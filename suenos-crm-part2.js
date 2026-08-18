// PART 2: Login, Sidebar, Header, Dashboards

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const { dispatch } = useApp();
  const [selected, setSelected] = useState(null);

  const roles = [
    { user: INIT_USERS[0], label:'Administrator', desc:'Full system access, reporting & management', icon:'settings', color:'bg-amber-500' },
    { user: INIT_USERS[1], label:'Sales Rep – Vancouver', desc:'Jordan Rivera · Vancouver territory', icon:'accounts', color:'bg-blue-500' },
    { user: INIT_USERS[2], label:'Sales Rep – Calgary', desc:'Sam Chen · Calgary territory', icon:'accounts', color:'bg-emerald-500' },
    { user: INIT_USERS[3], label:'Brand Ambassador', desc:'Aria Vega · Tastings & activations', icon:'tastings', color:'bg-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 mb-4 shadow-xl shadow-amber-500/30">
            <span className="text-2xl font-black text-white tracking-tighter">S</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sueños Tequila</h1>
          <p className="text-slate-400 text-sm mt-1">Sales & CRM Platform</p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
          <p className="text-sm text-slate-300 mb-4 text-center">Select your role to continue</p>
          <div className="space-y-2.5">
            {roles.map(r => (
              <button key={r.user.id} onClick={()=>setSelected(r.user.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${selected===r.user.id ? 'border-amber-500 bg-amber-500/15':'border-white/10 hover:border-white/20 hover:bg-white/5'}`}>
                <div className={`w-9 h-9 rounded-xl ${r.color} flex items-center justify-center flex-shrink-0`}>
                  <Ic n={r.icon} cls="w-4.5 h-4.5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{r.label}</p>
                  <p className="text-xs text-slate-400 truncate">{r.desc}</p>
                </div>
                {selected===r.user.id && <Ic n="check" cls="w-4 h-4 text-amber-400 ml-auto flex-shrink-0" />}
              </button>
            ))}
          </div>
          <button disabled={!selected}
            onClick={()=>{ const u=INIT_USERS.find(u=>u.id===selected); dispatch({type:'LOGIN',payload:u}); }}
            className="mt-5 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-amber-500/25">
            Sign In
          </button>
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">Demo environment — all data is sample data</p>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = {
  admin: [
    { section:'Main',       items:[{v:'dashboard',icon:'dashboard',label:'Dashboard'},{v:'accounts',icon:'accounts',label:'Accounts'},{v:'visits',icon:'visits',label:'Visits'},{v:'tasks',icon:'tasks',label:'Tasks'}] },
    { section:'Sales',      items:[{v:'orders',icon:'orders',label:'Orders'},{v:'menu-placements',icon:'menu',label:'Menu Placements'},{v:'tastings',icon:'tastings',label:'Tastings'}] },
    { section:'Management', items:[{v:'products',icon:'products',label:'Products'},{v:'stores',icon:'stores',label:'Fulfillment Stores'},{v:'sales-import',icon:'download',label:'Sales Import'},{v:'targets',icon:'targets',label:'Targets'},{v:'users',icon:'users',label:'Users'}] },
    { section:'Analytics',  items:[{v:'reports',icon:'reports',label:'Reports'},{v:'map',icon:'map',label:'Account Map'}] },
  ],
  rep: [
    { section:'Main',  items:[{v:'dashboard',icon:'dashboard',label:'Dashboard'},{v:'accounts',icon:'accounts',label:'Accounts'},{v:'visits',icon:'visits',label:'Visits'},{v:'tasks',icon:'tasks',label:'Tasks'}] },
    { section:'Sales', items:[{v:'orders',icon:'orders',label:'Orders'},{v:'menu-placements',icon:'menu',label:'Menu Placements'}] },
    { section:'More',  items:[{v:'reports',icon:'reports',label:'Reports'},{v:'map',icon:'map',label:'Account Map'}] },
  ],
  ambassador: [
    { section:'Main', items:[{v:'dashboard',icon:'dashboard',label:'Dashboard'},{v:'tastings',icon:'tastings',label:'Tastings'},{v:'accounts',icon:'accounts',label:'Accounts'}] },
  ],
};

function Sidebar({ mobile, onClose }) {
  const { state, dispatch } = useApp();
  const nav = NAV[state.user?.role] || NAV.rep;
  const go = (v) => { dispatch({type:'NAV',view:v}); if(mobile) onClose(); };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-950 text-white ${mobile?'':'border-r border-slate-800'}`}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
          <span className="text-base font-black text-white">S</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-tight">Sueños Tequila</p>
          <p className="text-xs text-slate-400">Sales Platform</p>
        </div>
        {mobile && (
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <Ic n="x" cls="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {nav.map(section => (
          <div key={section.section}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{section.section}</p>
            {section.items.map(item => (
              <button key={item.v} onClick={()=>go(item.v)}
                className={`sidebar-link w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${state.view===item.v?'active text-amber-400 font-medium':'text-slate-300 font-normal'}`}>
                <Ic n={item.icon} cls="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{state.user?.initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{state.user?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{state.user?.role}</p>
          </div>
          <button onClick={()=>dispatch({type:'LOGOUT'})} title="Sign out"
            className="p-1 rounded text-slate-500 hover:text-slate-300 transition">
            <Ic n="x" cls="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HEADER ────────────────────────────────────────────────────────────────────
const VIEW_LABELS = {
  dashboard:'Dashboard', accounts:'Accounts', visits:'Visits', tasks:'Tasks',
  orders:'Orders', 'menu-placements':'Menu Placements', tastings:'Tastings',
  products:'Products', stores:'Fulfillment Stores', 'sales-import':'Sales Import',
  targets:'Targets', users:'Users', reports:'Reports', map:'Account Map',
  'account-detail':'Account', 'new-account':'New Account', 'new-visit':'Log Visit',
  'new-order':'New Order', 'new-tasting':'New Tasting',
};

function Header({ onMenuClick }) {
  const { state, dispatch } = useApp();
  return (
    <div className="h-14 flex items-center justify-between px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <Ic n="bars" cls="w-5 h-5" />
        </button>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
          {VIEW_LABELS[state.view] || state.view}
        </h1>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={()=>dispatch({type:'TOGGLE_DARK'})} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <Ic n={state.darkMode?'sun':'moon'} cls="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────
function Layout({ children }) {
  const { state, dispatch } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Bottom nav for mobile
  const mobileNav = [
    {v:'dashboard',icon:'dashboard',label:'Home'},
    {v:'accounts',icon:'accounts',label:'Accounts'},
    {v:'visits',icon:'visits',label:'Visits'},
    {v:'orders',icon:'orders',label:'Orders'},
    {v:'tasks',icon:'tasks',label:'Tasks'},
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Desktop sidebar */}
      <div className={`hidden lg:flex flex-col transition-all duration-200 ${state.sidebarOpen?'w-56':'w-0 overflow-hidden'} flex-shrink-0`}>
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setDrawerOpen(false)} />
          <div className="relative w-56 flex-shrink-0 fade-in">
            <Sidebar mobile onClose={()=>setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={()=>setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="fade-in">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <div className="lg:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
          <div className="flex">
            {mobileNav.map(item=>(
              <button key={item.v} onClick={()=>dispatch({type:'NAV',view:item.v})}
                className={`flex-1 flex flex-col items-center py-2 transition-colors ${state.view===item.v?'text-amber-500':'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                <Ic n={item.icon} cls="w-5 h-5" />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
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
  const sevenDaysAgo = new Date(now-7*86400000).toISOString().slice(0,10);

  const visitsThisMonth = visits.filter(v=>v.date.startsWith(thisMonth));
  const visitsLast7     = visits.filter(v=>v.date>=sevenDaysAgo);
  const ordersMonth     = orders.filter(o=>o.createdAt.startsWith(thisMonth));
  const activeAccounts  = accounts.filter(a=>a.status==='Active'||a.status==='Listed');
  const totalBottles    = sales.filter(s=>s.month===thisMonth).reduce((s,x)=>s+x.bottles,0);
  const totalRevenue    = sales.filter(s=>s.month===thisMonth).reduce((s,x)=>s+x.revenue,0);

  // Monthly trend (last 5 months)
  const months5 = Array.from({length:5},(_,i)=>{
    const d = new Date(now); d.setMonth(d.getMonth()-4+i);
    return d.toISOString().slice(0,7);
  });
  const trendData = months5.map(m=>({
    month: m.slice(5)+'/'+m.slice(2,4),
    bottles: sales.filter(s=>s.month===m).reduce((s,x)=>s+x.bottles,0),
    revenue: sales.filter(s=>s.month===m).reduce((s,x)=>s+x.revenue,0),
  }));

  // Sales by region
  const regionData = REGIONS.map(r=>({
    region: r.replace(' / ','/ ').replace('Kelowna / Okanagan','Kelowna'),
    bottles: sales.filter(s=>{ const a=accounts.find(a2=>a2.id===s.accountId); return a?.region===r; }).reduce((sum,x)=>sum+x.bottles,0),
  })).filter(r=>r.bottles>0).sort((a,b)=>b.bottles-a.bottles);

  // Sales by product
  const COLORS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6'];
  const productData = state.products.map((p,i)=>({
    name: p.name.replace('Sueños ',''),
    value: sales.reduce((s,x)=>x.productId===p.id?s+x.bottles:s,0),
    fill: COLORS[i],
  })).filter(p=>p.value>0);

  // Top reps
  const repPerf = users.filter(u=>u.role==='rep').map(u=>({
    name: u.name.split(' ')[0],
    bottles: sales.filter(s=>{ const a=accounts.find(a2=>a2.id===s.accountId); return a?.assignedRep===u.id&&s.month===thisMonth; }).reduce((s,x)=>s+x.bottles,0),
    visits: visits.filter(v=>v.repId===u.id&&v.date.startsWith(thisMonth)).length,
  })).sort((a,b)=>b.bottles-a.bottles);

  const dueTasks = tasks.filter(t=>!t.done&&t.dueDate<=today());

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Visits This Month" value={visitsThisMonth.length} sub={`${visitsLast7.length} last 7 days`} icon="visits" color="blue" />
        <StatCard label="Bottles Sold" value={totalBottles} sub={thisMonth} icon="products" color="amber" />
        <StatCard label="Revenue" value={fmtCurrency(totalRevenue)} sub={thisMonth} icon="reports" color="emerald" />
        <StatCard label="Active Accounts" value={activeAccounts.length} sub={`${ordersMonth.length} orders this month`} icon="accounts" color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bottles trend */}
        <Card cls="p-4 col-span-1 lg:col-span-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Bottles Sold — 5 Month Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="bottleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} />
              <Tooltip formatter={(v)=>[v+' btl','Bottles']} />
              <Area type="monotone" dataKey="bottles" stroke="#f59e0b" strokeWidth={2} fill="url(#bottleGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Product breakdown */}
        <Card cls="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Bottles by Product</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={productData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {productData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Pie>
              <Tooltip formatter={(v,n)=>[v+' btl', n]}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {productData.map((p,i)=>(
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:p.fill}} /><span className="text-gray-600 dark:text-gray-400">{p.name}</span></div>
                <span className="font-medium text-gray-900 dark:text-white">{p.value} btl</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Region + Reps + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By region */}
        <Card cls="p-4 col-span-1 lg:col-span-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Bottles by Region</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionData} layout="vertical" margin={{left:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{fontSize:10}} />
              <YAxis type="category" dataKey="region" tick={{fontSize:10}} width={55} />
              <Tooltip formatter={(v)=>[v+' btl','Bottles']} />
              <Bar dataKey="bottles" fill="#f59e0b" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top reps */}
        <Card cls="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Rep Performance — {thisMonth.slice(5)}/{thisMonth.slice(2,4)}</p>
          <div className="space-y-3">
            {repPerf.map((r,i)=>(
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{r.name}</span>
                  <span className="text-gray-500">{r.bottles} btl · {r.visits} visits</span>
                </div>
                <ProgressBar value={r.bottles} max={Math.max(...repPerf.map(x=>x.bottles),1)} color="amber" />
              </div>
            ))}
          </div>
        </Card>

        {/* Due tasks */}
        <Card cls="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Actions Due Today</p>
            <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">{dueTasks.length}</span>
          </div>
          {dueTasks.length===0
            ? <p className="text-xs text-gray-500 text-center py-4">All caught up!</p>
            : <div className="space-y-2">
                {dueTasks.slice(0,5).map(t=>{
                  const acc = state.accounts.find(a=>a.id===t.accountId);
                  return (
                    <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:t.accountId}})}>
                      <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority==='high'?'bg-red-500':t.priority==='medium'?'bg-amber-500':'bg-gray-400'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
                        <p className="text-[10px] text-gray-500 truncate">{acc?.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Card>
      </div>
    </div>
  );
}

// ─── REP DASHBOARD ────────────────────────────────────────────────────────────
function RepDashboard() {
  const { state, dispatch } = useApp();
  const { visits, orders, accounts, sales, targets, tasks } = state;
  const me = state.user;

  const now = new Date();
  const thisMonth = now.toISOString().slice(0,7);
  const weekAgo = new Date(now-7*86400000).toISOString().slice(0,10);
  const mondayStr = (() => { const d=new Date(now); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().slice(0,10); })();

  const myVisitsMonth = visits.filter(v=>v.repId===me.id&&v.date.startsWith(thisMonth));
  const myVisitsWeek  = visits.filter(v=>v.repId===me.id&&v.date>=mondayStr);
  const myOrders      = orders.filter(o=>o.repId===me.id&&o.createdAt.startsWith(thisMonth));
  const myAccounts    = accounts.filter(a=>a.assignedRep===me.id);
  const myBottles     = sales.filter(s=>{ const a=accounts.find(a2=>a2.id===s.accountId); return a?.assignedRep===me.id&&s.month===thisMonth; }).reduce((s,x)=>s+x.bottles,0);
  const myTasks       = tasks.filter(t=>t.repId===me.id&&!t.done);
  const overdueTasks  = myTasks.filter(t=>t.dueDate<=today());
  const dueSoonTasks  = myTasks.filter(t=>t.dueDate>today()).slice(0,4);

  const target = targets.find(t=>t.repId===me.id&&t.month===thisMonth);

  const newListings = myAccounts.filter(a=>a.status==='Listed'&&a.createdAt.startsWith(thisMonth)).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hey, {me.name.split(' ')[0]} 👋</h2>
          <p className="text-sm text-gray-500">{me.region} · {fmtDate(today())}</p>
        </div>
        <Btn onClick={()=>dispatch({type:'NAV',view:'new-visit'})} cls="shadow-sm">
          <Ic n="plus" cls="w-4 h-4" /> Log Visit
        </Btn>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Visits This Week" value={myVisitsWeek.length} icon="visits" color="blue" />
        <StatCard label="Visits This Month" value={myVisitsMonth.length} sub={target?`Target: ${target.visits}`:undefined} icon="visits" color="amber" />
        <StatCard label="Bottles Sold" value={myBottles} sub={target?`Target: ${target.bottles}`:undefined} icon="products" color="emerald" />
        <StatCard label="My Accounts" value={myAccounts.length} icon="accounts" color="purple" />
        <StatCard label="Orders Submitted" value={myOrders.length} icon="orders" color="teal" />
        <StatCard label="New Listings" value={newListings} sub={target?`Target: ${target.newListings}`:undefined} icon="star" color="rose" />
      </div>

      {/* Targets */}
      {target && (
        <Card cls="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Monthly Targets — {thisMonth}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label:'Visits',      cur:myVisitsMonth.length, tgt:target.visits },
              { label:'Bottles',     cur:myBottles,            tgt:target.bottles },
              { label:'New Accounts',cur:myAccounts.filter(a=>a.createdAt.startsWith(thisMonth)).length, tgt:target.newAccounts },
              { label:'New Listings',cur:newListings,          tgt:target.newListings },
            ].map(row=>(
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{row.cur} / {row.tgt}</span>
                </div>
                <ProgressBar value={row.cur} max={row.tgt} color={row.cur>=row.tgt?'emerald':'amber'} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Overdue tasks */}
      {overdueTasks.length>0 && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
          <Ic n="alert" cls="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{overdueTasks.length} overdue task{overdueTasks.length>1?'s':''}</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{overdueTasks.map(t=>t.title).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Upcoming tasks */}
      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Follow-Ups</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'tasks'})}>View all</Btn>
        </div>
        {dueSoonTasks.length===0
          ? <p className="text-xs text-gray-500 text-center py-3">No upcoming tasks</p>
          : <div className="space-y-2">
              {dueSoonTasks.map(t=>{
                const acc = accounts.find(a=>a.id===t.accountId);
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                    onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:t.accountId}})}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority==='high'?'bg-red-500':t.priority==='medium'?'bg-amber-500':'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-500 truncate">{acc?.name}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtShort(t.dueDate)}</span>
                  </div>
                );
              })}
            </div>
        }
      </Card>

      {/* Account health summary */}
      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Account Health</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'accounts'})}>View all</Btn>
        </div>
        <div className="flex gap-4">
          {['Healthy','Watch List','At Risk'].map(lbl=>{
            const count = myAccounts.filter(a=>healthInfo(calcHealth(a)).label===lbl).length;
            const h = healthInfo(lbl==='Healthy'?80:lbl==='Watch List'?55:20);
            return (
              <div key={lbl} className={`flex-1 text-center p-3 rounded-xl ${h.bg}`}>
                <p className={`text-xl font-bold ${h.color}`}>{count}</p>
                <p className={`text-xs font-medium ${h.color} mt-0.5`}>{lbl}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── AMBASSADOR DASHBOARD ─────────────────────────────────────────────────────
function AmbassadorDashboard() {
  const { state, dispatch } = useApp();
  const { tastings } = state;
  const now = new Date();
  const thisMonth = now.toISOString().slice(0,7);
  const myTastings = tastings.filter(t=>t.date.startsWith(thisMonth));
  const totalSamples = myTastings.reduce((s,t)=>s+t.samplesServed,0);
  const totalBottles = myTastings.reduce((s,t)=>s+t.bottlesUsed,0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hey, {state.user.name.split(' ')[0]} 🎉</h2>
          <p className="text-sm text-gray-500">Brand Ambassador · {fmtDate(today())}</p>
        </div>
        <Btn onClick={()=>dispatch({type:'NAV',view:'new-tasting'})}>
          <Ic n="plus" cls="w-4 h-4" /> Log Tasting
        </Btn>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Tastings This Month" value={myTastings.length} icon="tastings" color="purple" />
        <StatCard label="Samples Served" value={totalSamples} icon="star" color="amber" />
        <StatCard label="Bottles Used" value={totalBottles} icon="products" color="emerald" />
      </div>
      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activations</p>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:'NAV',view:'tastings'})}>View all</Btn>
        </div>
        {tastings.slice(0,5).map(t=>{
          const acc = state.accounts.find(a=>a.id===t.accountId);
          return (
            <div key={t.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 border-gray-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <Ic n="tastings" cls="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{acc?.name}</p>
                <p className="text-[10px] text-gray-500">{fmtDate(t.date)} · {t.samplesServed} samples · {t.bottlesUsed} btl used</p>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
