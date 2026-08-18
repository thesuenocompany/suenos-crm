// PART 4: Tasks, Tastings, Menu Placements, Products, Stores, Reports, Map, Admin modules

// ─── TASKS VIEW ───────────────────────────────────────────────────────────────
function TasksView() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountId:'', title:'', dueDate:'', priority:'medium' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const [filter, setFilter] = useState('open');

  const isAdmin = state.user.role==='admin';
  const myTasks = state.tasks
    .filter(t=>isAdmin||t.repId===state.user.id)
    .filter(t=>filter==='all'||filter==='done'?t.done===true:(filter==='open'&&!t.done));

  const overdue  = myTasks.filter(t=>!t.done&&t.dueDate<today());
  const upcoming = myTasks.filter(t=>!t.done&&t.dueDate>=today()).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  const done     = myTasks.filter(t=>t.done).sort((a,b)=>b.dueDate.localeCompare(a.dueDate));

  function addTask() {
    if(!form.title||!form.dueDate) return;
    dispatch({ type:'ADD_TASK', payload:{ id:genId(), ...form, repId:state.user.id, done:false } });
    setForm({ accountId:'', title:'', dueDate:'', priority:'medium' });
    setOpen(false);
    showToast(dispatch,'Task created');
  }

  const myAccounts = isAdmin ? state.accounts : state.accounts.filter(a=>a.assignedRep===state.user.id);

  const TaskRow = ({ t }) => {
    const acc = state.accounts.find(a=>a.id===t.accountId);
    const isOverdue = !t.done && t.dueDate < today();
    return (
      <Card cls="p-3.5">
        <div className="flex items-center gap-3">
          <button onClick={()=>dispatch({type:'UPD_TASK',payload:{...t,done:!t.done}})}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${t.done?'bg-emerald-500 border-emerald-500':'border-gray-300 dark:border-gray-600 hover:border-amber-400'}`}>
            {t.done && <Ic n="check" cls="w-3 h-3 text-white" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${t.done?'line-through text-gray-400':'text-gray-900 dark:text-white'}`}>{t.title}</p>
            {acc && (
              <button onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:acc.id}})}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 block">{acc.name}</button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-medium ${isOverdue?'text-red-500':t.done?'text-gray-400':'text-gray-500'}`}>{fmtShort(t.dueDate)}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t.priority==='high'?'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400':t.priority==='medium'?'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400':'bg-gray-100 text-gray-500'}`}>
              {t.priority}
            </span>
            <button onClick={()=>dispatch({type:'DEL_TASK',id:t.id})} className="p-1 text-gray-300 hover:text-red-400 transition">
              <Ic n="trash" cls="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{myTasks.length} task{myTasks.length!==1?'s':''}</p>
        <Btn onClick={()=>setOpen(true)}><Ic n="plus" cls="w-4 h-4" /> Add Task</Btn>
      </div>

      <div className="flex gap-2 mb-4">
        {[{k:'open',l:'Open'},{k:'all',l:'All'},{k:'done',l:'Done'}].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${filter===f.k?'bg-amber-500 border-amber-500 text-white':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {overdue.length>0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Overdue ({overdue.length})</p>
          <div className="space-y-2">{overdue.map(t=><TaskRow key={t.id} t={t}/>)}</div>
        </div>
      )}
      {upcoming.length>0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upcoming ({upcoming.length})</p>
          <div className="space-y-2">{upcoming.map(t=><TaskRow key={t.id} t={t}/>)}</div>
        </div>
      )}
      {filter==='done' && done.length>0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Completed</p>
          <div className="space-y-2">{done.map(t=><TaskRow key={t.id} t={t}/>)}</div>
        </div>
      )}
      {myTasks.length===0 && <EmptyState icon="tasks" title="No tasks" desc="Add tasks to stay on top of every account." action={<Btn onClick={()=>setOpen(true)}>Add Task</Btn>} />}

      <Modal open={open} onClose={()=>setOpen(false)} title="New Task">
        <div className="space-y-3">
          <Input label="Task Title" value={form.title} onChange={v=>set('title',v)} placeholder="e.g. Follow up on listing" required />
          <Select label="Account" value={form.accountId} onChange={v=>set('accountId',v)}
            options={myAccounts.map(a=>({value:a.id,label:a.name}))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Due Date" value={form.dueDate} onChange={v=>set('dueDate',v)} type="date" required />
            <Select label="Priority" value={form.priority} onChange={v=>set('priority',v)} options={['low','medium','high']} />
          </div>
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" onClick={()=>setOpen(false)} cls="flex-1">Cancel</Btn>
            <Btn onClick={addTask} cls="flex-1" disabled={!form.title||!form.dueDate}>Add Task</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── TASTINGS VIEW ────────────────────────────────────────────────────────────
function TastingsView() {
  const { state, dispatch } = useApp();
  const sorted = [...state.tastings].sort((a,b)=>b.date.localeCompare(a.date));
  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{sorted.length} activation{sorted.length!==1?'s':''}</p>
        <Btn onClick={()=>dispatch({type:'NAV',view:'new-tasting'})}><Ic n="plus" cls="w-4 h-4" /> Log Tasting</Btn>
      </div>
      {sorted.length===0
        ? <EmptyState icon="tastings" title="No tastings yet" action={<Btn onClick={()=>dispatch({type:'NAV',view:'new-tasting'})}>Log Tasting</Btn>} />
        : <div className="space-y-2">
            {sorted.map(t=>{
              const acc = state.accounts.find(a=>a.id===t.accountId);
              return (
                <Card key={t.id} cls="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{acc?.name||t.location}</p>
                      <p className="text-xs text-gray-500">{t.location}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(t.date)}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg">{t.samplesServed} samples</span>
                    <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg">{t.bottlesUsed} btl used</span>
                    <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">{t.staff}</span>
                  </div>
                  {t.notes && <p className="text-xs text-gray-500 mt-2">{t.notes}</p>}
                </Card>
              );
            })}
          </div>
      }
    </div>
  );
}

function NewTasting() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ accountId:'', date:today(), location:'', staff:state.user.name, bottlesUsed:'', samplesServed:'', notes:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  function submit(e) {
    e.preventDefault();
    dispatch({ type:'ADD_TASTING', payload:{ ...form, id:genId(), bottlesUsed:parseInt(form.bottlesUsed)||0, samplesServed:parseInt(form.samplesServed)||0 } });
    showToast(dispatch,'Activation logged');
    dispatch({ type:'NAV', view:'tastings' });
  }
  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
      <button onClick={()=>dispatch({type:'NAV',view:'tastings'})} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4 transition">
        <Ic n="chevronL" cls="w-3.5 h-3.5" /> Back
      </button>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Log Tasting / Activation</h2>
      <form onSubmit={submit} className="space-y-3">
        <Select label="Account" value={form.accountId} onChange={v=>set('accountId',v)}
          options={state.accounts.map(a=>({value:a.id,label:a.name}))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" value={form.date} onChange={v=>set('date',v)} type="date" required />
          <Input label="Staff Member" value={form.staff} onChange={v=>set('staff',v)} required />
        </div>
        <Input label="Location / Event Name" value={form.location} onChange={v=>set('location',v)} placeholder="Store tasting, industry night…" required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bottles Used" value={form.bottlesUsed} onChange={v=>set('bottlesUsed',v)} type="number" placeholder="2" required />
          <Input label="Samples Served" value={form.samplesServed} onChange={v=>set('samplesServed',v)} type="number" placeholder="40" required />
        </div>
        <Input label="Notes" value={form.notes} onChange={v=>set('notes',v)} rows={3} />
        <div className="flex gap-2 pt-1">
          <Btn variant="secondary" onClick={()=>dispatch({type:'NAV',view:'tastings'})} cls="flex-1">Cancel</Btn>
          <Btn type="submit" cls="flex-1" disabled={!form.location||!form.bottlesUsed}>Log Tasting</Btn>
        </div>
      </form>
    </div>
  );
}

// ─── MENU PLACEMENTS VIEW ─────────────────────────────────────────────────────
function MenuPlacementsView() {
  const { state, dispatch } = useApp();
  const [fItem, setFItem] = useState('');
  const [fStatus, setFStatus] = useState('');

  const onPremise = state.accounts.filter(a=>['Restaurant','Bar','Hotel','Golf Course','Resort'].includes(a.type));

  const rows = onPremise.flatMap(acc=>
    MENU_ITEMS.map(item=>({
      acc, item, status: acc.menuPlacements?.[item]||'Not Discussed'
    }))
  ).filter(r=>!fItem||r.item===fItem)
   .filter(r=>!fStatus||r.status===fStatus);

  const summary = MENU_ITEMS.map(item=>({
    item, permanent: onPremise.filter(a=>a.menuPlacements?.[item]==='Permanent Placement').length,
    seasonal: onPremise.filter(a=>a.menuPlacements?.[item]==='Seasonal Feature').length,
  }));

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {summary.map(s=>(
          <Card key={s.item} cls="p-3 text-center">
            <p className="text-lg font-bold text-amber-500">{s.permanent}</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.item}</p>
            <p className="text-[10px] text-gray-400">perm. · {s.seasonal} seasonal</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={fItem} onChange={e=>setFItem(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <option value="">All Drinks</option>
          {MENU_ITEMS.map(i=><option key={i}>{i}</option>)}
        </select>
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <option value="">All Statuses</option>
          {MENU_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {rows.filter(r=>r.status!=='Not Discussed'||fStatus==='Not Discussed').map((r,i)=>(
          <Card key={i} cls="p-3.5" onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:r.acc.id}})}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{r.acc.name}</p>
                <p className="text-xs text-gray-500">{r.item} · {r.acc.region}</p>
              </div>
              <Badge label={r.status} />
            </div>
          </Card>
        ))}
        {rows.filter(r=>r.status!=='Not Discussed'||fStatus==='Not Discussed').length===0 &&
          <EmptyState icon="menu" title="No placements match filters" />
        }
      </div>
    </div>
  );
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
function ProductsView() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = { name:'', sku:'', size:'750ml', casePack:12, price:'', active:true };
  const [form, setForm] = useState(blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function openEdit(p) { setEditing(p); setForm({...p}); setOpen(true); }
  function openNew()   { setEditing(null); setForm(blank); setOpen(true); }
  function save() {
    if (!form.name||!form.sku) return;
    if (editing) { dispatch({type:'UPD_PRODUCT',payload:{...form,id:editing.id}}); showToast(dispatch,'Product updated'); }
    else         { dispatch({type:'ADD_PRODUCT',payload:{...form,id:genId(),price:parseFloat(form.price)||0}}); showToast(dispatch,'Product added'); }
    setOpen(false);
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{state.products.length} products</p>
        {state.user.role==='admin' && <Btn onClick={openNew}><Ic n="plus" cls="w-4 h-4" /> Add Product</Btn>}
      </div>
      <div className="space-y-2">
        {state.products.map(p=>(
          <Card key={p.id} cls="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-500 text-lg font-bold">{p.name.replace('Sueños ','')[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-500">SKU: {p.sku} · {p.size} · {p.casePack}/case</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':'bg-gray-100 text-gray-500'}`}>{p.active?'Active':'Inactive'}</span>
                {state.user.role==='admin' && <Btn variant="ghost" size="sm" onClick={()=>openEdit(p)}><Ic n="edit" cls="w-3.5 h-3.5" /></Btn>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Product':'New Product'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Product Name" value={form.name} onChange={v=>set('name',v)} required cls="col-span-2" />
            <Input label="SKU" value={form.sku} onChange={v=>set('sku',v)} required />
            <Input label="Bottle Size" value={form.size} onChange={v=>set('size',v)} placeholder="750ml" />
            <Input label="Case Pack" value={form.casePack} onChange={v=>set('casePack',parseInt(v)||12)} type="number" />
            <Input label="Price/Bottle ($)" value={form.price} onChange={v=>set('price',v)} type="number" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={()=>set('active',!form.active)} className={`w-9 h-5 rounded-full transition relative ${form.active?'bg-amber-500':'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.active?'left-4':'left-0.5'}`}/>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" onClick={()=>setOpen(false)} cls="flex-1">Cancel</Btn>
            <Btn onClick={save} cls="flex-1" disabled={!form.name||!form.sku}>Save</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── FULFILLMENT STORES ───────────────────────────────────────────────────────
function StoresView() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = { name:'', address:'', contact:'', email:'', phone:'', region:'' };
  const [form, setForm] = useState(blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function save() {
    if(!form.name||!form.email) return;
    if(editing) { dispatch({type:'UPD_STORE',payload:{...form,id:editing.id}}); showToast(dispatch,'Store updated'); }
    else        { dispatch({type:'ADD_STORE',payload:{...form,id:genId()}}); showToast(dispatch,'Store added'); }
    setOpen(false);
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{state.stores.length} fulfillment stores</p>
        {state.user.role==='admin' && (
          <Btn onClick={()=>{ setEditing(null); setForm(blank); setOpen(true); }}><Ic n="plus" cls="w-4 h-4" /> Add Store</Btn>
        )}
      </div>
      <div className="space-y-3">
        {state.stores.map(s=>(
          <Card key={s.id} cls="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.region}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><Ic n="users" cls="w-3 h-3" />{s.contact}</div>
                  <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Ic n="mail" cls="w-3 h-3" />{s.email}</a>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><Ic n="pin" cls="w-3 h-3" />{s.address}</div>
                </div>
              </div>
              {state.user.role==='admin' && (
                <Btn variant="ghost" size="sm" onClick={()=>{ setEditing(s); setForm({...s}); setOpen(true); }}>
                  <Ic n="edit" cls="w-3.5 h-3.5" />
                </Btn>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Store':'New Fulfillment Store'}>
        <div className="space-y-3">
          <Input label="Store Name" value={form.name} onChange={v=>set('name',v)} required />
          <Select label="Region" value={form.region} onChange={v=>set('region',v)} options={REGIONS} required />
          <Input label="Address" value={form.address} onChange={v=>set('address',v)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact Name" value={form.contact} onChange={v=>set('contact',v)} />
            <Input label="Phone" value={form.phone} onChange={v=>set('phone',v)} />
          </div>
          <Input label="Email" value={form.email} onChange={v=>set('email',v)} type="email" required />
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" onClick={()=>setOpen(false)} cls="flex-1">Cancel</Btn>
            <Btn onClick={save} cls="flex-1" disabled={!form.name||!form.email}>Save Store</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
function ReportsView() {
  const { state, dispatch } = useApp();
  const { sales, accounts, visits, users, products } = state;
  const COLORS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#6366f1'];

  // Bottles by region
  const byRegion = REGIONS.map(r=>({
    region: r.split('/')[0].trim().replace('Kelowna','Kelowna'),
    bottles: sales.filter(s=>accounts.find(a=>a.id===s.accountId)?.region===r).reduce((s,x)=>s+x.bottles,0),
  })).filter(r=>r.bottles>0).sort((a,b)=>b.bottles-a.bottles);

  // Bottles by product
  const byProduct = products.map((p,i)=>({
    name: p.name.replace('Sueños ',''),
    bottles: sales.filter(s=>s.productId===p.id).reduce((s,x)=>s+x.bottles,0),
    fill: COLORS[i],
  })).filter(p=>p.bottles>0);

  // Bottles by rep
  const byRep = users.filter(u=>u.role==='rep').map(u=>({
    name: u.name.split(' ')[0],
    bottles: sales.filter(s=>accounts.find(a=>a.id===s.accountId)?.assignedRep===u.id).reduce((s,x)=>s+x.bottles,0),
    visits: visits.filter(v=>v.repId===u.id).length,
  }));

  // Monthly trend
  const now = new Date();
  const months6 = Array.from({length:6},(_,i)=>{ const d=new Date(now); d.setMonth(d.getMonth()-5+i); return d.toISOString().slice(0,7); });
  const monthlyTrend = months6.map(m=>({
    month: m.slice(5)+'/'+m.slice(2,4),
    bottles: sales.filter(s=>s.month===m).reduce((s,x)=>s+x.bottles,0),
    revenue: sales.filter(s=>s.month===m).reduce((s,x)=>s+x.revenue,0),
    visits:  visits.filter(v=>v.date.startsWith(m)).length,
  }));

  // Unvisited accounts (>60 days)
  const unvisited = accounts
    .filter(a=>a.status!=='Lost')
    .map(a=>({...a, vd:daysSince(a.lastVisit)}))
    .filter(a=>a.vd>60)
    .sort((a,b)=>b.vd-a.vd);

  // Tastings performance
  const tastingImpact = state.tastings.map(t=>{
    const acc = accounts.find(a=>a.id===t.accountId);
    const salesAfter = acc ? sales.filter(s=>s.accountId===acc.id&&s.month>=t.date.slice(0,7)).reduce((s,x)=>s+x.bottles,0) : 0;
    return { ...t, accName:acc?.name||t.location, salesAfter };
  }).sort((a,b)=>b.salesAfter-a.salesAfter);

  const totalBottles = sales.reduce((s,x)=>s+x.bottles,0);
  const totalRevenue = sales.reduce((s,x)=>s+x.revenue,0);
  const bottlesPerVisit = visits.length ? (totalBottles/visits.length).toFixed(1) : 0;
  const revenuePerVisit = visits.length ? fmtCurrency(totalRevenue/visits.length) : '—';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto pb-24 lg:pb-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Bottles" value={totalBottles} icon="products" color="amber" />
        <StatCard label="Total Revenue" value={fmtCurrency(totalRevenue)} icon="reports" color="emerald" />
        <StatCard label="Btl / Visit" value={bottlesPerVisit} icon="visits" color="blue" />
        <StatCard label="Rev / Visit" value={revenuePerVisit} icon="targets" color="purple" />
      </div>

      {/* Trend */}
      <Card cls="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Bottles & Revenue Trend (6 months)</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthlyTrend}>
            <defs>
              <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
            <XAxis dataKey="month" tick={{fontSize:11}}/>
            <YAxis yAxisId="btl" tick={{fontSize:11}}/>
            <YAxis yAxisId="vis" orientation="right" tick={{fontSize:11}}/>
            <Tooltip/>
            <Area yAxisId="btl" type="monotone" dataKey="bottles" stroke="#f59e0b" strokeWidth={2} fill="url(#rGrad)" name="Bottles"/>
            <Line yAxisId="vis" type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} dot={false} name="Visits"/>
            <Legend/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Region + Product */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card cls="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Bottles by Region</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byRegion} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis type="number" tick={{fontSize:10}}/>
              <YAxis type="category" dataKey="region" tick={{fontSize:10}} width={60}/>
              <Tooltip formatter={v=>[v+' btl','Bottles']}/>
              <Bar dataKey="bottles" fill="#f59e0b" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card cls="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Bottles by Product</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byProduct}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip formatter={v=>[v+' btl','Bottles']}/>
              <Bar dataKey="bottles" radius={[4,4,0,0]}>
                {byProduct.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Rep performance */}
      <Card cls="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Rep Performance — All Time</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 dark:border-gray-800">
              {['Rep','Bottles Sold','Visits','Btl/Visit','Listings'].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">{h}</th>)}
            </tr></thead>
            <tbody>
              {byRep.sort((a,b)=>b.bottles-a.bottles).map((r,i)=>(
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{r.name}</td>
                  <td className="py-2 pr-4 text-amber-600 dark:text-amber-400 font-semibold">{r.bottles}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{r.visits}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{r.visits?(r.bottles/r.visits).toFixed(1):'—'}</td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">
                    {accounts.filter(a=>a.assignedRep===users.find(u=>u.name.startsWith(r.name))?.id&&(a.status==='Listed'||a.status==='Active')).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Accounts not visited recently */}
      <Card cls="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Accounts Not Visited (60+ days)</p>
        <p className="text-xs text-gray-500 mb-4">{unvisited.length} account{unvisited.length!==1?'s':''} need attention</p>
        {unvisited.length===0
          ? <p className="text-xs text-gray-500 text-center py-3">All accounts visited recently ✓</p>
          : <div className="space-y-2">
              {unvisited.slice(0,8).map(a=>(
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 px-1 rounded transition"
                  onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:a.id}})}>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.region} · {a.type}</p>
                  </div>
                  <span className="text-xs text-red-500 font-medium">{a.vd === 999 ? 'Never' : `${a.vd}d ago`}</span>
                </div>
              ))}
            </div>
        }
      </Card>

      {/* Tasting impact */}
      <Card cls="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tasting Impact on Sales</p>
        {tastingImpact.length===0
          ? <EmptyState icon="tastings" title="No tastings logged yet" />
          : <div className="space-y-2">
              {tastingImpact.map(t=>(
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.accName}</p>
                    <p className="text-xs text-gray-500">{fmtDate(t.date)} · {t.samplesServed} samples · {t.staff}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{t.salesAfter} btl</p>
                    <p className="text-xs text-gray-400">post-event sales</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  );
}

// ─── MAP VIEW ─────────────────────────────────────────────────────────────────
function MapView() {
  const { state, dispatch } = useApp();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (typeof L === 'undefined') return;

    mapInstance.current = L.map(mapRef.current, { zoomControl:true }).setView([51.5, -115], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© OpenStreetMap contributors', maxZoom:19
    }).addTo(mapInstance.current);

    state.accounts.forEach(acc=>{
      if (!acc.lat || !acc.lng) return;
      const vd = daysSince(acc.lastVisit);
      const color = vd<14 ? '#10b981' : vd<60 ? '#f59e0b' : '#ef4444';
      const marker = L.circleMarker([acc.lat, acc.lng], {
        radius:8, fillColor:color, color:'#fff', weight:2, opacity:1, fillOpacity:0.85
      });
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px">${acc.name}</div>
          <div style="color:#6b7280;font-size:11px">${acc.type} · ${acc.region}</div>
          <div style="color:#6b7280;font-size:11px;margin-top:2px">${acc.status}</div>
          <div style="color:${color};font-size:11px;margin-top:4px;font-weight:500">${acc.lastVisit?`Last visit ${vd}d ago`:'Never visited'}</div>
        </div>
      `);
      marker.addTo(mapInstance.current);
    });

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  return (
    <div className="flex flex-col h-full" style={{height:'calc(100vh - 7rem)'}}>
      {/* Legend */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-4 flex-shrink-0">
        {[{color:'#10b981',label:'Visited < 14 days'},{color:'#f59e0b',label:'Needs follow-up'},{color:'#ef4444',label:'At risk / unvisited'}].map(l=>(
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{background:l.color}}/>
            {l.label}
          </div>
        ))}
      </div>
      <div className="flex-1 px-4 pb-4">
        <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" />
      </div>
    </div>
  );
}

// ─── USERS (Admin) ────────────────────────────────────────────────────────────
function UsersView() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const blank = { name:'', email:'', role:'rep', region:'', initials:'', active:true };
  const [form, setForm] = useState(blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function save() {
    if(!form.name||!form.email) return;
    const initials = form.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    dispatch({ type:'ADD_USER', payload:{ ...form, id:genId(), initials } });
    showToast(dispatch,'User created'); setOpen(false);
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{state.users.length} users</p>
        <Btn onClick={()=>{ setForm(blank); setOpen(true); }}><Ic n="plus" cls="w-4 h-4" /> Add User</Btn>
      </div>
      <div className="space-y-2">
        {state.users.map(u=>(
          <Card key={u.id} cls="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${u.role==='admin'?'bg-amber-500':u.role==='rep'?'bg-blue-500':'bg-purple-500'}`}>
                {u.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{u.name}</p>
                <p className="text-xs text-gray-500">{u.email} · {u.region||'All regions'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${u.role==='admin'?'bg-amber-100 text-amber-700':u.role==='rep'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{u.role}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.active?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>{u.active?'Active':'Inactive'}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="New User">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" value={form.name} onChange={v=>set('name',v)} required cls="col-span-2" />
            <Input label="Email" value={form.email} onChange={v=>set('email',v)} type="email" required cls="col-span-2" />
            <Select label="Role" value={form.role} onChange={v=>set('role',v)} options={['admin','rep','ambassador']} />
            <Select label="Region" value={form.region} onChange={v=>set('region',v)} options={REGIONS} />
          </div>
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" onClick={()=>setOpen(false)} cls="flex-1">Cancel</Btn>
            <Btn onClick={save} cls="flex-1" disabled={!form.name||!form.email}>Create User</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── TARGETS (Admin) ──────────────────────────────────────────────────────────
function TargetsView() {
  const { state, dispatch } = useApp();
  const now = new Date();
  const [month, setMonth] = useState(now.toISOString().slice(0,7));
  const reps = state.users.filter(u=>u.role==='rep');
  const [forms, setForms] = useState({});

  useEffect(() => {
    const init = {};
    reps.forEach(u=>{
      const existing = state.targets.find(t=>t.repId===u.id&&t.month===month);
      init[u.id] = existing||{ visits:20, newAccounts:3, newListings:2, bottles:300, revenue:21000 };
    });
    setForms(init);
  }, [month, state.targets]);

  function save(repId) {
    dispatch({ type:'SET_TARGET', payload:{ ...forms[repId], id:genId(), repId, month } });
    showToast(dispatch,'Target saved');
  }
  const setField = (repId,k,v) => setForms(f=>({...f,[repId]:{...f[repId],[k]:v}}));

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Month</label>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400" />
      </div>
      <div className="space-y-4">
        {reps.map(u=>(
          <Card key={u.id} cls="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">{u.initials}</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{u.name}</p>
                <p className="text-xs text-gray-500">{u.region}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { k:'visits',       label:'Visits'      },
                { k:'newAccounts',  label:'New Accounts' },
                { k:'newListings',  label:'New Listings' },
                { k:'bottles',      label:'Bottles'     },
                { k:'revenue',      label:'Revenue ($)'  },
              ].map(f=>(
                <div key={f.k}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  <input type="number" value={forms[u.id]?.[f.k]||''} onChange={e=>setField(u.id,f.k,parseInt(e.target.value)||0)}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Btn size="sm" onClick={()=>save(u.id)}>Save Targets</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── SALES IMPORT ─────────────────────────────────────────────────────────────
function SalesImportView() {
  const { state, dispatch } = useApp();
  const [rows, setRows] = useState([{ month:'', accountId:'', productId:'', bottles:'', revenue:'' }]);
  const addRow = () => setRows(r=>[...r,{ month:'', accountId:'', productId:'', bottles:'', revenue:'' }]);
  const setCell = (i,k,v) => setRows(r=>r.map((row,j)=>j===i?{...row,[k]:v}:row));

  function submit() {
    const valid = rows.filter(r=>r.month&&r.accountId&&r.productId&&r.bottles);
    if(!valid.length) return;
    dispatch({ type:'ADD_SALES', payload:valid.map(r=>({ id:genId(), month:r.month, accountId:r.accountId, productId:r.productId, bottles:parseInt(r.bottles)||0, revenue:parseFloat(r.revenue)||0 })) });
    setRows([{ month:'', accountId:'', productId:'', bottles:'', revenue:'' }]);
    showToast(dispatch,`${valid.length} sales records imported`,'success');
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto">
      <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
        <p className="font-semibold mb-1">Monthly Sales Import</p>
        All reporting is based on bottles sold. Enter data row by row or paste from a spreadsheet.
      </div>

      <div className="space-y-3 mb-4">
        {rows.map((row,i)=>(
          <Card key={i} cls="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Month</label>
                <input type="month" value={row.month} onChange={e=>setCell(i,'month',e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account</label>
                <select value={row.accountId} onChange={e=>setCell(i,'accountId',e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  <option value="">—</option>
                  {state.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Product</label>
                <select value={row.productId} onChange={e=>setCell(i,'productId',e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  <option value="">—</option>
                  {state.products.map(p=><option key={p.id} value={p.id}>{p.name.replace('Sueños ','')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bottles</label>
                <input type="number" value={row.bottles} onChange={e=>setCell(i,'bottles',e.target.value)} placeholder="24"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Revenue</label>
                <input type="number" value={row.revenue} onChange={e=>setCell(i,'revenue',e.target.value)} placeholder="1440"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Btn variant="secondary" onClick={addRow}><Ic n="plus" cls="w-3.5 h-3.5" /> Add Row</Btn>
        <Btn onClick={submit} cls="ml-auto">
          <Ic n="upload" cls="w-3.5 h-3.5" /> Import Sales
        </Btn>
      </div>

      {/* Existing sales */}
      <div className="mt-6">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Sales Records</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-200 dark:border-gray-800">
              {['Month','Account','Product','Bottles','Revenue'].map(h=><th key={h} className="text-left font-medium text-gray-500 pb-2 pr-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {[...state.sales].reverse().slice(0,15).map(s=>{
                const acc  = state.accounts.find(a=>a.id===s.accountId);
                const prod = state.products.find(p=>p.id===s.productId);
                return (
                  <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">{s.month}</td>
                    <td className="py-1.5 pr-3 text-gray-900 dark:text-white font-medium truncate max-w-[120px]">{acc?.name||'—'}</td>
                    <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">{prod?.name.replace('Sueños ','')}</td>
                    <td className="py-1.5 pr-3 text-amber-600 font-semibold">{s.bottles}</td>
                    <td className="py-1.5 text-gray-600 dark:text-gray-400">{fmtCurrency(s.revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
