// PART 2-B: Login, Sidebar, Header, Layout, Dashboards (using SVG charts)

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const { dispatch } = useApp();
  const [sel, setSel] = useState(null);
  const roles = [
    { u:INIT_USERS[0], label:'Administrator',          desc:'Full system access, reporting & management', icon:'settings', bg:'bg-teal-600'  },
    { u:INIT_USERS[1], label:'Sales Rep - Vancouver',  desc:'Jordan Rivera · Vancouver territory',        icon:'accounts', bg:'bg-blue-500'   },
    { u:INIT_USERS[2], label:'Sales Rep - Calgary',    desc:'Sam Chen · Calgary territory',               icon:'accounts', bg:'bg-emerald-500'},
    { u:INIT_USERS[3], label:'Brand Ambassador',       desc:'Aria Vega · Tastings & activations',         icon:'tastings', bg:'bg-purple-500' },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 mb-4 shadow-xl">
            <span className="text-3xl font-black text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Suenos Tequila</h1>
          <p className="text-slate-400 text-sm mt-1">Sales & CRM Platform</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-slate-400 mb-4 text-center">Select your role to continue</p>
          <div className="space-y-2">
            {roles.map(r=>(
              <button key={r.u.id} onClick={()=>setSel(r.u.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${sel===r.u.id?'border-teal-600 bg-teal-600/15':'border-white/10 hover:border-white/20 hover:bg-white/5'}`}>
                <div className={`w-9 h-9 rounded-xl ${r.bg} flex items-center justify-center flex-shrink-0`}>
                  <Ic n={r.icon} cls="w-4 h-4 text-white"/>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{r.label}</p>
                  <p className="text-xs text-slate-400 truncate">{r.desc}</p>
                </div>
                {sel===r.u.id && <Ic n="check" cls="w-4 h-4 text-teal-400 ml-auto flex-shrink-0"/>}
              </button>
            ))}
          </div>
          <button disabled={!sel} onClick={()=>{ const u=INIT_USERS.find(u=>u.id===sel); dispatch({type:'LOGIN',payload:u}); }}
            className="mt-4 w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg">
            Sign In
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-4">Demo — all data is sample</p>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV_CFG = {
  admin: [
    { s:'Main',       items:[{v:'dashboard',n:'dashboard',l:'Dashboard'},{v:'accounts',n:'accounts',l:'Accounts'},{v:'visits',n:'visits',l:'Visits'},{v:'tasks',n:'tasks',l:'Tasks'}] },
    { s:'Sales',      items:[{v:'orders',n:'orders',l:'Orders'},{v:'trade-leads',n:'accounts',l:'Trade Leads'},{v:'menu-placements',n:'menu',l:'Menu Placements'},{v:'tastings',n:'tastings',l:'Tastings'},{v:'calendar',n:'calendar',l:'Events Calendar'},{v:'sampling-request',n:'mail',l:'Sampling Request'}] },
    { s:'Management', items:[{v:'products',n:'products',l:'Products'},{v:'stores',n:'stores',l:'Fulfillment Stores'},{v:'sales-import',n:'download',l:'Sales Import'},{v:'targets',n:'targets',l:'Targets'},{v:'users',n:'users',l:'Users'},{v:'retail-pricing',n:'tag',l:'Retail Pricing'},{v:'licenses-admin',n:'accounts',l:'BC Licences Upload'},{v:'dashboard-email',n:'mail',l:'Dashboard Email'}] },
    { s:'Analytics',  items:[{v:'reports',n:'reports',l:'Reports'},{v:'map',n:'map',l:'Account Map'}] },
    { s:'Prospecting', items:[{v:'licence-prospects',n:'accounts',l:'Licence Prospects'}] },
  ],
  rep: [
    { s:'Main',  items:[{v:'dashboard',n:'dashboard',l:'Dashboard'},{v:'accounts',n:'accounts',l:'Accounts'},{v:'visits',n:'visits',l:'Visits'},{v:'tasks',n:'tasks',l:'Tasks'}] },
    { s:'Sales', items:[{v:'orders',n:'orders',l:'Orders'},{v:'menu-placements',n:'menu',l:'Menu Placements'},{v:'calendar',n:'calendar',l:'Events Calendar'},{v:'sampling-request',n:'mail',l:'Sampling Request'}] },
    { s:'More',  items:[{v:'reports',n:'reports',l:'Reports'},{v:'map',n:'map',l:'Account Map'}] },
    { s:'Prospecting', items:[{v:'licence-prospects',n:'accounts',l:'Licence Prospects'}] },
  ],
  ambassador: [
    { s:'Main', items:[{v:'dashboard',n:'dashboard',l:'Dashboard'},{v:'tastings',n:'tastings',l:'Tastings'},{v:'calendar',n:'calendar',l:'Events Calendar'},{v:'accounts',n:'accounts',l:'Accounts'}] },
    { s:'Forms', items:[{v:'sampling-request',n:'mail',l:'Sampling Request'}] },
  ],
};

function Sidebar({ mobile, onClose }) {
  const { state, dispatch } = useApp();
  const nav = NAV_CFG[state.user?.role] || NAV_CFG.rep;
  const go = v => { dispatch({type:'NAV',view:v}); if(mobile) onClose(); };
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-black text-white">S</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white leading-tight">Suenos Tequila</p>
          <p className="text-xs text-slate-400">CRM Platform</p>
        </div>
        {mobile && <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><Ic n="x" cls="w-4 h-4"/></button>}
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {nav.map(sec=>(
          <div key={sec.s}>
            <p className="px-3 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-widest">{sec.s}</p>
            {sec.items.map(it=>(
              <button key={it.v} onClick={()=>go(it.v)}
                className={`sidebar-link w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${state.view===it.v?'active text-teal-400 font-medium':'text-slate-300'}`}>
                <Ic n={it.n} cls="w-4 h-4 flex-shrink-0"/>
                {it.l}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{state.user?.initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{state.user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{state.user?.role}</p>
          </div>
          <button onClick={()=>dispatch({type:'LOGOUT'})} className="p-1 text-slate-500 hover:text-slate-300 transition" title="Sign out">
            <Ic n="x" cls="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
const VL = { dashboard:'Dashboard', accounts:'Accounts', visits:'Visits', tasks:'Tasks', orders:'Orders', 'menu-placements':'Menu Placements', tastings:'Tastings', calendar:'Events Calendar', products:'Products', stores:'Fulfillment Stores', 'sales-import':'Sales Import', targets:'Targets', users:'Team & Settings', reports:'Reports', map:'Account Map', 'trade-leads':'Trade Leads', 'account-detail':'Account', 'new-account':'New Account', 'new-visit':'Log Visit', 'new-order':'New Order', 'new-tasting':'New Tasting', 'sampling-request':'Sampling Request',
  'order-promo':'Order Promotional Materials', 'my-promo-orders':'My Promotional Material Orders',
  'manage-promo':'Manage Promotional Materials', 'promo-orders-admin':'Promotional Material Orders',
  'manage-promo-categories':'Manage Promotional Material Categories',
  'promo-reporting':'Promotional Material Reporting' };

function Header({ onMenuClick }) {
  const { state, dispatch } = useApp();
  return (
    <div className="h-14 flex items-center justify-between px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <Ic n="bars" cls="w-5 h-5"/>
        </button>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{VL[state.view]||state.view}</h1>
      </div>
      <button onClick={()=>dispatch({type:'TOGGLE_NEON'})} title={state.neonMode?'Exit Neon Nights':'Enter Neon Nights'} className={`p-2 rounded-lg transition ${state.neonMode?'neon-icon-glow':'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
        <Ic n="moon" cls="w-4 h-4"/>
      </button>
    </div>
  );
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────
function Layout({ children }) {
  const { state, dispatch } = useApp();
  const [drawer, setDrawer] = useState(false);
  const mNav = [{v:'dashboard',n:'dashboard',l:'Home'},{v:'accounts',n:'accounts',l:'Accounts'},{v:'visits',n:'visits',l:'Visits'},{v:'orders',n:'orders',l:'Orders'},{v:'tasks',n:'tasks',l:'Tasks'}];
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <div className="hidden lg:flex flex-col w-56 flex-shrink-0">
        <Sidebar/>
      </div>
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setDrawer(false)}/>
          <div className="relative w-56 flex-shrink-0 fade-in"><Sidebar mobile onClose={()=>setDrawer(false)}/></div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={()=>setDrawer(true)}/>
        <main className="flex-1 overflow-y-auto">
          {state.notice?.active && state.notice?.text && (
            <div style={{background:'linear-gradient(135deg,#3c9ca8 0%,#1e4048 50%,#3c9ca8 100%)',borderBottom:'1px solid rgba(228,191,112,0.2)',boxShadow:'0 2px 12px rgba(23,52,58,0.35)'}}>
              <div className="px-5 py-3 flex items-start gap-3">
                <span style={{fontSize:18,flexShrink:0,marginTop:1,color:'#E4BF70'}}>✦</span>
                <div>
                  <p style={{fontSize:10,fontWeight:800,letterSpacing:'0.12em',color:'#E4BF70',textTransform:'uppercase',marginBottom:2}}>The Distillery Has Entered the Chat</p>
                  <p className="text-sm leading-relaxed" style={{color:'rgba(228,191,112,0.75)'}}>{state.notice.text}</p>
                </div>
              </div>
            </div>
          )}
          <div className="fade-in">{children}</div>
        </main>
        <div className="lg:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="flex">
            {mNav.map(it=>(
              <button key={it.v} onClick={()=>dispatch({type:'NAV',view:it.v})}
                className={`flex-1 flex flex-col items-center py-2 transition-colors ${state.view===it.v?'text-teal-600':'text-gray-400'}`}>
                <Ic n={it.n} cls="w-5 h-5"/>
                <span className="text-xs mt-0.5 font-medium">{it.l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TRADE LEADS NEEDING ATTENTION (dashboard alert) ─────────────────────────
// In-app alert surfacing trade inquiries that fell through to the House Account,
// or are flagged manual_review / not_distributed, and haven't been reviewed yet.
function TradeLeadsAlert() {
  const { state, dispatch } = useApp();
  const [leads, setLeads] = useState([]);
  const [busy, setBusy]   = useState(null);
  const [assigning, setAssigning] = useState(null);
  const reps = (state.users||[]).filter(u=>u.role==='rep' && u.active!==false);

  const load = async () => {
    try {
      const { data, error } = await sb.from('trade_leads')
        .select('id,account_id,business_name,province,scenario,assignment_source,assigned_rep,created_at')
        .is('reviewed_at', null)
        .or('manual_review_needed.eq.true,scenario.in.(manual_review,not_distributed),assignment_source.eq.house_account_fallback')
        .order('created_at', { ascending:false })
        .limit(50);
      if (error) { setLeads([]); return; }
      setLeads(data || []);
    } catch (e) { setLeads([]); }
  };
  useEffect(() => { load(); }, []);

  if (!leads.length) return null;

  const repName = id => { const u=(state.users||[]).find(x=>x.id===id); return u ? u.name : null; };
  const tag = l => l.assignment_source==='house_account_fallback' ? 'House Account'
    : l.scenario==='not_distributed' ? 'Not distributed'
    : l.scenario==='manual_review' ? 'Manual review' : 'Needs attention';
  const goto = id => id && dispatch({type:'NAV',view:'account-detail',params:{id}});

  const markReviewed = async (id) => {
    setBusy(id);
    try {
      await sb.from('trade_leads').update({ reviewed_at:new Date().toISOString(), reviewed_by: state.user?.id || null }).eq('id', id);
      setLeads(ls => ls.filter(l => l.id !== id));
    } catch (e) {}
    setBusy(null);
  };

  const assign = async (leadId, repId) => {
    if (!repId) return;
    setAssigning(leadId);
    try {
      const { data, error } = await sb.functions.invoke('trade-assign', { body:{ leadId, repId } });
      if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Assign failed');
      setLeads(ls => ls.filter(l => l.id !== leadId));
      showToast(dispatch, 'Lead assigned — rep notified');
    } catch (e) { showToast(dispatch, 'Assign failed: '+(e.message||e), 'error'); }
    setAssigning(null);
  };

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Trade Leads Needing Attention ({leads.length})
          </h2>
        </div>
        <button onClick={load} className="text-xs text-amber-700 dark:text-amber-300 underline">Refresh</button>
      </div>
      <div className="space-y-2">
        {leads.map(l => (
          <div key={l.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>goto(l.account_id)}>
              <p className="text-sm font-semibold truncate">{l.business_name||'(no name)'}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {(l.province||'')}{l.assigned_rep&&repName(l.assigned_rep)?` · ${repName(l.assigned_rep)}`:''} · {new Date(l.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-200 text-amber-900 whitespace-nowrap">{tag(l)}</span>
            {l.account_id && <button onClick={()=>goto(l.account_id)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">View</button>}
            <select disabled={assigning===l.id} value="" onChange={e=>assign(l.id, e.target.value)}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 max-w-[130px]">
              <option value="">{assigning===l.id?'Assigning…':'Assign to…'}</option>
              {reps.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button disabled={busy===l.id} onClick={()=>markReviewed(l.id)} className="text-xs font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap disabled:opacity-50">
              {busy===l.id?'…':'Mark reviewed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN: ALL TRADE LEADS (new + historical) ───────────────────────────────
function TradeLeadsView() {
  const { state, dispatch } = useApp();
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');
  const [fScenario, setFScenario] = useState('');
  const [fRep, setFRep]       = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fState, setFState]   = useState('all'); // all | open | reviewed
  const [busy, setBusy]       = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await sb.from('trade_leads')
        .select('id,account_id,business_name,first_name,last_name,email,phone,province,city,inquiry_type,scenario,assignment_source,assigned_rep,status,manual_review_needed,reviewed_at,created_at')
        .order('created_at', { ascending:false }).limit(1000);
      setLeads(data || []);
    } catch (e) { setLeads([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const reps    = (state.users||[]).filter(u=>u.role==='rep' && u.active!==false);
  const repName = id => { const u=(state.users||[]).find(x=>x.id===id); return u ? u.name : null; };
  const ownerLabel = l => l.assignment_source==='house_account_fallback' ? 'House Account'
    : (repName(l.assigned_rep) || (l.assigned_rep ? 'Unknown' : '—'));
  const goto = id => id && dispatch({type:'NAV',view:'account-detail',params:{id}});
  const fmt = d => { try { return new Date(d).toLocaleDateString(); } catch (e) { return ''; } };

  const scenarios = ['local','provincial','national','manual_review','not_distributed'];
  const statuses  = [...new Set(leads.map(l=>l.status).filter(Boolean))];

  const filtered = leads.filter(l => {
    if (fScenario && l.scenario !== fScenario) return false;
    if (fStatus && l.status !== fStatus) return false;
    if (fRep) { if (fRep==='__unassigned') { if (l.assigned_rep) return false; } else if (l.assigned_rep !== fRep) return false; }
    if (fState==='open' && l.reviewed_at) return false;
    if (fState==='reviewed' && !l.reviewed_at) return false;
    if (q) { const s=`${l.business_name||''} ${l.first_name||''} ${l.last_name||''} ${l.email||''} ${l.city||''} ${l.province||''}`.toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  });

  const toggleReviewed = async (l) => {
    setBusy(l.id);
    try {
      const nv = l.reviewed_at ? null : new Date().toISOString();
      await sb.from('trade_leads').update({ reviewed_at: nv, reviewed_by: nv ? (state.user?.id||null) : null }).eq('id', l.id);
      setLeads(ls => ls.map(x => x.id===l.id ? {...x, reviewed_at: nv} : x));
    } catch (e) { showToast(dispatch, 'Update failed', 'error'); }
    setBusy(null);
  };

  const assign = async (leadId, repId) => {
    if (!repId) return;
    setBusy(leadId);
    try {
      const { data, error } = await sb.functions.invoke('trade-assign', { body:{ leadId, repId } });
      if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Assign failed');
      setLeads(ls => ls.map(x => x.id===leadId ? {...x, assigned_rep: repId, assignment_source:'manual', reviewed_at:new Date().toISOString()} : x));
      showToast(dispatch, 'Lead assigned — rep notified');
    } catch (e) { showToast(dispatch, 'Assign failed: '+(e.message||e), 'error'); }
    setBusy(null);
  };

  const selCls = 'text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800';

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Trade Leads</h2>
        <button onClick={load} className="text-sm text-teal-600 dark:text-teal-400 underline">Refresh</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search business, contact, email…" className={selCls+' flex-1 min-w-[180px]'} />
        <select value={fState} onChange={e=>setFState(e.target.value)} className={selCls}>
          <option value="all">All</option><option value="open">Open (unreviewed)</option><option value="reviewed">Reviewed</option>
        </select>
        <select value={fScenario} onChange={e=>setFScenario(e.target.value)} className={selCls}>
          <option value="">All scenarios</option>{scenarios.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fRep} onChange={e=>setFRep(e.target.value)} className={selCls}>
          <option value="">All owners</option><option value="__unassigned">Unassigned</option>{reps.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {statuses.length>0 && <select value={fStatus} onChange={e=>setFStatus(e.target.value)} className={selCls}>
          <option value="">All statuses</option>{statuses.map(s=><option key={s} value={s}>{s}</option>)}
        </select>}
      </div>

      <p className="text-xs text-gray-500">{loading ? 'Loading…' : `${filtered.length} of ${leads.length} leads`}</p>

      <div className="space-y-2">
        {filtered.map(l => (
          <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-[160px] cursor-pointer" onClick={()=>goto(l.account_id)}>
              <p className="text-sm font-semibold truncate">{l.business_name||'(no name)'} {l.reviewed_at && <span className="text-[10px] text-green-600">✓ reviewed</span>}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {`${l.first_name||''} ${l.last_name||''}`.trim()}{l.email?` · ${l.email}`:''}{l.city?` · ${l.city}`:''} {l.province||''} · {fmt(l.created_at)}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 whitespace-nowrap">{l.scenario||'—'}</span>
            <span className="text-[11px] text-gray-600 dark:text-gray-300 whitespace-nowrap">👤 {ownerLabel(l)}</span>
            {l.account_id && <button onClick={()=>goto(l.account_id)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">View</button>}
            <select disabled={busy===l.id} value="" onChange={e=>assign(l.id, e.target.value)} className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 max-w-[120px]">
              <option value="">{busy===l.id?'…':'Assign…'}</option>
              {reps.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button disabled={busy===l.id} onClick={()=>toggleReviewed(l)} className="text-xs font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap disabled:opacity-50">
              {l.reviewed_at ? 'Reopen' : 'Mark reviewed'}
            </button>
          </div>
        ))}
        {!loading && filtered.length===0 && <p className="text-sm text-gray-500 py-8 text-center">No trade leads match your filters.</p>}
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard() {
  const { state, dispatch } = useApp();
  const { visits, orders, accounts, sales, users, targets, tasks } = state;
  const now = new Date();
  const thisMonth = now.toISOString().slice(0,7);
  const sevenAgo  = new Date(now-7*86400000).toISOString().slice(0,10);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [fRange,  setFRange]  = useState('this-month');
  const [fRep,    setFRep]    = useState('');
  const [fRegion, setFRegion] = useState('');

  const reps      = users.filter(u=>u.role==='rep'&&u.active!==false);
  const _rNames   = state.regions?.length ? state.regions.map(r=>r.name) : REGIONS;
  const hasFilter = fRange!=='this-month' || fRep || fRegion;

  // Derive date bounds from range selector
  const { startMonth, endMonth, startDay, endDay, label: rangeLabel } = useMemo(()=>{
    const pad = n => String(n).padStart(2,'0');
    const ym  = (y,m) => `${y}-${pad(m)}`;
    const ymd = d => d.toISOString().slice(0,10);
    const y=now.getFullYear(), m=now.getMonth()+1;
    if (fRange==='last-7') {
      const s = new Date(now-7*86400000);
      return { startMonth:ymd(s).slice(0,7), endMonth:thisMonth, startDay:ymd(s), endDay:ymd(now), label:'Last 7 Days' };
    }
    if (fRange==='last-month') {
      const d=new Date(now); d.setDate(1); d.setMonth(d.getMonth()-1);
      const sm=ym(d.getFullYear(),d.getMonth()+1);
      const lastDay=new Date(d.getFullYear(),d.getMonth()+1,0);
      return { startMonth:sm, endMonth:sm, startDay:`${sm}-01`, endDay:ymd(lastDay), label:'Last Month' };
    }
    if (fRange==='this-month')  return { startMonth:thisMonth, endMonth:thisMonth, startDay:null, endDay:null, label:'This Month' };
    if (fRange==='last-3')  { const d=new Date(now); d.setMonth(d.getMonth()-2); return { startMonth:ym(d.getFullYear(),d.getMonth()+1), endMonth:thisMonth, startDay:null, endDay:null, label:'Last 3 Months' }; }
    if (fRange==='last-6')  { const d=new Date(now); d.setMonth(d.getMonth()-5); return { startMonth:ym(d.getFullYear(),d.getMonth()+1), endMonth:thisMonth, startDay:null, endDay:null, label:'Last 6 Months' }; }
    if (fRange==='last-12') { const d=new Date(now); d.setMonth(d.getMonth()-11); return { startMonth:ym(d.getFullYear(),d.getMonth()+1), endMonth:thisMonth, startDay:null, endDay:null, label:'Last 12 Months' }; }
    if (fRange==='ytd')     return { startMonth:ym(y,1), endMonth:thisMonth, startDay:null, endDay:null, label:'Year to Date' };
    return { startMonth:'2000-01', endMonth:'2999-12', startDay:null, endDay:null, label:'All Time' };
  }, [fRange, thisMonth]);

  // Filter helpers
  const accInRegion = a => !fRegion || a.region===fRegion;
  const accById     = id => accounts.find(a=>a.id===id);
  const inDateRange = m => m>=startMonth && m<=endMonth;
  const inDateRangeDay = d => {
    if (startDay) return d>=startDay && d<=endDay;
    const m=d.slice(0,7); return m>=startMonth && m<=endMonth;
  };

  // Filtered data sets
  const fSales = useMemo(()=> sales.filter(s=>
    inDateRange(s.month) &&
    (!fRep    || s.repId===fRep) &&
    (!fRegion || accInRegion(accById(s.accountId)))
  ), [sales, startMonth, endMonth, fRep, fRegion, accounts]);

  const fVisits = useMemo(()=> visits.filter(v=>
    inDateRangeDay(v.date) &&
    (!fRep    || v.repId===fRep) &&
    (!fRegion || accInRegion(accById(v.accountId)))
  ), [visits, startMonth, endMonth, fRep, fRegion, accounts]);

  const fOrders = useMemo(()=> orders.filter(o=>
    o.status!=='Cancelled' &&
    inDateRangeDay((o.requestedDate||o.createdAt||'')) &&
    (!fRep    || accounts.find(a=>a.id===o.accountId)?.assignedRep===fRep) &&
    (!fRegion || accInRegion(accById(o.accountId)))
  ), [orders, startMonth, endMonth, fRep, fRegion, accounts]);

  // ── Previous period (same length, immediately before current window) ──────────
  const { prevStartMonth, prevEndMonth, prevLabel } = useMemo(()=>{
    const toDate = ym => new Date(ym+'-01');
    const toYM   = d  => d.toISOString().slice(0,7);
    const numMonths = (parseInt(endMonth.slice(0,4))-parseInt(startMonth.slice(0,4)))*12
                    + (parseInt(endMonth.slice(5,7))-parseInt(startMonth.slice(5,7)))+1;
    const prevEnd   = new Date(toDate(startMonth)); prevEnd.setMonth(prevEnd.getMonth()-1);
    const prevStart = new Date(toDate(startMonth)); prevStart.setMonth(prevStart.getMonth()-numMonths);
    const lbl = numMonths===1 ? 'vs last month' : `vs prior ${numMonths}mo`;
    return { prevStartMonth:toYM(prevStart), prevEndMonth:toYM(prevEnd), prevLabel:lbl };
  }, [startMonth, endMonth]);

  const pctChange = (cur, prev) => prev===0 ? (cur>0?100:null) : Math.round(((cur-prev)/prev)*100);

  const prevSales = useMemo(()=> sales.filter(s=>
    s.month>=prevStartMonth && s.month<=prevEndMonth &&
    (!fRep    || s.repId===fRep) &&
    (!fRegion || accInRegion(accById(s.accountId)))
  ), [sales, prevStartMonth, prevEndMonth, fRep, fRegion, accounts]);

  const prevVisits = useMemo(()=> visits.filter(v=> {
    const vm=v.date.slice(0,7);
    return vm>=prevStartMonth && vm<=prevEndMonth &&
      (!fRep    || v.repId===fRep) &&
      (!fRegion || accInRegion(accById(v.accountId)));
  }), [visits, prevStartMonth, prevEndMonth, fRep, fRegion, accounts]);

  const prevOrders = useMemo(()=> orders.filter(o=> {
    const om=(o.requestedDate||o.createdAt||'').slice(0,7);
    return o.status!=='Cancelled' && om>=prevStartMonth && om<=prevEndMonth &&
      (!fRep    || accounts.find(a=>a.id===o.accountId)?.assignedRep===fRep) &&
      (!fRegion || accInRegion(accById(o.accountId)));
  }), [orders, prevStartMonth, prevEndMonth, fRep, fRegion, accounts]);

  // ── Derived metrics ───────────────────────────────────────────────────────────
  // Add imports + CRM orders directly (separate transactions — no dedup)
  const fOrdersDeduped = fOrders; // alias kept so downstream refs work
  const totalBottles  = fSales.reduce((s,x)=>s+x.bottles,0) + fOrders.reduce((s,o)=>s+(o.bottles||0),0);
  const totalRevenue  = fSales.reduce((s,x)=>s+x.revenue,0) + fOrders.reduce((s,o)=>{
    const p=state.products.find(x=>x.id===o.productId); return s+(o.bottles||0)*(p?.price||0);
  },0);
  const activeAccounts = accounts.filter(a=>(a.status==='Active'||a.status==='Listed')&&accInRegion(a)&&(!fRep||a.assignedRep===fRep));

  // ── Previous period derived metrics (for MoM / period-over-period indicators) ─
  const prevOrdersDeduped = prevOrders; // alias kept so downstream refs work
  const prevBottles  = prevSales.reduce((s,x)=>s+x.bottles,0) + prevOrders.reduce((s,o)=>s+(o.bottles||0),0);
  const prevRevenue  = prevSales.reduce((s,x)=>s+x.revenue,0) + prevOrders.reduce((s,o)=>{
    const p=state.products.find(x=>x.id===o.productId); return s+(o.bottles||0)*(p?.price||0);
  },0);
  const prevActiveAccounts = accounts.filter(a=>(a.status==='Active'||a.status==='Listed')&&accInRegion(a)&&(!fRep||a.assignedRep===fRep)).length;
  const trendVisits   = { pct: pctChange(fVisits.length, prevVisits.length), label: prevLabel };
  const trendBottles  = { pct: pctChange(totalBottles,   prevBottles),        label: prevLabel };
  const trendRevenue  = { pct: pctChange(totalRevenue,   prevRevenue),        label: prevLabel };
  const trendAccounts = { pct: pctChange(activeAccounts.length, prevActiveAccounts), label: prevLabel };

  // Trend — always 12 months, rep/region filtered but NOT date-range filtered
  const months12 = Array.from({length:12},(_,i)=>{ const d=new Date(now); d.setMonth(d.getMonth()-11+i); return d.toISOString().slice(0,7); });
  const trendSales  = sales.filter(s => (!fRep || s.repId===fRep) && (!fRegion || accInRegion(accById(s.accountId))));
  const trendOrders = orders.filter(o => o.status!=='Cancelled' && (!fRep || accounts.find(a=>a.id===o.accountId)?.assignedRep===fRep) && (!fRegion || accInRegion(accById(o.accountId))));
  const trendData = months12.map(m=>{
    const s = trendSales.filter(x=>x.month===m).reduce((a,x)=>a+x.bottles,0);
    const o = trendOrders.filter(x=>(x.requestedDate||x.createdAt||'').startsWith(m)).reduce((a,x)=>a+(x.bottles||0),0);
    return { month:m.slice(5), bottles: s+o };
  });

  // By region
  const PCOLS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6'];
  const regionData = _rNames.map(r=>({
    name:r.split('/')[0].trim().slice(0,9), region:r,
    bottles: fSales.filter(s=>accById(s.accountId)?.region===r).reduce((a,x)=>a+x.bottles,0)
           + fOrdersDeduped.filter(o=>accById(o.accountId)?.region===r).reduce((a,o)=>a+(o.bottles||0),0)
  })).filter(r=>r.bottles>0).sort((a,b)=>b.bottles-a.bottles).slice(0,6);

  // By product
  const prodData = state.products.map((p,i)=>({
    name:p.name.split(' ').pop(),
    value: fSales.filter(s=>s.productId===p.id).reduce((a,x)=>a+x.bottles,0)
         + fOrdersDeduped.filter(o=>o.productId===p.id).reduce((a,o)=>a+(o.bottles||0),0),
    fill:PCOLS[i%4]
  })).filter(p=>p.value>0);

  // Rep performance
  const repPerf = (fRep ? reps.filter(u=>u.id===fRep) : reps).map(u=>({
    name:u.name.split(' ')[0],
    bottles: fSales.filter(s=>s.repId===u.id).reduce((a,x)=>a+x.bottles,0)
           + fOrdersDeduped.filter(o=>accById(o.accountId)?.assignedRep===u.id).reduce((a,o)=>a+(o.bottles||0),0),
    revenue: fSales.filter(s=>s.repId===u.id).reduce((a,x)=>a+x.revenue,0),
    visits:  fVisits.filter(v=>v.repId===u.id).length,
  })).sort((a,b)=>b.bottles-a.bottles);
  const maxBtl = Math.max(...repPerf.map(r=>r.bottles),1);

  // Month drill-down
  const [selectedMonth, setSelectedMonth] = useState(null); // e.g. "01" (MM label from chart)

  // Map short label back to full YYYY-MM
  const selectedFullMonth = useMemo(()=>{
    if (!selectedMonth) return null;
    return months12.find(m=>m.slice(5)===selectedMonth) || null;
  }, [selectedMonth, months12]);

  const monthOrders = useMemo(()=>{
    if (!selectedFullMonth) return [];
    return trendOrders.filter(o=>(o.requestedDate||o.createdAt||'').startsWith(selectedFullMonth));
  }, [selectedFullMonth, trendOrders]);

  const monthSales = useMemo(()=>{
    if (!selectedFullMonth) return [];
    return trendSales.filter(s=>s.month===selectedFullMonth);
  }, [selectedFullMonth, trendSales]);

  // Overdue tasks (not filtered)
  const dueTasks = tasks.filter(t=>!t.done&&t.dueDate<=today());

  // Recent activity: orders + sales imports merged, filtered by date range
  const recentActivity = useMemo(()=>{
    const os = fOrders.map(o=>({ ...o, _type:'order', _date: o.createdAt?.slice(0,10)||'' }));
    const ss = fSales.map(s=>({ ...s, _type:'sale', _date: s.month+'-01', createdAt: s.month+'-01' }));
    return [...os, ...ss].sort((a,b)=>b._date.localeCompare(a._date)).slice(0,10);
  }, [fOrders, fSales]);

  // Upcoming tasting events
  const upcomingEvents = [...(state.tastingEvents||[])]
    .filter(e=>e.eventDate>=today())
    .sort((a,b)=>a.eventDate.localeCompare(b.eventDate)||(a.eventTime||'').localeCompare(b.eventTime||''))
    .slice(0,5);

  const selCls = "px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-teal-400";

  /* ── Agave watermark + seal SVGs inlined ── */
  const AgaveWatermark = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
      style={{position:'absolute',right:80,top:'50%',transform:'translateY(-50%)',width:180,height:180,opacity:0.13,pointerEvents:'none'}}>
      <g fill="none" stroke="#2D656F" strokeWidth="12" strokeLinejoin="round">
        <path d="M508.7,733.4 Q370.0,694.2 214.7,667.3 Q356.1,736.8 491.3,786.6 Z"/><path d="M514.0,735.8 Q361.6,654.2 188.2,580.0 Q339.2,693.0 486.0,784.2 Z"/><path d="M518.7,739.2 Q361.6,605.2 180.4,472.3 Q331.6,638.5 481.3,780.8 Z"/><path d="M522.7,743.5 Q377.1,552.7 206.1,355.5 Q340.8,579.0 477.3,776.5 Z"/><path d="M534.7,744.5 Q420.4,506.5 276.3,257.5 Q364.8,531.2 465.3,775.5 Z"/><path d="M537.2,752.1 Q471.4,479.0 378.4,187.8 Q411.9,491.7 462.8,767.9 Z"/><path d="M538.0,760.0 Q530.4,472.0 500.0,160.0 Q469.6,472.0 462.0,760.0 Z"/><path d="M537.2,767.9 Q588.1,491.7 621.6,187.8 Q528.6,479.0 462.8,752.1 Z"/><path d="M534.7,775.5 Q635.2,531.2 723.7,257.5 Q579.6,506.5 465.3,744.5 Z"/><path d="M522.7,776.5 Q659.2,579.0 793.9,355.5 Q622.9,552.7 477.3,743.5 Z"/><path d="M518.7,780.8 Q668.4,638.5 819.6,472.3 Q638.4,605.2 481.3,739.2 Z"/><path d="M514.0,784.2 Q660.8,693.0 811.8,580.0 Q638.4,654.2 486.0,735.8 Z"/><path d="M508.7,786.6 Q643.9,736.8 785.3,667.3 Q630.0,694.2 491.3,733.4 Z"/>
        <path d="M300 765 Q500 710 700 765"/>
      </g>
    </svg>
  );
  const HechoCon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
      style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',width:88,height:88,opacity:0.9,pointerEvents:'none'}}>
      <g fill="none" stroke="#E4BF70" strokeWidth="14">
        <circle cx="500" cy="500" r="420"/><circle cx="500" cy="500" r="330" strokeWidth="5"/>
      </g>
      <defs>
        <path id="dta" d="M 170,500 A 330,330 0 0,1 830,500"/>
        <path id="dba" d="M 830,500 A 330,330 0 0,1 170,500"/>
      </defs>
      <g fill="#E4BF70" fontFamily="Arial,sans-serif" fontWeight="700" letterSpacing="16">
        <text fontSize="66"><textPath href="#dta" startOffset="50%" textAnchor="middle">HECHO CON PASIÓN</textPath></text>
        <text fontSize="56"><textPath href="#dba" startOffset="50%" textAnchor="middle">JALISCO, MÉXICO</textPath></text>
      </g>
      <g fill="none" stroke="#E4BF70" strokeWidth="14" strokeLinejoin="round">
        <path d="M500 660 L500 310"/><path d="M500 610 L380 360"/><path d="M500 610 L620 360"/>
        <path d="M500 620 L310 450"/><path d="M500 620 L690 450"/>
        <path d="M500 650 L355 535"/><path d="M500 650 L645 535"/>
      </g>
      <circle cx="500" cy="700" r="10" fill="#E4BF70"/>
    </svg>
  );

  // Promo materials admin snapshot
  const pmOrders = state.promoOrders || [];
  const pmAwaiting = pmOrders.filter(o=>['Submitted','Under Review'].includes(o.status)).length;
  const pmLow = (state.promoMaterials||[]).filter(m=>m.inventoryTracking && m.quantityAvailable<=m.lowStockThreshold && m.quantityAvailable>0).length;
  const pmOut = (state.promoMaterials||[]).filter(m=>m.inventoryTracking && m.quantityAvailable<=0).length;
  const pmMonthCost = pmOrders.filter(o=>String(o.submittedAt||'').slice(0,7)===thisMonth)
    .reduce((s,o)=>s + o.items.reduce((t,i)=>t + i.unitCost*(i.quantityApproved!=null?i.quantityApproved:i.quantityRequested),0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto pb-24 lg:pb-6">

      {/* ── Brand Dashboard Header ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{background:'#3c9ca8',minHeight:100}}>
        <AgaveWatermark/>
        <HechoCon/>
        <div className="px-7 py-6 pr-28">
          <p className="text-[9px] font-bold uppercase tracking-[5px]" style={{color:'rgba(228,191,112,0.55)'}}>AGAVE FIELD MANUAL</p>
          <h1 className="text-3xl font-black uppercase tracking-widest leading-none mt-1" style={{fontFamily:"'Playfair Display', Georgia, serif",color:'#E4BF70'}}>DASHBOARD</h1>
          <p className="text-[9px] mt-2 uppercase tracking-[4px]" style={{color:'rgba(228,191,112,0.4)'}}>SIP SLOW · LIVE SUEÑOS</p>
        </div>
      </div>

      {/* Trade leads needing attention (House Account / manual review / not distributed) */}
      <TradeLeadsAlert/>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={fRange} onChange={e=>setFRange(e.target.value)} className={selCls}>
          <option value="last-7">Last 7 Days</option>
          <option value="last-month">Last Month</option>
          <option value="this-month">This Month</option>
          <option value="last-3">Last 3 Months</option>
          <option value="last-6">Last 6 Months</option>
          <option value="last-12">Last 12 Months</option>
          <option value="ytd">Year to Date</option>
          <option value="all">All Time</option>
        </select>
        <select value={fRep} onChange={e=>setFRep(e.target.value)} className={selCls}>
          <option value="">All Reps</option>
          {reps.map(u=><option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>)}
        </select>
        <select value={fRegion} onChange={e=>setFRegion(e.target.value)} className={selCls}>
          <option value="">All Regions</option>
          {_rNames.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        {hasFilter && (
          <button onClick={()=>{setFRange('this-month');setFRep('');setFRegion('');}}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 hover:border-red-300 transition">
            Clear
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{rangeLabel}{fRep?' · '+reps.find(u=>u.id===fRep)?.name.split(' ')[0]:''}{fRegion?' · '+fRegion:''}</span>
      </div>

      {/* Promo materials snapshot */}
      {(pmAwaiting>0 || pmLow>0 || pmOut>0 || pmMonthCost>0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Promo orders to review',pmAwaiting,'#f59e0b','promo-orders-admin'],['Low-stock items',pmLow,'#f97316','manage-promo'],['Out-of-stock',pmOut,'#ef4444','manage-promo'],['Promo cost this month','$'+pmMonthCost.toFixed(0),'#2E8A97','promo-reporting']].map(([l,v,c,view])=>(
            <button key={l} onClick={()=>dispatch({type:'NAV',view})} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-left hover:shadow-sm transition">
              <p className="text-xl font-black" style={{color:c}}>{v}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{l}</p>
            </button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Visits" value={fVisits.length} sub={rangeLabel} icon="visits" color="blue" onClick={()=>dispatch({type:'NAV',view:'visits'})} trend={trendVisits}/>
        <StatCard label="Bottles" value={totalBottles} sub={rangeLabel} icon="products" color="amber" onClick={()=>dispatch({type:'NAV',view:'orders'})} trend={trendBottles}/>
        <StatCard label="Revenue" value={fmtCurrency(totalRevenue)} sub={rangeLabel} icon="reports" color="emerald" onClick={()=>dispatch({type:'NAV',view:'reports'})} trend={trendRevenue}/>
        <StatCard label="Active Accounts" value={activeAccounts.length} sub={fRegion||'All regions'} icon="accounts" color="purple" onClick={()=>dispatch({type:'NAV',view:'accounts'})} trend={trendAccounts}/>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card cls="p-4 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Bottles Sold — 12 Month Trend</p>
            {selectedMonth && <button onClick={()=>setSelectedMonth(null)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕ {selectedMonth}</button>}
          </div>
          <AreaChart data={trendData} xKey="month" yKey="bottles" color="#2D656F" h={180}
            onPointClick={d=>setSelectedMonth(prev=>prev===d.month?null:d.month)}
            selectedX={selectedMonth}/>
          {selectedFullMonth && (
            <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
                {new Date(selectedFullMonth+'-15').toLocaleString('en-CA',{month:'long',year:'numeric'})} — {monthOrders.reduce((s,o)=>s+(o.bottles||0),0) + monthSales.reduce((s,x)=>s+x.bottles,0)} bottles
              </p>
              {monthSales.length > 0 && (
                <div className="space-y-1 mb-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Sales Imports</p>
                  {monthSales.map(s=>{
                    const acc=accounts.find(a=>a.id===s.accountId);
                    const prod=state.products.find(p=>p.id===s.productId);
                    return (
                      <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-blue-50 dark:bg-blue-900/10 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20"
                        onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:s.accountId}})}>
                        <span className="text-gray-700 dark:text-gray-300 truncate">{acc?.name||'Unknown'}</span>
                        <span className="text-gray-500 ml-2 flex-shrink-0">{prod?.name?.split(' ').pop()||''} · {s.bottles} btl{s.revenue>0?' · '+fmtCurrency(s.revenue):''}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {monthOrders.length > 0 && (
                <div className="space-y-1">
                  {monthSales.length > 0 && <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Orders</p>}
                  {monthOrders.map(o=>{
                    const acc=accounts.find(a=>a.id===o.accountId);
                    const prod=state.products.find(p=>p.id===o.productId);
                    const rev=(o.bottles||0)*(prod?.price||0);
                    return (
                      <div key={o.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:o.accountId}})}>
                        <span className="text-gray-700 dark:text-gray-300 truncate">{acc?.name||'Unknown'}</span>
                        <span className="text-gray-500 ml-2 flex-shrink-0">{prod?.name?.split(' ').pop()||''} · {o.bottles} btl{rev>0?' · '+fmtCurrency(rev):''}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {monthOrders.length===0 && monthSales.length===0 && (
                <p className="text-xs text-gray-400 text-center py-2">No records found for this month</p>
              )}
            </div>
          )}
        </Card>
        <Card cls="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Bottles by Product</p>
          <DonutChart data={prodData} h={200}/>
        </Card>
      </div>

      {/* Region + Reps + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card cls="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Bottles by Region</p>
            <p className="text-xs text-gray-400">Click to view accounts</p>
          </div>
          <BarChart data={regionData} xKey="name" yKey="bottles" color="#2D656F" h={180} horizontal={true} onBarClick={d=>dispatch({type:'NAV',view:'accounts',params:{region:d.region,salesOnly:true}})} />
        </Card>
        <Card cls="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Rep Performance — {rangeLabel}</p>
          <div className="space-y-4 mt-2">
            {repPerf.length===0
              ? <p className="text-xs text-gray-400 text-center py-4">No data</p>
              : repPerf.map((r,i)=>(
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{r.name}</span>
                    <span className="text-gray-400">{r.bottles} btl{r.revenue>0?` · ${fmtCurrency(r.revenue)}`:''} · {r.visits} visits</span>
                  </div>
                  <ProgressBar value={r.bottles} max={maxBtl} color="amber"/>
                </div>
              ))
            }
          </div>
        </Card>
        <Card cls="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Actions Due Today</p>
            <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">{dueTasks.length}</span>
          </div>
          {dueTasks.length===0
            ? <p className="text-xs text-gray-400 text-center py-6">All caught up!</p>
            : <div className="space-y-2">
                {dueTasks.slice(0,5).map(t=>{
                  const acc = accounts.find(a=>a.id===t.accountId);
                  return (
                    <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:t.accountId}})}>
                      <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority==='high'?'bg-red-500':t.priority==='medium'?'bg-teal-600':'bg-gray-400'}`}/>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
                        <p className="text-xs text-gray-400 truncate">{acc?.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Card>
      </div>

      {/* Recent Activity (orders + sales imports) */}
      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Recent Orders & Sales</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'orders'})}>View all</Btn>
        </div>
        {recentActivity.length===0
          ? <p className="text-xs text-gray-400 text-center py-4">No activity in this period</p>
          : <div className="space-y-1">
              {recentActivity.map(o=>{
                const acc  = accounts.find(a=>a.id===o.accountId);
                const prod = state.products.find(p=>p.id===o.productId);
                const isSale = o._type==='sale';
                const isComplete = isSale || o.status==='completed';
                const rev  = isSale ? (o.revenue||0) : (o.bottles||0) * (prod?.price||0);
                return (
                  <div key={o.id} className={`flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0 px-1 rounded transition ${isComplete ? 'opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    {/* Complete button — only for regular orders */}
                    {!isSale ? (
                      <button
                        onClick={e=>{ e.stopPropagation(); if(!isComplete) dbCompleteOrder(dispatch, o); }}
                        title={isComplete ? 'Completed' : 'Mark as completed'}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isComplete ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'}`}>
                        {isComplete && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                    ) : (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-500 text-white flex items-center justify-center">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:o.accountId}})}>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-medium truncate ${isComplete ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{acc?.name||'Unknown'}</p>
                        {isSale && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">Import</span>}
                        {!isSale && isComplete && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">Done</span>}
                      </div>
                      <p className="text-xs text-gray-400">{prod?.name||'Unknown product'} · {o.bottles} btl</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {rev>0 && <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{fmtCurrency(rev)}</p>}
                      <p className="text-xs text-gray-400">{o._date||o.createdAt?.slice(0,10)||''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </Card>

      {/* Upcoming Events */}
      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Events</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'calendar'})}>View calendar</Btn>
        </div>
        {upcomingEvents.length===0
          ? <p className="text-xs text-gray-400 text-center py-4">No upcoming events scheduled</p>
          : <div className="space-y-1">
              {upcomingEvents.map(evt=>{
                const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const parts = evt.eventDate.split('-');
                return (
                  <div key={evt.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded transition"
                    onClick={()=>dispatch({type:'NAV',view:'calendar'})}>
                    <div className="flex-shrink-0 w-9 text-center">
                      <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase leading-tight">{MO[parseInt(parts[1])-1]}</p>
                      <p className="text-base font-black text-gray-900 dark:text-white leading-tight">{parseInt(parts[2])}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{evt.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {evt.eventTime ? evt.eventTime.slice(0,5)+' · ' : ''}{evt.location||''}{evt.staffedByName ? ' · '+evt.staffedByName : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </Card>

      {/* Brand footer */}
      <div className="text-center py-4" style={{borderTop:'1px solid rgba(23,52,58,0.12)'}}>
        <p className="text-[10px] font-bold uppercase tracking-[3px]" style={{color:'rgba(45,101,111,0.45)'}}>
          FIELD NOTE No. 001 &nbsp;|&nbsp; HECHO CON PASIÓN ✦ JALISCO, MÉXICO &nbsp;|&nbsp; SUEÑOS TEQUILA EST. 2023
        </p>
      </div>
    </div>
  );
}

// ─── REP: TRADE LEADS IN YOUR REGION ─────────────────────────────────────────
// Reps see unreviewed trade inquiries in the provinces they cover (via
// sales_territories rep_id/backup_rep_id) plus any lead assigned to them.
function RepRegionLeads() {
  const { state, dispatch } = useApp();
  const me = state.user;
  const [leads, setLeads] = useState([]);
  const [busy, setBusy]   = useState(null);

  const load = async () => {
    try {
      const { data: terrs } = await sb.from('sales_territories')
        .select('province,rep_id,backup_rep_id')
        .or(`rep_id.eq.${me.id},backup_rep_id.eq.${me.id}`);
      const provinces = [...new Set((terrs||[]).map(t=>t.province).filter(Boolean))];
      const orParts = [`assigned_rep.eq.${me.id}`];
      if (provinces.length) orParts.unshift(`province.in.(${provinces.join(',')})`);
      const { data, error } = await sb.from('trade_leads')
        .select('id,account_id,business_name,province,scenario,assignment_source,assigned_rep,created_at')
        .is('reviewed_at', null)
        .or(orParts.join(','))
        .order('created_at', { ascending:false })
        .limit(50);
      if (error) { setLeads([]); return; }
      setLeads(data || []);
    } catch (e) { setLeads([]); }
  };
  useEffect(() => { load(); }, []);

  if (!leads.length) return null;

  const assignedCount = leads.filter(l=>l.assigned_rep===me.id).length;
  const regionCount   = leads.length - assignedCount;
  // Assigned-to-you leads first, then region leads; newest first within each group.
  const sorted = [...leads].sort((a,b)=>
    ((a.assigned_rep===me.id?0:1)-(b.assigned_rep===me.id?0:1)) ||
    (new Date(b.created_at) - new Date(a.created_at)));

  const tag = l => l.assigned_rep===me.id ? 'Assigned to you'
    : l.assignment_source==='house_account_fallback' ? 'House Account'
    : l.scenario==='not_distributed' ? 'Not distributed'
    : l.scenario==='manual_review' ? 'Manual review' : 'In your region';
  const goto = id => id && dispatch({type:'NAV',view:'account-detail',params:{id}});

  const markReviewed = async (id) => {
    setBusy(id);
    try {
      await sb.from('trade_leads').update({ reviewed_at:new Date().toISOString(), reviewed_by: me.id }).eq('id', id);
      setLeads(ls => ls.filter(l => l.id !== id));
    } catch (e) {}
    setBusy(null);
  };

  return (
    <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 dark:bg-sky-900/20 p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h2 className="text-sm font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">
            New Trade Leads ({leads.length})
          </h2>
        </div>
        <button onClick={load} className="text-xs text-sky-700 dark:text-sky-300 underline">Refresh</button>
      </div>
      <p className="text-[11px] text-sky-700 dark:text-sky-300 mb-3">
        {assignedCount>0 ? `${assignedCount} assigned to you` : ''}
        {assignedCount>0 && regionCount>0 ? ' · ' : ''}
        {regionCount>0 ? `${regionCount} in your region` : ''}
      </p>
      <div className="space-y-2">
        {sorted.map(l => (
          <div key={l.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-sky-200 dark:border-sky-800">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>goto(l.account_id)}>
              <p className="text-sm font-semibold truncate">{l.business_name||'(no name)'}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {(l.province||'')} · {new Date(l.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-sky-200 text-sky-900 whitespace-nowrap">{tag(l)}</span>
            {l.account_id && <button onClick={()=>goto(l.account_id)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">View</button>}
            <button disabled={busy===l.id} onClick={()=>markReviewed(l.id)} className="text-xs font-semibold text-sky-700 dark:text-sky-300 whitespace-nowrap disabled:opacity-50">
              {busy===l.id?'…':'Mark reviewed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── REP DASHBOARD ────────────────────────────────────────────────────────────
function RepDashboard() {
  const { state, dispatch } = useApp();
  const { visits, orders, accounts, sales, targets, tasks, expenses } = state;
  const me = state.user;
  const now = new Date();
  const thisMonth = now.toISOString().slice(0,7);
  const monday = (() => { const d=new Date(now); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().slice(0,10); })();

  const myAccounts    = accounts.filter(a=>a.assignedRep===me.id);
  const myAcctIds     = new Set(myAccounts.map(a=>a.id));

  // ── Order Activity card state ────────────────────────────────────────────
  const [orderRange, setOrderRange] = useState('this');
  const [orderFrom,  setOrderFrom]  = useState('');
  const [orderTo,    setOrderTo]    = useState('');
  const myVisitsMonth = visits.filter(v=>v.repId===me.id&&v.date.startsWith(thisMonth));
  const myVisitsWeek  = visits.filter(v=>v.repId===me.id&&v.date>=monday);
  const myOrdersMonth = orders.filter(o=>o.status!=='Cancelled'&&myAcctIds.has(o.accountId)&&o.createdAt?.startsWith(thisMonth));
  const myAllOrders   = orders.filter(o=>o.status!=='Cancelled'&&myAcctIds.has(o.accountId));
  const prevDate2      = new Date(now); prevDate2.setMonth(prevDate2.getMonth()-1);
  const prevMonth2     = prevDate2.toISOString().slice(0,7);
  const myBottlesOrders  = myOrdersMonth.reduce((s,o)=>s+(o.bottles||0),0);
  const mySalesThisMonth = sales.filter(s=>s.repId===me.id&&s.month===thisMonth);
  const myBottlesSales   = mySalesThisMonth.reduce((s,x)=>s+x.bottles,0);
  const myRevenue        = mySalesThisMonth.reduce((s,x)=>s+x.revenue,0);
  const myBottles        = myBottlesOrders || myBottlesSales;
  const prevSales        = sales.filter(s=>s.repId===me.id&&s.month===prevMonth2);
  const prevMyBottles    = prevSales.reduce((s,x)=>s+x.bottles,0);
  const prevMyRevenue    = prevSales.reduce((s,x)=>s+x.revenue,0);
  const prevMyVisits     = visits.filter(v=>v.repId===me.id&&v.date.startsWith(prevMonth2)).length;
  const myTasks       = tasks.filter(t=>t.repId===me.id&&!t.done);
  const overdue       = myTasks.filter(t=>t.dueDate<=today());
  const upcoming      = myTasks.filter(t=>t.dueDate>today()).slice(0,4);
  const upcomingEventsRep = [...(state.tastingEvents||[])]
    .filter(e=>e.eventDate>=today())
    .sort((a,b)=>a.eventDate.localeCompare(b.eventDate)||(a.eventTime||'').localeCompare(b.eventTime||''))
    .slice(0,5);
  const target        = targets.find(t=>t.repId===me.id&&t.month===thisMonth);

  // Account coverage stats
  const d60 = new Date(now); d60.setDate(d60.getDate()-60); const cutoff60 = d60.toISOString().slice(0,10);
  const d90 = new Date(now); d90.setDate(d90.getDate()-90); const cutoff90 = d90.toISOString().slice(0,10);
  const myVisitsAll = visits.filter(v=>v.repId===me.id);
  const lastVisitByAcct = {};
  myVisitsAll.forEach(v=>{ if(!lastVisitByAcct[v.accountId]||v.date>lastVisitByAcct[v.accountId]) lastVisitByAcct[v.accountId]=v.date; });
  const visitedLast60 = myAccounts.filter(a=>lastVisitByAcct[a.id]>=cutoff60).length;
  const notVisited90  = myAccounts.filter(a=>!lastVisitByAcct[a.id]||lastVisitByAcct[a.id]<cutoff90).length;
  const newListings   = myAccounts.filter(a=>(a.status==='Listed'||a.status==='Active')&&a.createdAt.startsWith(thisMonth)).length;

  // ── Focus Today ──────────────────────────────────────────────────────────────
  const focusItems = myAccounts.map(account => {
    const flags = [];
    const lastV = lastVisitByAcct[account.id];
    const daysV = lastV ? Math.floor((now - new Date(lastV)) / 86400000) : 999;
    if (daysV > 45) flags.push({ col:'red',   txt: daysV===999 ? 'Never visited' : `No visit ${daysV}d` });

    const acctOrds = orders.filter(o=>o.accountId===account.id&&o.status!=='Cancelled');
    const lastOrdDate = acctOrds.length
      ? [...acctOrds].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0].createdAt?.slice(0,10)
      : null;
    const daysO = lastOrdDate ? Math.floor((now - new Date(lastOrdDate)) / 86400000) : null;
    if (daysO !== null && daysO > 60) flags.push({ col:'amber', txt:`No order ${daysO}d` });
    else if (daysO === null && acctOrds.length === 0 && daysV > 30) flags.push({ col:'amber', txt:'Never ordered' });

    const acctExp  = (expenses||[]).filter(e=>e.accountId===account.id);
    const spent    = acctExp.reduce((s,e)=>s+(Number(e.amount)||0),0);
    const revenue  = acctOrds.reduce((s,o)=>s+(o.subtotal||0),0);
    if (account.budgetTotal > 0 && spent > account.budgetTotal) flags.push({ col:'red', txt:'Over budget' });
    else if (spent > 0 && revenue > 0 && spent > revenue)       flags.push({ col:'amber', txt:'Spend > revenue' });

    const score = flags.length * 1000 + daysV;
    return { account, flags, score };
  }).filter(x=>x.flags.length>0).sort((a,b)=>b.score-a.score).slice(0,8);
  const recentMyOrders = [...myAllOrders].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,6);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto pb-24 lg:pb-6">

      {/* ── Trade lead notification (top of dashboard) ─────────────────────── */}
      <RepRegionLeads/>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hey, {me.name.split(' ')[0]}</h2>
          <p className="text-sm text-gray-500">{(()=>{ const r=me.regions||[]; if(!r.length) return 'All regions'; if(r.length<=3) return r.join(', '); return r.slice(0,2).join(', ')+` +${r.length-2} more`; })()} · {fmtDate(today())}</p>
        </div>
        <div className="flex items-center gap-2">
          <VoiceVisitButton className="flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm" />
          <Btn onClick={()=>dispatch({type:'NAV',view:'new-visit'})}><Ic n="plus" cls="w-4 h-4"/> Log Visit</Btn>
        </div>
      </div>

      {/* ── Promo materials quick stats ──────────────────────────────────── */}
      {(()=>{
        const mine = (state.promoOrders||[]).filter(o=>o.submittedBy===me.id);
        const awaiting = mine.filter(o=>['Submitted','Under Review'].includes(o.status)).length;
        const shipped = mine.filter(o=>o.status==='Shipped').length;
        if (mine.length===0) return null;
        return (
          <div className="grid grid-cols-3 gap-2">
            {[['Awaiting approval',awaiting,'#f59e0b'],['Shipped',shipped,'#0ea5e9'],['Total orders',mine.length,'#2E8A97']].map(([l,v,c])=>(
              <button key={l} onClick={()=>dispatch({type:'NAV',view:'my-promo-orders'})} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-left hover:shadow-sm transition">
                <p className="text-xl font-black" style={{color:c}}>{v}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{l}</p>
              </button>
            ))}
          </div>
        );
      })()}

      {/* ── Focus Today ──────────────────────────────────────────────────── */}
      {focusItems.length > 0 && (
        <Card cls="overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-sm">🎯</span>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Focus Today</p>
            </div>
            <span className="text-xs font-bold text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{focusItems.length}</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {focusItems.map(({account, flags})=>(
              <button key={account.id}
                onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:account.id}})}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left">
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{account.name}</p>
                  <p className="text-xs text-gray-400 truncate">{account.type} · {account.region}</p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end flex-shrink-0">
                  {flags.map((f,i)=>(
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.col==='red'?'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400':'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {f.txt}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Account Coverage Bar */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={()=>dispatch({type:'NAV',view:'accounts'})}
          className="rounded-xl p-3 text-left border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{myAccounts.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">My Accounts</p>
        </button>
        <button onClick={()=>dispatch({type:'NAV',view:'accounts'})}
          className="rounded-xl p-3 text-left border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 transition">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{visitedLast60}</p>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Visited (60 days)</p>
        </button>
        <button onClick={()=>dispatch({type:'NAV',view:'accounts'})}
          className={`rounded-xl p-3 text-left border transition ${notVisited90>0
            ? 'border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 hover:bg-red-100/60 dark:hover:bg-red-900/30'
            : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
          <p className={`text-2xl font-bold ${notVisited90>0?'text-red-500 dark:text-red-400':'text-gray-900 dark:text-white'}`}>{notVisited90}</p>
          <p className={`text-xs mt-0.5 ${notVisited90>0?'text-red-400/80 dark:text-red-400/70':'text-gray-400'}`}>Not Visited (90+ days)</p>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Visits This Week"  value={myVisitsWeek.length}    icon="visits"   color="blue"    onClick={()=>dispatch({type:'NAV',view:'visits'})}/>
        <StatCard label="Visits This Month" value={myVisitsMonth.length}  sub={target?`Target: ${target.visits}`:undefined} icon="visits" color="amber" onClick={()=>dispatch({type:'NAV',view:'visits'})}/>
        <StatCard label="Bottles This Month" value={myBottles}            sub={target?`Target: ${target.bottles}`:undefined} icon="products" color="emerald" onClick={()=>dispatch({type:'NAV',view:'orders'})}/>
        <StatCard label="Revenue This Month" value={fmtCurrency(myRevenue)} sub={target&&target.revenue?`Target: ${fmtCurrency(target.revenue)}`:undefined} icon="reports" color="teal" onClick={()=>dispatch({type:'NAV',view:'sales-import'})}/>
        <StatCard label="New Listings"      value={newListings}           sub={target?`Target: ${target.newListings}`:undefined} icon="star" color="rose" onClick={()=>dispatch({type:'NAV',view:'menu-placements'})}/>
      </div>

      {/* ── Order Activity ─────────────────────────────────────────────── */}
      {(()=>{
        const todayStr = today();
        // Compute date window
        let fromDate, toDate;
        if (orderRange==='this') {
          fromDate = thisMonth+'-01'; toDate = todayStr;
        } else if (orderRange==='last') {
          const pd = new Date(now); pd.setMonth(pd.getMonth()-1);
          const pm = pd.toISOString().slice(0,7);
          const [y,m] = pm.split('-').map(Number);
          fromDate = pm+'-01';
          toDate   = pm+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0');
        } else {
          fromDate = orderFrom||'2000-01-01'; toDate = orderTo||todayStr;
        }

        // From orders
        const orderEntries = orders
          .filter(o=>myAcctIds.has(o.accountId)&&(o.createdAt||'')>=fromDate&&(o.createdAt||'')<=toDate)
          .map(o=>({id:o.id, date:o.createdAt||'', accountId:o.accountId, bottles:o.bottles||0, source:'order'}));

        // From imported sales — use first of month as date
        const salesEntries = sales
          .filter(s=>myAcctIds.has(s.accountId)&&(s.month+'-01')>=fromDate&&(s.month+'-01')<=toDate)
          .map(s=>({id:s.id, date:s.month+'-01', accountId:s.accountId, bottles:s.bottles||0, source:'imported'}));

        const combined = [...orderEntries, ...salesEntries].sort((a,b)=>b.date.localeCompare(a.date));

        // First-ever date per account across ALL data (not just filtered window)
        const allDates = [
          ...orders.filter(o=>myAcctIds.has(o.accountId)).map(o=>({accountId:o.accountId, date:o.createdAt||''})),
          ...sales.filter(s=>myAcctIds.has(s.accountId)).map(s=>({accountId:s.accountId, date:s.month+'-01'})),
        ];
        const firstByAcct = {};
        allDates.forEach(e=>{ if(e.date&&(!firstByAcct[e.accountId]||e.date<firstByAcct[e.accountId])) firstByAcct[e.accountId]=e.date; });

        const rows = combined.map(e=>({
          ...e,
          isFirst: firstByAcct[e.accountId]===e.date,
          account: accounts.find(a=>a.id===e.accountId),
        }));

        const rangeLabel = orderRange==='this'?thisMonth:orderRange==='last'?(()=>{const pd=new Date(now);pd.setMonth(pd.getMonth()-1);return pd.toISOString().slice(0,7);})():'';
        const totalBottles = rows.reduce((s,r)=>s+(r.bottles||0),0);

        return (
          <Card cls="overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-sm">📦</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Order Activity</p>
                {rows.length>0 && <span className="text-xs text-gray-400 font-normal">· {totalBottles} btl</span>}
              </div>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
                {[['this','This Month'],['last','Last Month'],['custom','Custom']].map(([k,l])=>(
                  <button key={k} onClick={()=>setOrderRange(k)}
                    className={`px-2.5 py-1 transition ${orderRange===k?'bg-teal-600 text-white':'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{l}</button>
                ))}
              </div>
            </div>

            {orderRange==='custom' && (
              <div className="flex gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">From</span>
                  <input type="date" value={orderFrom} onChange={e=>setOrderFrom(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-teal-400"/>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">To</span>
                  <input type="date" value={orderTo} onChange={e=>setOrderTo(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-teal-400"/>
                </div>
              </div>
            )}

            {rows.length===0
              ? <p className="text-xs text-gray-400 text-center py-5">No orders{rangeLabel?' for '+rangeLabel:''}</p>
              : <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map(row=>(
                    <button key={row.id} onClick={()=>row.account&&dispatch({type:'NAV',view:'account-detail',params:{id:row.accountId}})}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left">
                      {/* Date */}
                      <span className="text-xs text-gray-400 flex-shrink-0 w-20 font-mono">
                        {row.source==='imported' ? row.date.slice(0,7) : fmtShort(row.date)}
                      </span>
                      {/* Account */}
                      <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white truncate">
                        {row.account?.name || 'Unknown'}
                      </span>
                      {/* Bottles */}
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">
                        {row.bottles} btl
                      </span>
                      {/* Badge */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${row.isFirst
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {row.isFirst ? 'New Listing' : 'Re-order'}
                      </span>
                      {/* Source tag */}
                      {row.source==='imported' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 flex-shrink-0">imported</span>
                      )}
                    </button>
                  ))}
                </div>
            }
          </Card>
        );
      })()}

      {/* Previous month summary */}
      {(prevMyBottles>0||prevMyRevenue>0||prevMyVisits>0) && (
        <Card cls="p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Previous Month — {prevMonth2}</p>
          <div className="flex flex-wrap gap-6">
            {prevMyBottles>0  && <div><p className="text-lg font-bold text-gray-900 dark:text-white">{prevMyBottles}</p><p className="text-xs text-gray-400">Bottles</p></div>}
            {prevMyRevenue>0  && <div><p className="text-lg font-bold text-gray-900 dark:text-white">{fmtCurrency(prevMyRevenue)}</p><p className="text-xs text-gray-400">Revenue</p></div>}
            {prevMyVisits>0   && <div><p className="text-lg font-bold text-gray-900 dark:text-white">{prevMyVisits}</p><p className="text-xs text-gray-400">Visits</p></div>}
          </div>
        </Card>
      )}

      {target && (
        <Card cls="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Monthly Targets — {thisMonth}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { l:'Visits',       cur:myVisitsMonth.length, tgt:target.visits },
              { l:'Bottles',      cur:myBottles,             tgt:target.bottles },
              { l:'New Accounts', cur:myAccounts.filter(a=>a.createdAt.startsWith(thisMonth)).length, tgt:target.newAccounts },
              { l:'New Listings', cur:newListings,            tgt:target.newListings },
            ].map(row=>(
              <div key={row.l}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">{row.l}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{row.cur} / {row.tgt}</span>
                </div>
                <ProgressBar value={row.cur} max={row.tgt} color={row.cur>=row.tgt?'emerald':'amber'}/>
              </div>
            ))}
          </div>
        </Card>
      )}

      {overdue.length>0 && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
          <Ic n="alert" cls="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{overdue.length} overdue task{overdue.length>1?'s':''}</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5 line-clamp-2">{overdue.map(t=>t.title).join(' · ')}</p>
          </div>
        </div>
      )}

      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Follow-Ups</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'tasks'})}>View all</Btn>
        </div>
        {upcoming.length===0
          ? <p className="text-xs text-gray-400 text-center py-3">No upcoming tasks</p>
          : <div className="space-y-2">
              {upcoming.map(t=>{
                const acc = accounts.find(a=>a.id===t.accountId);
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                    onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:t.accountId}})}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority==='high'?'bg-red-500':t.priority==='medium'?'bg-teal-600':'bg-gray-400'}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
                      <p className="text-xs text-gray-400 truncate">{acc?.name}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{fmtShort(t.dueDate)}</span>
                  </div>
                );
              })}
            </div>
        }
      </Card>

      {/* Upcoming Events */}
      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Events</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'calendar'})}>View calendar</Btn>
        </div>
        {upcomingEventsRep.length===0
          ? <p className="text-xs text-gray-400 text-center py-4">No upcoming events scheduled</p>
          : <div className="space-y-1">
              {upcomingEventsRep.map(evt=>{
                const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const parts = evt.eventDate.split('-');
                return (
                  <div key={evt.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded transition"
                    onClick={()=>dispatch({type:'NAV',view:'calendar'})}>
                    <div className="flex-shrink-0 w-9 text-center">
                      <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase leading-tight">{MO[parseInt(parts[1])-1]}</p>
                      <p className="text-base font-black text-gray-900 dark:text-white leading-tight">{parseInt(parts[2])}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{evt.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {evt.eventTime ? evt.eventTime.slice(0,5)+' · ' : ''}{evt.location||''}{evt.staffedByName ? ' · '+evt.staffedByName : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </Card>

      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Account Health</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'accounts'})}>View all</Btn>
        </div>
        <div className="flex gap-3">
          {['Healthy','Watch List','At Risk'].map(lbl=>{
            const count = myAccounts.filter(a=>healthInfo(calcHealth(a)).label===lbl).length;
            const h = healthInfo(lbl==='Healthy'?80:lbl==='Watch List'?55:20);
            return (
              <button key={lbl} onClick={()=>dispatch({type:'NAV',view:'accounts',params:{health:lbl}})}
                className={`flex-1 text-center p-3 rounded-xl ${h.bg} hover:opacity-80 transition-opacity cursor-pointer`}>
                <p className={`text-xl font-bold ${h.color}`}>{count}</p>
                <p className={`text-xs font-medium ${h.color} mt-0.5`}>{lbl}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Leaderboard */}
      {(()=>{
        const cutoff30 = new Date(now-30*86400000).toISOString().slice(0,10);
        const reps = (state.users||[]).filter(u=>u.role==='rep'&&u.active!==false);
        const board = reps.map(u=>({
          id:u.id, name:u.name, initials:u.initials||u.name.slice(0,2).toUpperCase(),
          visits: visits.filter(v=>v.repId===u.id&&v.date>=cutoff30).length,
          bottles: orders.filter(o=>o.status!=='Cancelled'&&o.repId===u.id&&(o.createdAt||'')>=cutoff30).reduce((s,o)=>s+(o.bottles||0),0),
        }));
        const [lb, setLb] = useState('visits');
        const sorted = [...board].sort((a,b)=>b[lb]-a[lb]);
        const MEDAL = ['🥇','🥈','🥉'];
        return (
          <Card cls="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Team Leaderboard — Last 30 Days</p>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
                {['visits','bottles'].map(k=>(
                  <button key={k} onClick={()=>setLb(k)}
                    className={`px-3 py-1 capitalize transition ${lb===k?'bg-teal-600 text-white':'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    {k==='visits'?'Visits':'Bottles'}
                  </button>
                ))}
              </div>
            </div>
            {sorted.length===0
              ? <p className="text-xs text-gray-400 text-center py-3">No reps found</p>
              : <div className="space-y-2">
                  {sorted.map((u,i)=>{
                    const isMe = u.id===me.id;
                    const pct = sorted[0][lb]>0?(u[lb]/sorted[0][lb])*100:0;
                    return (
                      <div key={u.id} className={`flex items-center gap-2.5 p-2 rounded-lg ${isMe?'bg-teal-50 dark:bg-teal-900/20':''}`}>
                        <span className="w-5 text-center flex-shrink-0 text-sm">{MEDAL[i]||<span className="text-xs text-gray-400 font-semibold">{i+1}</span>}</span>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isMe?'bg-teal-600':'bg-gray-400 dark:bg-gray-600'}`}>{u.initials}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className={`text-xs font-medium truncate ${isMe?'text-teal-700 dark:text-teal-400':'text-gray-800 dark:text-gray-200'}`}>{u.name}{isMe?' (you)':''}</p>
                            <p className={`text-xs font-bold flex-shrink-0 ml-2 ${isMe?'text-teal-700 dark:text-teal-400':'text-gray-700 dark:text-gray-300'}`}>{u[lb]}</p>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                            <div className={`h-1.5 rounded-full transition-all ${isMe?'bg-teal-500':'bg-gray-300 dark:bg-gray-600'}`} style={{width:`${pct}%`}}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </Card>
        );
      })()}

      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Recent Orders</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'orders'})}>View all</Btn>
        </div>
        {recentMyOrders.length===0
          ? <p className="text-xs text-gray-400 text-center py-4">No orders yet</p>
          : <div className="space-y-1">
              {recentMyOrders.map(o=>{
                const acc  = accounts.find(a=>a.id===o.accountId);
                const prod = state.products.find(p=>p.id===o.productId);
                return (
                  <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded transition"
                    onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:o.accountId}})}>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{acc?.name||'Unknown'}</p>
                      <p className="text-xs text-gray-400">{prod?.name||'Unknown product'} · {o.bottles} btl</p>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0 ml-3">{o.createdAt?.slice(0,10)||''}</p>
                  </div>
                );
              })}
            </div>
        }
      </Card>
    </div>
  );
}

// ─── AMBASSADOR DASHBOARD ─────────────────────────────────────────────────────
function AmbassadorDashboard() {
  const { state, dispatch } = useApp();
  const now = new Date();
  const thisMonth = now.toISOString().slice(0,7);
  const myTastings = state.tastings.filter(t=>t.date.startsWith(thisMonth));
  const upcomingEventsAmb = [...(state.tastingEvents||[])]
    .filter(e=>e.eventDate>=today())
    .sort((a,b)=>a.eventDate.localeCompare(b.eventDate)||(a.eventTime||'').localeCompare(b.eventTime||''))
    .slice(0,5);
  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hey, {state.user.name.split(' ')[0]}</h2>
          <p className="text-sm text-gray-500">Brand Ambassador · {fmtDate(today())}</p>
        </div>
        <Btn onClick={()=>dispatch({type:'NAV',view:'new-tasting'})}><Ic n="plus" cls="w-4 h-4"/> Log Tasting</Btn>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Tastings This Month" value={myTastings.length}                                icon="tastings" color="purple"  onClick={()=>dispatch({type:'NAV',view:'tastings'})}/>
        <StatCard label="Samples Served"      value={myTastings.reduce((s,t)=>s+t.samplesServed,0)}  icon="star"     color="amber"   onClick={()=>dispatch({type:'NAV',view:'tastings'})}/>
        <StatCard label="Bottles Used"        value={myTastings.reduce((s,t)=>s+t.bottlesUsed,0)}    icon="products" color="emerald" onClick={()=>dispatch({type:'NAV',view:'tastings'})}/>
      </div>
      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activations</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'tastings'})}>View all</Btn>
        </div>
        {[...state.tastings].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(t=>{
          const acc = state.accounts.find(a=>a.id===t.accountId);
          return (
            <div key={t.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 border-gray-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <Ic n="tastings" cls="w-4 h-4 text-purple-500"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{acc?.name||t.location}</p>
                <p className="text-xs text-gray-400">{fmtDate(t.date)} · {t.samplesServed} samples · {t.bottlesUsed} btl</p>
              </div>
            </div>
          );
        })}
      </Card>
      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Events</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'calendar'})}>View calendar</Btn>
        </div>
        {upcomingEventsAmb.length===0
          ? <p className="text-xs text-gray-400 text-center py-3">No upcoming events scheduled</p>
          : upcomingEventsAmb.map(e=>{
              const d = new Date(e.eventDate+'T12:00:00');
              const mo = d.toLocaleString('en-US',{month:'short'});
              const dy = d.getDate();
              return (
                <div key={e.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 border-gray-100 dark:border-gray-800">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-semibold text-teal-500 uppercase leading-none">{mo}</span>
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400 leading-tight">{dy}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{e.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {e.eventTime ? e.eventTime.slice(0,5)+' · ' : ''}{e.location||''}{e.staffedByName ? ' · '+e.staffedByName : ''}
                    </p>
                  </div>
                </div>
              );
            })
        }
      </Card>
    </div>
  );
}


// ─── INVOICE HELPERS ─────────────────────────────────────────────────────────

function buildInvoiceHTML({ invoiceNum, invoiceDate, acc, prod, store, tax, footer, order, unitPrice, subtotal, pstAmt, gstAmt, deposit = 0, depositPerBottle = 0, pstExempt = false, pstNum: pstNumArg = '', total, pstRate: pstRateArg, gstRate: gstRateArg, pstLabel: pstLabelArg, gstLabel: gstLabelArg }) {
  const billToName    = acc?.liquorLicenseName || acc?.name || '—';
  const tradeName     = (acc?.liquorLicenseName && acc?.liquorLicenseName !== acc?.name) ? acc.name : '';
  const billToAddr    = [acc?.address, acc?.city, acc?.region].filter(Boolean).join(', ');
  const accLicense    = acc?.licenseNumber || '';
  const pstNum        = pstNumArg || order?.pstNumber || '';
  const storeName     = store ? store.name : (order?.storeId === 'BCLDB' ? 'BCLDB' : '—');
  const storeAddr     = store?.address || '';
  const storeLicense  = store?.licenseNumber || '';
  const storeGst      = store?.gstNumber || '';
  const productName   = prod?.name || '—';
  const qty           = order?.bottles || 0;
  const pstRate       = pstRateArg !== undefined ? pstRateArg : (tax?.pstRate > 0 ? tax.pstRate : 7);
  const gstRate       = gstRateArg !== undefined ? gstRateArg : (tax?.gstRate > 0 ? tax.gstRate : 5);
  const pstLabelStr   = pstLabelArg || 'PST';
  const gstLabelStr   = gstLabelArg || 'GST';

  const depositRow = deposit > 0
    ? `<tr class="total-row"><td>Bottle Deposit (${qty} × $${(depositPerBottle||0).toFixed(2)})</td><td class="amount">$${deposit.toFixed(2)}</td></tr>`
    : '';
  const taxRows = (tax?.enabled ? [
    pstExempt
      ? `<tr class="total-row"><td>${pstLabelStr} — Exempt (PST # on file)</td><td class="amount">$0.00</td></tr>`
      : (pstRate > 0 ? `<tr class="total-row"><td>${pstLabelStr} (${pstRate}%)</td><td class="amount">$${pstAmt.toFixed(2)}</td></tr>` : ''),
    `<tr class="total-row"><td>${gstLabelStr} (${gstRate}%)</td><td class="amount">$${gstAmt.toFixed(2)}</td></tr>`,
  ].join('') : '') + depositRow;

  const storeEtransfer = store?.etransferAddress || '';
  const footerEtransfer = storeEtransfer ? `<p style="margin-bottom:6px"><strong>Payment by e-transfer to:</strong> ${storeEtransfer}</p>` : '';
  const footerGst  = storeGst  ? `<p>GST Registration #: ${storeGst}</p>` : '';
  const footerText = footer    ? `<p style="margin-bottom:6px">${footer.replace(/\n/g,'<br>')}</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice #${invoiceNum}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;background:#fff;font-size:14px}
.invoice{max-width:760px;margin:0 auto;padding:48px 40px}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;margin-bottom:32px;border-bottom:3px solid #0d9488}
.brand{font-size:26px;font-weight:800;color:#0d9488;letter-spacing:-0.5px}
.brand-sub{font-size:12px;color:#555;margin-top:3px}
.invoice-meta{text-align:right}
.invoice-title{font-size:20px;font-weight:800;color:#111;letter-spacing:1px}
.invoice-meta p{color:#666;font-size:13px;margin-top:3px}
.parties{display:grid;grid-template-columns:1fr;gap:32px;margin-bottom:32px}
.party-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0d9488;margin-bottom:6px}
.party h3{font-size:14px;font-weight:700;color:#111;margin-bottom:4px}
.party p{font-size:12px;color:#444;line-height:1.7}
table{width:100%;border-collapse:collapse;margin-bottom:0}
thead{background:#f4f7f6}
th{text-align:left;padding:9px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#666;border-bottom:2px solid #e5e7eb}
td{padding:12px;font-size:13px;border-bottom:1px solid #f0f0f0;color:#222}
.amount{text-align:right}
.totals-table{width:260px;margin-left:auto;border-collapse:collapse;margin-top:4px}
.total-row td{padding:5px 12px;font-size:13px;color:#444;border:none}
.total-row .amount{text-align:right}
tr.grand-total td{border-top:2px solid #111;padding-top:10px;font-size:16px;font-weight:800;color:#111}
.footer-section{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#666;line-height:1.8}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}@page{margin:15mm}}
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div>
      <div class="brand">${storeName}</div>
      ${storeAddr    ? `<div class="brand-sub">${storeAddr}</div>` : ''}
      ${storeLicense ? `<div class="brand-sub">License #: ${storeLicense}</div>` : ''}
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">INVOICE</div>
      <p># ${invoiceNum}</p>
      <p>${invoiceDate}</p>
      ${order?.requestedDate && order.requestedDate !== invoiceDate ? `<p>Requested: ${order.requestedDate}</p>` : ''}
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <div class="party-label">Bill To</div>
      <h3>${billToName}</h3>
      ${tradeName  ? `<p>(${tradeName})</p>` : ''}
      ${billToAddr ? `<p>${billToAddr}</p>` : ''}
      ${accLicense ? `<p>Liquor License #: ${accLicense}</p>` : ''}
      ${pstNum     ? `<p>PST #: ${pstNum}</p>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>Product</th><th class="amount">Qty</th><th class="amount">Unit Price</th><th class="amount">Amount</th></tr></thead>
    <tbody><tr><td>${productName}</td><td class="amount">${qty}</td><td class="amount">$${unitPrice.toFixed(2)}</td><td class="amount">$${subtotal.toFixed(2)}</td></tr></tbody>
  </table>
  <table class="totals-table">
    <tr class="total-row"><td>Subtotal</td><td class="amount">$${subtotal.toFixed(2)}</td></tr>
    ${taxRows}
    <tr class="grand-total"><td>Total</td><td class="amount">$${total.toFixed(2)}</td></tr>
  </table>
  <div class="footer-section">
    ${footerEtransfer}
    ${footerText}
    ${footerGst}
  </div>
</div>
</body>
</html>`;
}

// ─── INVOICE MODAL ────────────────────────────────────────────────────────────
function InvoiceModal({ open, onClose, order }) {
  const { state, dispatch } = useApp();
  const [sendingStore, setSendingStore] = React.useState(false);
  const [sendingAcc,   setSendingAcc]   = React.useState(false);
  const [storeEmailTo, setStoreEmailTo] = React.useState('');
  const [accEmailTo,   setAccEmailTo]   = React.useState('');

  const acc   = open && order ? state.accounts.find(a => a.id === order.accountId) : null;
  const store = open && order
    ? (order.storeId === 'BCLDB'
        ? { name:'BCLDB', address:'', licenseNumber:'', gstNumber:'', email:'' }
        : state.stores.find(s => s.id === order.storeId))
    : null;

  // Sync editable To: fields whenever order changes
  React.useEffect(() => {
    if (!open || !order) return;
    setStoreEmailTo(store?.email || '');
    setAccEmailTo(acc?.email || '');
  }, [order?.id, open]);

  if (!open || !order) return null;

  const prod  = state.products.find(p => p.id === order.productId);
  const tax    = state.taxSettings || { enabled:true, pstRate:10, gstRate:7 };
  const footer = state.invoiceFooter || '';

  // Use province tax from store if available, otherwise fall back to global settings
  const provinceTax = store?.province ? getProvinceTax(store.province, state.provinceTaxRates) : null;
  const pstRate   = provinceTax ? provinceTax.pstRate   : (Number(tax.pstRate) || 0);
  const gstRate   = provinceTax ? provinceTax.gstRate   : ((tax.gstRate > 0) ? tax.gstRate : 5);
  const pstLabel  = provinceTax ? (provinceTax.pstLabel || 'PST') : 'PST';
  const gstLabel  = provinceTax ? (provinceTax.gstLabel || 'GST') : 'GST';

  // Always recalculate from current rates so invoice reflects Settings/province rates.
  // unitPrice: derive from stored subtotal if available (preserves order price), else use product price.
  const unitPrice = (order.subtotal > 0 && order.bottles > 0)
    ? parseFloat((order.subtotal / order.bottles).toFixed(2))
    : parseFloat(prod?.price || 0);
  const qty       = order.bottles || 0;
  const subtotal  = order.subtotal > 0 ? order.subtotal : parseFloat((unitPrice * qty).toFixed(2));
  // PST exemption: an account with a PST number on file is PST-exempt; otherwise province PST applies. GST always applies.
  // Admin override (on the account) can force exempt/charge regardless of the number on file.
  const acctPstNumber = (acc?.pstNumber || order?.pstNumber || '').trim();
  const pstOverride = (acc?.pstOverride || '').trim();
  const pstExempt = pstOverride === 'exempt' ? true
                  : pstOverride === 'charge' ? false
                  : !!acctPstNumber;
  const pstAmt    = (tax.enabled && !pstExempt) ? parseFloat((subtotal * pstRate / 100).toFixed(2)) : 0;
  const gstAmt    = tax.enabled ? parseFloat((subtotal * gstRate / 100).toFixed(2)) : 0;
  // Flat per-bottle container deposit (tax-exempt) — added after tax.
  const depositPerBottle = Number(state.bottleDeposit) || 0;
  const deposit   = parseFloat((depositPerBottle * qty).toFixed(2));
  const total     = parseFloat((subtotal + pstAmt + gstAmt + deposit).toFixed(2));
  const invoiceNum  = order.id.replace(/-/g,'').slice(0,8).toUpperCase();
  const invoiceDate = order.createdAt || order.requestedDate || '';

  const html = buildInvoiceHTML({ invoiceNum, invoiceDate, acc, prod, store, tax, footer, order, unitPrice, subtotal, pstAmt, gstAmt, deposit, depositPerBottle, pstExempt, pstNum: acctPstNumber, total, pstRate, gstRate, pstLabel, gstLabel });

  function handlePrint() {
    const w = window.open('', '_blank', 'width=900,height=720');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch(e) {} }, 650);
  }

  function ejsReady() {
    if (typeof emailjs === 'undefined' || EMAILJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY') {
      showToast(dispatch, 'EmailJS not configured', 'error'); return false;
    }
    if (!EMAILJS_INVOICE_TEMPLATE_ID || EMAILJS_INVOICE_TEMPLATE_ID === 'YOUR_EMAILJS_INVOICE_TEMPLATE_ID') {
      showToast(dispatch, 'Set EMAILJS_INVOICE_TEMPLATE_ID in the code first', 'error'); return false;
    }
    return true;
  }

  const invoicePayload = {
    invoice_number:     invoiceNum,
    invoice_date:       invoiceDate,
    bill_to_name:       acc?.liquorLicenseName || acc?.name || '',
    bill_to_trade_name: acc?.name || '',
    bill_to_address:    [acc?.address, acc?.city, acc?.region].filter(Boolean).join(', '),
    bill_to_license:    acc?.licenseNumber || '',
    bill_to_pst:        acctPstNumber || '',
    store_name:         store?.name || '',
    store_address:      store?.address || '',
    store_license:      store?.licenseNumber || '',
    store_gst:          store?.gstNumber || '',
    product_name:       prod?.name || '',
    quantity:           String(order?.bottles || 0),
    unit_price:         '$' + unitPrice.toFixed(2),
    subtotal:           '$' + subtotal.toFixed(2),
    pst_rate:           String(tax.pstRate),
    pst_amount:         '$' + pstAmt.toFixed(2),
    gst_rate:           String(tax.gstRate),
    gst_amount:         '$' + gstAmt.toFixed(2),
    total:              '$' + total.toFixed(2),
    invoice_footer:     footer,
    invoice_html:       html,
  };

  async function handleEmailStore() {
    if (!storeEmailTo.trim()) { showToast(dispatch, 'Enter a store email address', 'error'); return; }
    if (!ejsReady()) return;
    setSendingStore(true);
    try {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_INVOICE_TEMPLATE_ID, { email: storeEmailTo.trim(), to_name: store?.name || '', ...invoicePayload });
      showToast(dispatch, 'Invoice sent to store: ' + storeEmailTo.trim(), 'success');
    } catch(err) { showToast(dispatch, 'Email failed: ' + (err?.text || err?.message || 'error'), 'error'); }
    setSendingStore(false);
  }

  async function handleEmailAccount() {
    if (!accEmailTo.trim()) { showToast(dispatch, 'Enter an account email address', 'error'); return; }
    if (!ejsReady()) return;
    setSendingAcc(true);
    try {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_INVOICE_TEMPLATE_ID, { email: accEmailTo.trim(), to_name: acc?.liquorLicenseName || acc?.name || '', ...invoicePayload });
      showToast(dispatch, 'Invoice sent to account: ' + accEmailTo.trim(), 'success');
    } catch(err) { showToast(dispatch, 'Email failed: ' + (err?.text || err?.message || 'error'), 'error'); }
    setSendingAcc(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">Invoice #{invoiceNum}</p>
            <p className="text-xs text-gray-500 mt-0.5">{acc?.liquorLicenseName || acc?.name || 'Unlinked'} &mdash; {store?.name || ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <Btn size="sm" variant="secondary" onClick={handlePrint}><Ic n="download" cls="w-3.5 h-3.5 mr-1"/>Save PDF</Btn>
            <Btn size="sm" variant="secondary" onClick={handleEmailStore} disabled={sendingStore}><Ic n="mail" cls="w-3.5 h-3.5 mr-1"/>{sendingStore?'Sending…':'Send to Store'}</Btn>
            <Btn size="sm" onClick={handleEmailAccount} disabled={sendingAcc}><Ic n="mail" cls="w-3.5 h-3.5 mr-1"/>{sendingAcc?'Sending…':'Send to Account'}</Btn>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"><Ic n="x" cls="w-4 h-4"/></button>
          </div>
        </div>
        <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-14 flex-shrink-0">To Store</span>
            <input type="email" value={storeEmailTo} onChange={e=>setStoreEmailTo(e.target.value)}
              placeholder="store@example.com"
              className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-400"/>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-16 flex-shrink-0">To Account</span>
            <input type="email" value={accEmailTo} onChange={e=>setAccEmailTo(e.target.value)}
              placeholder="account@example.com"
              className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-400"/>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 bg-gray-50 dark:bg-gray-950">
          <iframe srcDoc={html} style={{width:'100%',minHeight:'500px',border:'none',borderRadius:'8px',background:'white'}} title={'Invoice ' + invoiceNum}/>
        </div>
      </div>
    </div>
  );
}
