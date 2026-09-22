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
          {picked && <span className="text-xs text-gray-500">{picked.phone}</span>}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Calls are placed by your ElevenLabs agent over Twilio. Results appear below and on the account once the call ends.</p>
      </div>

      {/* Recent calls */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent calls <span className="text-gray-400 font-normal">({calls.length})</span></p>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter…" className={`${inputCls} py-1.5 text-xs`} />
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
                  {(tr.length>0 || dc.length>0) && (
                    <button onClick={()=>setOpen(o=>({...o,[c.id]:!o[c.id]}))}
                      className="text-xs font-medium text-teal-600 hover:text-teal-700 whitespace-nowrap flex-shrink-0">
                      {isOpen ? 'Hide' : 'Transcript'}
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
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
