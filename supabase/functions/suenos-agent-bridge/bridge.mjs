import { z } from 'zod';

const CRM_URL='https://dowfjjthshbbgnvwxzjv.supabase.co';
const SESSION_URL='https://os.thesuenocompany.com/api/agent/session';
const id=z.string().uuid(),crmId=z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T00:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s;});
const page={limit:z.number().int().min(1).max(100).default(30),offset:z.number().int().min(0).max(100000).default(0)};
const filter=z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} '\-]+$/u);
const fields={title:z.string().trim().min(1).max(240),notes:z.string().max(6000).nullable().optional(),due_date:date.nullable().optional(),rep_id:id.nullable().optional(),priority:z.enum(['low','medium','high']).default('medium')};
export const schemas={
  crm_find_accounts:z.object({query:filter.optional(),province:filter.optional(),rep_id:id.optional(),...page}).strict(),
  crm_account_history:z.object({account_id:crmId,...page}).strict(),
  crm_list_reps:z.object(page).strict(),
  crm_list_tasks:z.object({account_id:crmId.optional(),rep_id:id.optional(),due_before:date.optional(),open_only:z.boolean().default(true),...page}).strict(),
  crm_sales_summary:z.object({from_month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),to_month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),account_id:crmId.optional()}).strict(),
  crm_create_task:z.object({request_key:id,account_id:crmId,...fields,source_url:z.string().url().max(2000).refine(s=>s.startsWith('https://')).optional()}).strict(),
  crm_update_task:z.object({request_key:id,task_id:crmId,expected_snapshot:z.string().regex(/^[a-f0-9]{32}$/),changes:z.object({...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.optional()])),done:z.boolean().optional()}).strict().refine(x=>Object.keys(x).length>0)}).strict(),
  agent_change_log:z.object(page).strict()
};
const writeTools=new Set(['crm_create_task','crm_update_task']);
const query=values=>new URLSearchParams(Object.entries(values).filter(([,v])=>v!==undefined&&v!==null)).toString();
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
class BridgeError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function stable(value){if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;return JSON.stringify(value);}
async function sha(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}

export function createBridge({fetchImpl=fetch,getEnv=name=>globalThis.Deno?.env.get(name)||'',dbOverride}={}){
  async function db(path,options={}){
    if(dbOverride)return dbOverride(path,options);
    const key=getEnv('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new BridgeError('CRM connection is not configured.',503);
    const r=await fetchImpl(`${CRM_URL}/rest/v1/${path}`,{...options,headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',...(options.headers||{})},signal:AbortSignal.timeout(12000)});
    const data=await r.json().catch(()=>null);
    if(!r.ok){const code=['AGENT_NOT_ALLOWED','AGENT_CONFLICT','AGENT_REQUEST_KEY_REUSED','AGENT_NOT_FOUND','AGENT_INVALID_TASK','AGENT_INVALID_RANGE'].find(x=>String(data?.message||'').includes(x));throw new BridgeError(code||'CRM database request failed.',code?.includes('CONFLICT')||code?.includes('REUSED')?409:code?400:503);}
    return data;
  }
  const rpc=(name,args)=>db(`rpc/${name}`,{method:'POST',body:JSON.stringify(args)});
  const list=(table,select,a,filters={})=>db(`${table}?${query({select,...filters,limit:a.limit,offset:a.offset})}`);
  return async req=>{
    try{
      const token=/^Bearer (sua_[A-Za-z0-9_-]{43})$/i.exec(req.headers.get('authorization')||'')?.[1];
      if(!token)return json({error:'Agent authentication required.'},401);
      if(req.method!=='POST')return json({error:'Method not allowed.'},405);
      const r=await fetchImpl(SESSION_URL,{headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
      if(!r.ok)return json({error:'Agent connection expired, revoked, or unavailable.'},r.status===401||r.status===403?r.status:503);
      const session=await r.json();
      if(!z.string().uuid().safeParse(session.user_id).success||!z.string().uuid().safeParse(session.connection_id).success||!Array.isArray(session.scopes)||!Number.isFinite(Date.parse(session.expires_at))||Date.parse(session.expires_at)<=Date.now())return json({error:'Invalid agent identity.'},401);
      const links=await db(`suenos_agent_members?${query({os_user_id:`eq.${session.user_id}`,active:'eq.true',select:'crm_user_id'})}`);
      if(!links?.length)return json({error:'This OS account is not linked to CRM.'},403);
      const users=await db(`profiles?${query({id:`eq.${links[0].crm_user_id}`,role:'eq.admin',active:'eq.true',select:'id'})}`);
      if(!users?.length)return json({error:'Active CRM administrator access is required.'},403);
      if(Number(req.headers.get('content-length')||0)>32768)return json({error:'Request too large.'},413);
      const reader=req.body?.getReader();if(!reader)throw new BridgeError('Body required.');
      let length=0;const chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>32768){await reader.cancel();return json({error:'Request too large.'},413);}chunks.push(value);}
      const bytes=new Uint8Array(length);let cursor=0;for(const chunk of chunks){bytes.set(chunk,cursor);cursor+=chunk.length;}
      let input;try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new BridgeError('Invalid JSON.');}
      const tool=input?.tool,schema=schemas[tool];if(!schema)throw new BridgeError('Unknown CRM action.');
      const parsed=schema.safeParse(input.args);if(!parsed.success)throw new BridgeError('Invalid CRM arguments.');const a=parsed.data;
      const scope=writeTools.has(tool)?'crm:tasks:write':'crm:read';
      if(!session.scopes.includes(scope)||!session.scopes.includes('crm:read'))return json({error:'Permission for this CRM action was not granted.'},403);
      const output=records=>({system:'crm',records,offset:a.offset,limit:a.limit,has_more:records.length===a.limit});
      if(tool==='crm_find_accounts')return json(output(await list('accounts','id,name,type,region,province,city,assigned_rep,status,last_visit,last_order',a,{name:a.query?`ilike.*${a.query}*`:undefined,province:a.province?`eq.${a.province}`:undefined,assigned_rep:a.rep_id?`eq.${a.rep_id}`:undefined,deleted_at:'is.null',order:'name.asc,id.asc'})));
      if(tool==='crm_list_reps')return json(output(await list('profiles','id,name,role,region',a,{active:'eq.true',order:'name.asc,id.asc'})));
      if(tool==='crm_list_tasks')return json(output(await rpc('suenos_agent_list_tasks',{p_account:a.account_id||null,p_rep:a.rep_id||null,p_due_before:a.due_before||null,p_open:a.open_only,p_limit:a.limit,p_offset:a.offset})));
      if(tool==='crm_sales_summary')return json({system:'crm',summary:await rpc('suenos_agent_sales_summary',{p_from:a.from_month,p_to:a.to_month,p_account:a.account_id||null})});
      if(tool==='agent_change_log')return json(output(await list('suenos_agent_audit','id,action,target_id,request_key,created_at',a,{actor_id:`eq.${session.user_id}`,order:'created_at.desc,id.desc'})));
      if(tool==='crm_account_history'){
        const accounts=await db(`accounts?${query({id:`eq.${a.account_id}`,deleted_at:'is.null',select:'id,name,type,status,region,province,city,assigned_rep,contact,email,phone,notes,last_visit,last_order'})}`);if(!accounts?.length)throw new BridgeError('Account not found.',404);
        const [visits,orders,tasks]=await Promise.all([
          list('visits','id,date,type,notes,outcome,follow_up_date,rep_id',a,{account_id:`eq.${a.account_id}`,order:'date.desc,id.asc'}),
          list('orders','id,product_id,bottles,status,requested_date,created_at,rep_id',a,{account_id:`eq.${a.account_id}`,order:'created_at.desc,id.asc'}),
          rpc('suenos_agent_list_tasks',{p_account:a.account_id,p_rep:null,p_due_before:null,p_open:true,p_limit:a.limit,p_offset:a.offset})
        ]);
        return json({system:'crm',account:accounts[0],visits,orders,tasks,offset:a.offset,limit:a.limit,has_more:{visits:visits.length===a.limit,orders:orders.length===a.limit,tasks:tasks.length===a.limit},note:'These are recorded activities and orders. Read all pages before claiming a complete history.'});
      }
      const action=tool==='crm_create_task'?'create':'update';
      return json(await rpc('suenos_agent_write_task',{p_actor:session.user_id,p_connection:session.connection_id,p_request_key:a.request_key,p_request_hash:await sha(stable({action,args:a})),p_action:action,p_payload:a}));
    }catch(error){return json({error:error instanceof BridgeError?error.message:'The CRM connection could not complete this request.'},error instanceof BridgeError?error.status:503);}
  };
}
