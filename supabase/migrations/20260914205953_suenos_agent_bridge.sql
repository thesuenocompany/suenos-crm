-- Apply to Sueños CRM only (dowfjjthshbbgnvwxzjv). No credentials are stored in source.
create table public.suenos_agent_members(
  os_user_id uuid primary key, crm_user_id uuid not null references auth.users(id),
  active boolean not null default true, created_at timestamptz not null default now()
);
create index on public.suenos_agent_members(crm_user_id);
insert into public.suenos_agent_members(os_user_id,crm_user_id)
select 'f88d6033-d325-4291-a5f1-04db991f146e',id from public.profiles where id='84b94f00-8d0a-40d7-bdea-d109dfc2cdf2' and role='admin' and active;
create table public.suenos_agent_audit(
  id uuid primary key default gen_random_uuid(), actor_id uuid not null, connection_id uuid not null,
  system text not null default 'crm',action text not null,target_id text,request_key uuid not null,
  request_hash text not null,result jsonb,created_at timestamptz not null default now(),unique(actor_id,request_key)
);
create index on public.suenos_agent_audit(actor_id,created_at desc);
alter table public.suenos_agent_members enable row level security;
alter table public.suenos_agent_audit enable row level security;
revoke all on public.suenos_agent_members,public.suenos_agent_audit from public,anon,authenticated;
grant select,insert,update,delete on public.suenos_agent_members,public.suenos_agent_audit to service_role;

create function public.suenos_agent_list_tasks(p_account text default null,p_rep uuid default null,p_due_before date default null,p_open boolean default true,p_limit integer default 30,p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(item),'[]'::jsonb) from (
    select to_jsonb(t)||jsonb_build_object('snapshot',md5(to_jsonb(t)::text)) as item from tasks t
    where (p_account is null or t.account_id=p_account) and (p_rep is null or t.rep_id=p_rep) and (p_due_before is null or t.due_date<p_due_before) and (not p_open or not coalesce(t.done,false))
    order by t.due_date nulls last,t.id limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)
  ) s;
$$;
create function public.suenos_agent_sales_summary(p_from text,p_to text,p_account text default null)
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb; begin
  if p_from!~'^\d{4}-(0[1-9]|1[0-2])$' or p_to!~'^\d{4}-(0[1-9]|1[0-2])$' or p_from>p_to or (p_to||'-01')::date>(p_from||'-01')::date+interval '36 months' then raise exception 'AGENT_INVALID_RANGE'; end if;
  select jsonb_build_object('from_month',p_from,'to_month',p_to,'records',count(*),'bottles',coalesce(sum(bottles),0),'recorded_revenue',coalesce(sum(revenue),0),'currency',null,
    'by_month_product',coalesce((select jsonb_agg(to_jsonb(g)) from (select s.month,s.product_id,p.name as product_name,count(*) as records,sum(s.bottles) as bottles,sum(s.revenue) as recorded_revenue from sales s left join products p on p.id=s.product_id where s.month>=p_from and s.month<=p_to and (p_account is null or s.account_id=p_account) group by s.month,s.product_id,p.name order by s.month,s.product_id)g),'[]'::jsonb),
    'note','Exact aggregation of recorded sales rows. Orders are excluded. Missing months are not proof of zero sales. Currency is not stored on sales rows; verify it before external reporting.') into result from sales where month>=p_from and month<=p_to and (p_account is null or account_id=p_account);
  return result;
end $$;
create function public.suenos_agent_write_task(p_actor uuid,p_connection uuid,p_request_key uuid,p_request_hash text,p_action text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare audit suenos_agent_audit; task tasks; changes jsonb; rep uuid; actor uuid; out jsonb; begin
  select m.crm_user_id into actor from suenos_agent_members m join profiles p on p.id=m.crm_user_id where m.os_user_id=p_actor and m.active and p.role='admin' and p.active;
  if not found then raise exception 'AGENT_NOT_ALLOWED'; end if;
  insert into suenos_agent_audit(actor_id,connection_id,action,request_key,request_hash) values(p_actor,p_connection,p_action,p_request_key,p_request_hash) on conflict(actor_id,request_key) do nothing;
  select * into audit from suenos_agent_audit where actor_id=p_actor and request_key=p_request_key for update;
  if audit.request_hash<>p_request_hash then raise exception 'AGENT_REQUEST_KEY_REUSED'; end if;
  if audit.result is not null then return audit.result||jsonb_build_object('replayed',true); end if;
  if p_action='create' then
    if not exists(select 1 from accounts where id=p_payload->>'account_id' and deleted_at is null) then raise exception 'AGENT_INVALID_TASK'; end if;
    rep=(p_payload->>'rep_id')::uuid;
    if rep is not null and not exists(select 1 from profiles where id=rep and active) then raise exception 'AGENT_INVALID_TASK'; end if;
    insert into tasks(account_id,title,notes,due_date,rep_id,priority,done) values(p_payload->>'account_id',p_payload->>'title',concat_ws(E'\n\n',nullif(p_payload->>'notes',''),case when p_payload->>'source_url' is not null then 'Source: '||(p_payload->>'source_url') end),(p_payload->>'due_date')::date,rep,coalesce(p_payload->>'priority','medium'),false) returning * into task;
  elsif p_action='update' then
    select * into task from tasks where id=p_payload->>'task_id' for update;
    if not found then raise exception 'AGENT_NOT_FOUND'; end if;
    if md5(to_jsonb(task)::text) is distinct from p_payload->>'expected_snapshot' then raise exception 'AGENT_CONFLICT'; end if;
    changes=p_payload->'changes';rep=case when changes?'rep_id' then (changes->>'rep_id')::uuid else task.rep_id end;
    if rep is not null and not exists(select 1 from profiles where id=rep and active) then raise exception 'AGENT_INVALID_TASK'; end if;
    update tasks set title=coalesce(changes->>'title',task.title),notes=case when changes?'notes' then changes->>'notes' else task.notes end,
      due_date=case when changes?'due_date' then (changes->>'due_date')::date else task.due_date end,rep_id=rep,priority=coalesce(changes->>'priority',task.priority),done=coalesce((changes->>'done')::boolean,task.done)
      where id=task.id returning * into task;
  else raise exception 'AGENT_INVALID_TASK'; end if;
  out=jsonb_build_object('system','crm','task',to_jsonb(task)||jsonb_build_object('snapshot',md5(to_jsonb(task)::text)),'replayed',false);
  update suenos_agent_audit set target_id=task.id,result=out where id=audit.id;
  return out;
end $$;
revoke execute on function public.suenos_agent_list_tasks(text,uuid,date,boolean,integer,integer),public.suenos_agent_sales_summary(text,text,text),public.suenos_agent_write_task(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.suenos_agent_list_tasks(text,uuid,date,boolean,integer,integer),public.suenos_agent_sales_summary(text,text,text),public.suenos_agent_write_task(uuid,uuid,uuid,text,text,jsonb) to service_role;
