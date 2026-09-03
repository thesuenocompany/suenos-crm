-- weather-ads.sql — Weather Triggered Ads (Phase 1 schema)
-- A GENERIC automation engine: trigger → condition → action → rollback → reporting.
-- Weather is the first trigger_type; the same tables serve future triggers
-- (events, long weekends, inventory, sales, competitor, sports, promos).
-- Admin-only throughout. Safe to re-run.
-- ============================================================================

-- ── helper: is the caller an active admin ──────────────────────────────────
create or replace function auto_is_admin() returns boolean
  language sql stable as $$
  select exists (select 1 from profiles p
                 where p.id = auth.uid() and p.role = 'admin' and coalesce(p.active, true));
$$;

-- ── 1. RULES ────────────────────────────────────────────────────────────────
create table if not exists automation_rules (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  trigger_type              text not null default 'weather',   -- weather | event | long_weekend | inventory | ...
  active                    boolean not null default false,     -- safeguard #7: new rules start inactive
  approval_required         boolean not null default true,      -- safeguard #7: default to human approval

  -- location (Canada-only)
  province                  text,
  city                      text,
  latitude                  numeric,
  longitude                 numeric,
  radius_km                 numeric,

  -- Meta target (reuses the existing ad account + object ids; NO new integration)
  meta_ad_account_id        text,                               -- e.g. 813974741538881
  target_type               text not null default 'adset',      -- campaign | adset | ad
  target_id                 text not null,                      -- Meta object id
  target_name               text,

  -- weather trigger config (first-class for weather; extensible via trigger_config)
  weather_condition         text,   -- temp_above|temp_below|forecast_high_above|forecast_low_below|
                                     -- consecutive_above|consecutive_below|precip_prob|snow|severe_alert|air_quality
  threshold                 numeric,
  consecutive_days          int,
  lead_time_hours           int default 0,                      -- forecast look-ahead window
  trigger_config            jsonb not null default '{}'::jsonb, -- future trigger types / extra params

  -- actions
  start_action              text not null default 'activate',   -- activate | set_budget | activate_and_budget
  stop_action               text not null default 'pause',      -- pause | restore | set_budget  (safeguard #2: required)
  daily_budget_cents        integer,                            -- hard daily cap when a budget is set (safeguard #1)
  budget_adjust_pct         numeric,                            -- optional % adjust instead of absolute
  max_incremental_spend_cents integer,                          -- safeguard #8: hard ceiling (second kill switch)

  created_by                uuid references profiles(id),
  created_at                timestamptz default now(),
  updated_at                timestamptz default now(),

  constraint automation_rules_stop_required check (stop_action is not null and length(stop_action) > 0)
);
create index if not exists automation_rules_active_idx on automation_rules (active, trigger_type);

-- ── 2. CONTROL LOCK + ROLLBACK SNAPSHOT ─────────────────────────────────────
-- One row per Meta object. UNIQUE target_id => only ONE rule controls an object
-- at a time (safeguard #6). meta_before holds the pre-change status/budget so a
-- rollback restores exactly (safeguard #3).
create table if not exists automation_control (
  target_id            text primary key,             -- Meta object id (unique => the lock)
  controlling_rule_id  uuid references automation_rules(id) on delete set null,
  meta_before          jsonb,                        -- {status, daily_budget_cents, ...} captured before first change
  incremental_spend_cents integer default 0,         -- running spend attributed to the active trigger (safeguard #8)
  activated_at         timestamptz,
  updated_at           timestamptz default now()
);

-- ── 3. AUDIT EVENTS (safeguard #4: log everything) ──────────────────────────
create table if not exists automation_events (
  id            bigserial primary key,
  rule_id       uuid references automation_rules(id) on delete set null,
  target_id     text,
  event_type    text not null,   -- check | trigger_detected | approval_requested | approved | modified |
                                 -- ignored | executed | budget_clamped | failed | rollback | conflict_blocked | ceiling_hit
  meta_before   jsonb,
  meta_after    jsonb,
  detail        text,
  spend_cents   integer,
  actor         uuid,            -- profile id, or null for automated
  created_at    timestamptz default now()
);
create index if not exists automation_events_rule_idx on automation_events (rule_id, created_at desc);

-- ── 4. WEATHER/TRIGGER CHECK RUNS ───────────────────────────────────────────
create table if not exists automation_runs (
  id               bigserial primary key,
  rule_id          uuid references automation_rules(id) on delete cascade,
  checked_at       timestamptz default now(),
  snapshot         jsonb,           -- normalized weather snapshot at check time
  condition_met    boolean,
  decision         text,            -- e.g. 'recommend', 'auto_execute', 'no_change', 'rollback', 'blocked'
  note             text
);
create index if not exists automation_runs_rule_idx on automation_runs (rule_id, checked_at desc);

-- ── 5. PENDING APPROVALS (recommendations) ──────────────────────────────────
create table if not exists automation_approvals (
  id            uuid primary key default gen_random_uuid(),
  rule_id       uuid references automation_rules(id) on delete cascade,
  headline      text,
  body          text,
  proposed_action jsonb,            -- {action, target_id, daily_budget_cents, until, ...}
  status        text not null default 'pending',   -- pending | approved | modified | ignored | expired | executed
  decided_by    uuid,
  decided_at    timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz default now()
);
create index if not exists automation_approvals_status_idx on automation_approvals (status, created_at desc);

-- ── 6. TRIGGERED PERIODS (Phase 5 reporting; tag weather-driven windows) ────
create table if not exists automation_periods (
  id             uuid primary key default gen_random_uuid(),
  rule_id        uuid references automation_rules(id) on delete set null,
  target_id      text,
  trigger_type   text default 'weather',
  trigger_reason text,
  started_at     timestamptz default now(),
  ended_at       timestamptz,
  budget_cents   integer,
  -- metrics filled from Meta insights later
  spend_cents    integer,
  impressions    integer,
  clicks         integer,
  results        integer,
  revenue_cents  integer,
  created_at     timestamptz default now()
);
create index if not exists automation_periods_rule_idx on automation_periods (rule_id, started_at desc);

-- ── RLS: admin-only on every table ──────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['automation_rules','automation_control','automation_events',
                           'automation_runs','automation_approvals','automation_periods']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "admins manage %1$s" on %1$s', t);
    execute format($p$create policy "admins manage %1$s" on %1$s
                      for all to authenticated
                      using (auto_is_admin()) with check (auto_is_admin())$p$, t);
  end loop;
end $$;

-- keep updated_at fresh on rules + control
create or replace function auto_touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists automation_rules_touch on automation_rules;
create trigger automation_rules_touch before update on automation_rules
  for each row execute function auto_touch_updated_at();
drop trigger if exists automation_control_touch on automation_control;
create trigger automation_control_touch before update on automation_control
  for each row execute function auto_touch_updated_at();
