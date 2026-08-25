// ══════════════════════════════════════════════════════════════════════════════
//  PROMOTIONAL MATERIALS MODULE — views
//  (loaded between p4b and part5 so AppRouter can reference these components)
// ══════════════════════════════════════════════════════════════════════════════

const PM_ORDER_STATUSES = ['Draft','Submitted','Under Review','Approved','Partially Approved','Preparing','Shipped','Delivered','Cancelled','Declined'];
const PM_FULFILLMENT = ['Pending','Shipped','Delivered','Backordered'];
const PM_UOM = ['Each','Pack','Case','Box','Bundle'];
const PM_AVAIL = {
  in_stock:      { label:'In stock',       cls:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  low_stock:     { label:'Low stock',      cls:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  out_of_stock:  { label:'Out of stock',   cls:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  by_request:    { label:'By request',     cls:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  unavailable:   { label:'Unavailable',    cls:'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};
const PM_STATUS_CLS = {
  'Draft':'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'Submitted':'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Under Review':'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Approved':'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Partially Approved':'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'Preparing':'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Shipped':'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  'Delivered':'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Cancelled':'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Declined':'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
function PmStatusBadge({ s }) {
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${PM_STATUS_CLS[s]||'bg-gray-100 text-gray-500'}`}>{s}</span>;
}
function pmMoney(n) { const v = Number(n)||0; return '$' + v.toFixed(2); }
function pmToday() { return new Date().toISOString().slice(0,10); }
// Effective stock for a material (or a chosen variant)
function pmEffectiveStock(mat, variant) {
  const t = variant || mat;
  if (!(variant ? variant.inventoryTracking : mat.inventoryTracking)) return Infinity;
  return t.quantityAvailable || 0;
}
// Category helpers
function pmSortedCats(cats) { return [...(cats||[])].sort((a,b)=> (a.sortOrder-b.sortOrder) || a.name.localeCompare(b.name)); }
function pmActiveCats(cats) { return pmSortedCats((cats||[]).filter(c=>c.isActive)); }
function pmCatItemCount(materials, catId) { return (materials||[]).filter(m=>m.categoryId===catId).length; }
function pmCatActiveItemCount(materials, catId) { return (materials||[]).filter(m=>m.categoryId===catId && m.isActive).length; }
function pmCatName(cats, id) { return (cats||[]).find(c=>c.id===id)?.name || '—'; }
// Auto-generate a unique SKU: PM-<CATEGORY PREFIX>-<sequence>
function pmGenerateSku(cats, catId, materials) {
  const cat = (cats||[]).find(c=>c.id===catId);
  const prefix = (cat?.name || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4) || 'GEN';
  const base = `PM-${prefix}-`;
  let max = 0;
  (materials||[]).forEach(m=>{ if (m.sku && m.sku.startsWith(base)) { const n = parseInt(m.sku.slice(base.length)); if (!isNaN(n) && n>max) max = n; } });
  return base + String(max+1).padStart(4,'0');
}
// CSV download helper
function pmDownloadCsv(filename, rows) {
  const esc = v => { const s = String(v==null?'':v); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

// ══════════════════════════════════════════════════════════════════════════════
//  1. ADMIN — MANAGE PROMOTIONAL MATERIALS
// ══════════════════════════════════════════════════════════════════════════════
function ManagePromoMaterialsView() {
  const { state, dispatch } = useApp();
  const isAdmin = state.user?.role === 'admin';
  const [search, setSearch] = React.useState('');
  const [catFilter, setCatFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all'); // all|active|inactive|tracked|untracked|availabilitykey
  const [editing, setEditing] = React.useState(null);   // material object or {} for new
  const [adjusting, setAdjusting] = React.useState(null); // material for inventory adjust
  const [sortByCat, setSortByCat] = React.useState(false);
  const [selected, setSelected] = React.useState({});    // { [id]: true } for bulk move
  const [bulkCat, setBulkCat] = React.useState('');

  if (!isAdmin) return <div className="p-8 text-center text-gray-400 text-sm">Admins only.</div>;

  const cats = state.promoCategories || [];
  const catName = id => pmCatName(cats, id);
  let mats = (state.promoMaterials || []).filter(m => {
    if (search && !`${m.name} ${m.sku}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== 'all' && m.categoryId !== catFilter) return false;
    if (statusFilter === 'active' && !m.isActive) return false;
    if (statusFilter === 'inactive' && m.isActive) return false;
    if (statusFilter === 'tracked' && !m.inventoryTracking) return false;
    if (statusFilter === 'untracked' && m.inventoryTracking) return false;
    if (['in_stock','low_stock','out_of_stock','by_request'].includes(statusFilter) && m.availabilityStatus !== statusFilter) return false;
    return true;
  });
  if (sortByCat) mats = [...mats].sort((a,b)=> catName(a.categoryId).localeCompare(catName(b.categoryId)) || a.name.localeCompare(b.name));
  const selCount = Object.values(selected).filter(Boolean).length;
  async function bulkMove() {
    if (!bulkCat) { showToast(dispatch, 'Pick a category to move to', 'error'); return; }
    const ids = Object.keys(selected).filter(k=>selected[k]);
    try { await dbBulkMoveCategory(dispatch, ids, bulkCat, state.user?.id); showToast(dispatch, `Moved ${ids.length} item${ids.length!==1?'s':''}`); setSelected({}); setBulkCat(''); }
    catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
  }

  async function toggleActive(m) {
    try { await dbSavePromoMaterial(dispatch, { ...m, isActive: !m.isActive }, state.user?.id); showToast(dispatch, m.isActive?'Deactivated':'Activated'); }
    catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
  }
  async function duplicate(m) {
    try { await dbSavePromoMaterial(dispatch, { ...m, id:null, name:m.name+' (Copy)', sku:(m.sku||'')+'-COPY' }, state.user?.id); showToast(dispatch, 'Duplicated'); }
    catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-6xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 sm:p-6 mb-5 text-white shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight">Manage Promotional Materials</h1>
            <p className="text-xs text-teal-100/70 mt-0.5">{mats.length} item{mats.length!==1?'s':''} · {cats.length} categories</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={()=>dispatch({type:'NAV',view:'manage-promo-categories'})} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition">Categories</button>
            <button onClick={()=>setEditing({})} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-[#2E8A97] hover:bg-teal-50 transition">＋ Add Item</button>
          </div>
        </div>
      </div>

      {/* Rep cost visibility toggle */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 mb-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Show unit costs to sales reps</p>
          <p className="text-[11px] text-gray-400">Off by default — costs are admin-only unless enabled here.</p>
        </div>
        <button onClick={()=>dbSetPromoRepCostVisible(dispatch, !state.promoRepCostVisible)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${state.promoRepCostVisible?'bg-emerald-500':'bg-gray-300 dark:bg-gray-600'}`}>
          <span className="inline-block rounded-full bg-white shadow" style={{height:'18px',width:'18px',transform:state.promoRepCostVisible?'translateX(22px)':'translateX(3px)'}}/>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2 mb-4 shadow-sm">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or SKU…"
          className="flex-1 min-w-[140px] px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <option value="all">All categories</option>
          {pmSortedCats(cats).map(c=><option key={c.id} value={c.id}>{c.name}{!c.isActive?' (inactive)':''}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <option value="all">Any status</option>
          <option value="active">Active</option><option value="inactive">Inactive</option>
          <option value="tracked">Inventory-tracked</option><option value="untracked">Non-inventory</option>
          <option value="in_stock">In stock</option><option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option><option value="by_request">By request</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={sortByCat} onChange={e=>setSortByCat(e.target.checked)}/> Sort by category</label>
      </div>

      {/* Bulk move bar */}
      {selCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl px-3 py-2 mb-4">
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">{selCount} selected</span>
          <select value={bulkCat} onChange={e=>setBulkCat(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <option value="">Move to category…</option>
            {pmActiveCats(cats).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Btn size="sm" onClick={bulkMove}>Move</Btn>
          <button onClick={()=>setSelected({})} className="text-xs text-gray-400 hover:underline">Clear</button>
        </div>
      )}

      {mats.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">📦</p><p className="text-sm">No items match.</p></div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="p-3 w-8"><input type="checkbox" checked={mats.length>0 && mats.every(m=>selected[m.id])} onChange={e=>{ const on=e.target.checked; const next={}; if(on) mats.forEach(m=>next[m.id]=true); setSelected(next); }}/></th>
                <th className="text-left p-3 font-semibold">Item</th>
                <th className="text-left p-3 font-semibold">SKU</th>
                <th className="text-left p-3 font-semibold">Category</th>
                <th className="text-right p-3 font-semibold">Cost</th>
                <th className="text-left p-3 font-semibold">Inventory</th>
                <th className="text-center p-3 font-semibold">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {mats.map(m=>{
                const av = PM_AVAIL[m.availabilityStatus] || PM_AVAIL.in_stock;
                const low = m.inventoryTracking && m.quantityAvailable <= m.lowStockThreshold;
                return (
                  <tr key={m.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="p-3 text-center"><input type="checkbox" checked={!!selected[m.id]} onChange={e=>setSelected(s=>({...s,[m.id]:e.target.checked}))}/></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {m.imageUrl ? <img src={m.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover"/> : <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800"/>}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">{m.name}</p>
                          {m.hasVariants && <p className="text-[10px] text-gray-400">{m.variants.length} variants</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-gray-400">{m.sku||'—'}</td>
                    <td className="p-3 text-gray-500">{catName(m.categoryId)}</td>
                    <td className="p-3 text-right font-semibold text-gray-700 dark:text-gray-300">{pmMoney(m.unitCost)}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${av.cls}`}>{av.label}</span>
                      {m.inventoryTracking && <span className={`ml-1 text-[11px] ${low?'text-red-500 font-bold':'text-gray-400'}`}>{m.quantityAvailable} left</span>}
                    </td>
                    <td className="p-3 text-center">{m.isActive ? '✅' : '⛔'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={()=>setEditing(m)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"><Ic n="edit" cls="w-3.5 h-3.5"/></button>
                        {m.inventoryTracking && <button onClick={()=>setAdjusting(m)} title="Adjust inventory" className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"><Ic n="download" cls="w-3.5 h-3.5"/></button>}
                        <button onClick={()=>duplicate(m)} title="Duplicate" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"><Ic n="tag" cls="w-3.5 h-3.5"/></button>
                        <button onClick={()=>toggleActive(m)} title={m.isActive?'Deactivate':'Activate'} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"><Ic n={m.isActive?'x':'check'} cls="w-3.5 h-3.5"/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <PromoMaterialModal material={editing} onClose={()=>setEditing(null)}/>}
      {adjusting && <PromoInventoryModal material={adjusting} onClose={()=>setAdjusting(null)}/>}
    </div>
  );
}

// ── Add/Edit material modal ──────────────────────────────────────────────────
function PromoMaterialModal({ material, onClose }) {
  const { state, dispatch } = useApp();
  const isNew = !material.id;
  const [f, setF] = React.useState({
    id: material.id, name: material.name||'', sku: material.sku||'', categoryId: material.categoryId||'',
    shortDescription: material.shortDescription||'', description: material.description||'', imageUrl: material.imageUrl||'',
    unitOfMeasure: material.unitOfMeasure||'Each', packSize: material.packSize||'', unitCost: material.unitCost||'',
    minimumOrderQuantity: material.minimumOrderQuantity||1, maximumOrderQuantity: material.maximumOrderQuantity||'',
    inventoryTracking: material.inventoryTracking||false, quantityAvailable: material.quantityAvailable||0,
    lowStockThreshold: material.lowStockThreshold||0, availabilityStatus: material.availabilityStatus||'in_stock',
    hasVariants: material.hasVariants||false, isActive: material.isActive!==false, sortOrder: material.sortOrder||0,
    internalNotes: material.internalNotes||'',
  });
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [addCat, setAddCat] = React.useState(false);
  const set = (k,v) => setF(x=>({...x,[k]:v}));
  const isAdmin = state.user?.role === 'admin';

  // Active categories in display order, plus the item's current category if it's now inactive
  const activeCats = pmActiveCats(state.promoCategories);
  const currentCat = (state.promoCategories||[]).find(c=>c.id===f.categoryId);
  const catOptions = [...activeCats.map(c=>({value:c.id,label:c.name})),
    ...(currentCat && !currentCat.isActive ? [{value:currentCat.id,label:currentCat.name+' (inactive)'}] : [])];

  async function pickImage(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const url = await dbUploadPromoImage(file); set('imageUrl', url); showToast(dispatch, 'Photo uploaded'); }
    catch(err) { showToast(dispatch, String(err.message||err), 'error'); }
    finally { setUploading(false); e.target.value=''; }
  }
  async function save() {
    if (!f.name.trim()) { showToast(dispatch, 'Name is required', 'error'); return; }
    if (!f.categoryId) { showToast(dispatch, 'Please select a category', 'error'); return; }
    // Auto-assign a SKU if left blank
    const payload = { ...f, sku: f.sku.trim() || pmGenerateSku(state.promoCategories, f.categoryId, state.promoMaterials) };
    setBusy(true);
    try { await dbSavePromoMaterial(dispatch, payload, state.user?.id); showToast(dispatch, isNew?`Item created (SKU ${payload.sku})`:'Item saved'); onClose(); }
    catch(e) { const m=String(e.message||e); showToast(dispatch, /inactive/i.test(m)?'This category is inactive and cannot be assigned to new promotional materials.':m, 'error'); }
    finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title={isNew?'Add Promotional Material':'Edit Item'} width="max-w-2xl">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FInput label="Item name" value={f.name} onChange={v=>set('name',v)} required/>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">SKU / Item number</label>
              <button type="button" onClick={()=>set('sku', pmGenerateSku(state.promoCategories, f.categoryId, state.promoMaterials))} className="text-[11px] text-teal-600 hover:underline">Auto-generate</button>
            </div>
            <input value={f.sku} onChange={e=>set('sku', e.target.value)} placeholder="Leave blank to auto-assign"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400"/>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Category <span className="text-red-400">*</span></label>
              {isAdmin && <button type="button" onClick={()=>setAddCat(true)} className="text-[11px] text-teal-600 hover:underline">＋ Add New Category</button>}
            </div>
            <select value={f.categoryId} onChange={e=>set('categoryId', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400">
              <option value="">— Select category —</option>
              {catOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <FSelect label="Unit of measure" value={f.unitOfMeasure} onChange={v=>set('unitOfMeasure',v)} options={PM_UOM}/>
        </div>
        <FInput label="Short description" value={f.shortDescription} onChange={v=>set('shortDescription',v)}/>
        <FInput label="Detailed description" value={f.description} onChange={v=>set('description',v)} rows={2}/>
        {/* Photo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product photo</label>
          <div className="flex items-center gap-3">
            {f.imageUrl && <img src={f.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700"/>}
            <label className="cursor-pointer px-3 py-2 text-xs rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-teal-400">
              {uploading?'Uploading…':(f.imageUrl?'Replace photo':'Upload photo')}
              <input type="file" accept="image/*" className="hidden" onChange={pickImage}/>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FInput label="Cost per unit" type="number" value={f.unitCost} onChange={v=>set('unitCost',v)}/>
          <FInput label="Pack size" type="number" value={f.packSize} onChange={v=>set('packSize',v)}/>
          <FInput label="Min order qty" type="number" value={f.minimumOrderQuantity} onChange={v=>set('minimumOrderQuantity',v)}/>
          <FInput label="Max per order" type="number" value={f.maximumOrderQuantity} onChange={v=>set('maximumOrderQuantity',v)}/>
        </div>
        {/* Inventory */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={f.inventoryTracking} onChange={e=>set('inventoryTracking', e.target.checked)}/>
            Track inventory for this item
          </label>
          {f.inventoryTracking && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <FInput label="Quantity available" type="number" value={f.quantityAvailable} onChange={v=>set('quantityAvailable',v)}/>
              <FInput label="Low-stock threshold" type="number" value={f.lowStockThreshold} onChange={v=>set('lowStockThreshold',v)}/>
              {!isNew && <p className="text-[10px] text-gray-400 col-span-full">Tip: use “Adjust inventory” on the list for tracked changes with a reason + history. Editing the number here sets it directly.</p>}
            </div>
          )}
          <FSelect label="Availability status" value={f.availabilityStatus} onChange={v=>set('availabilityStatus',v)}
            options={[{value:'in_stock',label:'In stock'},{value:'low_stock',label:'Low stock'},{value:'out_of_stock',label:'Out of stock'},{value:'by_request',label:'Available by request'},{value:'unavailable',label:'Temporarily unavailable'}]}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Sort order" type="number" value={f.sortOrder} onChange={v=>set('sortOrder',v)}/>
          <label className="flex items-end gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer pb-2">
            <input type="checkbox" checked={f.isActive} onChange={e=>set('isActive', e.target.checked)}/>
            Active (visible to reps)
          </label>
        </div>
        <FInput label="Internal admin notes" value={f.internalNotes} onChange={v=>set('internalNotes',v)} rows={2}/>
        {!isNew && f.hasVariants && <PromoVariantEditor material={material}/>}
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy?'Saving…':'Save Item'}</Btn>
        </div>
      </div>
      {/* Add-category shortcut — preserves this form and auto-selects the new category */}
      {addCat && <PromoCategoryModal category={null} onClose={()=>setAddCat(false)} onSaved={c=>{ if(c) set('categoryId', c.id); }}/>}
    </Modal>
  );
}

// ── Variant editor (apparel) ─────────────────────────────────────────────────
function PromoVariantEditor({ material }) {
  const { dispatch } = useApp();
  const [rows, setRows] = React.useState(material.variants || []);
  const [blank, setBlank] = React.useState({ colour:'', size:'', fit:'Unisex', quantityAvailable:0, lowStockThreshold:5 });
  async function add() {
    if (!blank.size && !blank.colour) { showToast(dispatch, 'Add a size or colour', 'error'); return; }
    try { await dbSavePromoVariant(material.id, blank); showToast(dispatch, 'Variant added — reload to see updated stock'); setRows(r=>[...r,{...blank, id:'tmp'+Date.now(), label:[blank.colour,blank.size,blank.fit].filter(Boolean).join(' · ')}]); setBlank({ colour:'', size:'', fit:'Unisex', quantityAvailable:0, lowStockThreshold:5 }); }
    catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
  }
  async function del(v) { if (v.id.startsWith('tmp')) { setRows(r=>r.filter(x=>x!==v)); return; } await dbDeletePromoVariant(v.id); setRows(r=>r.filter(x=>x.id!==v.id)); }
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
      <p className="text-xs font-semibold text-gray-500 mb-2">Variants (size / colour)</p>
      <div className="space-y-1 mb-2">
        {rows.map(v=>(
          <div key={v.id} className="flex items-center gap-2 text-xs">
            <span className="flex-1">{v.label || [v.colour,v.size,v.fit].filter(Boolean).join(' · ')}</span>
            <span className="text-gray-400">{v.quantityAvailable} in stock</span>
            <button onClick={()=>del(v)} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        <input placeholder="Colour" value={blank.colour} onChange={e=>setBlank(b=>({...b,colour:e.target.value}))} className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
        <input placeholder="Size" value={blank.size} onChange={e=>setBlank(b=>({...b,size:e.target.value}))} className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
        <input placeholder="Fit" value={blank.fit} onChange={e=>setBlank(b=>({...b,fit:e.target.value}))} className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
        <input placeholder="Qty" type="number" value={blank.quantityAvailable} onChange={e=>setBlank(b=>({...b,quantityAvailable:e.target.value}))} className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
        <button onClick={add} className="px-2 py-1 text-xs font-semibold rounded bg-teal-600 text-white hover:bg-teal-700">Add</button>
      </div>
    </div>
  );
}

// ── Inventory adjust modal ───────────────────────────────────────────────────
function PromoInventoryModal({ material, onClose }) {
  const { dispatch } = useApp();
  const [variantId, setVariantId] = React.useState('');
  const [delta, setDelta] = React.useState('');
  const [reason, setReason] = React.useState('Restock');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  async function apply() {
    const d = parseInt(delta);
    if (!d) { showToast(dispatch, 'Enter a quantity (+ to add, − to remove)', 'error'); return; }
    setBusy(true);
    try {
      await dbAdjustPromoInventory(material.id, variantId||null, d, reason, note);
      await dbLoadPromo(dispatch, true);
      showToast(dispatch, `Inventory adjusted by ${d>0?'+':''}${d}`);
      onClose();
    } catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
    finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Adjust inventory · ${material.name}`}>
      <div className="space-y-3">
        {material.hasVariants && material.variants.length>0 && (
          <FSelect label="Variant" value={variantId} onChange={setVariantId} options={material.variants.map(v=>({value:v.id,label:`${v.label} (${v.quantityAvailable} in stock)`}))}/>
        )}
        <p className="text-xs text-gray-500">Current: <strong>{variantId ? material.variants.find(v=>v.id===variantId)?.quantityAvailable : material.quantityAvailable}</strong> available</p>
        <FInput label="Quantity added (+) or removed (−)" type="number" value={delta} onChange={setDelta} placeholder="e.g. 100 or -20"/>
        <FSelect label="Reason" value={reason} onChange={setReason} options={['Restock','Damaged','Lost','Correction','Event usage','Other']}/>
        <FInput label="Note (optional)" value={note} onChange={setNote}/>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={apply} disabled={busy}>{busy?'Applying…':'Apply Adjustment'}</Btn></div>
      </div>
    </Modal>
  );
}

// ── Category add/edit modal (reused by the page and the item-form shortcut) ──
function PromoCategoryModal({ category, onClose, onSaved }) {
  const { state, dispatch } = useApp();
  const isNew = !category?.id;
  const [f, setF] = React.useState({
    id: category?.id, name: category?.name||'', description: category?.description||'',
    internalNotes: category?.internalNotes||'', sortOrder: category?.sortOrder!=null?category.sortOrder:((state.promoCategories||[]).length+1),
    isActive: category?.isActive!==false,
  });
  const [busy, setBusy] = React.useState(false);
  const set = (k,v)=>setF(x=>({...x,[k]:v}));
  async function save() {
    if (!f.name.trim()) { showToast(dispatch, 'Category name is required.', 'error'); return; }
    // client-side duplicate guard among active categories
    const norm = f.name.trim().replace(/\s+/g,' ').toLowerCase();
    const clash = (state.promoCategories||[]).find(c=>c.id!==f.id && c.isActive && c.normalizedName===norm);
    if (clash && f.isActive) { showToast(dispatch, 'A category with this name already exists.', 'error'); return; }
    setBusy(true);
    try {
      const saved = await dbSavePromoCategory(dispatch, f, state.user?.id, category);
      showToast(dispatch, isNew?'Category created':'Category saved');
      if (onSaved) onSaved(saved);
      onClose();
    } catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
    finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={isNew?'Add Category':'Edit Category'}>
      <div className="space-y-3">
        <FInput label="Category name" value={f.name} onChange={v=>set('name',v)} required/>
        <FInput label="Description" value={f.description} onChange={v=>set('description',v)} rows={2}/>
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Display order" type="number" value={f.sortOrder} onChange={v=>set('sortOrder',v)}/>
          <label className="flex items-end gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer pb-2">
            <input type="checkbox" checked={f.isActive} onChange={e=>set('isActive', e.target.checked)}/> Active
          </label>
        </div>
        <FInput label="Internal admin notes (optional)" value={f.internalNotes} onChange={v=>set('internalNotes',v)} rows={2}/>
        <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy?'Saving…':'Save Category'}</Btn></div>
      </div>
    </Modal>
  );
}

// ── Manage Categories page (admin) ───────────────────────────────────────────
function PromoCategoriesView() {
  const { state, dispatch } = useApp();
  const isAdmin = state.user?.role === 'admin';
  const [search, setSearch] = React.useState('');
  const [statusF, setStatusF] = React.useState('all');
  const [editing, setEditing] = React.useState(null);
  if (!isAdmin) return <div className="p-8 text-center text-gray-400 text-sm">You do not have permission to manage promotional material categories.</div>;

  const mats = state.promoMaterials || [];
  const cats = pmSortedCats(state.promoCategories).filter(c=>{
    if (search && !`${c.name} ${c.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusF==='active' && !c.isActive) return false;
    if (statusF==='inactive' && c.isActive) return false;
    return true;
  });
  const ordered = pmSortedCats(state.promoCategories);

  async function move(cat, dir) {
    const idx = ordered.findIndex(c=>c.id===cat.id);
    const swap = ordered[idx+dir];
    if (!swap) return;
    try {
      await dbReorderCategory(dispatch, cat, swap.sortOrder, state.user?.id);
      await dbReorderCategory(dispatch, swap, cat.sortOrder, state.user?.id);
    } catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
  }
  async function toggleActive(cat) {
    if (cat.isActive) {
      const active = pmCatActiveItemCount(mats, cat.id);
      if (active > 0 && !confirm(`This category currently contains ${active} active promotional material${active!==1?'s':''}. The category will no longer appear to sales representatives. Existing items and order history will not be deleted.`)) return;
    }
    try { await dbSetCategoryActive(dispatch, cat, !cat.isActive, state.user?.id); showToast(dispatch, cat.isActive?'Deactivated':'Activated'); }
    catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
  }
  async function del(cat) {
    const count = pmCatItemCount(mats, cat.id);
    if (count > 0) { showToast(dispatch, 'This category cannot be deleted because promotional materials are assigned to it.', 'error'); return; }
    if (!confirm(`Permanently delete “${cat.name}”? This cannot be undone.`)) return;
    try { await dbDeletePromoCategory(dispatch, cat.id); showToast(dispatch, 'Category deleted'); }
    catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-4xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 sm:p-6 mb-5 text-white shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><h1 className="text-xl font-black tracking-tight">Manage Promotional Material Categories</h1><p className="text-xs text-teal-100/70 mt-0.5">{ordered.length} categories</p></div>
          <button onClick={()=>setEditing({})} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-[#2E8A97] hover:bg-teal-50 transition">＋ Add Category</button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2 mb-4 shadow-sm">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search categories…" className="flex-1 min-w-[140px] px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
        <select value={statusF} onChange={e=>setStatusF(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
      </div>
      {cats.length===0 ? <div className="text-center py-12 text-gray-400 text-sm">No categories match.</div> : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {cats.map((c,i)=>{
            const total = pmCatItemCount(mats, c.id); const activeItems = pmCatActiveItemCount(mats, c.id);
            const canDelete = total===0;
            const gi = ordered.findIndex(x=>x.id===c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 p-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                <div className="flex flex-col">
                  <button onClick={()=>move(c,-1)} disabled={gi===0} className="text-gray-300 hover:text-teal-600 disabled:opacity-30 leading-none">▲</button>
                  <button onClick={()=>move(c,1)} disabled={gi===ordered.length-1} className="text-gray-300 hover:text-teal-600 disabled:opacity-30 leading-none">▼</button>
                </div>
                <span className="text-[10px] text-gray-300 w-5 text-center">{c.sortOrder}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{c.name}</p>
                    {!c.isActive && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 dark:bg-gray-700">INACTIVE</span>}</div>
                  {c.description && <p className="text-[11px] text-gray-400 truncate">{c.description}</p>}
                </div>
                <span className="text-[11px] text-gray-400">{total} item{total!==1?'s':''}{activeItems!==total?` (${activeItems} active)`:''}</span>
                <div className="flex items-center gap-1">
                  <button onClick={()=>setEditing(c)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"><Ic n="edit" cls="w-3.5 h-3.5"/></button>
                  <button onClick={()=>toggleActive(c)} title={c.isActive?'Deactivate':'Activate'} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"><Ic n={c.isActive?'x':'check'} cls="w-3.5 h-3.5"/></button>
                  <button onClick={()=>del(c)} disabled={!canDelete} title={canDelete?'Delete (unused)':'In use — deactivate instead'} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30"><Ic n="trash" cls="w-3.5 h-3.5"/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && <PromoCategoryModal category={editing.id?editing:null} onClose={()=>setEditing(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  2. REP — ORDER PROMOTIONAL MATERIALS (shop + cart + review + submit)
// ══════════════════════════════════════════════════════════════════════════════
function OrderPromoMaterialsView() {
  const { state, dispatch } = useApp();
  const user = state.user || {};
  const isAdmin = user.role === 'admin';
  const showCost = isAdmin || state.promoRepCostVisible;
  const DRAFT_KEY = 'pm_draft_' + (user.id||'x');

  const [search, setSearch] = React.useState('');
  const [catFilter, setCatFilter] = React.useState('all');
  const [availOnly, setAvailOnly] = React.useState(false);
  const [cart, setCart] = React.useState(() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY))?.cart || []; } catch { return []; } });
  const [detailItem, setDetailItem] = React.useState(null);
  const [checkout, setCheckout] = React.useState(false);

  // Persist draft cart locally
  React.useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ cart })); } catch {} }, [cart]);

  const cats = state.promoCategories || [];
  const catName = id => pmCatName(cats, id);
  const shopItems = (state.promoMaterials || []).filter(m => m.isActive && m.availabilityStatus !== 'unavailable');
  // Rep filter: only active categories that contain at least one active item, in display order
  const filterCats = pmActiveCats(cats)
    .map(c => ({ ...c, count: shopItems.filter(m=>m.categoryId===c.id).length }))
    .filter(c => c.count > 0);
  const items = shopItems.filter(m => {
    if (search && !`${m.name} ${m.shortDescription} ${m.sku}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== 'all' && m.categoryId !== catFilter) return false;
    if (availOnly && m.inventoryTracking && m.quantityAvailable <= 0) return false;
    return true;
  });

  const cartCount = cart.reduce((s,i)=>s+i.quantity, 0);

  function addToCart(mat, variant, qty) {
    const min = mat.minimumOrderQuantity || 1;
    const q = Math.max(min, parseInt(qty)||min);
    const stock = pmEffectiveStock(mat, variant);
    if (q > stock) { showToast(dispatch, `Only ${stock} in stock`, 'error'); return; }
    if (mat.maximumOrderQuantity && q > mat.maximumOrderQuantity) { showToast(dispatch, `Max ${mat.maximumOrderQuantity} per order`, 'error'); return; }
    const key = mat.id + (variant?('|'+variant.id):'');
    setCart(c => {
      const ex = c.find(x=>x.key===key);
      if (ex) return c.map(x=>x.key===key?{...x, quantity:x.quantity+q}:x);
      return [...c, { key, materialId:mat.id, variantId:variant?.id||null, name:mat.name,
        variantLabel:variant?.label||'', sku:variant?.sku||mat.sku, unitCost:mat.unitCost,
        imageUrl:mat.imageUrl, unitOfMeasure:mat.unitOfMeasure, inventoryTracked:variant?variant.inventoryTracking:mat.inventoryTracking,
        stock, quantity:q }];
    });
    showToast(dispatch, `Added ${q} × ${mat.name}`);
  }
  function setQty(key, q) { setCart(c=>c.map(x=>x.key===key?{...x, quantity:Math.max(1, parseInt(q)||1)}:x)); }
  function removeItem(key) { setCart(c=>c.filter(x=>x.key!==key)); }

  if (checkout) return <PromoCheckout cart={cart} showCost={showCost} onBack={()=>setCheckout(false)}
    onDone={()=>{ setCart([]); try{localStorage.removeItem(DRAFT_KEY);}catch{}; setCheckout(false); dispatch({type:'NAV',view:'my-promo-orders'}); }}/>;

  return (
    <div className="p-4 sm:p-6 pb-32 lg:pb-6 max-w-6xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 sm:p-6 mb-5 text-white shadow-sm">
        <h1 className="text-xl font-black tracking-tight">Order Promotional Materials</h1>
        <p className="text-xs text-teal-100/70 mt-0.5">Browse the library and build your order</p>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2 mb-4 shadow-sm sticky top-0 z-10">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search materials…"
          className="flex-1 min-w-[140px] px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <option value="all">All Categories</option>
          {filterCats.map(c=><option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={availOnly} onChange={e=>setAvailOnly(e.target.checked)}/> Available only</label>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🔍</p><p className="text-sm">No materials match your search.</p></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(m => <PromoShopCard key={m.id} mat={m} catName={catName(m.categoryId)} showCost={showCost} onAdd={addToCart} onDetail={()=>setDetailItem(m)}/>)}
        </div>
      )}

      {/* Cart bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 lg:bottom-4 left-0 right-0 px-4 z-20 no-print">
          <div className="max-w-6xl mx-auto bg-[#2E8A97] text-white rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold">{cartCount}</span>
              <span className="text-sm font-semibold">{cart.length} item{cart.length!==1?'s':''} in order</span>
            </div>
            <button onClick={()=>setCheckout(true)} className="px-4 py-2 text-sm font-bold rounded-xl bg-white text-[#2E8A97] hover:bg-teal-50 transition">Review Order →</button>
          </div>
        </div>
      )}

      {detailItem && <PromoDetailModal mat={detailItem} showCost={showCost} onClose={()=>setDetailItem(null)} onAdd={addToCart}/>}
    </div>
  );
}

function PromoShopCard({ mat, catName, showCost, onAdd, onDetail }) {
  const [qty, setQty] = React.useState(mat.minimumOrderQuantity || 1);
  const [variantId, setVariantId] = React.useState('');
  const variant = mat.variants.find(v=>v.id===variantId);
  const stock = pmEffectiveStock(mat, variant);
  const out = mat.inventoryTracking && (mat.hasVariants ? (variant && stock<=0) : stock<=0);
  const needsVariant = mat.hasVariants && !variantId;
  const av = PM_AVAIL[mat.availabilityStatus] || PM_AVAIL.in_stock;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="relative cursor-pointer" onClick={onDetail}>
        {mat.imageUrl ? <img src={mat.imageUrl} alt={mat.name} className="w-full h-32 object-cover"/> : <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl">📦</div>}
        <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${av.cls}`}>{av.label}</span>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{catName}</p>
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight cursor-pointer" onClick={onDetail}>{mat.name}</p>
        {mat.shortDescription && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{mat.shortDescription}</p>}
        <p className="text-[11px] text-gray-400 mt-1">{mat.unitOfMeasure}{mat.packSize?` · pack of ${mat.packSize}`:''}{showCost?` · ${pmMoney(mat.unitCost)}`:''}</p>
        {mat.inventoryTracking && !mat.hasVariants && <p className={`text-[11px] mt-0.5 ${stock<=0?'text-red-500 font-bold':stock<=mat.lowStockThreshold?'text-amber-500':'text-gray-400'}`}>{stock<=0?'Out of stock':`${stock} available`}</p>}
        {!mat.inventoryTracking && mat.availabilityStatus==='by_request' && <p className="text-[11px] text-blue-500 mt-0.5">Available by request</p>}
        {mat.hasVariants && (
          <select value={variantId} onChange={e=>setVariantId(e.target.value)} className="mt-2 w-full px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <option value="">Select variant…</option>
            {mat.variants.filter(v=>v.isActive).map(v=><option key={v.id} value={v.id} disabled={v.inventoryTracking && v.quantityAvailable<=0}>{v.label} {v.inventoryTracking?`(${v.quantityAvailable})`:''}</option>)}
          </select>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <input type="number" min={mat.minimumOrderQuantity||1} value={qty} onChange={e=>setQty(e.target.value)}
            className="w-14 px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
          <button onClick={()=>onAdd(mat, variant, qty)} disabled={out || needsVariant}
            className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 transition">
            {out ? 'Out of stock' : needsVariant ? 'Pick variant' : '＋ Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromoDetailModal({ mat, showCost, onClose, onAdd }) {
  const [qty, setQty] = React.useState(mat.minimumOrderQuantity||1);
  const [variantId, setVariantId] = React.useState('');
  const variant = mat.variants.find(v=>v.id===variantId);
  return (
    <Modal open onClose={onClose} title={mat.name}>
      <div className="space-y-3">
        {mat.imageUrl && <img src={mat.imageUrl} alt={mat.name} className="w-full h-52 object-cover rounded-xl"/>}
        {mat.description && <p className="text-sm text-gray-600 dark:text-gray-300">{mat.description}</p>}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p className="text-gray-400">SKU: <span className="text-gray-600 dark:text-gray-300 font-mono">{mat.sku||'—'}</span></p>
          <p className="text-gray-400">Unit: <span className="text-gray-600 dark:text-gray-300">{mat.unitOfMeasure}</span></p>
          {mat.packSize && <p className="text-gray-400">Pack size: <span className="text-gray-600 dark:text-gray-300">{mat.packSize}</span></p>}
          {showCost && <p className="text-gray-400">Cost: <span className="text-gray-600 dark:text-gray-300">{pmMoney(mat.unitCost)}</span></p>}
          {mat.inventoryTracking && !mat.hasVariants && <p className="text-gray-400">In stock: <span className="text-gray-600 dark:text-gray-300">{mat.quantityAvailable}</span></p>}
        </div>
        {mat.hasVariants && (
          <FSelect label="Variant" value={variantId} onChange={setVariantId} options={mat.variants.filter(v=>v.isActive).map(v=>({value:v.id,label:`${v.label} ${v.inventoryTracking?`(${v.quantityAvailable} in stock)`:''}`}))}/>
        )}
        <div className="flex items-center gap-2">
          <input type="number" min={mat.minimumOrderQuantity||1} value={qty} onChange={e=>setQty(e.target.value)} className="w-20 px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
          <Btn onClick={()=>{ onAdd(mat, variant, qty); onClose(); }} disabled={mat.hasVariants && !variantId} cls="flex-1">＋ Add to Order</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── Checkout: Order For + shipping + notes + review + submit ──────────────────
function PromoCheckout({ cart, showCost, onBack, onDone }) {
  const { state, dispatch } = useApp();
  const user = state.user || {};
  const myRegions = user.regions || [];
  const [step, setStep] = React.useState('details'); // details | review
  const [busy, setBusy] = React.useState(false);
  const [orderFor, setOrderFor] = React.useState('rep');
  const [accountId, setAccountId] = React.useState('');
  const [acctSearch, setAcctSearch] = React.useState('');
  const [regionId, setRegionId] = React.useState(myRegions[0]||'');
  const [ship, setShip] = React.useState({
    name: user.name||'', company:'', address1:'', address2:'', city:'', province:'', postal:'', country:'Canada',
    phone:'', email: user.email||'', instructions:'',
  });
  const [notes, setNotes] = React.useState('');
  const [event, setEvent] = React.useState('');
  const [deliveryDate, setDeliveryDate] = React.useState('');
  const setS = (k,v)=>setShip(x=>({...x,[k]:v}));

  // reps only see their own accounts/regions
  const myAccounts = (state.accounts||[]).filter(a => user.role==='admin' || a.assignedRep===user.id);
  const acctResults = acctSearch ? myAccounts.filter(a=>`${a.name} ${a.region}`.toLowerCase().includes(acctSearch.toLowerCase())).slice(0,8) : [];
  const selectedAcct = myAccounts.find(a=>a.id===accountId);
  const regionOpts = (state.regions||[]).filter(r => user.role==='admin' || myRegions.includes(r.id));
  const total = cart.reduce((s,i)=>s + i.unitCost*i.quantity, 0);

  function validate() {
    if (!cart.length) return 'Add at least one item';
    if (!ship.name.trim()) return 'Representative name is required';
    if (!ship.address1.trim()) return 'Shipping address is required';
    if (!ship.city.trim()) return 'City is required';
    if (!ship.province.trim()) return 'Province/state is required';
    if (!ship.postal.trim()) return 'Postal/ZIP code is required';
    if (!ship.country.trim()) return 'Country is required';
    if (!/.+@.+\..+/.test(ship.email)) return 'A valid email is required';
    if (!orderFor) return 'Choose who the order is for';
    if (orderFor==='account' && !accountId) return 'Select a customer account';
    if (orderFor==='region' && !regionId) return 'Select a region';
    for (const i of cart) {
      if (i.inventoryTracked && i.quantity > i.stock) return `${i.name}: only ${i.stock} in stock`;
    }
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) { showToast(dispatch, err, 'error'); return; }
    setBusy(true);
    try {
      const order = {
        representative_name: ship.name, order_for_type: orderFor,
        account_id: orderFor==='account'?accountId:null, region_id: orderFor==='region'?regionId:null,
        shipping_company:ship.company, shipping_address1:ship.address1, shipping_address2:ship.address2,
        shipping_city:ship.city, shipping_province:ship.province, shipping_postal_code:ship.postal,
        shipping_country:ship.country, shipping_phone:ship.phone, shipping_email:ship.email,
        delivery_instructions:ship.instructions, representative_notes:notes,
        requested_delivery_date: deliveryDate||null, event_or_program_name:event,
      };
      const items = cart.map(i => ({
        material_id:i.materialId, variant_id:i.variantId, quantity:i.quantity, name:i.name, sku:i.sku,
        unit_cost:i.unitCost, variant_label:i.variantLabel, inventory_tracked:!!i.inventoryTracked,
      }));
      const res = await dbSubmitPromoOrder(order, items);
      await dbLoadPromo(dispatch, user.role==='admin');
      // Notify submitter + the configured promo-order recipients (Settings → Promo Order Notifications).
      // If none are configured yet, fall back to all admins so orders are never silently unseen.
      notifyPromo({ toEmail: ship.email, title:'Promo order submitted', orderNumber:res.order_number, statusOrNote:'Submitted' });
      const promoRecipIds = (state.promoSettings && state.promoSettings.orderNotifyRecipientIds) || [];
      const promoRecipients = promoRecipIds.length
        ? (state.users||[]).filter(u=>promoRecipIds.includes(u.id) && u.email)
        : (state.users||[]).filter(u=>u.role==='admin' && u.email);
      promoRecipients.forEach(u=>notifyPromo({ toEmail:u.email, title:'New promo order', orderNumber:res.order_number, statusOrNote:`From ${ship.name}` }));
      showToast(dispatch, `✅ Order ${res.order_number} submitted!`);
      onDone();
    } catch(e) { showToast(dispatch, 'Submit failed: ' + String(e.message||e), 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto">
      <button onClick={onBack} className="text-xs text-teal-600 hover:underline mb-3">← Back to materials</button>
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 mb-5 text-white shadow-sm">
        <h1 className="text-xl font-black tracking-tight">{step==='review'?'Review & Submit':'Order Details'}</h1>
        <p className="text-xs text-teal-100/70 mt-0.5">{cart.reduce((s,i)=>s+i.quantity,0)} units · {cart.length} item{cart.length!==1?'s':''}{showCost?` · est. ${pmMoney(total)}`:''}</p>
      </div>

      {step === 'details' ? (
        <div className="space-y-4">
          {/* Cart lines */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Items</p>
            {cart.map(i=>(
              <div key={i.key} className="flex items-center gap-3">
                {i.imageUrl ? <img src={i.imageUrl} className="w-10 h-10 rounded-lg object-cover"/> : <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800"/>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{i.name}</p>
                  {i.variantLabel && <p className="text-[11px] text-gray-400">{i.variantLabel}</p>}
                  <p className="text-[11px] text-gray-400">Qty {i.quantity}{i.inventoryTracked && i.stock!==Infinity?` · ${i.stock} in stock`:''}{showCost?` · ${pmMoney(i.unitCost*i.quantity)}`:''}</p>
                </div>
                <span className="text-sm font-semibold text-gray-500">×{i.quantity}</span>
              </div>
            ))}
          </div>

          {/* Order For */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order For <span className="text-red-400">*</span></p>
            <div className="flex gap-2 flex-wrap mb-3">
              {[['account','Customer Account'],['region','Sales Region'],['rep','Representative Inventory']].map(([k,l])=>(
                <button key={k} onClick={()=>setOrderFor(k)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${orderFor===k?'bg-teal-600 border-teal-600 text-white':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-400'}`}>{l}</button>
              ))}
            </div>
            {orderFor==='account' && (
              <div>
                {selectedAcct ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-sm">
                    <span>{selectedAcct.name} <span className="text-gray-400">· {selectedAcct.region}</span></span>
                    <button onClick={()=>{setAccountId('');setAcctSearch('');}} className="text-xs text-red-400">Change</button>
                  </div>
                ) : (
                  <div>
                    <input value={acctSearch} onChange={e=>setAcctSearch(e.target.value)} placeholder="Search your accounts…" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
                    {acctResults.map(a=>(
                      <button key={a.id} onClick={()=>{setAccountId(a.id);}} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">{a.name} <span className="text-gray-400 text-xs">· {a.region}</span></button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {orderFor==='region' && (
              <FSelect label="" value={regionId} onChange={setRegionId} options={regionOpts.map(r=>({value:r.id,label:r.name}))}/>
            )}
            {orderFor==='rep' && <p className="text-xs text-gray-400">Order will be assigned to you ({user.name}).</p>}
          </div>

          {/* Shipping */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipping</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FInput label="Representative name" value={ship.name} onChange={v=>setS('name',v)} required/>
              <FInput label="Company (optional)" value={ship.company} onChange={v=>setS('company',v)}/>
            </div>
            <FInput label="Address line 1" value={ship.address1} onChange={v=>setS('address1',v)} required/>
            <FInput label="Address line 2 (optional)" value={ship.address2} onChange={v=>setS('address2',v)}/>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FInput label="City" value={ship.city} onChange={v=>setS('city',v)} required/>
              <FInput label="Province/State" value={ship.province} onChange={v=>setS('province',v)} required/>
              <FInput label="Postal/ZIP" value={ship.postal} onChange={v=>setS('postal',v)} required/>
              <FInput label="Country" value={ship.country} onChange={v=>setS('country',v)} required/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FInput label="Phone" value={ship.phone} onChange={v=>setS('phone',v)}/>
              <FInput label="Email" type="email" value={ship.email} onChange={v=>setS('email',v)} required/>
            </div>
            <FInput label="Delivery instructions (optional)" value={ship.instructions} onChange={v=>setS('instructions',v)}/>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Notes</p>
            <FInput label="Notes (e.g. 'Needed for a tasting', shirt-size breakdown…)" value={notes} onChange={setNotes} rows={2}/>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FInput label="Requested delivery date (optional)" type="date" value={deliveryDate} onChange={setDeliveryDate}/>
              <FInput label="Event / program name (optional)" value={event} onChange={setEvent}/>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={onBack}>Cancel</Btn>
            <Btn onClick={()=>{ const e=validate(); if(e){showToast(dispatch,e,'error');return;} setStep('review'); }}>Review Order →</Btn>
          </div>
        </div>
      ) : (
        /* Review */
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-2 text-sm">
            <p><span className="text-gray-400">Rep:</span> {ship.name}</p>
            <p><span className="text-gray-400">Ship to:</span> {ship.address1}{ship.address2?`, ${ship.address2}`:''}, {ship.city}, {ship.province} {ship.postal}, {ship.country}</p>
            <p><span className="text-gray-400">Order for:</span> {orderFor==='account'?`Account — ${selectedAcct?.name}`:orderFor==='region'?`Region — ${regionOpts.find(r=>r.id===regionId)?.name}`:'Representative inventory'}</p>
            {deliveryDate && <p><span className="text-gray-400">Requested delivery:</span> {deliveryDate}</p>}
            {event && <p><span className="text-gray-400">Event:</span> {event}</p>}
            {notes && <p><span className="text-gray-400">Notes:</span> {notes}</p>}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-2">
            {cart.map(i=>(
              <div key={i.key} className="flex items-center gap-3 text-sm">
                {i.imageUrl ? <img src={i.imageUrl} className="w-10 h-10 rounded-lg object-cover"/> : <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800"/>}
                <div className="flex-1"><p className="font-medium text-gray-800 dark:text-gray-200">{i.name}</p>{i.variantLabel && <p className="text-[11px] text-gray-400">{i.variantLabel}</p>}</div>
                <span className="text-gray-500">×{i.quantity}{showCost?` · ${pmMoney(i.unitCost*i.quantity)}`:''}</span>
              </div>
            ))}
            {showCost && <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-sm font-bold"><span>Estimated total</span><span>{pmMoney(total)}</span></div>}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" id="pm-confirm"/> I confirm the order information is correct.</label>
          <div className="flex justify-between gap-2">
            <Btn variant="ghost" onClick={()=>setStep('details')}>← Edit</Btn>
            <Btn onClick={()=>{ if(!document.getElementById('pm-confirm')?.checked){showToast(dispatch,'Please confirm the order is correct','error');return;} submit(); }} disabled={busy}>{busy?'Submitting…':'Submit Order'}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  3. REP — MY PROMOTIONAL MATERIAL ORDERS
// ══════════════════════════════════════════════════════════════════════════════
function MyPromoOrdersView() {
  const { state, dispatch } = useApp();
  const user = state.user || {};
  const [open, setOpen] = React.useState(null);
  const mine = (state.promoOrders||[]).filter(o => o.submittedBy === user.id);

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-4xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 mb-5 text-white shadow-sm">
        <h1 className="text-xl font-black tracking-tight">My Promotional Material Orders</h1>
        <p className="text-xs text-teal-100/70 mt-0.5">{mine.length} order{mine.length!==1?'s':''}</p>
      </div>
      {mine.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">📋</p><p className="text-sm">No orders yet.</p>
          <button onClick={()=>dispatch({type:'NAV',view:'order-promo'})} className="mt-3 px-4 py-2 text-sm font-semibold rounded-xl bg-teal-600 text-white">Order Materials</button>
        </div>
      ) : (
        <div className="space-y-2">
          {mine.map(o=>(
            <button key={o.id} onClick={()=>setOpen(o)} className="w-full text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><p className="text-sm font-bold text-gray-800 dark:text-gray-100 font-mono">{o.orderNumber}</p><PmStatusBadge s={o.status}/></div>
                <p className="text-[11px] text-gray-400 mt-0.5">{o.items.length} items · {o.items.reduce((s,i)=>s+i.quantityRequested,0)} units · {String(o.submittedAt||o.createdAt).slice(0,10)}</p>
              </div>
              {o.trackingNumber && <span className="text-[10px] text-sky-500">📦 {o.trackingNumber}</span>}
            </button>
          ))}
        </div>
      )}
      {open && <PromoOrderDetail order={open} isAdmin={false} onClose={()=>setOpen(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  4. ADMIN — PROMOTIONAL MATERIAL ORDERS
// ══════════════════════════════════════════════════════════════════════════════
function PromoOrdersAdminView() {
  const { state, dispatch } = useApp();
  const isAdmin = state.user?.role === 'admin';
  const [statusF, setStatusF] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [open, setOpen] = React.useState(null);
  if (!isAdmin) return <div className="p-8 text-center text-gray-400 text-sm">Admins only.</div>;

  const acctName = id => (state.accounts||[]).find(a=>a.id===id)?.name || '';
  const regionName = id => (state.regions||[]).find(r=>r.id===id)?.name || '';
  const repName = id => (state.users||[]).find(u=>u.id===id)?.name || '';
  const orders = (state.promoOrders||[]).filter(o => {
    if (statusF !== 'all' && o.status !== statusF) return false;
    if (search) { const q=search.toLowerCase(); if (!`${o.orderNumber} ${o.representativeName} ${acctName(o.accountId)}`.toLowerCase().includes(q)) return false; }
    return true;
  });

  function exportCsv() {
    const rows = [['Order #','Submitted','Representative','Region','Account','Item','SKU','Category','Variant','Qty Requested','Qty Approved','Unit Cost','Extended Cost','Status','Ship City','Ship Province','Requested Delivery','Shipped']];
    orders.forEach(o=>o.items.forEach(i=>{
      rows.push([o.orderNumber, String(o.submittedAt||'').slice(0,10), o.representativeName, regionName(o.regionId), acctName(o.accountId),
        i.name, i.sku, i.categoryNameSnapshot||'', i.variantLabel, i.quantityRequested, i.quantityApproved==null?'':i.quantityApproved, i.unitCost.toFixed(2),
        (i.unitCost*(i.quantityApproved!=null?i.quantityApproved:i.quantityRequested)).toFixed(2), o.status, o.shippingCity, o.shippingProvince,
        o.requestedDeliveryDate||'', String(o.shippedAt||'').slice(0,10)]);
    }));
    pmDownloadCsv(`promo-orders-${pmToday()}.csv`, rows);
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-6xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 sm:p-6 mb-5 text-white shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><h1 className="text-xl font-black tracking-tight">Promotional Material Orders</h1><p className="text-xs text-teal-100/70 mt-0.5">{orders.length} order{orders.length!==1?'s':''}</p></div>
          <button onClick={exportCsv} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-[#2E8A97] hover:bg-teal-50 transition">⬇ Export CSV</button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2 mb-4 shadow-sm">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order #, rep, account…" className="flex-1 min-w-[160px] px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
        <select value={statusF} onChange={e=>setStatusF(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <option value="all">Any status</option>
          {PM_ORDER_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">📦</p><p className="text-sm">No orders.</p></div>
      ) : (
        <div className="space-y-2">
          {orders.map(o=>(
            <button key={o.id} onClick={()=>setOpen(o)} className="w-full text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 font-mono">{o.orderNumber}</p>
                  <PmStatusBadge s={o.status}/>
                </div>
                <p className="text-[11px] text-gray-400">{String(o.submittedAt||'').slice(0,10)}</p>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {o.representativeName} · {o.orderForType==='account'?acctName(o.accountId):o.orderForType==='region'?regionName(o.regionId):'Rep inventory'}
                {' · '}{o.items.length} items · {o.items.reduce((s,i)=>s+i.quantityRequested,0)} units · → {o.shippingCity}, {o.shippingProvince}
                {o.requestedDeliveryDate && ` · needs by ${o.requestedDeliveryDate}`}
              </p>
            </button>
          ))}
        </div>
      )}
      {open && <PromoOrderDetail order={open} isAdmin onClose={()=>setOpen(null)}/>}
    </div>
  );
}

// ── Order detail (shared; admin gets controls) ───────────────────────────────
function PromoOrderDetail({ order: orderProp, isAdmin, onClose }) {
  const { state, dispatch } = useApp();
  // Re-read the order from state so per-line fulfillment changes show live (no re-open).
  const order = (state.promoOrders||[]).find(o=>o.id===orderProp.id) || orderProp;
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState(order.status);
  const [statusNote, setStatusNote] = React.useState('');
  const [tracking, setTracking] = React.useState(order.trackingNumber||'');
  const [carrier, setCarrier] = React.useState(order.shippingCarrier||'');
  const [adminNotes, setAdminNotes] = React.useState(order.internalAdminNotes||'');
  const [approvals, setApprovals] = React.useState(() => Object.fromEntries(order.items.map(i=>[i.id, i.quantityApproved!=null?i.quantityApproved:i.quantityRequested])));
  const showCost = isAdmin || state.promoRepCostVisible;
  const acctName = id => (state.accounts||[]).find(a=>a.id===id)?.name || '';
  const regionName = id => (state.regions||[]).find(r=>r.id===id)?.name || '';

  async function saveStatus() {
    setBusy(true);
    try {
      await dbSetPromoOrderStatus(order.id, status, statusNote, tracking, carrier);
      if (isAdmin && adminNotes !== order.internalAdminNotes) await dbSetPromoAdminNotes(order.id, adminNotes);
      await dbLoadPromo(dispatch, true);
      // notify rep (no internal notes)
      const rep = (state.users||[]).find(u=>u.id===order.submittedBy);
      if (rep?.email) notifyPromo({ toEmail:rep.email, title:'Promo order update', orderNumber:order.orderNumber, statusOrNote:status, repVisibleNote:statusNote });
      showToast(dispatch, 'Order updated');
      onClose();
    } catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
    finally { setBusy(false); }
  }
  async function saveApprovals() {
    setBusy(true);
    try {
      for (const i of order.items) {
        const qty = parseInt(approvals[i.id]);
        if (qty !== i.quantityApproved) await dbApprovePromoLine(i.id, qty, qty>=i.quantityRequested?'Approved':qty>0?'Approved':'Declined');
      }
      await dbLoadPromo(dispatch, true);
      showToast(dispatch, 'Line quantities updated — set overall status above');
      onClose();
    } catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
    finally { setBusy(false); }
  }
  async function setLineFulfillment(itemId, fStatus) {
    setBusy(true);
    try { await dbSetPromoLineFulfillment(itemId, fStatus); await dbLoadPromo(dispatch, true); }
    catch(e){ showToast(dispatch, String(e.message||e), 'error'); }
    finally { setBusy(false); }
  }
  async function setAllFulfillment(fStatus) {
    setBusy(true);
    try { await dbSetPromoOrderFulfillment(order.id, fStatus); await dbLoadPromo(dispatch, true); showToast(dispatch, `All items marked ${fStatus}`); }
    catch(e){ showToast(dispatch, String(e.message||e), 'error'); }
    finally { setBusy(false); }
  }
  async function duplicateToDraft() {
    // rep: rebuild a local cart and jump to ordering
    const key = 'pm_draft_' + (state.user?.id||'x');
    const cart = order.items.map(i=>({ key:i.materialId+(i.variantId?('|'+i.variantId):''), materialId:i.materialId, variantId:i.variantId, name:i.name, variantLabel:i.variantLabel, sku:i.sku, unitCost:i.unitCost, imageUrl:null, unitOfMeasure:'Each', inventoryTracked:false, stock:Infinity, quantity:i.quantityRequested }));
    try { localStorage.setItem(key, JSON.stringify({ cart })); } catch {}
    showToast(dispatch, 'Loaded into a new order');
    onClose(); dispatch({type:'NAV',view:'order-promo'});
  }

  const total = order.items.reduce((s,i)=>s + i.unitCost*(i.quantityApproved!=null?i.quantityApproved:i.quantityRequested), 0);

  return (
    <Modal open onClose={onClose} title={`Order ${order.orderNumber}`} width="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <PmStatusBadge s={order.status}/>
          <span className="text-xs text-gray-400">{String(order.submittedAt||'').slice(0,16).replace('T',' ')}</span>
        </div>
        {/* Summary */}
        <div className="text-sm space-y-1 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3">
          <p><span className="text-gray-400">Rep:</span> {order.representativeName}</p>
          <p><span className="text-gray-400">For:</span> {order.orderForType==='account'?`Account — ${acctName(order.accountId)}`:order.orderForType==='region'?`Region — ${regionName(order.regionId)}`:'Rep inventory'}</p>
          <p><span className="text-gray-400">Ship to:</span> {order.shippingAddress1}{order.shippingAddress2?`, ${order.shippingAddress2}`:''}, {order.shippingCity}, {order.shippingProvince} {order.shippingPostalCode}, {order.shippingCountry}</p>
          {order.shippingPhone && <p><span className="text-gray-400">Phone:</span> {order.shippingPhone}</p>}
          {order.requestedDeliveryDate && <p><span className="text-gray-400">Requested delivery:</span> {order.requestedDeliveryDate}</p>}
          {order.eventOrProgramName && <p><span className="text-gray-400">Event:</span> {order.eventOrProgramName}</p>}
          {order.representativeNotes && <p><span className="text-gray-400">Rep notes:</span> {order.representativeNotes}</p>}
          {order.deliveryInstructions && <p><span className="text-gray-400">Delivery:</span> {order.deliveryInstructions}</p>}
        </div>

        {/* Items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</p>
          {order.items.map(i=>(
            <div key={i.id} className="flex items-center gap-2 text-sm border border-gray-100 dark:border-gray-800 rounded-xl p-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{i.name}</p>
                {i.variantLabel && <p className="text-[11px] text-gray-400">{i.variantLabel}</p>}
                <p className="text-[11px] text-gray-400">Requested {i.quantityRequested}{i.quantityApproved!=null?` · Approved ${i.quantityApproved}`:''}{showCost?` · ${pmMoney(i.unitCost)}/ea`:''}</p>
              </div>
              {isAdmin && ['Submitted','Under Review','Approved','Partially Approved'].includes(order.status) && (
                <input type="number" min={0} max={i.quantityRequested} value={approvals[i.id]} onChange={e=>setApprovals(a=>({...a,[i.id]:e.target.value}))} className="w-16 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" title="Approved qty"/>
              )}
              {showCost && <span className="text-xs text-gray-500 w-16 text-right">{pmMoney(i.unitCost*(i.quantityApproved!=null?i.quantityApproved:i.quantityRequested))}</span>}
              {isAdmin
                ? <select value={i.fulfillmentStatus||'Pending'} disabled={busy} onChange={e=>setLineFulfillment(i.id, e.target.value)} title="Fulfillment"
                    className="text-[11px] px-1.5 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                    {PM_FULFILLMENT.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                : (i.fulfillmentStatus && i.fulfillmentStatus!=='Pending' &&
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">{i.fulfillmentStatus}</span>)}
            </div>
          ))}
          {showCost && <div className="flex justify-between text-sm font-bold pt-1"><span>Total</span><span>{pmMoney(total)}</span></div>}
          {isAdmin && ['Submitted','Under Review','Approved','Partially Approved'].includes(order.status) && (
            <Btn size="sm" variant="secondary" onClick={saveApprovals} disabled={busy}>Save approved quantities</Btn>
          )}
        </div>

        {/* Admin controls */}
        {isAdmin ? (
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Fulfillment</span>
              <Btn size="sm" variant="secondary" disabled={busy} onClick={()=>setAllFulfillment('Shipped')}>📦 Mark all shipped</Btn>
              <Btn size="sm" variant="secondary" disabled={busy} onClick={()=>setAllFulfillment('Delivered')}>✅ Mark all delivered</Btn>
              <span className="text-[11px] text-gray-400">or set each item above</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FSelect label="Status" value={status} onChange={setStatus} options={PM_ORDER_STATUSES}/>
              <FInput label="Status note (visible to rep)" value={statusNote} onChange={setStatusNote}/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FInput label="Tracking number" value={tracking} onChange={setTracking}/>
              <FInput label="Carrier" value={carrier} onChange={setCarrier}/>
            </div>
            <FInput label="Internal admin notes (never shown to reps)" value={adminNotes} onChange={setAdminNotes} rows={2}/>
            <div className="flex justify-between gap-2">
              <button onClick={()=>window.print()} className="text-xs text-gray-400 hover:underline">🖨 Print</button>
              <div className="flex gap-2"><Btn variant="ghost" onClick={onClose}>Close</Btn><Btn onClick={saveStatus} disabled={busy}>{busy?'Saving…':'Save Changes'}</Btn></div>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between gap-2">
            <Btn size="sm" variant="ghost" onClick={duplicateToDraft}>Duplicate to new order</Btn>
            {order.trackingNumber && <span className="text-xs text-sky-500 self-center">📦 {order.shippingCarrier} {order.trackingNumber}</span>}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  5. ADMIN — PROMOTIONAL MATERIAL REPORTING
// ══════════════════════════════════════════════════════════════════════════════
function PromoReportingView() {
  const { state, dispatch } = useApp();
  const isAdmin = state.user?.role === 'admin';
  if (!isAdmin) return <div className="p-8 text-center text-gray-400 text-sm">Admins only.</div>;
  const orders = state.promoOrders || [];
  const mats = state.promoMaterials || [];
  const repName = id => (state.users||[]).find(u=>u.id===id)?.name || '—';
  const regionName = id => (state.regions||[]).find(r=>r.id===id)?.name || '—';
  const acctName = id => (state.accounts||[]).find(a=>a.id===id)?.name || '—';

  // Aggregations
  const lineTotals = {}; const byRep = {}; const byRegion = {}; const byAccount = {}; const byMonth = {}; const itemQty = {}; const byCategory = {};
  orders.forEach(o=>{
    const m = String(o.submittedAt||o.createdAt||'').slice(0,7);
    o.items.forEach(i=>{
      const q = i.quantityApproved!=null?i.quantityApproved:i.quantityRequested;
      const cost = i.unitCost*q;
      const cn = i.categoryNameSnapshot || '—';
      byCategory[cn] = (byCategory[cn]||{q:0,c:0}), byCategory[cn].q+=q, byCategory[cn].c+=cost;
      itemQty[i.name] = (itemQty[i.name]||0)+q;
      byRep[o.submittedBy] = (byRep[o.submittedBy]||0)+cost;
      if (o.regionId) byRegion[o.regionId] = (byRegion[o.regionId]||0)+cost;
      if (o.accountId) byAccount[o.accountId] = (byAccount[o.accountId]||0)+cost;
      if (m) byMonth[m] = (byMonth[m]||{q:0,c:0}), byMonth[m].q+=q, byMonth[m].c+=cost;
    });
  });
  const topItems = Object.entries(itemQty).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const lowStock = mats.filter(m=>m.inventoryTracking && m.quantityAvailable<=m.lowStockThreshold && m.quantityAvailable>0);
  const outStock = mats.filter(m=>m.inventoryTracking && m.quantityAvailable<=0);

  function Section({title, children}) { return <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>{children}</div>; }
  const Row = ({l,r}) => <div className="flex justify-between text-sm py-0.5"><span className="text-gray-600 dark:text-gray-300 truncate">{l}</span><span className="font-semibold text-gray-800 dark:text-gray-100">{r}</span></div>;

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-5xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 mb-5 text-white shadow-sm">
        <h1 className="text-xl font-black tracking-tight">Promotional Material Reporting</h1>
        <p className="text-xs text-teal-100/70 mt-0.5">{orders.length} orders analyzed</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Most ordered items">{topItems.length?topItems.map(([n,q])=><Row key={n} l={n} r={`${q} units`}/>):<p className="text-xs text-gray-400">No data</p>}</Section>
        <Section title="Orders by category">{Object.entries(byCategory).sort((a,b)=>b[1].q-a[1].q).map(([n,v])=><Row key={n} l={n} r={`${v.q} units · ${pmMoney(v.c)}`}/>)||<p className="text-xs text-gray-400">No data</p>}</Section>
        <Section title="Cost by representative">{Object.entries(byRep).sort((a,b)=>b[1]-a[1]).map(([id,c])=><Row key={id} l={repName(id)} r={pmMoney(c)}/>)}</Section>
        <Section title="Cost by region">{Object.entries(byRegion).sort((a,b)=>b[1]-a[1]).map(([id,c])=><Row key={id} l={regionName(id)} r={pmMoney(c)}/>)}</Section>
        <Section title="Cost by account">{Object.entries(byAccount).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,c])=><Row key={id} l={acctName(id)} r={pmMoney(c)}/>)}</Section>
        <Section title="Monthly quantities & cost">{Object.entries(byMonth).sort().reverse().map(([m,v])=><Row key={m} l={m} r={`${v.q} units · ${pmMoney(v.c)}`}/>)}</Section>
        <Section title="Low / out of stock">
          {outStock.map(m=><Row key={m.id} l={`⛔ ${m.name}`} r="0 left"/>)}
          {lowStock.map(m=><Row key={m.id} l={`⚠️ ${m.name}`} r={`${m.quantityAvailable} left`}/>)}
          {!lowStock.length && !outStock.length && <p className="text-xs text-gray-400">All items well stocked</p>}
        </Section>
      </div>
    </div>
  );
}
