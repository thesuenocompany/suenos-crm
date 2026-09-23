// suenos-crm-calls.js — Voice Agent Calls (admin)
// Trigger outbound calls to stores via the ElevenLabs/Twilio agent and review
// what came back: transcript, summary, outcome, and any structured data. Each
// completed call is also logged onto its account by the post-call webhook.

function CallsView() {
  const { state, dispatch } = useApp();
  const isAdmin = state.user?.role === 'admin';
  const calls = state.calls || [];
  const accounts = state.accounts || [];

  const [pick, setPick]       = React.useState('');      // account search text
  const [picked, setPicked]   = React.useState(null);    // selected account
  const [calling, setCalling] = React.useState(false);
  const [q, setQ]             = React.useState('');       // filter the call list
  const [open, setOpen]       = React.useState({});       // expanded transcripts
  const callQueue = state.callQueue || [];
  const [cfg, setCfg]         = React.useState(null);     // editable copy of call config
  const [savingCfg, setSavingCfg] = React.useState(false);
  const [qAdding, setQAdding] = React.useState(false);
  React.useEffect(()=>{ if (state.callConfig) setCfg(state.callConfig); }, [state.callConfig]);

  const queueDone    = callQueue.filter(x=>x.status==='done');
  const queueFailed  = callQueue.filter(x=>x.status==='failed');
  const [qRegion, setQRegion] = React.useState('');
  const [qType, setQType]     = React.useState('');
  const pendingAll = callQueue.filter(x=>x.status==='pending');
  // Distinct regions / licence types present in the pending queue (for the filters)
  const qRegions = React.useMemo(()=>[...new Set(pendingAll.map(x=>acctById[x.accountId]?.region).filter(Boolean))].sort(), [pendingAll, acctById]);
  const qTypes   = React.useMemo(()=>[...new Set(pendingAll.map(x=>acctById[x.accountId]?.licenceType).filter(Boolean))].sort(), [pendingAll, acctById]);
  const queuePending = pendingAll.filter(x=>{
    const a = acctById[x.accountId];
    if (qRegion && (a?.region||'')!==qRegion) return false;
    if (qType && (a?.licenceType||'')!==qType) return false;
    return true;
  });
  async function removeShown() {
    if (!queuePending.length) return;
    if (!confirm(`Remove ${queuePending.length} shown item${queuePending.length!==1?'s':''} from the queue? (They won't be called. Accounts are kept.)`)) return;
    try { await dbCallQueueRemove(dispatch, queuePending.map(x=>x.id)); showToast(dispatch, 'Removed from queue'); }
    catch(e){ showToast(dispatch, 'Remove failed: '+(e.message||e), 'error'); }
  }

  async function saveCfg(patch) {
    const next = { ...(cfg||{ enabled:false, dailyCap:25, perRunCap:5, windowStart:15, windowEnd:20, daysMode:'all', timezone:'America/Vancouver' }), ...patch };
    setCfg(next); setSavingCfg(true);
    try { await dbSaveCallConfig(dispatch, next); showToast(dispatch, 'Auto-call settings saved'); }
    catch(e){ showToast(dispatch, 'Save failed: '+(e.message||e), 'error'); }
    finally { setSavingCfg(false); }
  }
  async function addToQueue(acc) {
    if (!acc) return;
    setQAdding(true);
    try { const r = await dbCallQueueAdd(dispatch, [acc.id]); showToast(dispatch, r.added ? `${acc.name} added to the call queue` : `${acc.name} is already queued or has no phone`); setPicked(null); setPick(''); }
    catch(e){ showToast(dispatch, 'Add failed: '+(e.message||e), 'error'); }
    finally { setQAdding(false); }
  }
  async function removeFromQueue(id) {
    try { await dbCallQueueRemove(dispatch, [id]); }
    catch(e){ showToast(dispatch, 'Remove failed: '+(e.message||e), 'error'); }
  }
  const H12 = h => { const x=((h+11)%12)+1; return `${x}${h<12?'am':'pm'}`; };

  const [syncing, setSyncing] = React.useState(false);
  async function syncNow() {
    setSyncing(true);
    try { const r = await dbSyncCalls(dispatch); showToast(dispatch, 'Calls refreshed'+(r&&r.completed?` · ${r.completed} completed`:'')); }
    catch(e){ showToast(dispatch, 'Sync failed: '+(e.message||e), 'error'); }
    finally { setSyncing(false); }
  }
  const [audio, setAudio] = React.useState({});   // callId -> { loading|url|error }
  async function playAudio(c) {
    if (audio[c.id]?.url) return;
    setAudio(a=>({ ...a, [c.id]:{ loading:true } }));
    try { const url = await fetchCallAudioUrl(c.conversationId); setAudio(a=>({ ...a, [c.id]:{ url } })); }
    catch(e){ setAudio(a=>({ ...a, [c.id]:{ error:e.message } })); showToast(dispatch, e.message||'No recording', 'error'); }
  }
  // Keep the list fresh while the screen is open (calls resolve via server sync).
  React.useEffect(()=>{ const t=setInterval(()=>{ dbLoadCalls(dispatch); }, 20000); return ()=>clearInterval(t); }, []);

  const acctById = React.useMemo(() => Object.fromEntries(accounts.map(a=>[a.id,a])), [accounts]);
  const fmtDT = d => d ? new Date(d).toLocaleString('en-CA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const fmtDur = s => s==null ? '' : `${Math.floor(s/60)}m ${s%60}s`;

  const matches = React.useMemo(() => {
    const t = pick.trim().toLowerCase();
    if (!t) return [];
    return accounts.filter(a => a.phone && (a.name||'').toLowerCase().includes(t)).slice(0,8);
  }, [pick, accounts]);

  async function startCall(acc) {
    if (!acc) return;
    if (!acc.phone) { showToast(dispatch, 'That account has no phone number', 'error'); return; }
    if (!confirm(`Call ${acc.name} at ${acc.phone} with the voice agent now?`)) return;
    setCalling(true);
    try {
      await dbStartCall(dispatch, { accountId:acc.id, phone:acc.phone, name:acc.name, campaign:'voice-outreach' });
      showToast(dispatch, `Calling ${acc.name}…`);
      setPicked(null); setPick('');
    } catch(e) { showToast(dispatch, 'Call failed: '+(e.message||e), 'error'); }
    finally { setCalling(false); }
  }

  const statusMeta = {
    initiated:   ['Calling…',   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'],
    in_progress: ['In progress','bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'],
    done:        ['Done',       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'],
    failed:      ['Failed',     'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'],
  };
  const outcomeMeta = {
    success: ['Success','bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'],
    failure: ['No / failure','bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'],
    unknown: ['Unclear','bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'],
  };
  const chip = (meta) => meta ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${meta[1]}`}>{meta[0]}</span> : null;

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return calls;
    return calls.filter(c => {
      const nm = (acctById[c.accountId]?.name || '').toLowerCase();
      return nm.includes(t) || (c.phone||'').includes(t) || (c.summary||'').toLowerCase().includes(t);
    });
  }, [calls, q, acctById]);

  if (!isAdmin) return <div className="p-6 text-sm text-gray-500">Voice agent calls are available to admins.</div>;

  const inputCls = "px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white"><Ic n="phone" cls="w-4 h-4"/></div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Voice Agent Calls</h1>
          <p className="text-xs text-gray-500">Call stores with the AI voice agent. Each call is logged to its account with a transcript and summary.</p>
        </div>
      </div>

      {/* Start a call */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Call a store</p>
        <div className="relative">
          <input value={pick} onChange={e=>{ setPick(e.target.value); setPicked(null); }}
            placeholder="Search an account with a phone number…" className={`${inputCls} w-full`} />
          {matches.length>0 && !picked && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
              {matches.map(a=>(
                <button key={a.id} onClick={()=>{ setPicked(a); setPick(a.name); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-2">
                  <span className="text-gray-800 dark:text-gray-200 truncate">{a.name}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{a.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={()=>startCall(picked)} disabled={!picked || calling}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 flex items-center gap-1.5">
            <Ic n="phone" cls="w-4 h-4"/> {calling ? 'Starting…' : picked ? `Call ${picked.name}` : 'Pick an account'}
          </button>
          <button onClick={()=>addToQueue(picked)} disabled={!picked || qAdding}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-40">
            {qAdding ? '…' : '+ Queue'}
          </button>
          {picked && <span className="text-xs text-gray-500">{picked.phone}</span>}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Calls are placed by your ElevenLabs agent over Twilio. Results appear below and on the account once the call ends.</p>
      </div>

      {/* Auto-call queue */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Auto-call queue</p>
            <p className="text-xs text-gray-500">The system works through the queue on its own during your calling window.</p>
          </div>
          <button onClick={()=>saveCfg({ enabled: !(cfg&&cfg.enabled) })} disabled={savingCfg}
            className={`relative w-12 h-6 rounded-full transition flex-shrink-0 ${cfg&&cfg.enabled ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            title={cfg&&cfg.enabled ? 'Auto-calling is ON' : 'Auto-calling is OFF'}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${cfg&&cfg.enabled ? 'translate-x-6' : ''}`}/>
          </button>
        </div>

        {cfg && (
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <label className="text-xs text-gray-500">Per day
              <select value={cfg.dailyCap} onChange={e=>saveCfg({ dailyCap:Number(e.target.value) })}
                className="block mt-0.5 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                {[10,25,50,100,150].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-500">From
              <select value={cfg.windowStart} onChange={e=>saveCfg({ windowStart:Number(e.target.value) })}
                className="block mt-0.5 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                {Array.from({length:24},(_,h)=><option key={h} value={h}>{H12(h)}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-500">To
              <select value={cfg.windowEnd} onChange={e=>saveCfg({ windowEnd:Number(e.target.value) })}
                className="block mt-0.5 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                {Array.from({length:24},(_,h)=><option key={h} value={h}>{H12(h)}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-500">Days
              <select value={cfg.daysMode} onChange={e=>saveCfg({ daysMode:e.target.value })}
                className="block mt-0.5 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="all">Every day</option>
                <option value="weekdays">Weekdays only</option>
              </select>
            </label>
            <span className="text-xs text-gray-400 pb-1">Pacific time</span>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs mb-2">
          <span className="text-amber-600 dark:text-amber-400 font-semibold">{pendingAll.length} pending</span>
          <span className="text-emerald-600 dark:text-emerald-400">{queueDone.length} called</span>
          {queueFailed.length>0 && <span className="text-red-600">{queueFailed.length} failed</span>}
          <span className="flex-1"/>
          <span className="text-gray-400">Add stores from Prospects or Accounts → “Add to call queue” (Type/Region filters honored), or the search above → “+ Queue”.</span>
        </div>

        {pendingAll.length>0 && (qRegions.length>0 || qTypes.length>0) && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <select value={qRegion} onChange={e=>setQRegion(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              <option value="">All regions</option>
              {qRegions.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <select value={qType} onChange={e=>setQType(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              <option value="">All licence types</option>
              {qTypes.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            {(qRegion||qType) && <button onClick={()=>{setQRegion('');setQType('');}} className="text-[11px] text-gray-400 hover:text-gray-600 underline">Clear</button>}
            <span className="flex-1"/>
            {(qRegion||qType) && queuePending.length>0 &&
              <button onClick={removeShown} className="text-[11px] font-medium px-2 py-1 rounded-md border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Remove shown ({queuePending.length})</button>}
          </div>
        )}
        {queuePending.length>0 && (
          <div className="max-h-48 overflow-auto rounded-lg border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {queuePending.slice(0,100).map(item=>{
              const a = acctById[item.accountId];
              return (
                <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                  <span className="truncate text-gray-800 dark:text-gray-200">{a ? a.name : item.accountId}</span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{a?.phone||''}</span>
                    <button onClick={()=>removeFromQueue(item.id)} className="text-gray-400 hover:text-red-600" title="Remove from queue"><Ic n="x" cls="w-4 h-4"/></button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {!cfg?.enabled && pendingAll.length>0 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">Auto-calling is off — turn on the toggle to start working through the queue.</p>
        )}
      </div>

      {/* Recent calls */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent calls <span className="text-gray-400 font-normal">({calls.length})</span></p>
        <div className="flex items-center gap-2">
          <button onClick={syncNow} disabled={syncing}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {syncing ? 'Syncing…' : '↻ Sync now'}
          </button>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter…" className={`${inputCls} py-1.5 text-xs`} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-sm text-gray-500 py-14 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          No calls yet. Start one above, or run a batch from Accounts → Call list.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(c=>{
            const acc = acctById[c.accountId];
            const isOpen = open[c.id];
            const tr = Array.isArray(c.transcript) ? c.transcript : [];
            const dc = c.dataCollection && typeof c.dataCollection==='object' ? Object.entries(c.dataCollection) : [];
            return (
              <div key={c.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {acc
                        ? <button onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:acc.id}})} className="font-semibold text-teal-700 dark:text-teal-400 hover:underline truncate">{acc.name}</button>
                        : <span className="font-semibold text-gray-900 dark:text-white truncate">{c.phone || 'Unknown'}</span>}
                      {chip(statusMeta[c.status])}
                      {c.callSuccessful && chip(outcomeMeta[c.callSuccessful])}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.phone || '—'}{c.durationSecs!=null?` · ${fmtDur(c.durationSecs)}`:''} · {fmtDT(c.startedAt)}
                    </p>
                    {c.summary && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 line-clamp-2">{c.summary}</p>}
                  </div>
                  {(tr.length>0 || dc.length>0 || c.conversationId) && (
                    <button onClick={()=>setOpen(o=>({...o,[c.id]:!o[c.id]}))}
                      className="text-xs font-medium text-teal-600 hover:text-teal-700 whitespace-nowrap flex-shrink-0">
                      {isOpen ? 'Hide' : 'Details'}
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
                    {c.conversationId && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Recording</p>
                        {audio[c.id]?.url
                          ? <audio controls src={audio[c.id].url} className="w-full h-9" />
                          : <button onClick={()=>playAudio(c)} disabled={audio[c.id]?.loading}
                              className="text-xs font-medium px-2.5 py-1 rounded-md border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-50">
                              {audio[c.id]?.loading ? 'Loading…' : '▶ Play recording'}
                            </button>}
                        {audio[c.id]?.error && <span className="text-[11px] text-gray-400 ml-2">{audio[c.id].error}</span>}
                      </div>
                    )}
                    {dc.length>0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Captured</p>
                        <div className="flex flex-wrap gap-2">
                          {dc.map(([k,v])=>(
                            <span key={k} className="text-[11px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300">
                              <b>{k.replace(/_/g,' ')}:</b> {String(v && typeof v==='object' ? (v.value ?? JSON.stringify(v)) : v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {tr.length>0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Transcript</p>
                        <div className="space-y-1.5 max-h-72 overflow-auto">
                          {tr.map((t,i)=>(
                            <div key={i} className={`text-sm ${t.role==='agent'?'text-gray-800 dark:text-gray-200':'text-teal-800 dark:text-teal-300'}`}>
                              <span className="text-[10px] font-bold uppercase mr-1.5 text-gray-400">{t.role==='agent'?'Agent':'Store'}</span>
                              {t.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
