// suenos-crm-volumereport.js — Sales Volume Report (admin)
// Runs entirely client-side off state.orders + state.sales + state.accounts +
// state.products. Combines direct purchase orders and imported sales records,
// with live filters (date range, region, source, product, account type) and a
// print-to-PDF export that mirrors the on-screen report.

function VolumeReportView() {
  const { state, dispatch } = useApp();
  const { orders = [], sales = [], accounts = [], products = [] } = state;

  const accById  = React.useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const prodById = React.useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const normRegion = r => (r === 'VI' ? 'Vancouver Island' : (r || '—'));
  const casePackOf = pid => Number(prodById[pid]?.casePack) || 12;

  // Build a unified record set from both sources (once).
  const allRecords = React.useMemo(() => {
    const recs = [];
    orders.forEach(o => {
      if ((o.status || '').toLowerCase() === 'cancelled') return;
      const a = accById[o.accountId]; if (!a) return;
      recs.push({ source:'PO', accountId:o.accountId, accountName:a.name,
        region:normRegion(a.region), type:a.type || '—', productId:o.productId,
        bottles:Number(o.bottles) || 0, date:(o.requestedDate || o.createdAt || '').slice(0,10) });
    });
    sales.forEach(s => {
      const a = accById[s.accountId]; if (!a) return;
      recs.push({ source:'Import', accountId:s.accountId, accountName:a.name,
        region:normRegion(a.region), type:a.type || '—', productId:s.productId,
        bottles:Number(s.bottles) || 0, date:(s.month ? s.month + '-15' : '') });
    });
    return recs.filter(r => r.date);
  }, [orders, sales, accById]);

  // ---- Filter option lists ----
  const regionOpts = React.useMemo(() =>
    [...new Set(allRecords.map(r => r.region))].sort(), [allRecords]);
  const typeOpts = React.useMemo(() =>
    [...new Set(allRecords.map(r => r.type))].sort(), [allRecords]);
  const productOpts = React.useMemo(() =>
    [...new Set(allRecords.map(r => r.productId))].map(id => ({ id, name: prodById[id]?.name || id })), [allRecords]);

  // ---- Filter state ----
  const yr = new Date().getFullYear();
  const todayStr = new Date().toISOString().slice(0,10);
  const [from, setFrom]   = React.useState(`${yr}-01-01`);
  const [to, setTo]       = React.useState(todayStr);
  const [regions, setRegions] = React.useState([]);   // [] = all
  const [types, setTypes]     = React.useState([]);   // [] = all
  const [productId, setProductId] = React.useState('all');
  const [source, setSource]   = React.useState('both'); // both | PO | Import

  const preset = (kind) => {
    if (kind === 'ytd')  { setFrom(`${yr}-01-01`); setTo(todayStr); }
    if (kind === '12mo') { const d = new Date(); d.setDate(d.getDate()-365); setFrom(d.toISOString().slice(0,10)); setTo(todayStr); }
    if (kind === 'all')  { const ds = allRecords.map(r=>r.date).sort(); setFrom(ds[0]||`${yr}-01-01`); setTo(ds[ds.length-1]||todayStr); }
  };
  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter(x=>x!==v) : [...arr, v]);

  // ---- Apply filters ----
  const rows = React.useMemo(() => allRecords.filter(r =>
    r.date >= from && r.date <= to &&
    (regions.length === 0 || regions.includes(r.region)) &&
    (types.length === 0 || types.includes(r.type)) &&
    (productId === 'all' || r.productId === productId) &&
    (source === 'both' || r.source === source)
  ), [allRecords, from, to, regions, types, productId, source]);

  // ---- Aggregations ----
  const sumB = list => list.reduce((s,r)=>s+r.bottles, 0);
  const sumC = list => list.reduce((s,r)=>s + r.bottles / casePackOf(r.productId), 0);
  const totalBottles = sumB(rows);
  const totalCases = sumC(rows);
  const distinctPOS = new Set(rows.map(r=>r.accountId)).size;

  const bySource = ['PO','Import'].map(src => {
    const l = rows.filter(r=>r.source===src);
    return { src, label: src==='PO'?'Direct purchase orders (CRM)':'Imported sales records',
      bottles:sumB(l), cases:sumC(l), pos:new Set(l.map(r=>r.accountId)).size };
  }).filter(x=>x.bottles>0);

  const byRegion = React.useMemo(() => {
    const m = {};
    rows.forEach(r => { (m[r.region] = m[r.region] || []).push(r); });
    return Object.entries(m).map(([region,l]) => ({ region, bottles:sumB(l), cases:sumC(l),
      pos:new Set(l.map(r=>r.accountId)).size })).sort((a,b)=>b.bottles-a.bottles);
  }, [rows]);

  const byMonth = React.useMemo(() => {
    const m = {};
    rows.forEach(r => { const k=r.date.slice(0,7); m[k]=(m[k]||0)+r.bottles; });
    return Object.keys(m).sort().map(k => ({ month:k, bottles:m[k] }));
  }, [rows]);

  const byAccount = React.useMemo(() => {
    const m = {};
    rows.forEach(r => {
      const k = r.accountId;
      if (!m[k]) m[k] = { name:r.accountName, region:r.region, type:r.type, bottles:0, srcs:new Set() };
      m[k].bottles += r.bottles; m[k].srcs.add(r.source==='PO'?'PO':'Import');
    });
    return Object.values(m).map(a => ({ ...a,
      source:[...a.srcs].sort().join(' + ').replace('Import + PO','Import + PO') }))
      .sort((a,b)=> a.region.localeCompare(b.region) || b.bottles-a.bottles);
  }, [rows]);

  const maxMonth = Math.max(1, ...byMonth.map(m=>m.bottles));
  const fmt = n => (n||0).toLocaleString();
  const fmtC = n => (n||0).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1});
  const monthLabel = k => { const [y,m]=k.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+" '"+y.slice(2); };
  const activeFilterText = () => {
    const parts = [`${from} to ${to}`];
    parts.push(regions.length?regions.join(', '):'All regions');
    parts.push(source==='both'?'PO + Import':source==='PO'?'Purchase orders':'Imported sales');
    parts.push(productId==='all'?'All products':(prodById[productId]?.name||productId));
    if (types.length) parts.push(types.join(', '));
    return parts.join('  •  ');
  };

  // ---- PDF export (print) ----
  function exportPdf() {
    const rowsHtml = byAccount.map(a =>
      `<tr><td>${esc(a.region)}</td><td>${esc(a.name)}</td><td>${esc(a.type)}</td><td>${esc(a.source)}</td><td class="r">${fmt(a.bottles)}</td></tr>`).join('');
    const regionHtml = byRegion.map(r =>
      `<tr><td>${esc(r.region)}</td><td class="r">${fmt(r.bottles)}</td><td class="r">${fmtC(r.cases)}</td><td class="r">${r.pos}</td><td class="r">${(r.bottles/totalBottles*100||0).toFixed(1)}%</td></tr>`).join('');
    const srcHtml = bySource.map(s =>
      `<tr><td>${esc(s.label)}</td><td class="r">${fmt(s.bottles)}</td><td class="r">${fmtC(s.cases)}</td><td class="r">${s.pos}</td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sueños BC Sales Volume</title>
<style>
  body{font-family:Helvetica,Arial,sans-serif;color:#1e1e1e;margin:32px;font-size:12px}
  h1{color:#1F5C4D;margin:0 0 2px;font-size:22px} .sub{color:#6b6b6b;font-size:11px}
  hr{border:none;border-top:2px solid #C9A24B;margin:8px 0 14px}
  .kpis{display:flex;gap:10px;margin:14px 0}
  .kpi{flex:1;background:#F2EEE6;border:1px solid #D8D2C4;border-radius:6px;text-align:center;padding:10px}
  .kpi .n{color:#1F5C4D;font-weight:bold;font-size:19px}.kpi .l{color:#6b6b6b;font-size:8px;text-transform:uppercase;margin-top:3px}
  h2{color:#1F5C4D;font-size:13px;margin:18px 0 6px}
  table{width:100%;border-collapse:collapse} th{background:#1F5C4D;color:#fff;font-size:9px;text-align:left;padding:6px}
  td{border:1px solid #D8D2C4;padding:5px 6px;font-size:9px} tr:nth-child(even) td{background:#F2EEE6}
  .r{text-align:right} .meta{color:#6b6b6b;font-size:10px;margin-bottom:4px}
  @media print{@page{margin:14mm}}
</style></head><body>
  <h1>Sueños Tequila</h1>
  <div class="sub">British Columbia Sales Volume Summary — provincial liquor board licensing application</div>
  <hr>
  <div class="meta"><b>Filters:</b> ${esc(activeFilterText())}</div>
  <div class="kpis">
    <div class="kpi"><div class="n">${fmt(totalBottles)}</div><div class="l">Bottles</div></div>
    <div class="kpi"><div class="n">${fmtC(totalCases)}</div><div class="l">9-Litre-eq Cases</div></div>
    <div class="kpi"><div class="n">${distinctPOS}</div><div class="l">Points of Sale</div></div>
    <div class="kpi"><div class="n">${byRegion.length}</div><div class="l">Regions</div></div>
  </div>
  ${bySource.length>1?`<h2>Volume by source</h2><table><thead><tr><th>Source</th><th class="r">Bottles</th><th class="r">Cases</th><th class="r">Points of Sale</th></tr></thead><tbody>${srcHtml}</tbody></table>`:''}
  <h2>Volume by region</h2>
  <table><thead><tr><th>Region</th><th class="r">Bottles</th><th class="r">Cases</th><th class="r">Points of Sale</th><th class="r">% of Volume</th></tr></thead><tbody>${regionHtml}
    <tr><td><b>Total — British Columbia</b></td><td class="r"><b>${fmt(totalBottles)}</b></td><td class="r"><b>${fmtC(totalCases)}</b></td><td class="r"><b>${distinctPOS}</b></td><td class="r"><b>100%</b></td></tr></tbody></table>
  <h2>Distribution — licensed points of sale</h2>
  <table><thead><tr><th>Region</th><th>Licensed Establishment</th><th>Type</th><th>Source</th><th class="r">Bottles</th></tr></thead><tbody>${rowsHtml}</tbody></table>
  <p style="color:#6b6b6b;font-size:8px;margin-top:12px">Generated ${new Date().toLocaleDateString('en-CA')} from Sueños CRM records. Volume combines direct purchase orders (cancelled excluded) and imported sales records; cases are 9-litre equivalents. Where an establishment appears in both sources its volumes are combined and it is counted once as a point of sale.</p>
</body></html>`;
    const w = window.open('', '_blank', 'width=980,height=760');
    if (!w) { showToast(dispatch, 'Allow pop-ups to export the PDF', 'error'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(()=>{ try { w.print(); } catch(e){} }, 500);
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // ---- UI ----
  const chip = (active) => `text-xs px-2.5 py-1 rounded-full border transition ${active?'bg-teal-600 text-white border-teal-600':'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-teal-400'}`;
  const inputCls = "px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  const th = "text-[10px] font-bold uppercase tracking-wide text-white text-left px-3 py-2";
  const td = "px-3 py-2 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800";
  const tdr = td + " text-right tabular-nums";

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sales Volume Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">Purchase orders + imported sales, by region — for liquor board applications.</p>
        </div>
        <button onClick={exportPdf} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm">
          <Ic n="download" cls="w-4 h-4"/> Export PDF
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className={inputCls}/></div>
          <div><label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className={inputCls}/></div>
          <div className="flex gap-1.5 pb-0.5">
            <button className={chip(false)} onClick={()=>preset('ytd')}>YTD</button>
            <button className={chip(false)} onClick={()=>preset('12mo')}>Last 12 mo</button>
            <button className={chip(false)} onClick={()=>preset('all')}>All time</button>
          </div>
          <div><label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">Product</label>
            <select value={productId} onChange={e=>setProductId(e.target.value)} className={inputCls}>
              <option value="all">All products</option>
              {productOpts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">Data source</label>
          <div className="flex gap-1.5">
            {[['both','PO + Import'],['PO','Purchase orders'],['Import','Imported sales']].map(([v,l])=>
              <button key={v} className={chip(source===v)} onClick={()=>setSource(v)}>{l}</button>)}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">Regions {regions.length===0 && <span className="text-gray-300 normal-case font-normal">(all)</span>}</label>
          <div className="flex flex-wrap gap-1.5">
            {regionOpts.map(r=><button key={r} className={chip(regions.includes(r))} onClick={()=>toggle(regions,setRegions,r)}>{r}</button>)}
            {regions.length>0 && <button className="text-xs px-2.5 py-1 text-gray-400 hover:text-gray-600" onClick={()=>setRegions([])}>clear</button>}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">Account type {types.length===0 && <span className="text-gray-300 normal-case font-normal">(all)</span>}</label>
          <div className="flex flex-wrap gap-1.5">
            {typeOpts.map(t=><button key={t} className={chip(types.includes(t))} onClick={()=>toggle(types,setTypes,t)}>{t}</button>)}
            {types.length>0 && <button className="text-xs px-2.5 py-1 text-gray-400 hover:text-gray-600" onClick={()=>setTypes([])}>clear</button>}
          </div>
        </div>
      </div>

      {rows.length===0 ? (
        <div className="text-center text-sm text-gray-500 py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">No records match these filters.</div>
      ) : (<>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[[fmt(totalBottles),'Bottles'],[fmtC(totalCases),'9-Litre-eq Cases'],[distinctPOS,'Points of Sale'],[byRegion.length,'Regions']].map(([n,l])=>
            <div key={l} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 p-4 text-center">
              <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">{n}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">{l}</div>
            </div>)}
        </div>

        {/* Monthly trend */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Monthly volume — bottles</p>
          <div className="flex items-end gap-2 h-40">
            {byMonth.map(m=>(
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[10px] font-semibold text-gray-500 mb-1">{fmt(m.bottles)}</span>
                <div className="w-full rounded-t bg-teal-600" style={{height:`${Math.max(2,m.bottles/maxMonth*100)}%`}}/>
                <span className="text-[9px] text-gray-400 mt-1 whitespace-nowrap">{monthLabel(m.month)}</span>
              </div>))}
          </div>
        </div>

        {/* By source */}
        {bySource.length>1 && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mb-5">
          <table className="w-full">
            <thead><tr className="bg-teal-700"><th className={th}>Source</th><th className={th+" text-right"}>Bottles</th><th className={th+" text-right"}>Cases</th><th className={th+" text-right"}>Points of Sale</th></tr></thead>
            <tbody>{bySource.map(s=>(
              <tr key={s.src}><td className={td}>{s.label}</td><td className={tdr}>{fmt(s.bottles)}</td><td className={tdr}>{fmtC(s.cases)}</td><td className={tdr}>{s.pos}</td></tr>))}
              <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold"><td className={td}>Combined (distinct establishments)</td><td className={tdr}>{fmt(totalBottles)}</td><td className={tdr}>{fmtC(totalCases)}</td><td className={tdr}>{distinctPOS}</td></tr>
            </tbody>
          </table>
        </div>)}

        {/* By region */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mb-5">
          <table className="w-full">
            <thead><tr className="bg-teal-700"><th className={th}>Region</th><th className={th+" text-right"}>Bottles</th><th className={th+" text-right"}>Cases</th><th className={th+" text-right"}>Points of Sale</th><th className={th+" text-right"}>% Volume</th></tr></thead>
            <tbody>{byRegion.map(r=>(
              <tr key={r.region}><td className={td}>{r.region}</td><td className={tdr}>{fmt(r.bottles)}</td><td className={tdr}>{fmtC(r.cases)}</td><td className={tdr}>{r.pos}</td><td className={tdr}>{(r.bottles/totalBottles*100).toFixed(1)}%</td></tr>))}
            </tbody>
          </table>
        </div>

        {/* Points of sale */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Distribution — {byAccount.length} licensed points of sale</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-teal-700"><th className={th}>Region</th><th className={th}>Licensed Establishment</th><th className={th}>Type</th><th className={th}>Source</th><th className={th+" text-right"}>Bottles</th></tr></thead>
              <tbody>{byAccount.map((a,i)=>(
                <tr key={i}><td className={td}>{a.region}</td><td className={td}>{a.name}</td><td className={td}>{a.type}</td><td className={td}>{a.source}</td><td className={tdr}>{fmt(a.bottles)}</td></tr>))}
              </tbody>
            </table>
          </div>
        </div>
      </>)}
    </div>
  );
}
