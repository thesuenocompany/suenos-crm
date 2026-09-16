-- suenos-agent-crm-tools.sql — Phase 1 read-only CRM tools for the Sueños Work Agent
-- ============================================================================
-- Adds read-only server-side functions (the controlled logic layer) that the
-- existing suenos-agent-bridge edge function exposes to ChatGPT. No arbitrary
-- SQL, no service-role exposure, no new auth. All functions return jsonb in the
-- same style as the existing suenos_agent_* functions. Purchase orders and the
-- monthly `sales` table are kept distinct (matching existing CRM definitions).
-- Missing data is null, never fabricated as zero. Idempotent / safe to re-run.
-- ============================================================================

-- ── Shared views ───────────────────────────────────────────────────────────
-- Active (non-cancelled) orders with a resolved order_date and per-account
-- sequence number. seq = 1 is the account's first order (a "new listing");
-- seq > 1 is a reorder.
create or replace view v_agent_orders as
select o.id, o.account_id, o.rep_id, o.product_id, o.bottles, o.total,
       coalesce(o.requested_date, o.created_at::date) as order_date, o.status,
       row_number() over (partition by o.account_id
         order by coalesce(o.requested_date, o.created_at::date), o.created_at, o.id) as seq
from orders o
where lower(coalesce(o.status,'')) <> 'cancelled';

-- Per-account derived stats used by health/reorder/attention logic.
create or replace view v_agent_account_stats as
select a.id as account_id, a.name, a.type, a.status, a.region, a.province, a.city,
       a.assigned_rep, a.last_visit,
       st.order_count, st.first_order, st.last_order_date, st.last_reorder_date, st.avg_gap_days,
       case when st.last_order_date is not null then (current_date - st.last_order_date) end as days_since_last_order,
       case when a.last_visit  is not null then (current_date - a.last_visit)      end as days_since_last_visit
from accounts a
left join lateral (
  select count(*) as order_count, min(order_date) as first_order, max(order_date) as last_order_date,
         max(order_date) filter (where seq > 1) as last_reorder_date,
         case when count(*) >= 2
              then round((max(order_date) - min(order_date))::numeric / nullif(count(*) - 1, 0), 1) end as avg_gap_days
  from v_agent_orders vo where vo.account_id = a.id
) st on true
where a.deleted_at is null;

-- ── Sales summary (extended: region / rep / type filters) ───────────────────
drop function if exists public.suenos_agent_sales_summary(text, text, text);
create or replace function public.suenos_agent_sales_summary(
  p_from text, p_to text, p_account text default null,
  p_region text default null, p_rep uuid default null, p_type text default null)
returns jsonb language plpgsql stable set search_path to 'public','pg_temp' as $$
declare result jsonb; begin
  if p_from !~ '^\d{4}-(0[1-9]|1[0-2])$' or p_to !~ '^\d{4}-(0[1-9]|1[0-2])$' or p_from > p_to
     or (p_to||'-01')::date > (p_from||'-01')::date + interval '36 months'
  then raise exception 'AGENT_INVALID_RANGE'; end if;
  select jsonb_build_object(
    'from_month', p_from, 'to_month', p_to,
    'records', count(*), 'bottles', coalesce(sum(s.bottles),0),
    'cases_estimate', coalesce(round(sum(s.bottles::numeric / nullif(coalesce(pr.case_pack,12),0)),1),0),
    'recorded_revenue', coalesce(sum(s.revenue),0), 'currency', null,
    'distinct_accounts', count(distinct s.account_id),
    'by_month', coalesce((select jsonb_agg(to_jsonb(g)) from (
        select s2.month, count(*) records, sum(s2.bottles) bottles, sum(s2.revenue) recorded_revenue
        from sales s2 left join accounts a2 on a2.id=s2.account_id
        where s2.month between p_from and p_to
          and (p_account is null or s2.account_id=p_account) and (p_region is null or a2.region=p_region)
          and (p_rep is null or s2.rep_id=p_rep) and (p_type is null or a2.type=p_type)
        group by 1 order by 1) g),'[]'::jsonb),
    'by_region', coalesce((select jsonb_agg(to_jsonb(g)) from (
        select coalesce(a3.region,'(unknown)') region, count(*) records, sum(s3.bottles) bottles, sum(s3.revenue) recorded_revenue
        from sales s3 left join accounts a3 on a3.id=s3.account_id
        where s3.month between p_from and p_to
          and (p_account is null or s3.account_id=p_account) and (p_region is null or a3.region=p_region)
          and (p_rep is null or s3.rep_id=p_rep) and (p_type is null or a3.type=p_type)
        group by 1 order by 3 desc nulls last) g),'[]'::jsonb),
    'note','Exact aggregation of the recorded monthly sales table. Purchase orders are separate and excluded. cases_estimate uses product case_pack (default 12). Missing months are not proof of zero sales; currency is not stored on sales rows.'
  ) into result
  from sales s left join accounts a on a.id=s.account_id left join products pr on pr.id=s.product_id
  where s.month between p_from and p_to
    and (p_account is null or s.account_id=p_account) and (p_region is null or a.region=p_region)
    and (p_rep is null or s.rep_id=p_rep) and (p_type is null or a.type=p_type);
  return result;
end $$;

-- ── Orders list ─────────────────────────────────────────────────────────────
create or replace function public.suenos_agent_orders(
  p_from date default null, p_to date default null, p_account text default null,
  p_rep uuid default null, p_region text default null, p_kind text default 'all',
  p_limit int default 30, p_offset int default 0)
returns jsonb language sql stable set search_path to 'public','pg_temp' as $$
  select coalesce(jsonb_agg(item),'[]'::jsonb) from (
    select jsonb_build_object(
      'order_id', vo.id, 'order_date', vo.order_date, 'account', a.name, 'account_id', vo.account_id,
      'region', a.region, 'rep', pf.name, 'product', pr.name, 'bottles', vo.bottles,
      'status', vo.status, 'kind', case when vo.seq=1 then 'new_listing' else 'reorder' end, 'total', vo.total
    ) as item
    from v_agent_orders vo
    left join accounts a on a.id=vo.account_id
    left join profiles pf on pf.id=vo.rep_id
    left join products pr on pr.id=vo.product_id
    where (p_from is null or vo.order_date>=p_from) and (p_to is null or vo.order_date<=p_to)
      and (p_account is null or vo.account_id=p_account) and (p_rep is null or vo.rep_id=p_rep)
      and (p_region is null or a.region=p_region)
      and (p_kind='all' or (p_kind='new_listing' and vo.seq=1) or (p_kind='reorder' and vo.seq>1))
    order by vo.order_date desc, vo.id
    limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)
  ) s;
$$;

-- ── Visits list ─────────────────────────────────────────────────────────────
create or replace function public.suenos_agent_visits(
  p_from date default null, p_to date default null, p_account text default null,
  p_rep uuid default null, p_region text default null, p_limit int default 30, p_offset int default 0)
returns jsonb language sql stable set search_path to 'public','pg_temp' as $$
  select coalesce(jsonb_agg(item),'[]'::jsonb) from (
    select jsonb_build_object('date',v.date,'account',a.name,'account_id',v.account_id,'region',a.region,
      'rep',pf.name,'type',v.type,'notes',v.notes,'outcome',v.outcome,'follow_up_date',v.follow_up_date,
      'has_outcome',(nullif(trim(coalesce(v.outcome,'')),'') is not null)) as item
    from visits v left join accounts a on a.id=v.account_id left join profiles pf on pf.id=v.rep_id
    where (p_from is null or v.date>=p_from) and (p_to is null or v.date<=p_to)
      and (p_account is null or v.account_id=p_account) and (p_rep is null or v.rep_id=p_rep)
      and (p_region is null or a.region=p_region)
    order by v.date desc, v.id
    limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)
  ) s;
$$;

-- ── Reorders (cadence + overdue / single-order) ─────────────────────────────
create or replace function public.suenos_agent_reorders(
  p_region text default null, p_rep uuid default null, p_overdue_only boolean default false,
  p_single_order_only boolean default false, p_limit int default 30, p_offset int default 0)
returns jsonb language sql stable set search_path to 'public','pg_temp' as $$
  select coalesce(jsonb_agg(item),'[]'::jsonb) from (
    select jsonb_build_object(
      'account', st.name, 'account_id', st.account_id, 'region', st.region, 'rep', pf.name,
      'order_count', st.order_count, 'first_order', st.first_order, 'last_order', st.last_order_date,
      'last_reorder', st.last_reorder_date, 'avg_reorder_gap_days', st.avg_gap_days,
      'days_since_last_order', st.days_since_last_order,
      'status', case
        when coalesce(st.order_count,0)=0 then 'no_orders'
        when st.order_count=1 then 'single_order'
        when st.avg_gap_days is not null and st.days_since_last_order > st.avg_gap_days*1.5 then 'overdue'
        else 'on_track' end,
      'reason', case
        when coalesce(st.order_count,0)=0 then 'No recorded orders.'
        when st.order_count=1 then 'Only one recorded order ('||st.first_order||'); no reorder yet.'
        when st.avg_gap_days is not null and st.days_since_last_order > st.avg_gap_days*1.5
          then 'Last order '||st.days_since_last_order||' days ago; average reorder gap '||st.avg_gap_days||' days.'
        else 'Reorder cadence within normal range ('||coalesce(st.avg_gap_days::text,'n/a')||' day avg).' end
    ) as item
    from v_agent_account_stats st left join profiles pf on pf.id=st.assigned_rep
    where (p_region is null or st.region=p_region) and (p_rep is null or st.assigned_rep=p_rep)
      and (not p_overdue_only or (st.order_count>=2 and st.avg_gap_days is not null and st.days_since_last_order > st.avg_gap_days*1.5))
      and (not p_single_order_only or st.order_count=1)
    order by (case when p_overdue_only then st.days_since_last_order end) desc nulls last, st.name
    limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)
  ) s;
$$;

-- ── Listings (new / active / new-without-reorder) ───────────────────────────
create or replace function public.suenos_agent_listings(
  p_kind text default 'new', p_from date default null, p_to date default null,
  p_region text default null, p_rep uuid default null, p_limit int default 30, p_offset int default 0)
returns jsonb language sql stable set search_path to 'public','pg_temp' as $$
  select coalesce(jsonb_agg(item),'[]'::jsonb) from (
    select jsonb_build_object('account',st.name,'account_id',st.account_id,'region',st.region,'rep',pf.name,
      'status',st.status,'first_order',st.first_order,'last_order',st.last_order_date,'order_count',coalesce(st.order_count,0),
      'reordered',(coalesce(st.order_count,0)>1)) as item
    from v_agent_account_stats st left join profiles pf on pf.id=st.assigned_rep
    where (p_region is null or st.region=p_region) and (p_rep is null or st.assigned_rep=p_rep)
      and case p_kind
        when 'active' then st.status='Listed'
        when 'new_no_reorder' then st.first_order is not null
          and (p_from is null or st.first_order>=p_from) and (p_to is null or st.first_order<=p_to) and st.order_count=1
        else st.first_order is not null
          and (p_from is null or st.first_order>=p_from) and (p_to is null or st.first_order<=p_to)
      end
    order by st.first_order desc nulls last, st.name
    limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)
  ) s;
$$;

-- ── Follow-ups (open tasks bucketed by due date) ────────────────────────────
create or replace function public.suenos_agent_followups(
  p_bucket text default 'overdue', p_rep uuid default null, p_region text default null,
  p_account text default null, p_limit int default 30, p_offset int default 0)
returns jsonb language sql stable set search_path to 'public','pg_temp' as $$
  select coalesce(jsonb_agg(item),'[]'::jsonb) from (
    select jsonb_build_object('task_id',t.id,'title',t.title,'due_date',t.due_date,'priority',t.priority,
      'account',a.name,'account_id',t.account_id,'region',a.region,'rep',pf.name,
      'days_overdue', case when t.due_date is not null then greatest(current_date - t.due_date,0) end) as item
    from tasks t left join accounts a on a.id=t.account_id left join profiles pf on pf.id=t.rep_id
    where not coalesce(t.done,false)
      and (p_rep is null or t.rep_id=p_rep) and (p_account is null or t.account_id=p_account)
      and (p_region is null or a.region=p_region)
      and case p_bucket
        when 'overdue'  then t.due_date is not null and t.due_date < current_date
        when 'today'    then t.due_date = current_date
        when 'upcoming' then t.due_date is not null and t.due_date > current_date
        else true end
    order by t.due_date nulls last, t.id
    limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)
  ) s;
$$;

-- ── Rep activity (activity separated from outcomes) ─────────────────────────
create or replace function public.suenos_agent_rep_activity(
  p_from date, p_to date, p_rep uuid default null, p_region text default null)
returns jsonb language sql stable set search_path to 'public','pg_temp' as $$
  select coalesce(jsonb_agg(item order by item->>'rep'),'[]'::jsonb) from (
    select jsonb_build_object(
      'rep', pf.name, 'rep_id', pf.id, 'region', pf.region, 'from', p_from, 'to', p_to,
      'activity', jsonb_build_object(
        'visits', (select count(*) from visits v where v.rep_id=pf.id and v.date between p_from and p_to),
        'accounts_visited', (select count(distinct v.account_id) from visits v where v.rep_id=pf.id and v.date between p_from and p_to),
        'tastings', (select count(*) from tastings ta where ta.rep_id=pf.id and ta.date between p_from and p_to),
        'orders', (select count(*) from v_agent_orders vo where vo.rep_id=pf.id and vo.order_date between p_from and p_to),
        'followups_completed', (select count(*) from tasks t where t.rep_id=pf.id and coalesce(t.done,false) and t.due_date between p_from and p_to)
      ),
      'outcomes', jsonb_build_object(
        'new_listings', (select count(*) from v_agent_orders vo where vo.rep_id=pf.id and vo.seq=1 and vo.order_date between p_from and p_to),
        'reorders', (select count(*) from v_agent_orders vo where vo.rep_id=pf.id and vo.seq>1 and vo.order_date between p_from and p_to),
        'bottles_ordered', (select coalesce(sum(vo.bottles),0) from v_agent_orders vo where vo.rep_id=pf.id and vo.order_date between p_from and p_to)
      ),
      'outstanding_followups', (select count(*) from tasks t where t.rep_id=pf.id and not coalesce(t.done,false) and t.due_date is not null and t.due_date < current_date),
      'note','Activity measures effort (visits, tastings); outcomes measure results (new listings, reorders, bottles). High activity with low outcomes is not productive sales.'
    ) as item
    from profiles pf
    where pf.active and pf.role in ('rep','admin')
      and (p_rep is null or pf.id=p_rep) and (p_region is null or pf.region=p_region)
  ) s;
$$;

-- ── Account health (transparent signals + reasons) ──────────────────────────
create or replace function public.suenos_agent_account_health(p_account text)
returns jsonb language sql stable set search_path to 'public','pg_temp' as $$
  select jsonb_build_object(
    'label', case
      when st.status='Listed' and st.days_since_last_order is not null and st.avg_gap_days is not null and st.days_since_last_order > st.avg_gap_days*1.5 then 'slipping'
      when st.order_count>=1 and st.days_since_last_order is not null and st.days_since_last_order > 90 then 'dormant'
      when st.order_count>=2 then 'active'
      when st.order_count=1 then 'new_listing'
      else 'prospect' end,
    'signals', jsonb_build_object('order_count',coalesce(st.order_count,0),'days_since_last_order',st.days_since_last_order,
       'days_since_last_visit',st.days_since_last_visit,'avg_reorder_gap_days',st.avg_gap_days,'status',st.status,
       'open_overdue_tasks',(select count(*) from tasks t where t.account_id=p_account and not coalesce(t.done,false) and t.due_date is not null and t.due_date<current_date)),
    'reasons', coalesce((select jsonb_agg(r) from (
       select 'Last order '||st.days_since_last_order||' days ago.' r where st.days_since_last_order is not null
       union all select 'Average reorder gap '||st.avg_gap_days||' days.' where st.avg_gap_days is not null
       union all select 'No visit in '||st.days_since_last_visit||' days.' where st.days_since_last_visit is not null and st.days_since_last_visit>45
       union all select 'Only one recorded order; no reorder yet.' where st.order_count=1
       union all select 'No recorded orders.' where coalesce(st.order_count,0)=0
    ) x),'[]'::jsonb)
  )
  from v_agent_account_stats st where st.account_id=p_account;
$$;

-- ── Account summary (practical, resolved names, health) ─────────────────────
create or replace function public.suenos_agent_account_summary(p_account text)
returns jsonb language sql stable set search_path to 'public','pg_temp' as $$
  select jsonb_build_object(
    'account_id', a.id, 'name', a.name, 'type', a.type, 'status', a.status,
    'region', a.region, 'province', a.province, 'city', a.city, 'address', a.address,
    'assigned_rep', pf.name, 'contact', a.contact, 'email', a.email, 'phone', a.phone, 'notes', a.notes,
    'last_visit', a.last_visit, 'last_order', st.last_order_date, 'last_reorder', st.last_reorder_date,
    'order_count', coalesce(st.order_count,0), 'first_order', st.first_order,
    'avg_reorder_gap_days', st.avg_gap_days, 'days_since_last_order', st.days_since_last_order,
    'days_since_last_visit', st.days_since_last_visit,
    'tastings_count', (select count(*) from tastings ta where ta.account_id=a.id),
    'open_tasks', (select count(*) from tasks t where t.account_id=a.id and not coalesce(t.done,false)),
    'recorded_next_action', (select t.title from tasks t where t.account_id=a.id and not coalesce(t.done,false) order by t.due_date nulls last, t.id limit 1),
    'health', public.suenos_agent_account_health(a.id),
    'note','recorded_next_action is the earliest open task if one exists; the CRM stores no separate next-action field, so null means none is recorded.'
  )
  from accounts a
  left join v_agent_account_stats st on st.account_id=a.id
  left join profiles pf on pf.id=a.assigned_rep
  where a.id=p_account and a.deleted_at is null;
$$;

-- ── Attention items (each with an explicit reason) ──────────────────────────
create or replace function public.suenos_agent_attention(
  p_limit int default 20, p_region text default null, p_rep uuid default null)
returns jsonb language sql stable set search_path to 'public','pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(i) order by i.severity desc, i.account_name),'[]'::jsonb)
  from (
    select * from (
      select 'overdue_followup' kind, a.id account_id, a.name account_name, a.region, t.rep_id, pf.name rep, 3 severity,
        'Follow-up task "'||t.title||'" was due '||(current_date - t.due_date)||' days ago.' reason, t.title next_action
      from tasks t join accounts a on a.id=t.account_id left join profiles pf on pf.id=t.rep_id
      where not coalesce(t.done,false) and t.due_date is not null and t.due_date < current_date and a.deleted_at is null
      union all
      select 'new_listing_no_reorder', st.account_id, st.name, st.region, st.assigned_rep, pf.name, 2,
        'Listed with a first order on '||st.first_order||' ('||st.days_since_last_order||' days ago) but no reorder recorded.', null
      from v_agent_account_stats st left join profiles pf on pf.id=st.assigned_rep
      where st.order_count=1 and st.days_since_last_order is not null and st.days_since_last_order > 30
      union all
      select 'slipping_reorder', st.account_id, st.name, st.region, st.assigned_rep, pf.name, 3,
        'Last order '||st.days_since_last_order||' days ago; average reorder gap '||st.avg_gap_days||' days.', null
      from v_agent_account_stats st left join profiles pf on pf.id=st.assigned_rep
      where st.order_count>=2 and st.avg_gap_days is not null and st.days_since_last_order > st.avg_gap_days*1.5
      union all
      select 'no_recent_contact', st.account_id, st.name, st.region, st.assigned_rep, pf.name, 1,
        'Listed account with no visit in '||st.days_since_last_visit||' days.', null
      from v_agent_account_stats st left join profiles pf on pf.id=st.assigned_rep
      where st.status='Listed' and st.days_since_last_visit is not null and st.days_since_last_visit > 45
      union all
      select 'visit_no_outcome', a.id, a.name, a.region, v.rep_id, pf.name, 1,
        'Visit on '||v.date||' has no recorded outcome or follow-up.', null
      from visits v join accounts a on a.id=v.account_id left join profiles pf on pf.id=v.rep_id
      where v.date > current_date - 21 and nullif(trim(coalesce(v.outcome,'')),'') is null and v.follow_up_date is null and a.deleted_at is null
    ) all_items
    where (p_region is null or region=p_region) and (p_rep is null or rep_id=p_rep)
    order by severity desc, account_name
    limit least(greatest(p_limit,1),100)
  ) i;
$$;
