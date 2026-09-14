-- Run after the CRM agent migration. All test records are rolled back.
begin;
do $$
declare actor uuid;account text;connection uuid=gen_random_uuid();request uuid=gen_random_uuid();payload jsonb;first_result jsonb;replay jsonb;updated jsonb;
begin
  if has_table_privilege('anon','public.suenos_agent_members','SELECT') or has_function_privilege('authenticated','public.suenos_agent_write_task(uuid,uuid,uuid,text,text,jsonb)','EXECUTE') then raise exception 'Public connector access was not revoked';end if;
  select os_user_id into actor from suenos_agent_members where active limit 1;
  insert into accounts(name)values('AGENT ACCEPTANCE - ROLLBACK')returning id into account;
  payload=jsonb_build_object('account_id',account,'title','Check reorder needs','priority','medium');
  first_result=suenos_agent_write_task(actor,connection,request,'same-hash','create',payload);
  replay=suenos_agent_write_task(actor,connection,request,'same-hash','create',payload);
  if first_result#>>'{task,id}' is distinct from replay#>>'{task,id}' or replay->>'replayed'<>'true' then raise exception 'CRM idempotency failed';end if;
  if jsonb_array_length(suenos_agent_list_tasks(account,null,null,true,30,0))<>1 then raise exception 'Task list failed';end if;
  updated=suenos_agent_write_task(actor,connection,gen_random_uuid(),'updated','update',jsonb_build_object('task_id',first_result#>>'{task,id}','expected_snapshot',first_result#>>'{task,snapshot}','changes',jsonb_build_object('done',true)));
  if updated#>>'{task,done}'<>'true' then raise exception 'CRM completion failed';end if;
  begin perform suenos_agent_write_task(actor,connection,gen_random_uuid(),'stale','update',jsonb_build_object('task_id',first_result#>>'{task,id}','expected_snapshot',first_result#>>'{task,snapshot}','changes',jsonb_build_object('title','Stale change')));raise exception 'Stale CRM update accepted';exception when others then if sqlerrm<>'AGENT_CONFLICT' then raise;end if;end;
  begin perform suenos_agent_write_task(actor,connection,request,'changed-hash','create',payload);raise exception 'Changed retry accepted';exception when others then if sqlerrm<>'AGENT_REQUEST_KEY_REUSED' then raise;end if;end;
  if jsonb_array_length(suenos_agent_list_tasks(account,null,null,true,30,0))<>0 then raise exception 'Completed task resurfaced as open';end if;
  if (suenos_agent_sales_summary('2026-01','2026-08',account)->>'records')::int<>0 then raise exception 'Empty-account sales are wrong';end if;
  update suenos_agent_members set active=false where os_user_id=actor;
  begin perform suenos_agent_write_task(actor,connection,gen_random_uuid(),'inactive','create',payload);raise exception 'Inactive member wrote CRM task';exception when others then if sqlerrm<>'AGENT_NOT_ALLOWED' then raise;end if;end;
end $$;
select 'CRM task, snapshot, duplicate, sales and membership checks passed' as result;
rollback;
