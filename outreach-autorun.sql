-- outreach-autorun.sql — CRM-owned auto-refill for the outreach generator
-- ============================================================================
-- Makes the Tequila CRM request the next outreach batch automatically when you
-- clear the current one, and gives the drafting agent (a Claude agent using the
-- Microsoft 365 connector) a tiny, safe contract to consume. Reuses the existing
-- claim_outreach_batch (targeting, rolling-24h cap of 10, suppressions, dedup).
-- Nothing here creates drafts or emails — it only queues run requests. Idempotent.
-- ============================================================================

-- 1. Pause switch + run linkage + hard duplicate-recipient guard
alter table public.outreach_campaigns add column if not exists auto_refill boolean not null default true;
alter table public.outreach_messages  add column if not exists run_id uuid;
-- One message per recipient, ever, across all campaigns (backstop even if a
-- worker bypasses claim_outreach_batch). email_norm is nulls-distinct.
create unique index if not exists outreach_messages_email_norm_uidx on public.outreach_messages (email_norm);

-- 2. Run queue
create table if not exists public.outreach_runs (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      text not null references public.outreach_campaigns(id) on delete cascade,
  status           text not null default 'pending',   -- pending|running|done|partial|failed|empty|deferred
  reason           text,
  requested_by     uuid,
  requested_at     timestamptz not null default now(),
  started_at       timestamptz,
  finished_at      timestamptz,
  next_capacity_at timestamptz,
  target_count     int,
  drafted_count    int,
  error_count      int
);
-- At most one active run per campaign → no overlapping runs.
create unique index if not exists outreach_runs_active_uidx
  on public.outreach_runs (campaign_id) where status in ('pending','running');
create index if not exists outreach_runs_campaign_idx on public.outreach_runs (campaign_id, requested_at desc);

alter table public.outreach_runs enable row level security;
drop policy if exists "admins manage outreach_runs" on public.outreach_runs;
create policy "admins manage outreach_runs" on public.outreach_runs for all to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin')
  with check ((select role from profiles where id = auth.uid()) = 'admin');

-- Helper: is this campaign generating right now (active + not paused)?
create or replace function public.outreach_is_active(p_campaign text)
returns boolean language sql stable set search_path to 'public','pg_temp' as $$
  select exists (select 1 from outreach_campaigns c
                 where c.id = p_campaign and c.status = 'active' and coalesce(c.auto_refill, true));
$$;

-- 3. Enqueue a run request (used by the clear-trigger and the manual button)
create or replace function public.outreach_request_run(p_campaign text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_run uuid;
begin
  if auth.uid() is not null and coalesce((select role from profiles where id = auth.uid()), '') <> 'admin' then
    raise exception 'outreach_request_run requires admin';
  end if;
  if not exists (select 1 from outreach_campaigns where id = p_campaign) then
    raise exception 'campaign % not found', p_campaign;
  end if;
  if not outreach_is_active(p_campaign) then
    return jsonb_build_object('ok', false, 'status', 'paused', 'reason', 'Campaign is paused or inactive');
  end if;
  if exists (select 1 from outreach_runs where campaign_id = p_campaign and status in ('pending','running')) then
    return jsonb_build_object('ok', true, 'status', 'already_pending');
  end if;
  insert into outreach_runs (campaign_id, status, requested_by, reason)
  values (p_campaign, 'pending', auth.uid(), 'manual') returning id into v_run;
  return jsonb_build_object('ok', true, 'status', 'pending', 'run_id', v_run);
end $$;

-- 4. Auto-request when the batch is cleared (all drafts sent/skipped)
create or replace function public.trg_outreach_enqueue() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if not exists (select 1 from outreach_messages where campaign_id = new.campaign_id and status = 'queued')
     and outreach_is_active(new.campaign_id)
     and not exists (select 1 from outreach_runs where campaign_id = new.campaign_id and status in ('pending','running'))
  then
    insert into outreach_runs (campaign_id, status, reason) values (new.campaign_id, 'pending', 'batch_cleared');
  end if;
  return new;
end $$;
drop trigger if exists trg_outreach_after_status on public.outreach_messages;
create trigger trg_outreach_after_status after update of status on public.outreach_messages
  for each row execute function public.trg_outreach_enqueue();

-- 5. Agent contract: take a run (claims a batch or explains why not)
create or replace function public.outreach_take_run(p_campaign text, p_limit int default 10)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_cap int; v_used int; v_remaining int; v_run uuid; v_next timestamptz; v_contacts jsonb;
begin
  if auth.uid() is not null and coalesce((select role from profiles where id = auth.uid()), '') <> 'admin' then
    raise exception 'outreach_take_run requires admin';
  end if;
  if not outreach_is_active(p_campaign) then
    return jsonb_build_object('status','paused','reason','Campaign is paused or inactive','contacts','[]'::jsonb);
  end if;

  -- claim one pending run atomically
  update outreach_runs set status='running', started_at=now()
   where id = (select id from outreach_runs
                where campaign_id=p_campaign and status='pending'
                order by requested_at limit 1 for update skip locked)
   returning id into v_run;
  if v_run is null then
    return jsonb_build_object('status','idle','reason','No pending run','contacts','[]'::jsonb);
  end if;

  select daily_cap into v_cap from outreach_campaigns where id=p_campaign;
  select count(*) into v_used from outreach_messages
    where campaign_id=p_campaign and queued_at > now() - interval '24 hours';
  v_remaining := greatest(v_cap - v_used, 0);

  if v_remaining = 0 then
    select min(queued_at) + interval '24 hours' into v_next from outreach_messages
      where campaign_id=p_campaign and queued_at > now() - interval '24 hours';
    -- return the run to pending so it resumes automatically once capacity frees
    update outreach_runs set status='pending', started_at=null, next_capacity_at=v_next where id=v_run;
    return jsonb_build_object('status','deferred','reason','Daily cap reached','next_capacity_at',v_next,'contacts','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) into v_contacts
    from claim_outreach_batch(p_campaign, least(p_limit, v_remaining)) b;

  if v_contacts = '[]'::jsonb then
    update outreach_runs set status='empty', finished_at=now(), target_count=0 where id=v_run;
    return jsonb_build_object('status','empty','reason','No eligible prospects','run_id',v_run,'contacts','[]'::jsonb);
  end if;

  update outreach_messages m set run_id=v_run
    from jsonb_to_recordset(v_contacts) as x(message_id bigint)
   where m.id = x.message_id;
  update outreach_runs set target_count = jsonb_array_length(v_contacts) where id=v_run;

  return jsonb_build_object('status','ready','run_id',v_run,'remaining_cap',v_remaining,'contacts',v_contacts);
end $$;

-- 6. Agent writes a draft back (idempotent; keeps a mailbox id once set)
create or replace function public.outreach_record_draft(
  p_message_id bigint, p_subject text, p_body text, p_mailbox_draft_id text default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if auth.uid() is not null and coalesce((select role from profiles where id = auth.uid()), '') <> 'admin' then
    raise exception 'outreach_record_draft requires admin';
  end if;
  update outreach_messages
     set draft_subject = p_subject, draft_body = p_body, drafted_at = now(),
         mailbox_draft_id = coalesce(p_mailbox_draft_id, mailbox_draft_id), mailbox_error = null
   where id = p_message_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'message not found'); end if;
  return jsonb_build_object('ok', true, 'message_id', p_message_id);
end $$;

-- 7. Agent records a per-contact error (draft not created); leaves it for retry
create or replace function public.outreach_record_error(p_message_id bigint, p_error text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if auth.uid() is not null and coalesce((select role from profiles where id = auth.uid()), '') <> 'admin' then
    raise exception 'outreach_record_error requires admin';
  end if;
  update outreach_messages set mailbox_error = left(coalesce(p_error,'error'), 500) where id = p_message_id;
  return jsonb_build_object('ok', found, 'message_id', p_message_id);
end $$;

-- 8. Agent finalizes the run with explicit counts (zero drafts != success)
create or replace function public.outreach_finish_run(p_run uuid)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v jsonb; v_drafted int; v_errored int;
begin
  if auth.uid() is not null and coalesce((select role from profiles where id = auth.uid()), '') <> 'admin' then
    raise exception 'outreach_finish_run requires admin';
  end if;
  select count(*) filter (where mailbox_draft_id is not null),
         count(*) filter (where mailbox_draft_id is null)
    into v_drafted, v_errored
    from outreach_messages where run_id = p_run;
  update outreach_runs
     set status = case when coalesce(v_errored,0)=0 then 'done' when coalesce(v_drafted,0)=0 then 'failed' else 'partial' end,
         drafted_count = v_drafted, error_count = v_errored, finished_at = now()
   where id = p_run
   returning to_jsonb(outreach_runs.*) into v;
  return v;
end $$;

-- 9. Pause/resume from the CRM UI
create or replace function public.outreach_set_pause(p_campaign text, p_paused boolean)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if auth.uid() is not null and coalesce((select role from profiles where id = auth.uid()), '') <> 'admin' then
    raise exception 'outreach_set_pause requires admin';
  end if;
  update outreach_campaigns set auto_refill = not p_paused where id = p_campaign;
  return jsonb_build_object('ok', found, 'auto_refill', not p_paused);
end $$;
