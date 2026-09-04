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

// Compact weather-rule status shown on Ad Performance cards. For each rule
// attached to that Meta object it shows the condition, whether it's MET right
// now (live from the provider), and whether the rule currently controls the ad.
function AdWeatherRuleTag({ rules, control }) {
  const [live, setLive] = React.useState({});   // ruleId -> { loading?, w?, err? }
  const [metaStatus, setMetaStatus] = React.useState({}); // targetId -> effective_status (live)
  const controllingIds = new Set((control||[]).filter(c=>c.controlling_rule_id).map(c=>String(c.target_id)));
  const key = (rules||[]).map(r=>r.id).join(',');

  // Weather condition (one-time on mount) — the forecast doesn't move minute to minute.
  React.useEffect(() => { let dead=false; (async () => {
    for (const r of (rules||[])) {
      setLive(s=>({ ...s, [r.id]:{ loading:true } }));
      try {
        let lat=r.latitude, lng=r.longitude;
        if (lat==null || lng==null) {
          const g = await sb.functions.invoke('weather-provider', { body:{ action:'geocode', city:r.city, province:r.province } });
          const f = g.data?.results?.[0]; if (f) { lat=f.latitude; lng=f.longitude; }
        }
        if (lat==null || lng==null) throw new Error('no location');
        const res = await sb.functions.invoke('weather-provider', { body:{ action:'weather', latitude:lat, longitude:lng } });
        if (res.data?.error || res.error) throw new Error(res.data?.error || res.error?.message || 'weather failed');
        if (!dead) setLive(s=>({ ...s, [r.id]:{ w:res.data } }));
      } catch (e) { if (!dead) setLive(s=>({ ...s, [r.id]:{ err:(e.message||String(e)) } })); }
    }
  })(); return ()=>{ dead=true; }; }, [key]);

  // Live on/off status of the controlled Meta object — polled every 45s so the
  // card reflects the true state even when a weather rule flips it while you watch.
  React.useEffect(() => {
    const token = (typeof localStorage!=='undefined' && localStorage.getItem('meta_access_token')) || '';
    if (!token) return;
    let dead=false;
    const pull = async () => {
      const ids = [...new Set((rules||[]).map(r=>r.targetId).filter(Boolean))];
      for (const id of ids) {
        try {
          const j = await fetch(`https://graph.facebook.com/v25.0/${id}?fields=effective_status,status&access_token=${encodeURIComponent(token)}`).then(r=>r.json());
          if (!dead && !j.error) setMetaStatus(s=>({ ...s, [id]: j.effective_status || j.status || '?' }));
        } catch(_) {}
      }
    };
    pull();
    const t = setInterval(pull, 45000);
    return ()=>{ dead=true; clearInterval(t); };
  }, [key]);

  const isRunning = s => s === 'ACTIVE';
  const statusLabel = s => !s ? '' : (s==='ACTIVE'?'● Running':(s.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,m=>m.toUpperCase())));

  return (
    <div className="mt-1.5 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-900/10 p-2 space-y-1.5">
      {(rules||[]).map(r=>{
        const l = live[r.id];
        const ev = l?.w ? evalWeatherCondition(r, l.w) : null;
        const inControl = controllingIds.has(String(r.targetId));
        return (
          <div key={r.id} className="text-[11px] leading-snug">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-teal-700 dark:text-teal-300">🌦 Weather rule: {r.name}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${r.active?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300':'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>{r.active?'Active':'Inactive'}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${r.approvalRequired?'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300':'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{r.approvalRequired?'Approval':'Auto'}</span>
              {inControl && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">🎛 In control</span>}
              {metaStatus[r.targetId] && <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${isRunning(metaStatus[r.targetId])?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300':'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`} title="Live status of this ad object, refreshed automatically">{statusLabel(metaStatus[r.targetId])} · live</span>}
            </div>
            <p className="text-gray-500 dark:text-gray-400">Trigger: {wxRuleSummary(r)} · 📍 {r.city}{r.province?`, ${r.province}`:''}</p>
            {l?.loading && <p className="text-gray-400">Checking live weather…</p>}
            {l?.err && <p className="text-amber-600 dark:text-amber-400">Live weather unavailable ({l.err})</p>}
            {ev && (
              <p className={ev.met ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}>
                {ev.met ? '✅ Met right now' : '○ Not met right now'} — {ev.detail}
                {l.w?.current?.tempC!=null ? ` · now ${wxNum(l.w.current.tempC)}°C` : ''}
                {l.w?.airQuality?.usAqi!=null ? ` · AQI ${l.w.airQuality.usAqi}` : ''}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
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

// ── Apply-to-Meta confirmation (Phase 3) ─────────────────────────────────────
// Loads a read-only preview of the CURRENT Meta state + the exact planned change,
// surfaces conflicts / missing token, and only writes when the admin confirms.
function ApplyApprovalModal({ approval, onClose, onDone }) {
  const { dispatch } = useApp();
  const [loading, setLoading] = React.useState(true);
  const [prev, setPrev] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [applying, setApplying] = React.useState(false);

  React.useEffect(() => { (async () => {
    setLoading(true); setErr('');
    try {
      const { data, error } = await sb.functions.invoke('weather-execute', { body:{ action:'preview', approvalId:approval.id } });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Preview failed');
      setPrev(data);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  })(); }, [approval.id]);

  const apply = async () => {
    setApplying(true);
    try {
      const { data, error } = await sb.functions.invoke('weather-execute', { body:{ action:'apply', approvalId:approval.id } });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Apply failed');
      showToast(dispatch, 'Applied to Meta'+(data.clamped?' (budget clamped to cap)':''));
      onDone && onDone(); onClose();
    } catch (e) { showToast(dispatch, 'Apply failed: '+(e.message||e), 'error'); setErr(e.message||String(e)); }
    setApplying(false);
  };

  const budget = c => c==null ? '—' : '$'+(Number(c)/100).toFixed(2);
  const conflict = prev?.conflict;
  const blocked = !!conflict || prev?.missingEnv;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-5 space-y-3" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Apply to Meta</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-500">{approval.headline}</p>
        {loading && <p className="text-sm text-gray-500">Reading current Meta state…</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
        {prev && !loading && (
          <>
            {prev.missingEnv && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 p-2.5 text-xs text-red-700 dark:text-red-300">⚠️ META_ACCESS_TOKEN isn’t configured on the server, so Meta can’t be changed. Add it in Supabase → Edge Functions → Secrets, then retry.</div>}
            {conflict && <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 p-2.5 text-xs text-amber-800 dark:text-amber-200">⚠️ This ad object is already controlled by another weather rule. Roll that rule back first — only one rule may control an object at a time.</div>}
            {prev.liveError && !prev.missingEnv && <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 p-2.5 text-xs text-amber-800 dark:text-amber-200">Couldn’t read the live Meta object: {prev.liveError}</div>}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              <div className="flex justify-between px-3 py-2"><span className="text-gray-500">Target</span><span className="font-medium">{prev.targetType} {prev.target}</span></div>
              <div className="flex justify-between px-3 py-2"><span className="text-gray-500">Status now → after</span><span className="font-medium">{prev.before?.status||'?'} → <b className="text-emerald-600">{prev.plan?.status||prev.before?.status||'—'}</b></span></div>
              <div className="flex justify-between px-3 py-2"><span className="text-gray-500">Budget now → after</span><span className="font-medium">{budget(prev.before?.daily_budget)} → <b className="text-emerald-600">{prev.plan?.daily_budget!=null?budget(prev.plan.daily_budget):budget(prev.before?.daily_budget)}</b>{prev.plan?.clamped?' (capped)':''}</span></div>
              {prev.ceiling!=null && <div className="flex justify-between px-3 py-2"><span className="text-gray-500">Spend ceiling</span><span className="font-medium">{budget(prev.spentSoFar)} / {budget(prev.ceiling)}</span></div>}
            </div>
            {prev.plan?.note && <p className="text-[11px] text-gray-400">{prev.plan.note}</p>}
            <p className="text-[11px] text-gray-400">The current state above is saved so a rollback restores it exactly.</p>
          </>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button disabled={applying||loading||blocked} onClick={apply} className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-5 py-2 disabled:opacity-40">{applying?'Applying…':'Apply to Meta'}</button>
          <div className="flex-1" />
          <button onClick={onClose} className="text-sm text-gray-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
function WeatherAdsView() {
  const { state, dispatch } = useApp();
  const [rules, setRules] = React.useState([]);
  const [control, setControl] = React.useState([]);
  const [approvals, setApprovals] = React.useState([]);
  const [lastRun, setLastRun] = React.useState({});   // ruleId -> latest run row
  const [periods, setPeriods] = React.useState([]);   // automation_periods (Phase 5 reporting)
  const [loading, setLoading] = React.useState(true);
  const [checking, setChecking] = React.useState(null); // 'all' | ruleId | null
  const [syncing, setSyncing] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [editRule, setEditRule] = React.useState(null);   // null | {} (new) | rule
  const [checkRule, setCheckRule] = React.useState(null);
  const [applyAppr, setApplyAppr] = React.useState(null); // approval pending apply-to-Meta
  const [rollingBack, setRollingBack] = React.useState(null); // ruleId being rolled back

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
      // latest run per rule (recent window; first row per rule wins since ordered desc)
      const { data:runs } = await sb.from('automation_runs').select('rule_id,checked_at,condition_met,decision,note').order('checked_at',{ascending:false}).limit(300);
      const byRule = {}; (runs||[]).forEach(x => { if (!byRule[x.rule_id]) byRule[x.rule_id] = x; });
      setLastRun(byRule);
      const { data:per } = await sb.from('automation_periods').select('*').eq('trigger_type','weather').order('started_at',{ascending:false}).limit(200);
      setPeriods(per||[]);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  };

  // Phase 5 — pull Meta insights for every triggered period (spend/results + baseline).
  const syncReport = async () => {
    setSyncing(true);
    try {
      const { data, error } = await sb.functions.invoke('weather-report', { body:{} });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Sync failed');
      const failed = (data.results||[]).filter(r=>!r.ok).length;
      showToast(dispatch, failed ? `Synced ${data.synced} · ${failed} had no Meta data` : `Synced ${data.synced} period${data.synced===1?'':'s'}`);
      await load();
    } catch (e) { showToast(dispatch, 'Sync failed: '+(e.message||e), 'error'); }
    setSyncing(false);
  };
  React.useEffect(() => { load(); }, []);

  // Phase 2 — run the server-side engine (evaluate + log + recommend). No Meta.
  const runChecks = async (ruleId) => {
    setChecking(ruleId || 'all');
    try {
      const { data, error } = await sb.functions.invoke('weather-rules-check', { body: ruleId ? { ruleId } : {} });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Check failed');
      const res = data.results || [];
      const met = res.filter(x=>x.met).length;
      const recs = res.filter(x=>x.decision==='recommend').length;
      const applied = res.filter(x=>x.decision==='auto_executed').length;
      const rolled = res.filter(x=>['rolled_back','ceiling_rolled_back'].includes(x.decision)).length;
      const errs = res.filter(x=>['error','auto_failed','rollback_failed'].includes(x.decision));
      const noSecret = res.some(x=>String(x.decision||'').includes('no_cron_secret'));
      if (errs.length) showToast(dispatch, `${errs.length} rule(s) had a problem: ${errs[0].execError||errs[0].error||errs[0].decision}`, 'error');
      else if (noSecret) showToast(dispatch, 'Auto actions need CRON_SECRET set in Supabase → Edge Functions → Secrets', 'error');
      else if (!res.length) showToast(dispatch, ruleId ? 'Rule checked' : 'No active rules to check');
      else { const bits=[`${res.length} checked`, `${met} met`]; if(recs)bits.push(`${recs} new rec`); if(applied)bits.push(`${applied} auto-applied`); if(rolled)bits.push(`${rolled} rolled back`); showToast(dispatch, bits.join(' · ')); }
      await load();
    } catch (e) { showToast(dispatch, 'Check failed: '+(e.message||e), 'error'); }
    setChecking(null);
  };

  const ignoreApproval = async (a) => {
    try {
      const { error } = await sb.from('automation_approvals').update({ status:'ignored', decided_by:state.user.id, decided_at:new Date().toISOString() }).eq('id', a.id);
      if (error) throw error;
      await sb.from('automation_events').insert({ rule_id:a.rule_id, event_type:'ignored', detail:a.headline, actor:state.user.id });
      showToast(dispatch, 'Recommendation dismissed');
      await load();
    } catch (e) { showToast(dispatch, 'Failed: '+(e.message||e), 'error'); }
  };

  const rollback = async (r) => {
    if (!window.confirm(`Roll back "${r.name}"? This will ${r.stopAction==='pause'?'pause':r.stopAction==='restore'?'restore the previous status & budget on':'reset the budget on'} ${r.targetType} ${r.targetName||r.targetId} in Meta and release the lock.`)) return;
    setRollingBack(r.id);
    try {
      const { data, error } = await sb.functions.invoke('weather-execute', { body:{ action:'stop', ruleId:r.id } });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Rollback failed');
      showToast(dispatch, data.note || 'Rolled back in Meta');
      await load();
    } catch (e) { showToast(dispatch, 'Rollback failed: '+(e.message||e), 'error'); }
    setRollingBack(null);
  };

  const ctrlFor = id => control.find(c => c.target_id === id);
  const activeCount = rules.filter(r=>r.active).length;
  const controlledCount = control.filter(c=>c.controlling_rule_id).length;
  const ruleName = id => (rules.find(r=>r.id===id)||{}).name || '—';
  const weatherSpendCents = periods.reduce((s,p)=>s+(p.spend_cents||0),0);
  const anySynced = periods.some(p=>p.metrics_synced_at);
  const pctLift = (now, base) => (base==null||base===0) ? null : Math.round(((now-base)/base)*100);
  const lastCheckedAt = Object.values(lastRun).map(x=>x.checked_at).sort().slice(-1)[0];
  const fmtWhen = ts => { if(!ts) return null; const d=new Date(ts), m=Math.round((Date.now()-d)/60000); if(m<1) return 'just now'; if(m<60) return m+'m ago'; if(m<1440) return Math.round(m/60)+'h ago'; return d.toLocaleDateString(); };
  const DEC_LABEL = { recommend:'✅ Recommended', recommend_pending:'✅ Met (already pending)', holding:'🎛 Active (holding)', auto_executed:'⚡ Auto-applied', auto_failed:'⚠ Auto-apply failed', rolled_back:'⏹ Rolled back (cleared)', ceiling_rolled_back:'⏹ Rolled back (ceiling)', rollback_failed:'⚠ Rollback failed', auto_blocked_no_cron_secret:'⚠ Needs CRON_SECRET', rollback_blocked_no_cron_secret:'⚠ Needs CRON_SECRET', no_change:'○ No change', error:'⚠ Error' };

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
          {lastCheckedAt && <p className="text-[11px] text-teal-100/70 mt-1">Last check: {fmtWhen(lastCheckedAt)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button disabled={checking!=null || activeCount===0} onClick={()=>runChecks(null)} title={activeCount===0?'No active rules':'Evaluate all active rules against live weather'} className="text-sm font-semibold bg-white/15 hover:bg-white/25 text-white rounded-lg px-4 py-2 whitespace-nowrap disabled:opacity-40">{checking==='all'?'Checking…':'⟳ Check all now'}</button>
          <button onClick={()=>setEditRule({})} className="text-sm font-semibold bg-white text-[#2E8A97] hover:bg-teal-50 rounded-lg px-4 py-2 whitespace-nowrap">+ New rule</button>
        </div>
      </div>

      {/* Dashboard shell */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat v={activeCount} l="Active rules" />
        <Stat v={approvals.length} l="Pending approvals" />
        <Stat v={controlledCount} l="Ads weather-controlled" />
        <Stat v={periods.length ? `$${wxDollars(weatherSpendCents)}` : '—'} l="Weather spend (triggered)" />
      </div>

      {approvals.length>0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Pending weather recommendations</p>
          {approvals.map(a=>(
            <div key={a.id} className="rounded-lg bg-white/70 dark:bg-gray-900/40 border border-amber-200 dark:border-amber-800 p-2.5">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">{a.headline}</p>
              {a.body && <p className="text-[11px] text-amber-800/80 dark:text-amber-200/80 mt-0.5">{a.body}</p>}
              <div className="flex items-center gap-2 mt-2">
                <button onClick={()=>setApplyAppr(a)} title="Review the exact Meta change, then apply" className="text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-2.5 py-1">Approve & apply…</button>
                <button onClick={()=>ignoreApproval(a)} className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1">Ignore</button>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-amber-600 dark:text-amber-400">Approving shows the exact before → after and applies it to Meta with the budget cap, before-state capture, conflict lock and spend ceiling enforced.</p>
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
                  {c?.controlling_rule_id===r.id && <button disabled={rollingBack===r.id} onClick={()=>rollback(r)} title="Roll back this rule's Meta change and release the lock" className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg px-2.5 py-1 disabled:opacity-40">{rollingBack===r.id?'Rolling back…':'⏹ Roll back'}</button>}
                  <button disabled={checking!=null} onClick={()=>runChecks(r.id)} title="Evaluate this rule against live weather and log the result" className="text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-2.5 py-1 disabled:opacity-40">{checking===r.id?'Running…':'▶ Run now'}</button>
                  <button onClick={()=>setCheckRule(r)} className="text-xs font-semibold text-teal-600 border border-teal-200 dark:border-teal-800 rounded-lg px-2.5 py-1">🌤 Preview</button>
                  <button onClick={()=>setEditRule(r)} className="text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1">Edit</button>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                📍 {r.city}{r.province?`, ${r.province}`:''} · {wxRuleSummary(r)} · → {r.targetType} {r.targetName||r.targetId}
                {r.dailyBudgetCents!=null?` · $${wxDollars(r.dailyBudgetCents)}/day`:''}
                {r.maxIncrementalSpendCents!=null?` · cap $${wxDollars(r.maxIncrementalSpendCents)}`:''}
              </p>
              {lastRun[r.id] && (
                <p className="text-[11px] mt-1.5 flex items-center gap-1.5">
                  <span className={`font-semibold ${lastRun[r.id].decision==='error'?'text-red-600':lastRun[r.id].condition_met?'text-emerald-600 dark:text-emerald-400':'text-gray-400'}`}>{DEC_LABEL[lastRun[r.id].decision]||lastRun[r.id].decision}</span>
                  <span className="text-gray-400">· {fmtWhen(lastRun[r.id].checked_at)}</span>
                  {lastRun[r.id].note && <span className="text-gray-400 truncate">· {lastRun[r.id].note}</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Phase 5 — trigger performance */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div>
            <p className="font-semibold">📊 Trigger performance</p>
            <p className="text-[11px] text-gray-500">What each weather-triggered window actually delivered on Meta, vs the same ad in the equal window just before it.</p>
          </div>
          <button disabled={syncing || periods.length===0} onClick={syncReport} title={periods.length===0?'No triggered periods yet':'Pull Meta insights for every triggered window'} className="text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-3 py-1.5 disabled:opacity-40">{syncing?'Syncing…':'⟳ Sync Meta insights'}</button>
        </div>
        {periods.length===0
          ? <p className="text-xs text-gray-500 py-3 text-center">No triggered windows yet. When a rule activates an ad, it appears here — then Sync to pull spend & results.</p>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-400 text-left border-b border-gray-100 dark:border-gray-700">
                <th className="px-2 py-1">Rule</th><th className="px-2 py-1">Window</th><th className="px-2 py-1 text-right">Spend</th><th className="px-2 py-1 text-right">Impr.</th><th className="px-2 py-1 text-right">Clicks</th><th className="px-2 py-1 text-right">Results</th><th className="px-2 py-1 text-right">vs&nbsp;prior</th>
              </tr></thead>
              <tbody>
                {periods.map(p=>{
                  const lift = pctLift(p.results, p.baseline_results);
                  const spendLift = pctLift(p.spend_cents, p.baseline_spend_cents);
                  return (
                    <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="px-2 py-1.5 font-medium">{ruleName(p.rule_id)}</td>
                      <td className="px-2 py-1.5 text-gray-500">{(p.started_at||'').slice(5,10)} → {p.ended_at?p.ended_at.slice(5,10):<span className="text-emerald-600 font-semibold">active</span>}</td>
                      <td className="px-2 py-1.5 text-right">{p.spend_cents!=null?`$${wxDollars(p.spend_cents)}`:'—'}</td>
                      <td className="px-2 py-1.5 text-right">{p.impressions!=null?p.impressions.toLocaleString():'—'}</td>
                      <td className="px-2 py-1.5 text-right">{p.clicks!=null?p.clicks.toLocaleString():'—'}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{p.results!=null?p.results:'—'}</td>
                      <td className="px-2 py-1.5 text-right">{lift==null?<span className="text-gray-300">—</span>:<span className={lift>=0?'text-emerald-600 font-semibold':'text-rose-600 font-semibold'}>{lift>=0?'+':''}{lift}%</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!anySynced && <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">Metrics not pulled yet — hit “Sync Meta insights”. (Meta reports with a short delay, so very recent windows may read low.)</p>}
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-400">Phase 5 — weather-triggered windows are measured against baseline on Meta (spend, clicks, results, lift), and the live period’s real spend feeds the hard ceiling. Weather Ads is complete: rules → live checks → approval/auto → Meta with safeguards → scheduled every 2h → reporting.</p>

      {editRule && <WeatherRuleModal rule={editRule.id?editRule:null} onClose={()=>setEditRule(null)} onSaved={load} />}
      {checkRule && <WeatherCheckModal rule={checkRule} onClose={()=>setCheckRule(null)} />}
      {applyAppr && <ApplyApprovalModal approval={applyAppr} onClose={()=>setApplyAppr(null)} onDone={load} />}
    </div>
  );
}
