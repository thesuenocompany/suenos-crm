# Trigger-Driven Ad Automation — Architecture & Build Guide

How the "Weather Triggered Ads" feature was designed and built, written so you can
lift the pattern into other apps. Weather is just the **first** trigger; the whole
thing is a generic **trigger → condition → action → rollback → reporting** engine.

Stack it was built on: **Supabase** (Postgres + RLS + Edge Functions in Deno) +
**pg_cron/pg_net** for scheduling + the **Meta Graph API** for the action side +
a **single-file React** front end. None of that is load-bearing — the design ports
to any DB + serverless-function + external-API combination. The parts that matter
are the data model and the safeguards, not the vendors.

---

## 1. The mental model

Don't build "a weather feature." Build a rules engine with five stages, and make
weather one pluggable input:

```
TRIGGER        CONDITION            ACTION            ROLLBACK           REPORTING
(what to watch) (is it true now?)   (do the thing)    (undo it safely)   (did it work?)
   weather   →   temp ≥ 18°C     →  turn ad ON     →  turn ad OFF     →  spend vs. baseline
   event         high for 2 days    raise budget      restore budget      results, revenue
   inventory     precip > 60%       (clamped)         release the lock    lift %
```

Every stage is a row in a table, not a hardcoded `if`. That's what makes it reusable:
adding "event" or "inventory" triggers later means new `trigger_type` values and a new
evaluator branch — **zero** schema changes and no changes to the action/rollback/report
layers.

**Design rules that made it safe and portable**
- The trigger source sits behind a **normalized interface** so the engine never
  depends on a specific weather API. Swapping providers touches one file.
- The engine (condition eval) and the executor (writes to Meta) are **separate
  functions**. The engine decides; the executor acts. Nothing writes to the ad
  platform except the one executor, so every safeguard lives in one place.
- **Approval-required by default.** New rules start inactive and in approval mode.
  Automatic execution is opt-in per rule.
- The same functions are called by **both** the UI (a human clicking) and the
  **scheduler** (cron). Human-in-the-loop and automated paths share one code path.

---

## 2. Component map

| Component | Role | File (this project) |
|---|---|---|
| **Schema** | 6 generic tables + admin-only RLS | `weather-ads.sql` |
| **Provider fn** | Normalized trigger-data source (geocode + weather) | `supabase/functions/weather-provider` |
| **Engine fn** | Evaluate every active rule → decide → log; call executor | `supabase/functions/weather-rules-check` |
| **Executor fn** | The *only* thing that writes to the ad platform; all safeguards | `supabase/functions/weather-execute` |
| **Report fn** | Pull real performance per triggered window + baseline; feed spend back into the ceiling | `supabase/functions/weather-report` |
| **Scheduler** | pg_cron jobs that call engine + report on a cadence | `weather-ads-cron.sql` |
| **UI** | Rule builder, manual run, approvals, live status, reporting table | `suenos-crm-weather.js` + tags in `suenos-crm-p4b.js` |

Flow at runtime:

```
cron (every 2h) ──► engine fn ──► provider fn (get normalized snapshot)
                        │
                        ├─ evalCondition(rule, snapshot)
                        │
                        ├─ approval rule + met  → create approval row (human decides)
                        ├─ auto rule    + met   → executor.apply
                        ├─ controlling  + cleared → executor.stop (auto rollback)
                        └─ ceiling hit          → executor.stop (kill switch)

cron (every 2h, +30m) ─► report fn ─► ad-platform insights ─► periods + ceiling spend
```

---

## 3. The data model (the reusable core)

Six tables, all prefixed `automation_` so they read as a subsystem and are trigger-agnostic.

**`automation_rules`** — one row per rule. Generic columns (`trigger_type`, location,
target, actions, budget caps) plus first-class weather columns (`weather_condition`,
`threshold`, `consecutive_days`, `lead_time_hours`) and a `trigger_config jsonb` escape
hatch for future trigger types so you don't re-migrate. Key defaults that *are* the
safety posture:

```sql
active            boolean not null default false,  -- new rules start OFF
approval_required boolean not null default true,   -- default to human approval
daily_budget_cents            integer,             -- hard daily cap
max_incremental_spend_cents   integer,             -- hard spend ceiling (2nd kill switch)
constraint stop_required check (stop_action is not null)  -- every rule MUST define its undo
```

**`automation_control`** — one row per ad-platform object, `target_id` as the **primary
key**. That uniqueness *is* the "one rule controls one object at a time" lock. Holds
`meta_before` (the pre-change snapshot for exact rollback) and `incremental_spend_cents`
(running spend for the ceiling).

**`automation_events`** — append-only audit log. Every `executed | rollback | failed |
conflict_blocked | ceiling_hit | budget_clamped | approved | ...` is written with
before + after state. If you can't explain from this table why an ad changed, the
feature failed.

**`automation_runs`** — one row per rule per check: the weather snapshot, whether the
condition was met, and the decision. This is your "why didn't it fire?" trace.

**`automation_approvals`** — pending recommendations for approval-mode rules. Status
`pending → approved | modified | ignored | expired | executed`.

**`automation_periods`** — a tagged window from trigger-fire to rollback, later filled
with real spend/impressions/clicks/results/revenue **and** a baseline (the equal window
just before) so you can show lift.

**RLS:** every table is admin-only, applied in a loop against a single
`auto_is_admin()` helper. One helper = no policy drift across six tables.

---

## 4. The safeguards (copy these verbatim into any spend-touching automation)

These are non-negotiable when software can spend money. All enforced server-side in
the **executor**, never trusted from the client:

1. **Budget clamp.** A set/adjusted budget is clamped to the rule's `daily_budget_cents`
   hard cap; an over-cap value is clamped and logged `budget_clamped`.
2. **Before-state capture.** Live status + budget are read and stored in
   `meta_before` **before** the first change, so rollback restores *exactly* what was
   there — not a guessed default.
3. **One-rule-per-object lock.** Unique `target_id` in `automation_control`; if another
   rule already controls the object, apply is refused (`conflict_blocked`).
4. **Hard spend ceiling.** If `incremental_spend_cents >= max_incremental_spend_cents`,
   apply refuses and forces a rollback (`ceiling_hit`). A second kill switch independent
   of the daily cap.
5. **No blind retry.** A failed write is logged `failed` and left alone. No control is
   taken, the approval stays pending. Retrying a spend action automatically is how you
   get runaway loops.
6. **Full audit.** See `automation_events` above.
7. **Default to human approval.** Rules start inactive + approval-required.
8. **Every rule has an undo.** `stop_action` is `NOT NULL` at the DB level.
9. **Never fake data.** A provider or platform error is surfaced and logged, never
   swallowed or defaulted to a "safe" number. A missing API key returns
   `missingEnv:true`, it doesn't silently no-op.
10. **Server-only secrets.** The ad-platform token and cron secret live in function
    env vars. The browser never sees them; the client only invokes functions.

---

## 5. Function contracts

**Provider** — the swappable data layer. Two actions behind a normalized shape:

```
invoke('weather-provider', { action:'geocode', city, province })  → [{name,admin1,lat,lng}]
invoke('weather-provider', { action:'weather', latitude, longitude })
  → { current, daily[], airQuality, alerts[], capabilities, missing[] }
```

The engine only ever sees that normalized object. `capabilities` + `missing` tell the
rest of the system what this provider can't do (e.g. Open-Meteo has no official severe
alerts) so unsupported conditions degrade honestly instead of lying. Swapping to a
paid provider later = rewrite this file only.

**Engine** (`weather-rules-check`) — loops active rules, calls the provider, runs
`evalCondition(rule, snapshot)`, and picks a decision. The condition evaluator is a
`switch` on `weather_condition` (`temp_above`, `forecast_high_above`,
`consecutive_above/below`, `precip_prob`, `snow`, …) — that switch is the only thing a
new trigger type needs to grow. Decisions: `recommend` (approval rule → write an
approval row, deduped), `auto_executed` (auto rule → call executor apply),
`rolled_back` (weather cleared while controlling → executor stop),
`ceiling_rolled_back`, `holding`, `no_change`. Whether it may *act* is gated on
`canAct = !!cronSecret` — the engine only triggers writes when invoked by the trusted
scheduler, not by an arbitrary caller.

**Executor** (`weather-execute`) — the only writer. Actions: `preview` (read-only:
returns current state + planned change + any conflict, so a human sees exactly what
will happen), `apply`, `stop`. `apply` accepts either an `approvalId` (human path) or a
`ruleId` (auto path, allowed only when `approval_required=false`). `planChange()`
computes the intended after-state with the budget clamp **before** any write. All ten
safeguards live here.

**Report** (`weather-report`) — for each period, pulls platform insights for the
triggered window and the equal window before it (baseline), stores both, and feeds the
open period's real spend back into `automation_control.incremental_spend_cents` so the
ceiling enforces on **actual dollars**. Auth: an admin JWT **or** the shared cron secret.

---

## 6. Scheduling

pg_cron + pg_net call the functions on a cadence (engine on the hour every 2h, report
30 min offset so they don't collide). The `Authorization` bearer is the project's
**public anon key** (only gets past the gateway); real auth is a `CRON_SECRET` in the
POST body that the function compares. Reuse one cron secret across all your scheduled
functions — don't mint a new one per job or you'll break the others.

```sql
select cron.schedule('weather-ads-tick', '0 */2 * * *', $job$
  select net.http_post(
    url  := 'https://<project>.supabase.co/functions/v1/weather-rules-check',
    headers := jsonb_build_object('Content-Type','application/json',
               'Authorization','Bearer <ANON_KEY>'),
    body := jsonb_build_object('cron_secret','<CRON_SECRET>'),
    timeout_milliseconds := 120000);
$job$);
```

---

## 7. Client integration

The React UI never touches the ad platform for writes and never holds a server secret.
It only: builds rules (writes `automation_rules`), triggers `preview`/`apply`/`stop`
via `supabase.functions.invoke`, approves recommendations, and reads the tables for
status/reporting. Live on/off status is shown by polling the platform read API with a
**shared, throttled rate-limit guard** (batched id lookups, visibility-gated, backed off
and cooled down in `localStorage` so every component pauses together when the platform
pushes back). Human-in-the-loop spend actions are handed to the user to click — the
automated classifier also blocks scripted spend, which is the correct behavior.

---

## 8. Porting this to a new app — checklist

1. **Copy the six `automation_*` tables** and the `auto_is_admin()` + RLS loop. Keep the
   defaults (inactive, approval-required, stop-required, ceilings).
2. **Write a provider function** for your trigger source behind the normalized
   `{ capabilities, missing, ...data }` shape. This is the only trigger-specific data code.
3. **Add a branch to the condition evaluator** for your new `weather_condition` /
   `trigger_config` values. Everything downstream is untouched.
4. **Reuse the executor as-is** if your action is also "toggle/adjust an ad-platform
   object." If the action is different (send an email, flip a feature flag, page a human),
   write a new executor but keep all ten safeguards — especially before-state capture,
   the one-object lock, the ceiling, no-retry, and full audit.
5. **Reuse the report function** shape: tag a period on fire, close it on rollback, fill
   metrics from your platform, compute a baseline, feed real cost back into the ceiling.
6. **Schedule** engine + report with pg_cron, anon-bearer + shared cron secret in body.
7. **Set server secrets** (`META_ACCESS_TOKEN` with *write* scope, `CRON_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY`). Never put them in the client.

---

## 9. Gotchas we hit (so you don't)

- **Read vs. write scope.** A token can read fine and still fail every write. Meta needs
  `ads_management` (not just `ads_read`) for status/budget changes. Verify scope before
  blaming code — the safeguards will correctly log `failed` and take no control, which
  looks like "nothing happened."
- **Rate limits are per account, and auto-refresh re-trips them.** Fetching full insights
  on every page open kept the penalty window from ever clearing. Fix: a shared cooldown
  in `localStorage` that all pollers respect, throttle auto-refresh (≤ once / 15 min),
  stop the loop the instant the platform says "too many calls," and never auto-retry.
- **"Running" ≠ delivering.** A campaign whose flight end-date has passed still reports
  its toggle as `ACTIVE`. Derive "Ended" from the stored end date, not the platform
  status, or the UI lies about what's live.
- **Provider quirks.** Geocode by city only and use the province to *prefer* a match,
  not to filter the query string ("Cobble Hill BC" as a search string returns nothing;
  "Cobble Hill" + province=BC resolves).
- **Deploy integrity.** Large pasted function bodies can corrupt silently and boot-fail.
  Verify a hash of the code before/after deploy.

---

*Reference implementation: `weather-ads.sql`, `weather-ads-cron.sql`, `weather-report.sql`,
and `supabase/functions/weather-{provider,rules-check,execute,report}` in this repo.*
