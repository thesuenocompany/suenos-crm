import { z } from 'zod';

const CRM_URL='https://dowfjjthshbbgnvwxzjv.supabase.co';
const SESSION_URL='https://os.thesuenocompany.com/api/agent/session';
const id=z.string().uuid(),crmId=z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T00:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s;});
const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const page={limit:z.number().int().min(1).max(100).default(30),offset:z.number().int().min(0).max(100000).default(0)};
const filter=z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} '\-]+$/u);
// Region/type/city can contain "/", "&", "." (e.g. "Kelowna / Okanagan").
const label=z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} '\/&.\-]+$/u);
const rangeKw=z.enum(['today','yesterday','this_week','this_month','last_month','last_7_days','last_30_days','last_90_days','quarter_to_date','year_to_date','all_time','custom']);
const range={range:rangeKw.optional(),from:date.optional(),to:date.optional()};
const fields={title:z.string().trim().min(1).max(240),notes:z.string().max(6000).nullable().optional(),due_date:date.nullable().optional(),rep_id:id.nullable().optional(),priority:z.enum(['low','medium','high']).default('medium')};

export const schemas={
  // ── existing tools (unchanged auth/shape), find_accounts extended with city/type/status/region ──
  crm_find_accounts:z.object({query:filter.optional(),province:filter.optional(),region:label.optional(),city:label.optional(),type:label.optional(),status:label.optional(),rep_id:id.optional(),...page}).strict(),
  crm_account_history:z.object({account_id:crmId,...page}).strict(),
  crm_list_reps:z.object(page).strict(),
  crm_list_tasks:z.object({account_id:crmId.optional(),rep_id:id.optional(),due_before:date.optional(),open_only:z.boolean().default(true),...page}).strict(),
  crm_sales_summary:z.object({from_month:month.optional(),to_month:month.optional(),...range,account_id:crmId.optional(),region:label.optional(),rep_id:id.optional(),type:label.optional(),compare:z.boolean().default(true)}).strict(),
  crm_create_task:z.object({request_key:id,account_id:crmId,...fields,source_url:z.string().url().max(2000).refine(s=>s.startsWith('https://')).optional()}).strict(),
  crm_update_task:z.object({request_key:id,task_id:crmId,expected_snapshot:z.string().regex(/^[a-f0-9]{32}$/),changes:z.object({...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.optional()])),done:z.boolean().optional()}).strict().refine(x=>Object.keys(x).length>0)}).strict(),
  agent_change_log:z.object(page).strict(),
  // ── new Phase 1 read tools ──
  crm_account_summary:z.object({account_id:crmId}).strict(),
  crm_account_health:z.object({account_id:crmId}).strict(),
  crm_orders:z.object({...range,account_id:crmId.optional(),rep_id:id.optional(),region:label.optional(),kind:z.enum(['all','new_listing','reorder']).default('all'),...page}).strict(),
  crm_visits:z.object({...range,account_id:crmId.optional(),rep_id:id.optional(),region:label.optional(),...page}).strict(),
  crm_reorders:z.object({region:label.optional(),rep_id:id.optional(),overdue_only:z.boolean().default(false),single_order_only:z.boolean().default(false),...page}).strict(),
  crm_listings:z.object({kind:z.enum(['new','active','new_no_reorder']).default('new'),...range,region:label.optional(),rep_id:id.optional(),...page}).strict(),
  crm_followups:z.object({bucket:z.enum(['overdue','today','upcoming','all']).default('overdue'),rep_id:id.optional(),region:label.optional(),account_id:crmId.optional(),...page}).strict(),
  crm_rep_activity:z.object({...range,rep_id:id.optional(),region:label.optional()}).strict(),
  crm_attention:z.object({region:label.optional(),rep_id:id.optional(),limit:z.number().int().min(1).max(100).default(20)}).strict()
};
const writeTools=new Set(['crm_create_task','crm_update_task']);
const query=values=>new URLSearchParams(Object.entries(values).filter(([,v])=>v!==undefined&&v!==null)).toString();
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
class BridgeError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function stable(value){if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;return JSON.stringify(value);}
async function sha(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}

// ── Server-side natural date resolution. Always echoes the exact range used. ──
function resolveRange(a){
  const now=new Date();
  const base=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  const iso=x=>x.toISOString().slice(0,10);
  const minus=n=>{const y=new Date(base);y.setUTCDate(y.getUTCDate()-n);return y;};
  let from,to; let kw=a.range||((a.from||a.to)?'custom':'this_month');
  switch(kw){
    case 'today': from=base;to=base;break;
    case 'yesterday': from=minus(1);to=minus(1);break;
    case 'this_week': from=minus((base.getUTCDay()+6)%7);to=base;break;
    case 'last_7_days': from=minus(6);to=base;break;
    case 'last_30_days': from=minus(29);to=base;break;
    case 'last_90_days': from=minus(89);to=base;break;
    case 'this_month': from=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),1));to=base;break;
    case 'last_month': from=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()-1,1));to=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),0));break;
    case 'quarter_to_date': from=new Date(Date.UTC(base.getUTCFullYear(),Math.floor(base.getUTCMonth()/3)*3,1));to=base;break;
    case 'year_to_date': from=new Date(Date.UTC(base.getUTCFullYear(),0,1));to=base;break;
    case 'all_time': from=null;to=null;break;
    case 'custom': from=a.from?new Date(a.from+'T00:00:00Z'):null;to=a.to?new Date(a.to+'T00:00:00Z'):null;break;
    default: from=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),1));to=base;kw='this_month';
  }
  return {keyword:kw,from:from?iso(from):null,to:to?iso(to):null};
}
const shiftMonth=(m,n)=>{const[y,mm]=m.split('-').map(Number);const d=new Date(Date.UTC(y,mm-1+n,1));return d.toISOString().slice(0,7);};
const monthSpan=(a,b)=>{const[ay,am]=a.split('-').map(Number),[by,bm]=b.split('-').map(Number);return (by-ay)*12+(bm-am)+1;};

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
      const outputR=(records,resolved)=>({system:'crm',resolved_range:resolved,records,offset:a.offset,limit:a.limit,has_more:records.length===a.limit});

      // ── existing tools ──
      if(tool==='crm_find_accounts')return json(output(await list('accounts','id,name,type,region,province,city,assigned_rep,status,last_visit,last_order',a,{name:a.query?`ilike.*${a.query}*`:undefined,province:a.province?`eq.${a.province}`:undefined,region:a.region?`eq.${a.region}`:undefined,city:a.city?`ilike.*${a.city}*`:undefined,type:a.type?`eq.${a.type}`:undefined,status:a.status?`eq.${a.status}`:undefined,assigned_rep:a.rep_id?`eq.${a.rep_id}`:undefined,deleted_at:'is.null',order:'name.asc,id.asc'})));
      if(tool==='crm_list_reps')return json(output(await list('profiles','id,name,role,region',a,{active:'eq.true',order:'name.asc,id.asc'})));
      if(tool==='crm_list_tasks')return json(output(await rpc('suenos_agent_list_tasks',{p_account:a.account_id||null,p_rep:a.rep_id||null,p_due_before:a.due_before||null,p_open:a.open_only,p_limit:a.limit,p_offset:a.offset})));
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

      // ── new read tools ──
      if(tool==='crm_account_summary'){const s=await rpc('suenos_agent_account_summary',{p_account:a.account_id});if(s===null)throw new BridgeError('Account not found.',404);return json({system:'crm',account:s});}
      if(tool==='crm_account_health'){const s=await rpc('suenos_agent_account_health',{p_account:a.account_id});if(s===null)throw new BridgeError('Account not found.',404);return json({system:'crm',account_id:a.account_id,health:s});}
      if(tool==='crm_reorders')return json(output(await rpc('suenos_agent_reorders',{p_region:a.region||null,p_rep:a.rep_id||null,p_overdue_only:a.overdue_only,p_single_order_only:a.single_order_only,p_limit:a.limit,p_offset:a.offset})));
      if(tool==='crm_followups')return json(output(await rpc('suenos_agent_followups',{p_bucket:a.bucket,p_rep:a.rep_id||null,p_region:a.region||null,p_account:a.account_id||null,p_limit:a.limit,p_offset:a.offset})));
      if(tool==='crm_attention')return json({system:'crm',records:await rpc('suenos_agent_attention',{p_limit:a.limit,p_region:a.region||null,p_rep:a.rep_id||null}),note:'Each item includes the factual reason it was surfaced. next_action is only populated when the CRM already records one.'});
      if(tool==='crm_orders'){const rg=resolveRange(a);return json(outputR(await rpc('suenos_agent_orders',{p_from:rg.from,p_to:rg.to,p_account:a.account_id||null,p_rep:a.rep_id||null,p_region:a.region||null,p_kind:a.kind,p_limit:a.limit,p_offset:a.offset}),rg));}
      if(tool==='crm_visits'){const rg=resolveRange(a);return json(outputR(await rpc('suenos_agent_visits',{p_from:rg.from,p_to:rg.to,p_account:a.account_id||null,p_rep:a.rep_id||null,p_region:a.region||null,p_limit:a.limit,p_offset:a.offset}),rg));}
      if(tool==='crm_listings'){const rg=resolveRange(a);return json(outputR(await rpc('suenos_agent_listings',{p_kind:a.kind,p_from:rg.from,p_to:rg.to,p_region:a.region||null,p_rep:a.rep_id||null,p_limit:a.limit,p_offset:a.offset}),rg));}
      if(tool==='crm_rep_activity'){const rg=resolveRange(a);if(!rg.from||!rg.to)throw new BridgeError('Rep activity needs a bounded date range (not all_time).');return json({system:'crm',resolved_range:rg,records:await rpc('suenos_agent_rep_activity',{p_from:rg.from,p_to:rg.to,p_rep:a.rep_id||null,p_region:a.region||null}),note:'activity = effort (visits, tastings); outcomes = results (listings, reorders, bottles).'});}
      if(tool==='crm_sales_summary'){
        let fromM=a.from_month,toM=a.to_month,resolved=null;
        if(!fromM||!toM){const rg=resolveRange({range:a.range||'this_month',from:a.from,to:a.to});if(!rg.from||!rg.to)throw new BridgeError('Sales summary needs a month range.');fromM=rg.from.slice(0,7);toM=rg.to.slice(0,7);resolved=rg;}
        const args=r=>({p_from:r[0],p_to:r[1],p_account:a.account_id||null,p_region:a.region||null,p_rep:a.rep_id||null,p_type:a.type||null});
        const period=await rpc('suenos_agent_sales_summary',args([fromM,toM]));
        let previous=null,comparison=null;
        if(a.compare!==false){const span=monthSpan(fromM,toM);const pf=shiftMonth(fromM,-span),pt=shiftMonth(toM,-span);previous=await rpc('suenos_agent_sales_summary',args([pf,pt]));comparison={previous_from:pf,previous_to:pt,bottles_delta:(period.bottles||0)-(previous.bottles||0),recorded_revenue_delta:(period.recorded_revenue||0)-(previous.recorded_revenue||0)};}
        return json({system:'crm',resolved_range:resolved||{from_month:fromM,to_month:toM},period,previous,comparison,note:'Recorded monthly sales only; purchase orders are separate. Deltas compare the equivalent previous period.'});
      }

      // ── writes ──
      const action=tool==='crm_create_task'?'create':'update';
      return json(await rpc('suenos_agent_write_task',{p_actor:session.user_id,p_connection:session.connection_id,p_request_key:a.request_key,p_request_hash:await sha(stable({action,args:a})),p_action:action,p_payload:a}));
    }catch(error){return json({error:error instanceof BridgeError?error.message:'The CRM connection could not complete this request.'},error instanceof BridgeError?error.status:503);}
  };
}
