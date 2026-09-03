// ─── WEATHER TRIGGERED ADS (Phase 1: rules + provider preview) ───────────────
// Admin-only. A generic automation engine (trigger → condition → action →
// rollback → reporting); weather is the first trigger type. Phase 1 covers the
// rule CRUD, the dashboard shell, and a live "Check weather now" preview via the
// weather-provider edge function. Meta actions/approval/scheduling land in
// later phases. Self-contained (loads its own data via sb), like MediaDeskView.

const WX_DEFAULT_ADACCOUNT = '813974741538881'; // reuse the existing Sueños ad account
const CA_PROVINCES = ['BC','AB','SK','MB','ON','QC','NB','NS','PE','NL','YT','NT','NU'];
const WX_CONDITIONS = [
  { key:'temp_above',          label:'Temperature above (now)',        unit:'°C' },
  { key:'temp_below',          label:'Temperature below (now)',        unit:'°C' },
  { key:'forecast_high_above', label:'Forecast high above',            unit:'°C' },
  { key:'forecast_low_below',  label:'Forecast low below',             unit:'°C' },
  { key:'consecutive_above',   label:'Consecutive days high above',    unit:'°C', consec:true },
  { key:'consecutive_below',   label:'Consecutive days low below',     unit:'°C', consec:true },
  { key:'precip_prob',         label:'Rain / precip probability ≥',    unit:'%'  },
  { key:'snow',                label:'Snowfall ≥',                     unit:'cm' },
  { key:'severe_alert',        label:'Severe weather alert',           unit:'',  eccc:true },
  { key:'air_quality',         label:'Air quality (US-AQI) ≥',         unit:'AQI' },
];
const WX_START = [
  { key:'activate',            label:'Activate (turn on)' },
  { key:'set_budget',          label:'Set daily budget' },
  { key:'activate_and_budget', label:'Activate + set budget' },
];
const WX_STOP = [
  { key:'pause',    label:'Pause (turn off)' },
  { key:'restore',  label:'Restore previous status & budget' },
  { key:'set_budget', label:'Set budget back to $X' },
];

const wxCond = k => WX_CONDITIONS.find(c => c.key === k) || WX_CONDITIONS[0];
const wxDollars = c => (c == null ? '' : (Number(c) / 100).toFixed(2));
const wxCents = d => (d === '' || d == null ? null : Math.round(parseFloat(d) * 100));
const wxNum = n => (n == null ? '—' : (Math.round(Number(n) * 10) / 10));

function mapWxRule(r) {
  return {
    id:r.id, name:r.name, triggerType:r.trigger_type, active:r.active, approvalRequired:r.approval_required,
    province:r.province||'', city:r.city||'', latitude:r.latitude, longitude:r.longitude, radiusKm:r.radius_km,
    metaAdAccountId:r.meta_ad_account_id||'', targetType:r.target_type||'adset', targetId:r.target_id||'', targetName:r.target_name||'',
    weatherCondition:r.weather_condition||'', threshold:r.threshold, consecutiveDays:r.consecutive_days, leadTimeHours:r.lead_time_hours||0,
    startAction:r.start_action||'activate', stopAction:r.stop_action||'pause',
    dailyBudgetCents:r.daily_budget_cents, budgetAdjustPct:r.budget_adjust_pct, maxIncrementalSpendCents:r.max_incremental_spend_cents,
    createdAt:r.created_at,
  };
}

// Shared condition evaluation (client preview now; the scheduler reuses the same logic server-side in Phase 4).
function evalWeatherCondition(rule, w) {
  if (!w) return { met:false, detail:'No weather data' };
  const th = Number(rule.threshold);
  const daysAhead = Math.max(1, Math.ceil((Number(rule.leadTimeHours)||0)/24)) || 3;
  const win = (w.daily||[]).slice(0, daysAhead);
  const cur = w.current?.tempC;
  const f = wxNum;
  switch (rule.weatherCondition) {
    case 'temp_above': return { met: cur!=null && cur>=th, detail:`Current ${f(cur)}°C vs ≥ ${th}°C` };
    case 'temp_below': return { met: cur!=null && cur<=th, detail:`Current ${f(cur)}°C vs ≤ ${th}°C` };
    case 'forecast_high_above': { const h=win.find(d=>d.highC!=null&&d.highC>=th); return { met:!!h, detail:h?`High ${f(h.highC)}°C on ${h.date} (≥ ${th})`:`No forecast high ≥ ${th}°C in ${win.length}d` }; }
    case 'forecast_low_below':  { const h=win.find(d=>d.lowC!=null&&d.lowC<=th);  return { met:!!h, detail:h?`Low ${f(h.lowC)}°C on ${h.date} (≤ ${th})`:`No forecast low ≤ ${th}°C in ${win.length}d` }; }
    case 'consecutive_above': { const n=Number(rule.consecutiveDays)||2; let run=0,mx=0; win.forEach(d=>{ if(d.highC!=null&&d.highC>=th){run++;mx=Math.max(mx,run);}else run=0;}); return { met:mx>=n, detail:`${mx} consecutive day(s) ≥ ${th}°C (need ${n})` }; }
    case 'consecutive_below': { const n=Number(rule.consecutiveDays)||2; let run=0,mx=0; win.forEach(d=>{ if(d.lowC!=null&&d.lowC<=th){run++;mx=Math.max(mx,run);}else run=0;}); return { met:mx>=n, detail:`${mx} consecutive day(s) ≤ ${th}°C (need ${n})` }; }
    case 'precip_prob': { const h=win.find(d=>d.precipProbMax!=null&&d.precipProbMax>=th); return { met:!!h, detail:h?`${h.precipProbMax}% precip on ${h.date} (≥ ${th}%)`:`No day ≥ ${th}% precip in ${win.length}d` }; }
    case 'snow': { const t=th||0.1; const h=win.find(d=>d.snowfallCm!=null&&d.snowfallCm>=t); return { met:!!h, detail:h?`${f(h.snowfallCm)}cm snow on ${h.date}`:`No snowfall ≥ ${t}cm in ${win.length}d` }; }
    case 'air_quality': { const a=w.airQuality?.usAqi; return { met:a!=null&&a>=th, detail:a!=null?`US-AQI ${a} (≥ ${th})`:'AQI unavailable' }; }
    case 'severe_alert': return { met:false, detail:'Severe alerts need the ECCC provider (not yet configured)' };
    default: return { met:false, detail:'Choose a weather condition' };
  }
}

function wxRuleSummary(r) {
  const c = wxCond(r.weatherCondition);
  const consec = c.consec ? `${r.consecutiveDays||2}× ` : '';
  const lead = r.leadTimeHours ? ` · ${r.leadTimeHours}h ahead` : '';
  return `${consec}${c.label} ${r.threshold ?? ''}${c.unit}${lead}`;
}

// ── Live weather check (provider preview) ────────────────────────────────────
function WeatherCheckModal({ rule, onClose }) {
  const { dispatch } = useApp();
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');
  const [w, setW] = React.useState(null);
  React.useEffect(() => { (async () => {
    setLoading(true); setErr('');
    try {
      let lat = rule.latitude, lng = rule.longitude;
      if (lat == null || lng == null) {
        const g = await sb.functions.invoke('weather-provider', { body:{ action:'geocode', city:rule.city, province:rule.province } });
        const first = g.data?.results?.[0];
        if (!first) throw new Error('Could not locate '+(rule.city||'that city'));
        lat = first.latitude; lng = first.longitude;
      }
      const res = await sb.functions.invoke('weather-provider', { body:{ action:'weather', latitude:lat, longitude:lng } });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message || 'Weather fetch failed');
      setW(res.data);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  })(); }, [rule.id]);

  const evalr = w ? evalWeatherCondition(rule, w) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">🌤 Weather now — {rule.city || 'rule'}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        {loading && <p className="text-sm text-gray-500">Checking {rule.city}…</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
        {w && (
          <>
            <div className={`rounded-lg p-3 text-sm ${evalr.met ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
              <p className="font-semibold">{evalr.met ? '✅ Trigger condition MET' : '○ Condition not met'}</p>
              <p className="text-xs mt-0.5">{wxRuleSummary(rule)} — {evalr.detail}</p>
            </div>
            <p className="text-xs text-gray-500">Now: <b>{wxNum(w.current?.tempC)}°C</b>{w.airQuality?.usAqi!=null?` · AQI ${w.airQuality.usAqi}`:''} · via {w.provider}</p>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-400 text-left"><th className="px-2 py-1">Day</th><th className="px-2 py-1">High</th><th className="px-2 py-1">Low</th><th className="px-2 py-1">Precip</th><th className="px-2 py-1">Snow</th></tr></thead>
                <tbody>
                  {(w.daily||[]).slice(0,7).map(d=>(
                    <tr key={d.date} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-2 py-1">{d.date.slice(5)}</td>
                      <td className="px-2 py-1">{wxNum(d.highC)}°</td>
                      <td className="px-2 py-1">{wxNum(d.lowC)}°</td>
                      <td className="px-2 py-1">{d.precipProbMax!=null?d.precipProbMax+'%':'—'}</td>
                      <td className="px-2 py-1">{d.snowfallCm?wxNum(d.snowfallCm)+'cm':'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {w.missing?.length>0 && <p className="text-[11px] text-amber-600 dark:text-amber-400">Not yet available from this provider: {w.missing.map(m=>m.split(' — ')[0]).join(', ')}.</p>}
            <p className="text-[11px] text-gray-400">Preview only — no Meta changes are made in Phase 1.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Create / edit rule ───────────────────────────────────────────────────────
function WeatherRuleModal({ rule, onClose, onSaved }) {
  const { state, dispatch } = useApp();
  const editing = !!rule;
  const [f, setF] = React.useState(rule ? { ...rule } : {
    name:'', province:'BC', city:'', latitude:null, longitude:null, radiusKm:'',
    metaAdAccountId:WX_DEFAULT_ADACCOUNT, targetType:'adset', targetId:'', targetName:'',
    weatherCondition:'forecast_high_above', threshold:30, consecutiveDays:2, leadTimeHours:72,
    startAction:'activate', stopAction:'pause', dailyBudget:'', maxIncrementalSpend:'',
    approvalRequired:true, active:false,
  });
  const [busy, setBusy] = React.useState(false);
  const set = (k,v) => setF(s => ({ ...s, [k]: v }));
  const cond = wxCond(f.weatherCondition);

  // budgets shown in dollars in the form; converted to cents on save
  const dailyBudget = editing ? wxDollars(rule.dailyBudgetCents) : f.dailyBudget;
  const maxSpend = editing ? wxDollars(rule.maxIncrementalSpendCents) : f.maxIncrementalSpend;

  const save = async () => {
    if (!f.name.trim()) { showToast(dispatch,'Name the rule','error'); return; }
    if (!f.targetId.trim()) { showToast(dispatch,'Enter the Meta campaign/ad set/ad ID','error'); return; }
    if (!f.stopAction) { showToast(dispatch,'A stop/rollback action is required','error'); return; }
    if (f.active && !f.approvalRequired && !wxCents(f.maxIncrementalSpend ?? maxSpend)) {
      showToast(dispatch,'Automatic mode needs a maximum incremental spend (hard ceiling)','error'); return;
    }
    setBusy(true);
    try {
      // Geocode city → lat/lng if not set
      let lat = f.latitude, lng = f.longitude;
      if ((lat == null || lng == null) && f.city.trim()) {
        const g = await sb.functions.invoke('weather-provider', { body:{ action:'geocode', city:f.city, province:f.province } });
        const first = g.data?.results?.[0];
        if (first) { lat = first.latitude; lng = first.longitude; }
      }
      const row = {
        name:f.name.trim(), trigger_type:'weather', active:!!f.active, approval_required:!!f.approvalRequired,
        province:f.province||null, city:f.city.trim()||null, latitude:lat, longitude:lng,
        radius_km: f.radiusKm===''?null:Number(f.radiusKm),
        meta_ad_account_id:f.metaAdAccountId.trim()||null, target_type:f.targetType, target_id:f.targetId.trim(), target_name:f.targetName.trim()||null,
        weather_condition:f.weatherCondition, threshold: f.threshold===''?null:Number(f.threshold),
        consecutive_days: cond.consec ? (Number(f.consecutiveDays)||2) : null,
        lead_time_hours: Number(f.leadTimeHours)||0,
        start_action:f.startAction, stop_action:f.stopAction,
        daily_budget_cents: wxCents(f.dailyBudget ?? dailyBudget),
        max_incremental_spend_cents: wxCents(f.maxIncrementalSpend ?? maxSpend),
      };
      if (editing) { const { error } = await sb.from('automation_rules').update(row).eq('id', rule.id); if (error) throw error; }
      else { const { error } = await sb.from('automation_rules').insert({ ...row, created_by: state.user.id }); if (error) throw error; }
      showToast(dispatch, editing ? 'Rule updated' : 'Rule created'); onSaved && onSaved(); onClose();
    } catch (e) { showToast(dispatch, 'Save failed: '+(e.message||e), 'error'); }
    setBusy(false);
  };

  const inp = 'w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700';
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1';
  const autoMode = f.active && !f.approvalRequired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg">{editing ? 'Edit weather rule' : 'New weather rule'}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        <div><label className={lbl}>Rule name</label>
          <input className={inp} value={f.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Okanagan Heat Campaign" /></div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Location (Canada)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label className={lbl}>Province</label>
            <select className={inp} value={f.province} onChange={e=>set('province',e.target.value)}>{CA_PROVINCES.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
          <div className="col-span-1 sm:col-span-2"><label className={lbl}>City / region</label>
            <input className={inp} value={f.city} onChange={e=>{ set('city',e.target.value); set('latitude',null); set('longitude',null); }} placeholder="Kelowna" /></div>
          <div><label className={lbl}>Radius km <span className="text-gray-400 font-normal">(opt)</span></label>
            <input type="number" className={inp} value={f.radiusKm} onChange={e=>set('radiusKm',e.target.value)} /></div>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Meta target (existing ad account)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label className={lbl}>Ad account ID</label><input className={inp} value={f.metaAdAccountId} onChange={e=>set('metaAdAccountId',e.target.value)} /></div>
          <div><label className={lbl}>Target type</label>
            <select className={inp} value={f.targetType} onChange={e=>set('targetType',e.target.value)}><option value="campaign">Campaign</option><option value="adset">Ad set</option><option value="ad">Ad</option></select></div>
          <div><label className={lbl}>Target ID</label><input className={inp} value={f.targetId} onChange={e=>set('targetId',e.target.value)} placeholder="Meta object id" /></div>
          <div><label className={lbl}>Label <span className="text-gray-400 font-normal">(opt)</span></label><input className={inp} value={f.targetName} onChange={e=>set('targetName',e.target.value)} placeholder="Summer Margarita" /></div>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Trigger</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2"><label className={lbl}>Weather condition</label>
            <select className={inp} value={f.weatherCondition} onChange={e=>set('weatherCondition',e.target.value)}>{WX_CONDITIONS.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
          <div><label className={lbl}>Threshold {cond.unit&&`(${cond.unit})`}</label>
            <input type="number" className={inp} value={f.threshold} onChange={e=>set('threshold',e.target.value)} disabled={cond.key==='severe_alert'} /></div>
          {cond.consec
            ? <div><label className={lbl}>Consecutive days</label><input type="number" min="1" className={inp} value={f.consecutiveDays} onChange={e=>set('consecutiveDays',e.target.value)} /></div>
            : <div><label className={lbl}>Lead time (hours)</label><input type="number" min="0" className={inp} value={f.leadTimeHours} onChange={e=>set('leadTimeHours',e.target.value)} /></div>}
        </div>
        {cond.eccc && <p className="text-[11px] text-amber-600 dark:text-amber-400">Severe-weather alerts need the ECCC provider, which isn’t configured yet — this condition won’t fire until it’s wired.</p>}

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions & budget</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>When triggered</label>
            <select className={inp} value={f.startAction} onChange={e=>set('startAction',e.target.value)}>{WX_START.map(a=><option key={a.key} value={a.key}>{a.label}</option>)}</select></div>
          <div><label className={lbl}>Stop / rollback <span className="text-red-500">*</span></label>
            <select className={inp} value={f.stopAction} onChange={e=>set('stopAction',e.target.value)}>{WX_STOP.map(a=><option key={a.key} value={a.key}>{a.label}</option>)}</select></div>
          <div><label className={lbl}>Daily budget ($)</label>
            <input type="number" step="0.01" className={inp} value={f.dailyBudget ?? dailyBudget} onChange={e=>set('dailyBudget',e.target.value)} placeholder="25.00" /></div>
          <div><label className={lbl}>Max incremental spend ($) <span className="text-red-500">— hard ceiling</span></label>
            <input type="number" step="0.01" className={inp} value={f.maxIncrementalSpend ?? maxSpend} onChange={e=>set('maxIncrementalSpend',e.target.value)} placeholder="e.g. 200.00" /></div>
        </div>
        <p className="text-[11px] text-gray-400">The engine will never set a budget above the daily budget, and will force a rollback once total triggered spend hits the max incremental spend — a hard kill switch independent of Meta’s account cap.</p>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={f.approvalRequired} onChange={e=>set('approvalRequired',e.target.checked)} className="accent-teal-600" />
            Require human approval before any change
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={f.active} onChange={e=>set('active',e.target.checked)} className="accent-teal-600" />
            Active
          </label>
        </div>
        {autoMode && <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 p-2.5 text-xs text-amber-800 dark:text-amber-200">⚠️ Automatic mode: this rule will change Meta without asking. A maximum incremental spend is required as the kill switch.</div>}

        <div className="flex items-center gap-2 pt-1">
          <button disabled={busy} onClick={save} className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-5 py-2 disabled:opacity-40">{editing?'Save changes':'Create rule'}</button>
          <div className="flex-1" />
          <button onClick={onClose} className="text-sm text-gray-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
function WeatherAdsView() {
  const { state } = useApp();
  const [rules, setRules] = React.useState([]);
  const [control, setControl] = React.useState([]);
  const [approvals, setApprovals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');
  const [editRule, setEditRule] = React.useState(null);   // null | {} (new) | rule
  const [checkRule, setCheckRule] = React.useState(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const { data:r, error } = await sb.from('automation_rules').select('*').eq('trigger_type','weather').order('created_at',{ascending:false});
      if (error) throw error;
      setRules((r||[]).map(mapWxRule));
      const { data:ctrl } = await sb.from('automation_control').select('*');
      setControl(ctrl||[]);
      const { data:appr } = await sb.from('automation_approvals').select('*').eq('status','pending').order('created_at',{ascending:false});
      setApprovals(appr||[]);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  };
  React.useEffect(() => { load(); }, []);

  const ctrlFor = id => control.find(c => c.target_id === id);
  const activeCount = rules.filter(r=>r.active).length;
  const controlledCount = control.filter(c=>c.controlling_rule_id).length;

  const Stat = ({ v, l }) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
      <p className="text-xl font-black text-teal-700 dark:text-teal-400">{v}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{l}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-5xl mx-auto space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 text-white shadow-sm flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black tracking-tight">🌦 Weather Triggered Ads</h1>
          <p className="text-xs text-teal-100/80 mt-0.5">Run, pause or re-budget Meta ads automatically on Canadian weather. Canada-only.</p>
        </div>
        <button onClick={()=>setEditRule({})} className="text-sm font-semibold bg-white text-[#2E8A97] hover:bg-teal-50 rounded-lg px-4 py-2 whitespace-nowrap">+ New rule</button>
      </div>

      {/* Dashboard shell */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat v={activeCount} l="Active rules" />
        <Stat v={approvals.length} l="Pending approvals" />
        <Stat v={controlledCount} l="Ads weather-controlled" />
        <Stat v="—" l="Weather spend (Phase 5)" />
      </div>

      {approvals.length>0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Pending weather recommendations</p>
          {approvals.map(a=><p key={a.id} className="text-xs text-amber-800 dark:text-amber-200">• {a.headline}</p>)}
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Approve/modify controls arrive in Phase 3.</p>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading rules…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && !err && rules.length===0 && (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
          <p className="text-gray-500 text-sm">No weather rules yet.</p>
          <button onClick={()=>setEditRule({})} className="mt-3 text-sm font-semibold text-teal-600">Create your first rule →</button>
        </div>
      )}

      <div className="space-y-2">
        {rules.map(r=>{
          const c = ctrlFor(r.targetId);
          return (
            <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{r.name}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.active?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300':'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>{r.active?'Active':'Inactive'}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.approvalRequired?'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300':'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{r.approvalRequired?'Approval':'Auto'}</span>
                  {c?.controlling_rule_id && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" title="This ad is currently weather-controlled">🎛 In control</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setCheckRule(r)} className="text-xs font-semibold text-teal-600 border border-teal-200 dark:border-teal-800 rounded-lg px-2.5 py-1">🌤 Check weather</button>
                  <button onClick={()=>setEditRule(r)} className="text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1">Edit</button>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                📍 {r.city}{r.province?`, ${r.province}`:''} · {wxRuleSummary(r)} · → {r.targetType} {r.targetName||r.targetId}
                {r.dailyBudgetCents!=null?` · $${wxDollars(r.dailyBudgetCents)}/day`:''}
                {r.maxIncrementalSpendCents!=null?` · cap $${wxDollars(r.maxIncrementalSpendCents)}`:''}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400">Phase 1 — rules & live weather preview. Meta actions, approvals, automatic scheduling and reporting land in Phases 2–5.</p>

      {editRule && <WeatherRuleModal rule={editRule.id?editRule:null} onClose={()=>setEditRule(null)} onSaved={load} />}
      {checkRule && <WeatherCheckModal rule={checkRule} onClose={()=>setCheckRule(null)} />}
    </div>
  );
}
