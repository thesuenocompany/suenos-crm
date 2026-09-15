// PROSPECTING: Coverage · Match review · Outreach
// Panels mounted as tabs inside LicenseProspectsView.
// Backed by v_coverage_by_region, licence_match_review, license_enrichment
// and outreach_messages.

// ─── COVERAGE ─────────────────────────────────────────────────────────────────
function ProspectCoveragePanel() {
  const { dispatch } = useApp();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try {
      const { data, error } = await sb.from('v_coverage_by_region').select('*');
      if (error) throw error;
      setRows((data || []).sort((a,b) =>
        b.total_licences - a.total_licences || (a.region||'').localeCompare(b.region||'')));
    } catch(e) { showToast(dispatch, 'Coverage failed: '+e.message, 'error'); }
    finally { setLoading(false); }
  })(); }, []);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    licences: acc.licences + (r.total_licences||0),
    held:     acc.held + (r.held||0),
  }), {licences:0, held:0}), [rows]);

  if (loading) return <Card cls="p-6 text-center text-xs text-gray-400">Loading coverage…</Card>;

  const pct = totals.licences ? (100*totals.held/totals.licences) : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Targetable', totals.licences.toLocaleString('en-CA')],
          ['Held', totals.held.toLocaleString('en-CA')],
          ['Whitespace', (totals.licences-totals.held).toLocaleString('en-CA')],
          ['Penetration', pct.toFixed(1)+'%'],
        ].map(([label, val]) => (
          <Card key={label} cls="p-3">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{val}</div>
            <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
          </Card>
        ))}
      </div>

      <Card cls="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="px-3 py-2 font-medium">Region</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium text-right">Licences</th>
                <th className="px-3 py-2 font-medium text-right">Held</th>
                <th className="px-3 py-2 font-medium w-40">Penetration</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.region}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.crm_type}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{(r.total_licences||0).toLocaleString('en-CA')}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.held||0}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-violet-500" style={{width: Math.min(100, (r.pct_held||0)*4)+'%'}} />
                      </div>
                      <span className="tabular-nums text-gray-500 w-10 text-right">{(r.pct_held ?? 0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[10px] text-gray-400">Bar scaled to 25% for readability — penetration is low across the board.</p>
    </div>
  );
}

// ─── MATCH REVIEW ─────────────────────────────────────────────────────────────
function ProspectMatchPanel() {
  const { dispatch, state } = useApp();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId]   = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await sb.from('licence_match_review')
        .select('id,account_id,licence_number,name_score,total_score,distance_m,accounts(name),licenses(establishment,city,licence_type)')
        .eq('status','pending').eq('confidence','review').eq('rank',1)
        .order('total_score', { ascending:false });
      if (error) throw error;
      setRows(data || []);
    } catch(e) { showToast(dispatch, 'Match review failed: '+e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function decide(row, accept) {
    setBusyId(row.id);
    try {
      if (accept) {
        const { error } = await sb.from('accounts')
          .update({ license_number: row.licence_number, updated_at: new Date().toISOString() })
          .eq('id', row.account_id);
        if (error) throw error;
      }
      const { error: e2 } = await sb.from('licence_match_review').update({
        status: accept ? 'applied' : 'rejected',
        decided_by: state.user?.id ?? null,
        decided_at: new Date().toISOString(),
      }).eq('id', row.id);
      if (e2) throw e2;
      setRows(prev => prev.filter(r => r.id !== row.id));
      showToast(dispatch, accept ? 'Linked to licence' : 'Rejected', 'success');
    } catch(e) { showToast(dispatch, 'Failed: '+e.message, 'error'); }
    finally { setBusyId(null); }
  }

  const clean = (s) => (s||'').replace(/\(\s*\d+\s*\)/, '').trim();

  if (loading) return <Card cls="p-6 text-center text-xs text-gray-400">Loading matches…</Card>;
  if (!rows.length) return (
    <Card cls="p-8 text-center">
      <div className="text-2xl mb-2">✓</div>
      <p className="text-xs text-gray-500 dark:text-gray-400">No matches pending review.</p>
    </Card>
  );

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Accounts that look like a BC licence but couldn't be confirmed automatically — usually
        because the account has no postal code. Accepting writes the licence number onto the account,
        which is what keeps it out of the prospect list.
      </p>
      {rows.map(r => (
        <Card key={r.id} cls="p-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{r.accounts?.name}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                ↔ {clean(r.licenses?.establishment)}
                {r.licenses?.city && <span className="text-gray-400"> · {r.licenses.city}</span>}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                licence {r.licence_number} · score {Number(r.total_score).toFixed(2)}
                {r.distance_m != null && <> · {r.distance_m < 1000 ? Math.round(r.distance_m)+' m' : (r.distance_m/1000).toFixed(1)+' km'} apart</>}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button disabled={busyId===r.id} onClick={()=>decide(r, true)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-violet-600 text-white font-medium hover:opacity-90 disabled:opacity-40">
                Accept
              </button>
              <button disabled={busyId===r.id} onClick={()=>decide(r, false)}
                className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">
                Reject
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Copy helper — the drafts live in the CRM until Graph write permission lands,
// so reading and copying them here is the whole workflow in the meantime.
function copyDraft(m, dispatch) {
  const text = [m.draft_subject ? 'Subject: ' + m.draft_subject : '', '', m.draft_body || ''].join('\n');
  const done = () => showToast(dispatch, 'Draft copied', 'success');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done, dispatch));
  } else {
    fallbackCopy(text, done, dispatch);
  }
}
function fallbackCopy(text, done, dispatch) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  } catch (e) { showToast(dispatch, 'Copy failed — select the text manually', 'error'); }
}

/**
 * Reject a contact the crawler got wrong — most often a host venue's general
 * address (a ski hill, hotel, mall) rather than the liquor store's own.
 * Clears the email so the licence cannot become eligible again on it, and marks
 * the queued message skipped. The licence returns to the enrichment queue.
 */
async function rejectContact(m, reason, dispatch, onDone) {
  try {
    const { data: msg, error: e0 } = await sb.from('outreach_messages')
      .select('licence_number, email_norm').eq('id', m.id).single();
    if (e0) throw e0;

    const { error: e1 } = await sb.from('license_enrichment').update({
      status: 'no_email',
      email: null, email_type: null, email_confidence: null,
      email_source_url: null, email_source_snippet: null, email_found_at: null,
      contact_name: null, contact_title: null,
      last_error: 'rejected in CRM: ' + reason,
      updated_at: new Date().toISOString(),
    }).eq('licence_number', msg.licence_number);
    if (e1) throw e1;

    const { error: e2 } = await sb.from('outreach_messages').update({
      status: 'skipped', skip_reason: reason,
    }).eq('id', m.id);
    if (e2) throw e2;

    // A wrong or unwanted address must never be tried again, from any licence.
    if (reason === 'wrong business' || reason === 'do not contact') {
      await sb.from('outreach_suppressions')
        .upsert({ email_norm: msg.email_norm, reason: 'manual',
                  source: 'rejected in CRM: ' + reason },
                { onConflict: 'email_norm', ignoreDuplicates: true });
    }

    showToast(dispatch, 'Contact rejected', 'success');
    onDone();
  } catch (e) { showToast(dispatch, 'Reject failed: ' + e.message, 'error'); }
}

// ─── OUTREACH ─────────────────────────────────────────────────────────────────
function ProspectOutreachPanel() {
  const { dispatch } = useApp();
  const [msgs, setMsgs]       = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId]   = useState(null);
  const [rejectId, setRejectId]   = useState(null);
  const [busyId, setBusyId]       = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { (async () => {
    try {
      const [{ data: m, error: e1 }, { data: enr, error: e2 }] = await Promise.all([
        sb.from('outreach_messages')
          .select('id,email,status,queued_at,sent_at,consent_evidence,draft_subject,draft_body,drafted_at,mailbox_error,licenses(establishment,city)')
          .order('queued_at', { ascending:false }).limit(100),
        sb.from('license_enrichment').select('status'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setMsgs(m || []);
      const counts = {};
      (enr || []).forEach(r => { counts[r.status] = (counts[r.status]||0) + 1; });
      setStats(counts);
    } catch(e) { showToast(dispatch, 'Outreach failed: '+e.message, 'error'); }
    finally { setLoading(false); }
  })(); }, [reloadKey]);

  const clean = (s) => (s||'').replace(/\(\s*\d+\s*\)/, '').trim();
  const STATUS_CLS = {
    queued:'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    sent:'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    replied:'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    unsubscribed:'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    bounced:'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };

  if (loading) return <Card cls="p-6 text-center text-xs text-gray-400">Loading outreach…</Card>;

  return (
    <div className="space-y-3">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[['enriched','Contacts found'],['no_email','No email'],['no_website','No site'],
            ['blocked','Opted out'],['failed','Failed']].map(([k,label]) => (
            <Card key={k} cls="p-2.5">
              <div className="text-base font-bold text-gray-900 dark:text-white">{stats[k] || 0}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
            </Card>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400">
        “Opted out” means the site published a no-unsolicited-email notice. Those are permanently
        excluded — that's the rule working, not a failure.
      </p>

      {!msgs.length ? (
        <Card cls="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
          Nothing queued yet. The daily task drafts into the sales mailbox.
        </Card>
      ) : msgs.map(m => {
        const ev = m.consent_evidence || {};
        const open = openId === m.id;
        return (
          <Card key={m.id} cls="p-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{clean(m.licenses?.establishment)}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">{m.email}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {m.licenses?.city} · queued {new Date(m.queued_at).toLocaleDateString('en-CA')}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[m.status] || STATUS_CLS.queued}`}>{m.status}</span>
                <button onClick={()=>setOpenId(open ? null : m.id)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline">
                  {open ? 'hide' : 'consent'}
                </button>
                {m.status === 'queued' && (
                  <button onClick={()=>setRejectId(rejectId === m.id ? null : m.id)}
                    className="text-[10px] text-red-600 hover:text-red-700 underline">
                    reject
                  </button>
                )}
              </div>
            </div>
            {rejectId === m.id && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">
                  Why is this contact wrong? The licence goes back in the enrichment queue.
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    ['wrong business', 'Belongs to a host venue or another business'],
                    ['not the buyer',  'Right business, wrong department'],
                    ['closed',         'Business appears closed'],
                    ['do not contact', 'Never approach this one'],
                  ].map(([key, hint]) => (
                    <button key={key} title={hint} disabled={busyId === m.id}
                      onClick={()=>{ setBusyId(m.id);
                        rejectContact(m, key, dispatch, ()=>{ setBusyId(null); setRejectId(null); setReloadKey(k=>k+1); }); }}
                      className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-red-400 hover:text-red-600 disabled:opacity-40">
                      {key}
                    </button>
                  ))}
                  <button onClick={()=>setRejectId(null)}
                    className="text-[10px] px-2 py-1 text-gray-400 hover:text-gray-600">cancel</button>
                </div>
              </div>
            )}
            {open && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-400 space-y-2">
                {m.draft_body ? (
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                        {m.draft_subject || '(no subject)'}
                      </span>
                      <button onClick={()=>copyDraft(m, dispatch)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-violet-600 text-white font-medium hover:opacity-90 shrink-0">
                        Copy draft
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded p-2 max-h-72 overflow-y-auto">{m.draft_body}</pre>
                  </div>
                ) : (
                  <div className="italic text-gray-400">No draft written yet.</div>
                )}
                {m.mailbox_error && (
                  <div className="text-amber-700 dark:text-amber-400">
                    Not pushed to the mailbox: {m.mailbox_error}
                  </div>
                )}
                <div className="pt-1 border-t border-gray-100 dark:border-gray-800" />
                <div><span className="text-gray-400">Basis:</span> {ev.basis || '—'}</div>
                <div>
                  <span className="text-gray-400">Published at:</span>{' '}
                  {ev.source_url
                    ? <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 underline break-all">{ev.source_url}</a>
                    : '—'}
                </div>
                {ev.captured_at && <div><span className="text-gray-400">Captured:</span> {new Date(ev.captured_at).toLocaleDateString('en-CA')}</div>}
                {ev.snippet && <div className="italic bg-gray-50 dark:bg-gray-800 rounded p-2 mt-1">“{String(ev.snippet).slice(0,240)}…”</div>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── WRAPPER ──────────────────────────────────────────────────────────────────
// Tabs over the existing browse view (LicenseProspectsBrowse, in p4b).
// Coverage / Match review / Outreach are admin-only: they span the whole
// province and can rewrite account records.
function LicenseProspectsView() {
  const { state } = useApp();
  const isAdmin = state.user?.role === 'admin';
  const [ptab, setPtab] = useState('browse');

  const TABS = [
    { k:'browse',   l:'Browse',       admin:false },
    { k:'coverage', l:'Coverage',     admin:true  },
    { k:'matches',  l:'Match review', admin:true  },
    { k:'outreach', l:'Outreach',     admin:true  },
  ].filter(t => !t.admin || isAdmin);

  if (TABS.length === 1) return <LicenseProspectsBrowse />;

  return (
    <div>
      <div className="px-4 sm:px-6 pt-4 max-w-5xl mx-auto">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.k} onClick={()=>setPtab(t.k)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition ${
                ptab===t.k
                  ? 'border-violet-600 text-violet-700 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {ptab === 'browse'
        ? <LicenseProspectsBrowse />
        : (
          <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24">
            {ptab === 'coverage' && <ProspectCoveragePanel />}
            {ptab === 'matches'  && <ProspectMatchPanel />}
            {ptab === 'outreach' && <ProspectOutreachPanel />}
          </div>
        )}
    </div>
  );
}
