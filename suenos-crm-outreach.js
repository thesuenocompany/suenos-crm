// suenos-crm-outreach.js — Prospecting Outreach (admin, read-only)
// Surfaces what the prospecting agent writes: outreach_messages (drafts per
// campaign) + license_enrichment (found websites/emails), joined to the licenses
// master for establishment name/city. REVIEW ONLY — nothing is sent from here.

function OutreachView() {
  const { state, dispatch } = useApp();
  const [marking, setMarking] = React.useState(null); // id or 'bulk' while saving
  const outreach   = state.outreach   || [];
  const enrichment = state.enrichment || [];
  const licInfo    = state.licenceInfo || {};
  const infoFor = ln => licInfo[ln] || {};

  const campaigns = React.useMemo(() =>
    [...new Set(outreach.map(o => o.campaign_id).filter(Boolean))].sort(), [outreach]);
  const [campaign, setCampaign] = React.useState('');
  React.useEffect(() => { if (!campaign && campaigns.length) setCampaign(campaigns[0]); }, [campaigns]);
  const [tab, setTab] = React.useState('drafts');   // drafts | enrichment
  const [open, setOpen] = React.useState({});       // expanded draft bodies

  const msgs = React.useMemo(() =>
    outreach.filter(o => o.campaign_id === campaign), [outreach, campaign]);

  const statusMeta = {
    queued:  ['Queued',  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'],
    sent:    ['Sent',    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'],
    replied: ['Replied', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'],
    opened:  ['Opened',  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'],
    skipped: ['Skipped', 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'],
    error:   ['Error',   'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'],
  };
  const badge = s => { const [l,c] = statusMeta[s] || [s||'—','bg-gray-100 text-gray-500'];
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${c}`}>{l}</span>; };

  const cnt = st => msgs.filter(m => m.status === st).length;
  const queuedMsgs = msgs.filter(m => m.status === 'queued');

  // Mark a drafted message as sent — for when you've sent it yourself from your
  // mail drafts folder. Advances it out of "queued" so the agent can move on.
  async function markSent(ids, key) {
    setMarking(key);
    try { await dbMarkOutreachSent(dispatch, ids); showToast(dispatch, (Array.isArray(ids)&&ids.length>1?ids.length+' messages':'Message')+' marked sent'); }
    catch(e) { showToast(dispatch, 'Update failed: '+(e.message||e), 'error'); }
    finally { setMarking(null); }
  }
  const drafted = msgs.filter(m => m.draft_body).length;
  const emailsFound = enrichment.filter(e => e.email).length;
  const conf = v => v == null ? '—' : `${Math.round(Number(v)*100)}%`;
  const fmtDT = d => d ? new Date(d).toLocaleString('en-CA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

  const kpi = (n,l) => (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 p-3 text-center">
      <div className="text-xl font-bold text-teal-700 dark:text-teal-400">{n}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{l}</div>
    </div>);
  const tabBtn = (id,label,count) => (
    <button onClick={()=>setTab(id)}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${tab===id?'bg-teal-600 text-white':'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
      {label}<span className="ml-1.5 text-xs opacity-70">{count}</span></button>);
  const inputCls = "px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      <div className="mb-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Prospecting Outreach</h1>
        <p className="text-xs text-gray-500 mt-0.5">Drafts and enrichment produced by the prospecting agent. Review only — no messages are sent from this screen.</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center text-sm text-gray-500 py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 mt-4">
          No outreach campaigns found yet.
        </div>
      ) : (<>
        <div className="flex flex-wrap items-end gap-3 my-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">Campaign</label>
            <select value={campaign} onChange={e=>setCampaign(e.target.value)} className={inputCls}>
              {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {queuedMsgs.length > 0 && (
            <button onClick={()=>{ if(confirm(`Mark all ${queuedMsgs.length} queued messages as sent? Do this only for drafts you've already sent from your mail.`)) markSent(queuedMsgs.map(m=>m.id),'bulk'); }}
              disabled={marking==='bulk'}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-50">
              {marking==='bulk' ? 'Marking…' : `✓ Mark all ${queuedMsgs.length} queued as sent`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
          {kpi(msgs.length,'Messages')}
          {kpi(drafted,'Drafts')}
          {kpi(cnt('queued'),'Queued')}
          {kpi(cnt('sent')+cnt('replied'),'Sent')}
          {kpi(emailsFound,'Emails Found')}
        </div>

        <div className="flex gap-1.5 mb-4">
          {tabBtn('drafts','Outreach drafts', msgs.length)}
          {tabBtn('enrichment','Enrichment', enrichment.length)}
        </div>

        {tab === 'drafts' && (
          <div className="space-y-2.5">
            {msgs.length === 0 && <p className="text-sm text-gray-500 py-8 text-center">No messages in this campaign.</p>}
            {msgs.map(m => {
              const info = infoFor(m.licence_number);
              const isOpen = open[m.id];
              return (
                <div key={m.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{info.establishment || `Licence ${m.licence_number}`}</p>
                        {badge(m.status)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[info.city, info.region].filter(Boolean).join(', ') || '—'} · Licence {m.licence_number}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        <Ic n="mail" cls="w-3 h-3 inline mr-1 -mt-0.5"/>{m.email || <span className="text-gray-400">no email</span>}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                      <button onClick={()=>setOpen(o=>({...o,[m.id]:!o[m.id]}))}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700 whitespace-nowrap">
                        {isOpen ? 'Hide draft' : 'View draft'}
                      </button>
                      {m.status === 'queued' && (
                        <button onClick={()=>markSent(m.id, m.id)} disabled={marking===m.id}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap disabled:opacity-50">
                          {marking===m.id ? '…' : '✓ Mark sent'}
                        </button>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-gray-400">Subject</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{m.draft_subject || <span className="text-gray-400">—</span>}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-gray-400">Body</p>
                        <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">{m.draft_body || '—'}</pre>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-[11px] text-gray-500">
                        <span><b className="text-gray-400">Consent:</b> {(m.consent_basis||'—').replace(/_/g,' ')}</span>
                        <span><b className="text-gray-400">Drafted:</b> {fmtDT(m.drafted_at)}</span>
                        {m.sent_at && <span><b className="text-gray-400">Sent:</b> {fmtDT(m.sent_at)}</span>}
                        {m.replied_at && <span><b className="text-gray-400">Replied:</b> {fmtDT(m.replied_at)}</span>}
                        {m.skip_reason && <span className="text-amber-600"><b>Skipped:</b> {m.skip_reason}</span>}
                        {m.mailbox_error && <span className="text-red-600"><b>Error:</b> {m.mailbox_error}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'enrichment' && (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500">
              Enrichment is a shared pool keyed by licence number (not campaign-specific). {enrichment.length} licences · {emailsFound} with an email found.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-teal-700 text-white">
                  {['Establishment','City','Email','Conf.','Website','Status','Updated'].map((h,i)=>
                    <th key={h} className={`text-[10px] font-bold uppercase tracking-wide px-3 py-2 ${i>=3&&i<=3?'text-right':'text-left'}`}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {enrichment.map((e,i)=>{ const info=infoFor(e.licence_number); return (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200">{info.establishment || `Licence ${e.licence_number}`}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{info.city || '—'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{e.email || <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2 text-sm text-right tabular-nums text-gray-600">{conf(e.email_confidence)}</td>
                      <td className="px-3 py-2 text-sm">{e.website ? <a href={e.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">link</a> : <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{e.status || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{e.updated_at ? new Date(e.updated_at).toLocaleDateString('en-CA') : '—'}</td>
                    </tr>);})}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}
