// ─── MEDIA DESK (GOOGLE ADS PLANNING) ─────────────────────────────────────────
// Admin-only. Plan → Approve workflow that sits OVER Google Ads: answer a few
// plain-English questions, get a recommended media plan + budget split, see
// flagged problems, approve, and follow a generated Google setup checklist.
// No Google API yet — plans are built here and launched by hand in Google Ads.

const MD_OBJECTIVES = [
  { key:'calls',          label:'Get phone calls',         track:'phone calls' },
  { key:'store-visits',   label:'Drive store visits',      track:'store visits & direction requests' },
  { key:'quote-requests', label:'Generate quote requests', track:'quote-request form submissions' },
  { key:'sell-product',   label:'Sell a product',          track:'online purchases' },
  { key:'promote-event',  label:'Promote an event',        track:'event page visits & RSVPs' },
  { key:'retarget',       label:'Retarget past visitors',  track:'return visits & conversions' },
];
const MD_OBJ = k => MD_OBJECTIVES.find(o => o.key === k) || MD_OBJECTIVES[0];

// Share of budget per channel, by objective (percent).
const MD_MIX = {
  'calls':          { search:65, display:20, youtube:15 },
  'store-visits':   { search:40, display:25, youtube:35 },
  'quote-requests': { search:65, display:20, youtube:15 },
  'sell-product':   { search:55, display:25, youtube:20 },
  'promote-event':  { search:30, display:30, youtube:40 },
  'retarget':       { search:0,  display:70, youtube:30 },
};
const MD_CHANNELS = {
  search:  { name:'Google Search',       purpose:'Capture people actively searching' },
  display: { name:'Display retargeting', purpose:'Bring past website visitors back' },
  youtube: { name:'YouTube',             purpose:'Build local awareness' },
};
const MD_CREATIVE_ITEMS = [
  { key:'logo',       label:'Logo' },
  { key:'photos',     label:'Photos' },
  { key:'video',      label:'Video' },
  { key:'headline',   label:'Headline / offer copy' },
  { key:'offer',      label:'A clear offer' },
  { key:'brandRules', label:'Brand rules (colours/fonts)' },
];

const mdMoney = n => '$' + Math.round(Number(n || 0)).toLocaleString('en-CA');
const mdDate  = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { month:'short', day:'numeric' }) : '—';
function mdDays(s, e) {
  if (!s || !e) return null;
  const d = Math.round((new Date(e) - new Date(s)) / 86400000) + 1;
  return d > 0 ? d : null;
}

// Turn plan inputs into a recommended channel plan.
function mdRecommend(p) {
  const mix = MD_MIX[p.objective] || MD_MIX['calls'];
  const days = mdDays(p.start_date, p.end_date);
  const budget = Number(p.budget) || 0;
  const total = p.budget_type === 'daily' ? (days ? budget * days : budget) : budget;
  const channels = Object.keys(mix).filter(k => mix[k] > 0).map(k => ({
    key: k, name: MD_CHANNELS[k].name, purpose: MD_CHANNELS[k].purpose, pct: mix[k],
    budget: Math.round(total * mix[k] / 100),
    daily: days ? (total * mix[k] / 100) / days : null,
  }));
  return { channels, days, total, dailyTotal: days ? total / days : null };
}

// Flag likely problems in plain language.
function mdWarnings(p, rec) {
  const w = [];
  const cr = p.creative || {};
  const mix = MD_MIX[p.objective] || {};
  if (!p.geo_location || !p.geo_location.trim()) w.push('No location set — Google needs a target area to spend in.');
  else if (Number(p.geo_radius_km) > 80) w.push(`Targeting radius (${p.geo_radius_km} km) is very broad — tightening it focuses spend on your real market.`);
  if (!p.landing_url || !p.landing_url.trim()) w.push('No landing page URL — send traffic to a page with a clear call to action.');
  if (rec.dailyTotal != null && rec.dailyTotal < 10) w.push(`Budget is thin: about ${mdMoney(rec.dailyTotal)}/day across all channels may be too little to compete.`);
  rec.channels.forEach(c => { if (c.daily != null && c.daily < 3) w.push(`${c.name} gets about ${mdMoney(c.daily)}/day — likely too thin to deliver results.`); });
  if ((mix.search || 0) > 0 && !cr.headline) w.push('Search needs at least one headline — add headline/offer copy.');
  if ((mix.display || 0) > 0 && !cr.photos && !cr.logo) w.push('Display needs images — add a logo or photos.');
  if ((mix.youtube || 0) > 0 && !cr.video) w.push('YouTube needs a video.');
  if (p.start_date && p.end_date && new Date(p.end_date) < new Date(p.start_date)) w.push('End date is before the start date.');
  if (p.end_date && mdDays(new Date().toISOString().slice(0,10), p.end_date) === null) w.push('The end date is in the past.');
  return w;
}

// Build the Google Ads setup checklist for an approved plan.
function mdChecklist(p, rec) {
  const loc = p.geo_location || 'your area';
  const rad = p.geo_radius_km || 30;
  const track = MD_OBJ(p.objective).track;
  const steps = [
    { key:'g-account', text:'Sign in to the Sueños Google Ads account.' },
    { key:'g-conv',    text:`Set up a conversion action for ${track} (Tools → Conversions).` },
  ];
  rec.channels.forEach(c => {
    const dly = c.daily != null ? ` (≈ ${mdMoney(c.daily)}/day)` : '';
    if (c.key === 'search') {
      steps.push({ key:'s-camp',   text:`New campaign → objective "Leads/Sales" → Search. Name it "${p.name} – Search".` });
      steps.push({ key:'s-geo',    text:`Locations → within ${rad} km of ${loc}.` });
      steps.push({ key:'s-budget', text:`Set budget ${mdMoney(c.budget)} for the flight${dly}.` });
      steps.push({ key:'s-kw',     text:`Add keywords around: ${p.promoting || 'your offer'}.` });
      steps.push({ key:'s-ad',     text:'Build a responsive search ad from your headlines + landing page.' });
    } else if (c.key === 'display') {
      steps.push({ key:'d-camp',   text:`New campaign → Display. Name it "${p.name} – Retargeting".` });
      steps.push({ key:'d-aud',    text:'Audience → your website visitors (retargeting / remarketing list).' });
      steps.push({ key:'d-budget', text:`Set budget ${mdMoney(c.budget)} for the flight${dly}.` });
      steps.push({ key:'d-ad',     text:'Upload logo + images; write a short headline & description.' });
    } else if (c.key === 'youtube') {
      steps.push({ key:'y-camp',   text:`New campaign → Video → Awareness. Name it "${p.name} – YouTube".` });
      steps.push({ key:'y-geo',    text:`Target within ${rad} km of ${loc}.` });
      steps.push({ key:'y-budget', text:`Set budget ${mdMoney(c.budget)} for the flight${dly}.` });
      steps.push({ key:'y-ad',     text:'Add your video; set the landing page as the call-to-action URL.' });
    }
  });
  steps.push({ key:'g-review', text:'Review each campaign summary against the plan, then set live.' });
  steps.push({ key:'g-mark',   text:'Come back here and mark the plan Launched.' });
  return steps;
}

const MD_STATUS = {
  draft:    { label:'Draft',    cls:'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  approved: { label:'Approved', cls:'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  launched: { label:'Launched', cls:'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
};

// One clean plain-English approval line.
function mdSummary(p, rec) {
  const win = (p.start_date && p.end_date) ? `between ${mdDate(p.start_date)} and ${mdDate(p.end_date)}` : 'over the flight';
  const geo = p.geo_location ? `people within ${p.geo_radius_km || 30} km of ${p.geo_location}` : 'your target area';
  const land = p.landing_url ? ` Send traffic to ${p.landing_url}.` : '';
  return `Spend up to ${mdMoney(rec.total)} ${win}, reaching ${geo}.${land} Track ${MD_OBJ(p.objective).track}.`;
}

// ── Wizard (new / edit) ──────────────────────────────────────────────────────
function MediaPlanWizard({ plan, onClose, onSaved }) {
  const { state, dispatch } = useApp();
  const editing = !!plan;
  const [f, setF] = React.useState(plan ? { ...plan, creative: plan.creative || {} } : {
    name:'', promoting:'', objective:'calls', audience:'', geo_location:'', geo_radius_km:30,
    landing_url:'', budget:1000, budget_type:'total', start_date:'', end_date:'', creative:{},
  });
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const setCreative = (k, v) => setF(s => ({ ...s, creative: { ...s.creative, [k]: v } }));

  const rec = mdRecommend(f);
  const warnings = mdWarnings(f, rec);
  const autoName = () => (f.promoting ? f.promoting.slice(0, 40) : 'Google Ads plan') + (f.start_date ? ' · ' + mdDate(f.start_date) : '');

  const save = async () => {
    const name = (f.name && f.name.trim()) || autoName();
    if (!f.promoting.trim()) { showToast(dispatch, 'Tell us what you’re promoting', 'error'); return; }
    if (!Number(f.budget)) { showToast(dispatch, 'Enter a budget', 'error'); return; }
    setBusy(true);
    const row = {
      name, promoting: f.promoting.trim(), objective: f.objective, audience: f.audience.trim(),
      geo_location: f.geo_location.trim(), geo_radius_km: Number(f.geo_radius_km) || 0,
      landing_url: f.landing_url.trim(), budget: Number(f.budget) || 0, budget_type: f.budget_type,
      start_date: f.start_date || null, end_date: f.end_date || null, creative: f.creative || {},
      channels: rec.channels, warnings,
    };
    try {
      if (editing) {
        const { error } = await sb.from('media_plans').update(row).eq('id', plan.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('media_plans').insert({ ...row, created_by: state.user.id, status:'draft' });
        if (error) throw error;
      }
      showToast(dispatch, editing ? 'Plan updated' : 'Plan saved');
      onSaved && onSaved(); onClose();
    } catch (e) { showToast(dispatch, 'Save failed: ' + (e.message || e), 'error'); }
    setBusy(false);
  };

  const inp = 'w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700';
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{editing ? 'Edit plan' : 'New media plan'}</h3>
            <p className="text-xs text-gray-500">Answer in plain language — we build the Google plan for you.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={lbl}>What are we promoting?</label>
            <input className={inp} value={f.promoting} onChange={e=>set('promoting', e.target.value)} placeholder="e.g. Sueños Blanco summer feature" />
          </div>
          <div>
            <label className={lbl}>What should people do?</label>
            <select className={inp} value={f.objective} onChange={e=>set('objective', e.target.value)}>
              {MD_OBJECTIVES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Who should see it?</label>
            <input className={inp} value={f.audience} onChange={e=>set('audience', e.target.value)} placeholder="e.g. cocktail drinkers 25–45" />
          </div>
          <div>
            <label className={lbl}>Where do they live?</label>
            <input className={inp} value={f.geo_location} onChange={e=>set('geo_location', e.target.value)} placeholder="e.g. Vancouver, BC" />
          </div>
          <div>
            <label className={lbl}>Radius (km)</label>
            <input type="number" min="1" className={inp} value={f.geo_radius_km} onChange={e=>set('geo_radius_km', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Total budget</label>
            <div className="flex gap-2">
              <input type="number" min="0" className={inp} value={f.budget} onChange={e=>set('budget', e.target.value)} />
              <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 bg-white dark:bg-gray-700" value={f.budget_type} onChange={e=>set('budget_type', e.target.value)}>
                <option value="total">total</option>
                <option value="daily">per day</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Landing page URL</label>
            <input className={inp} value={f.landing_url} onChange={e=>set('landing_url', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className={lbl}>Start date</label>
            <input type="date" className={inp} value={f.start_date || ''} onChange={e=>set('start_date', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>End date</label>
            <input type="date" className={inp} value={f.end_date || ''} onChange={e=>set('end_date', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>What creative do we have?</label>
            <div className="flex flex-wrap gap-2">
              {MD_CREATIVE_ITEMS.map(c => (
                <label key={c.key} className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer ${f.creative[c.key] ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                  <input type="checkbox" className="hidden" checked={!!f.creative[c.key]} onChange={e=>setCreative(c.key, e.target.checked)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Live recommended plan */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/40 text-xs font-semibold text-gray-600 dark:text-gray-300">Recommended plan{rec.days ? ` · ${rec.days} days` : ''}</div>
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase text-gray-400 text-left"><th className="px-3 py-1.5">Campaign</th><th className="px-3 py-1.5">Purpose</th><th className="px-3 py-1.5 text-right">Budget</th></tr></thead>
            <tbody>
              {rec.channels.length === 0 && <tr><td colSpan="3" className="px-3 py-2 text-gray-400">Enter a budget to see the split.</td></tr>}
              {rec.channels.map(c => (
                <tr key={c.key} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-3 py-1.5 font-medium">{c.name}</td>
                  <td className="px-3 py-1.5 text-gray-500">{c.purpose}</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{mdMoney(c.budget)}{c.daily != null && <span className="text-[11px] text-gray-400 font-normal"> · {mdMoney(c.daily)}/day</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Worth a look before you launch</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs text-amber-800 dark:text-amber-200">{warnings.map((x,i)=><li key={i}>{x}</li>)}</ul>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button disabled={busy} onClick={save} className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-5 py-2 disabled:opacity-40">{editing ? 'Save changes' : 'Save plan'}</button>
          <div className="flex-1" />
          <button onClick={onClose} className="text-sm text-gray-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Detail / approval + setup checklist ──────────────────────────────────────
function MediaPlanDetail({ plan, onClose, onChanged, onEdit }) {
  const { dispatch } = useApp();
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(plan.setup_progress || []);
  const rec = mdRecommend(plan);
  const warnings = mdWarnings(plan, rec);
  const checklist = mdChecklist(plan, rec);
  const st = MD_STATUS[plan.status] || MD_STATUS.draft;

  const patch = async (fields, okMsg) => {
    setBusy(true);
    try {
      const { error } = await sb.from('media_plans').update(fields).eq('id', plan.id);
      if (error) throw error;
      if (okMsg) showToast(dispatch, okMsg);
      onChanged && onChanged();
    } catch (e) { showToast(dispatch, 'Failed: ' + (e.message || e), 'error'); }
    setBusy(false);
  };

  const toggleStep = (key) => {
    const next = progress.includes(key) ? progress.filter(k => k !== key) : [...progress, key];
    setProgress(next);
    patch({ setup_progress: next });
  };
  const approve = () => patch({ status:'approved', approved_at: new Date().toISOString() }, 'Plan approved');
  const launch  = () => patch({ status:'launched', launched_at: new Date().toISOString() }, 'Marked as launched');
  const remove  = async () => {
    if (!window.confirm('Delete this plan?')) return;
    setBusy(true);
    try { const { error } = await sb.from('media_plans').delete().eq('id', plan.id); if (error) throw error;
      showToast(dispatch, 'Plan deleted'); onChanged && onChanged(); onClose();
    } catch (e) { showToast(dispatch, 'Delete failed: ' + (e.message || e), 'error'); }
    setBusy(false);
  };

  const done = checklist.filter(s => progress.includes(s.key)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
            </div>
            <p className="text-xs text-gray-500">{MD_OBJ(plan.objective).label} · {plan.promoting}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        {/* Approval summary */}
        <div className="rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 p-3">
          <p className="text-sm text-teal-900 dark:text-teal-100">{mdSummary(plan, rec)}</p>
        </div>

        {/* Channel table */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase text-gray-400 text-left"><th className="px-3 py-1.5">Campaign</th><th className="px-3 py-1.5">Purpose</th><th className="px-3 py-1.5 text-right">Budget</th></tr></thead>
            <tbody>
              {rec.channels.map(c => (
                <tr key={c.key} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-3 py-1.5 font-medium">{c.name}</td>
                  <td className="px-3 py-1.5 text-gray-500">{c.purpose}</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{mdMoney(c.budget)}{c.daily != null && <span className="text-[11px] text-gray-400 font-normal"> · {mdMoney(c.daily)}/day</span>}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-200 dark:border-gray-600 font-semibold"><td className="px-3 py-1.5" colSpan="2">Total</td><td className="px-3 py-1.5 text-right">{mdMoney(rec.total)}</td></tr>
            </tbody>
          </table>
        </div>

        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Flags</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs text-amber-800 dark:text-amber-200">{warnings.map((x,i)=><li key={i}>{x}</li>)}</ul>
          </div>
        )}

        {/* Setup checklist */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Google setup checklist</p>
            <p className="text-[11px] text-gray-400">{done}/{checklist.length} done</p>
          </div>
          <div className="space-y-1">
            {checklist.map(s => (
              <label key={s.key} className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="mt-1" checked={progress.includes(s.key)} onChange={()=>toggleStep(s.key)} />
                <span className={progress.includes(s.key) ? 'line-through text-gray-400' : ''}>{s.text}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {plan.status === 'draft' && <button disabled={busy} onClick={approve} className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-4 py-2 disabled:opacity-40">Approve</button>}
          {plan.status === 'approved' && <button disabled={busy} onClick={launch} className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 disabled:opacity-40">Mark launched</button>}
          <button disabled={busy} onClick={()=>onEdit(plan)} className="text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2">Edit</button>
          <div className="flex-1" />
          <button disabled={busy} onClick={remove} className="text-sm text-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
function MediaDeskView() {
  const [plans, setPlans] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');
  const [wizard, setWizard] = React.useState(null);   // null | {} (new) | plan (edit)
  const [detail, setDetail] = React.useState(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const { data, error } = await sb.from('media_plans').select('*').order('created_at', { ascending:false });
      if (error) throw error;
      setPlans(data || []);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  };
  React.useEffect(() => { load(); }, []);

  const openDetail = (p) => setDetail(p);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Media Desk</h1>
          <p className="text-sm text-gray-500">Plan Google Ads in plain language, then follow the setup checklist to launch.</p>
        </div>
        <button onClick={()=>setWizard({})} className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-4 py-2 whitespace-nowrap">+ New plan</button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading plans…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && !err && plans.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
          <p className="text-gray-500 text-sm">No plans yet.</p>
          <button onClick={()=>setWizard({})} className="mt-3 text-sm font-semibold text-teal-600">Build your first plan →</button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {plans.map(p => {
          const rec = mdRecommend(p);
          const st = MD_STATUS[p.status] || MD_STATUS.draft;
          return (
            <button key={p.id} onClick={()=>openDetail(p)} className="text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-teal-400 transition">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold truncate">{p.name}</p>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{MD_OBJ(p.objective).label}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{mdMoney(rec.total)}</span>
                <span>{p.start_date && p.end_date ? `${mdDate(p.start_date)}–${mdDate(p.end_date)}` : 'No dates'}</span>
                <span className="text-gray-400">{rec.channels.length} channels</span>
              </div>
              {p.geo_location && <p className="text-[11px] text-gray-400 mt-1 truncate">📍 {p.geo_location} · {p.geo_radius_km || 30} km</p>}
            </button>
          );
        })}
      </div>

      {wizard && <MediaPlanWizard plan={wizard.id ? wizard : null} onClose={()=>setWizard(null)} onSaved={load} />}
      {detail && <MediaPlanDetail plan={detail} onClose={()=>setDetail(null)} onChanged={()=>{ load(); setDetail(null); }} onEdit={(p)=>{ setDetail(null); setWizard(p); }} />}
    </div>
  );
}
