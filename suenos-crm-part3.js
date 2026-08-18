// PART 3: Accounts, Visits, Orders

// ─── SEND SELL SHEET MODAL ────────────────────────────────────────────────────
function SendSellSheetModal({ account, onClose }) {
  const { state, dispatch } = useApp();
  const isAdmin = state.user.role === 'admin';
  const repsWithSheets = state.users.filter(u => u.sellSheetPath && u.active !== false);
  const defaultRep = isAdmin ? repsWithSheets[0] : state.users.find(u => u.id === state.user.id);
  const [selectedRepId, setSelectedRepId] = useState(defaultRep?.id || '');
  const [sending, setSending] = useState(false);
  const selectedRep = state.users.find(u => u.id === selectedRepId);

  async function send() {
    if (!selectedRep || !account.email) return;
    setSending(true);
    try {
      const { data:{ session } } = await sb.auth.getSession();
      const res = await fetch(`${EDGE_FN_URL}/send-sell-sheet`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token}` },
        body: JSON.stringify({
          accountEmail: account.email,
          accountName:  account.name,
          repId:        selectedRep.id,
          repName:      selectedRep.name || '',
          repEmail:     selectedRep.email || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      showToast(dispatch, `Sell sheet sent to ${account.email}`);
      onClose();
    } catch(err) {
      showToast(dispatch, 'Failed: ' + err.message, 'error');
    } finally {
      setSending(false);
    }
  }

  if (repsWithSheets.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">No sell sheets available</p>
          <p className="text-sm text-gray-500 mb-4">Upload a sell sheet in the Users admin section first.</p>
          <Btn onClick={onClose} cls="w-full">Close</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Send Sell Sheet</h3>
            <p className="text-xs text-gray-500 mt-0.5">{account.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <Ic n="x" cls="w-4 h-4"/>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {!account.email && (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
              This account has no email address. Add one first.
            </p>
          )}
          {account.email && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Sending to</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{account.email}</p>
            </div>
          )}
          {isAdmin && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Sell sheet from rep</p>
              <select value={selectedRepId} onChange={e=>setSelectedRepId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent">
                {repsWithSheets.map(u=>(
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          {!isAdmin && selectedRep && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Sending your sell sheet</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedRep.name}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 p-4 pt-0">
          <Btn variant="secondary" onClick={onClose} cls="flex-1">Cancel</Btn>
          <Btn onClick={send} disabled={sending || !account.email || !selectedRep} cls="flex-1">
            <Ic n="mail" cls="w-3.5 h-3.5"/> {sending ? 'Sending…' : 'Send'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── ACCOUNT LIST ─────────────────────────────────────────────────────────────
function AccountList() {
  const { state, dispatch } = useApp();
  const [q, setQ]       = useState('');
  const [fType, setFType]   = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fRegion, setFRegion] = useState('');
  const [fHealth, setFHealth] = useState('');
  const [showDupes, setShowDupes] = useState(false);
  const [sheetAccount, setSheetAccount] = useState(null);

  // Respond to params passed via NAV (e.g. from chart/health card clicks)
  const [salesOnly, setSalesOnly] = useState(false);
  useEffect(() => {
    if (!state.params) return;
    if (state.params.region)  setFRegion(state.params.region);
    if (state.params.health)  setFHealth(state.params.health);
    setSalesOnly(!!state.params.salesOnly);
  }, [state.params]);

  const isAdmin = state.user.role==='admin';

  // Set of account IDs that have at least one sales record
  const accountsWithSales = useMemo(() => {
    return new Set(state.sales.map(s => s.accountId));
  }, [state.sales]);

  const filtered = useMemo(() => {
    return state.accounts
      .filter(a => isAdmin || a.assignedRep===state.user.id || !a.assignedRep)
      .filter(a => !salesOnly || accountsWithSales.has(a.id))
      .filter(a => !q || a.name.toLowerCase().includes(q.toLowerCase()) || a.contact?.toLowerCase().includes(q.toLowerCase()))
      .filter(a => !fType   || a.type===fType)
      .filter(a => !fStatus || a.status===fStatus)
      .filter(a => !fRegion || a.region===fRegion)
      .filter(a => {
        if (!fHealth) return true;
        return healthInfo(calcHealth(a)).label===fHealth;
      })
      .sort((a,b)=>a.name.localeCompare(b.name));
  }, [state.accounts, q, fType, fStatus, fRegion, fHealth, state.user, salesOnly, accountsWithSales]);

  // Find duplicate groups — pairs/groups with similar names
  const dupeGroups = useMemo(() => {
    if (!isAdmin) return [];
    const norm = n => n.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
    const accs = state.accounts;
    const groups = [];
    const seen = new Set();
    for (let i=0; i<accs.length; i++) {
      if (seen.has(accs[i].id)) continue;
      const group = [accs[i]];
      const ni = norm(accs[i].name);
      for (let j=i+1; j<accs.length; j++) {
        if (seen.has(accs[j].id)) continue;
        const nj = norm(accs[j].name);
        let match = false;
        if (ni===nj) match = true;
        else if (ni.includes(nj)||nj.includes(ni)) match = true;
        else {
          const ti = ni.split(' ').filter(w=>w.length>2);
          const tj = nj.split(' ').filter(w=>w.length>2);
          const shared = ti.filter(w=>tj.includes(w)).length;
          if (shared>0 && shared>=Math.min(ti.length,tj.length)*0.65) match = true;
        }
        if (match) { group.push(accs[j]); seen.add(accs[j].id); }
      }
      if (group.length>1) { seen.add(accs[i].id); groups.push(group); }
    }
    return groups;
  }, [state.accounts, isAdmin]);

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      {sheetAccount && <SendSellSheetModal account={sheetAccount} onClose={()=>setSheetAccount(null)} />}
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{filtered.length} account{filtered.length!==1?'s':''}</p>
        <div className="flex items-center gap-2">
          {isAdmin && dupeGroups.length>0 && (
            <button onClick={()=>setShowDupes(v=>!v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${showDupes?'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400':'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>
              <Ic n="alert" cls="w-3.5 h-3.5"/>
              {dupeGroups.length} Duplicate{dupeGroups.length!==1?'s':''}
            </button>
          )}
          <Btn onClick={()=>dispatch({type:'NAV',view:'new-account'})}>
            <Ic n="plus" cls="w-4 h-4" /> New Account
          </Btn>
        </div>
      </div>

      {/* Duplicate panel */}
      {showDupes && dupeGroups.length>0 && (
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Possible Duplicates — review and delete the ones you don't need</p>
          {dupeGroups.map((group,gi)=>(
            <div key={gi} className="bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800 divide-y divide-amber-100 dark:divide-amber-900">
              {group.map(acc=>(
                <button key={acc.id}
                  onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:acc.id}})}
                  className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition group">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-teal-600 transition">{acc.name}</p>
                    <p className="text-xs text-gray-400 truncate">{acc.type} · {acc.region} · {acc.status}</p>
                  </div>
                  <span className="text-xs text-teal-600 dark:text-teal-400 flex-shrink-0 flex items-center gap-1">View <Ic n="chevR" cls="w-3 h-3"/></span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}


      {/* Search + filters */}
      <div className="mb-4 space-y-2">
        <div className="relative">
          <Ic n="search" cls="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search accounts or contacts…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { val:fType,   set:setFType,   opts:ACCOUNT_TYPES,   placeholder:'Type'   },
            { val:fStatus, set:setFStatus, opts:ACCOUNT_STATUSES, placeholder:'Status' },
            { val:fRegion, set:setFRegion, opts:REGIONS,          placeholder:'Region' },
            { val:fHealth, set:setFHealth, opts:['Healthy','Watch List','At Risk'], placeholder:'Health' },
          ].map((f,i)=>(
            <select key={i} value={f.val} onChange={e=>f.set(e.target.value)}
              className="flex-shrink-0 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-teal-400">
              <option value="">{f.placeholder}</option>
              {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length===0
        ? <EmptyState icon="accounts" title="No accounts found" desc="Try adjusting your filters."
            action={<Btn onClick={()=>dispatch({type:'NAV',view:'new-account'})}>Add Account</Btn>} />
        : <div className="space-y-2">
            {filtered.map(account=>{
              const score = calcHealth(account);
              const h = healthInfo(score);
              const rep = state.users.find(u=>u.id===account.assignedRep);
              const vd = daysSince(account.lastVisit);
              return (
                <Card key={account.id} cls="p-3 sm:p-4" onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:account.id}})}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${h.dot}`} title={h.label} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{account.name}</p>
                          <p className="text-xs text-gray-500 truncate">{account.type} · {account.region}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge label={account.status} />
                          {account.email && (
                            <button
                              onClick={e=>{ e.stopPropagation(); setSheetAccount(account); }}
                              title="Send sell sheet"
                              className="p-1 rounded hover:bg-teal-50 dark:hover:bg-teal-900/20 text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition">
                              <Ic n="mail" cls="w-3.5 h-3.5"/>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                        {account.contact && <span className="truncate">{account.contact}</span>}
                        <span className={vd<14?'text-emerald-500':vd<60?'text-teal-600':'text-red-500'}>
                          {account.lastVisit ? `Visited ${vd}d ago` : 'Never visited'}
                        </span>
                        {rep && <span className="hidden sm:inline text-gray-300 dark:text-gray-600">·</span>}
                        {rep && <span className="hidden sm:inline">{rep.name.split(' ')[0]}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
      }
    </div>
  );
}

// ─── ACCOUNT DETAIL ───────────────────────────────────────────────────────────
// ── Meta Ad helpers (must live outside AccountDetail so hooks are valid) ──────
function AdCopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 text-[10px] px-1.5 py-0.5 rounded transition flex-shrink-0"
      style={{ background: copied ? '#1B7873' : '#e4bf7022', color: copied ? '#fff' : '#1B7873' }}>
      {copied ? '✓' : 'Copy'}
    </button>
  );
}
function AdSection({ title, accent, children }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: accent || '#1B7873' }}>{title}</p>
      {children}
    </div>
  );
}
function AdChip({ label }) {
  return <span className="inline-block text-[11px] px-2 py-0.5 rounded-full mr-1 mb-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{label}</span>;
}

function AccountDetail() {
  const { state, dispatch, db } = useApp();
  const { id } = state.params;
  const account = state.accounts.find(a=>a.id===id);
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [draftModal, setDraftModal] = useState(null); // draft being pushed
  const [draftForm, setDraftForm] = useState({});
  const [draftGeo, setDraftGeo] = useState({lat:'',lng:'',geocoding:false});
  const [draftPushing, setDraftPushing] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [quickVisitOpen, setQuickVisitOpen] = useState(false);
  const [qvForm, setQvForm] = useState({date:today(), contact:'', type:'Follow Up', notes:''});
  useEffect(()=>{ if(quickVisitOpen) setQvForm(f=>({...f, contact:account.contact||'', date:today()})); },[quickVisitOpen]);
  const [qvSaving, setQvSaving] = useState(false);
  async function submitQuickVisit() {
    if(!qvForm.type) return;
    setQvSaving(true);
    const visit = { ...qvForm, id:genId(), accountId:id, repId:state.user.id, checks:{} };
    await dbAddVisit(dispatch, visit);
    await dbUpdAccount(dispatch, {...account, lastVisit:qvForm.date});
    showToast(dispatch,'Visit logged');
    setQvForm({date:today(), contact:account.contact||'', type:'Follow Up', notes:''});
    setQuickVisitOpen(false);
    setQvSaving(false);
  }
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPri, setTaskPri] = useState('medium');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [sending, setSending] = useState(false);
  const [sheetRepId, setSheetRepId] = useState('');
  // Google Places lookup state
  const [gLookupOpen, setGLookupOpen] = useState(false);
  const [gFound, setGFound] = useState(null);   // { name, address, phone, website, lat, lng }
  const [gSaving, setGSaving] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const gInputRef = React.useRef(null);
  const gAcRef    = React.useRef(null);

  // ── Meta Ad Tool state ────────────────────────────────────────────────────
  const [adOpen,     setAdOpen]     = useState(false);
  const [adLoading,  setAdLoading]  = useState(false);
  const [adResult,   setAdResult]   = useState(null);
  const [adError,    setAdError]    = useState(null);
  const [scanOpen,   setScanOpen]   = useState(false);
  const [scanKw,     setScanKw]     = useState('all');
  const [scanCustom, setScanCustom] = useState('');
  const [adHistOpen, setAdHistOpen] = useState(false);
  const [expandedSpec, setExpandedSpec] = useState(null);
  const [promo, setPromo] = useState({ drink:'', price:'', desc:'', start:'', end:'', occasion:'', radius:'' });
  // ── Ad Creative Image state ───────────────────────────────────────────────
  const [imgOpen,       setImgOpen]       = useState(false);
  const [imgSize,       setImgSize]       = useState('1:1');
  const [imgDrink,      setImgDrink]      = useState('');
  const [imgOccasion,   setImgOccasion]   = useState('');
  const [imgLoading,    setImgLoading]    = useState(false);
  const [imgResult,     setImgResult]     = useState(null);  // { imageUrl, size, label, prompt }
  const [imgError,      setImgError]      = useState(null);
  const [imgComposed,   setImgComposed]   = useState(null);  // data URL after canvas compositing

  const [adSendOpen,    setAdSendOpen]    = useState(false);
  const [adSendRep,     setAdSendRep]     = useState(true);
  const [adSendAccount, setAdSendAccount] = useState(true);
  const [adSendJason,   setAdSendJason]   = useState(true);
  const [adSendCustom,  setAdSendCustom]  = useState('');
  const [adSending,     setAdSending]     = useState(false);
  const [adSendDone,    setAdSendDone]    = useState(false);

  // Budget state
  const [budgetEdit,   setBudgetEdit]   = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetForm,   setBudgetForm]   = useState({});
  const [expItem,      setExpItem]      = useState('');
  const [expAmount,    setExpAmount]    = useState('');
  const [expDate,      setExpDate]      = useState(today());
  const [expAdding,    setExpAdding]    = useState(false);

  // Load ad specs whenever this account is opened
  React.useEffect(() => {
    if (id) dbLoadAdSpecs(dispatch, id);
  }, [id]);

  function extractCity(address) {
    if (!address) return '';
    const parts = address.split(',').map(s => s.trim());
    if (parts.length >= 3) {
      // strip trailing province code e.g. "Vancouver BC"
      return parts[parts.length - 2].replace(/\s+[A-Z]{2}\s*$/, '').trim();
    }
    return parts[0] || '';
  }

  async function generateMetaAd() {
    setAdLoading(true);
    setAdResult(null);
    setAdError(null);
    try {
      const { data:{ session } } = await sb.auth.getSession();
      const res = await fetch(`${EDGE_FN_URL}/${GENERATE_AD_FN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name:    account.name,
          type:    account.type || 'Bar/Restaurant',
          address: account.address || '',
          region:  account.region  || '',
          promo: {
            drink:    promo.drink.trim()    || null,
            price:    promo.price.trim()    || null,
            desc:     promo.desc.trim()     || null,
            start:    promo.start           || null,
            end:      promo.end             || null,
            occasion: promo.occasion.trim() || null,
          },
          radius_km: promo.radius ? parseInt(promo.radius, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAdResult(data.ad);
      // Auto-save to history
      dbSaveAdSpec(dispatch, { accountId: id, userId: state.user?.id, adSpec: data.ad });
    } catch(err) {
      setAdError(err.message || 'Something went wrong — try again.');
    } finally {
      setAdLoading(false);
    }
  }

  async function sendAdSpec() {
    if (typeof emailjs === 'undefined') { alert('Email service not loaded'); return; }
    if (!EMAILJS_AD_SPEC_TEMPLATE_ID || EMAILJS_AD_SPEC_TEMPLATE_ID.startsWith('YOUR_')) {
      alert('Set EMAILJS_AD_SPEC_TEMPLATE_ID in the CRM config first.\n\nCreate a template at emailjs.com with variables:\n  {{to_name}}, {{account_name}}, {{spec_body}}');
      return;
    }
    const repUser = (state.users||[]).find(u => u.id === account.assignedRep);
    const recipients = [];
    if (adSendRep && repUser?.email)    recipients.push({ email: repUser.email, name: repUser.name || repUser.email });
    if (adSendAccount && account.email) recipients.push({ email: account.email, name: account.contact || account.name });
    if (adSendJason)                    recipients.push({ email: 'jason@suenos.ca', name: 'Jason' });
    (adSendCustom.split(',').map(e => e.trim()).filter(e => e.includes('@')))
      .forEach(e => recipients.push({ email: e, name: e }));

    if (recipients.length === 0) { alert('No recipients — pick at least one option.'); return; }

    // Build readable plain-text spec body
    const specBody = [
      `ACCOUNT: ${account.name}`,
      `Generated: ${new Date().toLocaleDateString('en-CA')}`,
      '',
      `OBJECTIVE`,
      adResult.objective,
      '',
      `GEO TARGETING`,
      `${adResult.geo_targeting?.anchor} · ${adResult.geo_targeting?.radius_km} km radius`,
      adResult.geo_targeting?.note || '',
      '',
      `AUDIENCE`,
      `Age ${adResult.audience?.min_age}+  ·  Gender: ${adResult.audience?.gender}`,
      `Interests: ${(adResult.audience?.interests||[]).join(', ')}`,
      (adResult.audience?.behaviors||[]).length ? `Behaviors: ${adResult.audience.behaviors.join(', ')}` : '',
      '',
      `HEADLINES`,
      ...(adResult.headline_variants||[]).map((h,i) => `${i+1}. ${h}`),
      '',
      `PRIMARY TEXT OPTIONS`,
      ...(adResult.primary_text_variants||[]).map((t,i) => `${i+1}. ${t}`),
      '',
      `CTA BUTTON: ${adResult.cta_button}`,
      '',
      `CREATIVE DIRECTION`,
      adResult.creative_direction,
      '',
      `BUDGET (CAD)`,
      `Test:   $${adResult.suggested_budget_cad?.test_daily}/day`,
      `Scale:  $${adResult.suggested_budget_cad?.scale_daily}/day`,
      `Min flight: ${adResult.suggested_budget_cad?.min_flight_days} days`,
      ...(adResult.compliance_notes?.length ? ['', 'COMPLIANCE NOTES', ...(adResult.compliance_notes||[]).map(n => `• ${n}`)] : []),
    ].filter(s => s !== undefined).join('\n');

    setAdSending(true);
    setAdSendDone(false);
    try {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      for (const r of recipients) {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_AD_SPEC_TEMPLATE_ID, {
          to_email:     r.email,
          to_name:      r.name,
          account_name: account.name,
          spec_body:    specBody,
        });
      }
      setAdSendDone(true);
      setTimeout(() => setAdSendDone(false), 4000);
    } catch(err) {
      alert('Send failed: ' + (err?.text || err?.message || 'unknown error'));
    } finally {
      setAdSending(false);
    }
  }

  function scanAdsUrl() {
    const city = extractCity(account.address);
    const kw   = scanCustom.trim() || (scanKw === 'all' ? 'liquor spirits alcohol bar' : scanKw);
    const q    = [kw, city].filter(Boolean).join(' ');
    return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CA&q=${encodeURIComponent(q)}`;
  }
  function googleAdsSearchUrl() {
    const city = extractCity(account.address);
    const kw   = scanCustom.trim() || (scanKw === 'all' ? 'liquor spirits cocktails alcohol' : scanKw);
    const q    = [kw, city, 'BC', 'promotions'].filter(Boolean).join(' ');
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  }

  // ── Ad Creative Image functions ───────────────────────────────────────────
  async function generateAdImage() {
    setImgLoading(true); setImgResult(null); setImgError(null); setImgComposed(null);
    try {
      const { data:{ session } } = await sb.auth.getSession();
      const city = (account.address||'').split(',').slice(-2,-1)[0]?.trim() || '';
      const res = await fetch(`${EDGE_FN_URL}/${GENERATE_IMAGE_FN}`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token}` },
        body: JSON.stringify({
          accountName: account.name,
          venueType:   account.type || 'Bar/Restaurant',
          city,
          size:      imgSize,
          drink:     imgDrink.trim() || null,
          occasion:  imgOccasion.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setImgResult(data);
      // Auto-composite logos after image loads
      composeImage(data.imageUrl, imgSize);
    } catch(err) {
      setImgError(err.message || 'Image generation failed — try again.');
    } finally {
      setImgLoading(false);
    }
  }

  async function composeImage(bgUrl, size) {
    try {
      const DIMS = { '1:1': [1080,1080], '4:5': [1080,1350], '9:16': [1080,1920] };
      const [W, H] = DIMS[size] || [1080,1080];
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Load background
      const bgImg = await loadImg(bgUrl);
      ctx.drawImage(bgImg, 0, 0, W, H);

      // Dark vignette at bottom for logo visibility
      const grad = ctx.createLinearGradient(0, H * 0.65, 0, H);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H * 0.65, W, H * 0.35);

      const PAD = Math.round(W * 0.05);
      const LOGO_H = Math.round(H * 0.07); // ~7% of height

      // Sueños logo — bottom left
      if (state.brandLogoUrl) {
        try {
          const sLogo = await loadImg(state.brandLogoUrl);
          const sW = Math.round(sLogo.width * (LOGO_H / sLogo.height));
          ctx.drawImage(sLogo, PAD, H - PAD - LOGO_H, sW, LOGO_H);
        } catch(e) { console.warn('[composeImage] Sueños logo load failed', e); }
      }

      // Account logo — bottom right (if available)
      if (account.logoUrl) {
        try {
          const aLogo = await loadImg(account.logoUrl);
          const aW = Math.round(aLogo.width * (LOGO_H / aLogo.height));
          ctx.drawImage(aLogo, W - PAD - aW, H - PAD - LOGO_H, aW, LOGO_H);
        } catch(e) { console.warn('[composeImage] Account logo load failed', e); }
      }

      setImgComposed(canvas.toDataURL('image/jpeg', 0.92));
    } catch(err) {
      console.error('[composeImage] failed', err);
      // Fall back to raw image if compositing fails
      setImgComposed(bgUrl);
    }
  }

  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Init Places Autocomplete when lookup panel opens
  React.useEffect(()=>{
    if (!gLookupOpen) { setGFound(null); return; }
    function tryInit() {
      if (!window.google?.maps?.places?.Autocomplete) { setTimeout(tryInit,300); return; }
      if (!gInputRef.current) return;
      gAcRef.current = new window.google.maps.places.Autocomplete(gInputRef.current, {
        types: ['establishment'],
        fields: ['name','formatted_address','geometry','formatted_phone_number','website'],
      });
      gAcRef.current.addListener('place_changed', ()=>{
        const p = gAcRef.current.getPlace();
        if (!p || !p.geometry) return;
        setGFound({
          name:    p.name||'',
          address: p.formatted_address||'',
          phone:   p.formatted_phone_number||'',
          website: p.website||'',
          lat:     p.geometry.location.lat(),
          lng:     p.geometry.location.lng(),
        });
      });
    }
    tryInit();
    return ()=>{
      if (gAcRef.current) window.google?.maps?.event?.clearInstanceListeners(gAcRef.current);
      document.querySelectorAll('.pac-container').forEach(el=>el.remove());
    };
  },[gLookupOpen]);

  async function saveGoogleData() {
    if (!gFound) return;
    setGSaving(true);
    try {
      const updates = {};
      if (gFound.address) updates.address = gFound.address;
      if (gFound.phone)   updates.phone   = gFound.phone;
      if (gFound.website) updates.website = gFound.website;
      if (gFound.lat)     updates.lat     = gFound.lat;
      if (gFound.lng)     updates.lng     = gFound.lng;
      const { error } = await sb.from('accounts').update(updates).eq('id', id);
      if (error) throw error;
      dispatch({ type:'UPD_ACCOUNT', payload:{ ...account, ...updates } });
      showToast(dispatch, 'Account updated from Google');
      setGLookupOpen(false);
    } catch(err) {
      showToast(dispatch, 'Save failed: '+err.message, 'error');
    } finally {
      setGSaving(false);
    }
  }

  if (!account) return <div className="p-6 text-gray-500">Account not found.</div>;

  const accVisits  = state.visits.filter(v=>v.accountId===id).sort((a,b)=>b.date.localeCompare(a.date));
  const accOrders  = state.orders.filter(o=>o.accountId===id&&o.status!=='Cancelled').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const accTasks   = state.tasks.filter(t=>t.accountId===id&&!t.done);
  const accSales   = state.sales.filter(s=>s.accountId===id);
  const totalSalesBottles = accSales.reduce((s,x)=>s+x.bottles,0);
  const totalSalesRev     = accSales.reduce((s,x)=>s+x.revenue,0);
  const totalOrderRev     = accOrders.reduce((s,o)=>s+(o.subtotal||0),0);
  const totalSpentAll     = (state.expenses||[]).filter(e=>e.accountId===id).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const roiRevenue        = totalSalesRev || totalOrderRev; // prefer imported sales, fall back to orders
  const roiNet            = roiRevenue - totalSpentAll;
  const roiPct            = totalSpentAll > 0 ? Math.round((roiNet / totalSpentAll) * 100) : null;
  const score = calcHealth(account);
  const h = healthInfo(score);
  const rep = state.users.find(u=>u.id===account.assignedRep);

  const isOnPremise = ['Restaurant','Bar','Hotel','Golf Course','Resort'].includes(account.type);
  const isAdmin = state.user?.role === 'admin';

  async function addTask() {
    if(!taskTitle||!taskDue) return;
    const repId = isAdmin && taskAssigneeId ? taskAssigneeId : (account.assignedRep||state.user.id);
    const task = { id:genId(), accountId:id, title:taskTitle, dueDate:taskDue, repId, done:false, priority:taskPri, notes:taskNotes||null };
    await dbAddTask(dispatch, task);
    if (isAdmin && taskAssigneeId && taskAssigneeId !== state.user.id) {
      const assignedUser = state.users.find(u=>u.id===taskAssigneeId);
      const assigner     = state.users.find(u=>u.id===state.user.id);
      await sendTaskNotification({
        assignedUser,
        assignerName: assigner?.name || state.user?.email || 'Admin',
        taskTitle,
        accountName:  account.name,
        dueDate:      taskDue,
        priority:     taskPri,
      });
    }
    setTaskTitle(''); setTaskDue(''); setTaskAssigneeId(''); setTaskNotes(''); setTaskOpen(false);
    showToast(dispatch,'Task added');
  }

  const TABS = ['overview','visits','orders','menu','tasks','sales','budget','meta-ads'];

  const myProfile = state.users.find(u=>u.id===state.user?.id);
  // Reps with sell sheets uploaded
  const repsWithSheets = state.users.filter(u=>u.sellSheetPath && u.active!==false);
  // For admins: use selected rep from dropdown; for reps: use themselves
  const effectiveRepId = isAdmin ? (sheetRepId || (repsWithSheets[0]?.id || '')) : state.user?.id;
  const effectiveRep   = state.users.find(u=>u.id===effectiveRepId);
  const canSendSheet   = account.email && effectiveRep?.sellSheetPath;

  async function sendSellSheet() {
    if (!canSendSheet) return;
    setSending(true);
    try {
      const { data:{ session } } = await sb.auth.getSession();
      const res = await fetch(`${EDGE_FN_URL}/send-sell-sheet`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token}` },
        body: JSON.stringify({
          accountEmail: account.email,
          accountName:  account.name,
          repId:        effectiveRepId,
          repName:      effectiveRep?.name || '',
          repEmail:     effectiveRep?.email || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      showToast(dispatch, `Sell sheet sent to ${account.email}`);
    } catch(err) {
      showToast(dispatch, 'Failed: ' + err.message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-24 lg:pb-6">
      {editingOrder && <EditOrderModal order={editingOrder} onClose={()=>setEditingOrder(null)} />}
      {/* Back + hero */}
      <div className="px-4 sm:px-6 pt-4">
        <button onClick={()=>dispatch({type:'NAV',view:'accounts'})} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3 transition">
          <Ic n="chevronL" cls="w-3.5 h-3.5" /> Accounts
        </button>

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Logo / initials + upload */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="relative">
                {account.logoUrl
                  ? <img src={account.logoUrl} alt="logo"
                      className="w-14 h-14 rounded-xl object-contain border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"/>
                  : <div className="w-14 h-14 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                      <span className="text-lg font-bold text-teal-700 dark:text-teal-400">
                        {(account.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                      </span>
                    </div>
                }
                {account.logoUrl && (
                  <button
                    onClick={()=>{ if(confirm('Remove logo?')) dbRemoveAccountLogo(dispatch, account); }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] leading-none flex items-center justify-center">
                    ✕
                  </button>
                )}
              </div>
              <label className="cursor-pointer">
                <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400 hover:underline whitespace-nowrap">
                  {account.logoUrl ? '📷 Change' : '📷 Upload logo'}
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={async e=>{
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { showToast(dispatch,'Max 2 MB', 'error'); return; }
                    showToast(dispatch,'Uploading logo…');
                    await dbUploadAccountLogo(dispatch, account, file);
                    showToast(dispatch,'Logo saved');
                  }}/>
              </label>
            </div>
            {/* Name + status */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{account.name}</h2>
                <Badge label={account.status} />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{account.type} · {account.region}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end items-center">
            {account.email && isAdmin && repsWithSheets.length > 0 && (
              <div className="flex items-center gap-1">
                <select
                  value={sheetRepId || effectiveRepId}
                  onChange={e=>setSheetRepId(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent">
                  {repsWithSheets.map(u=>(
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <Btn variant="secondary" size="sm" onClick={sendSellSheet} disabled={sending}>
                  <Ic n="mail" cls="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send Sheet'}
                </Btn>
              </div>
            )}
            {account.email && isAdmin && repsWithSheets.length === 0 && (
              <span className="text-xs text-gray-400 self-center">No sell sheets uploaded</span>
            )}
            {!isAdmin && canSendSheet && (
              <Btn variant="secondary" size="sm" onClick={sendSellSheet} disabled={sending}>
                <Ic n="mail" cls="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Sell Sheet'}
              </Btn>
            )}
            <Btn variant="secondary" size="sm" onClick={()=>setEditOpen(true)}><Ic n="edit" cls="w-3.5 h-3.5" /></Btn>
            {isAdmin && (
              <button
                onClick={async () => {
                  if (!confirm(`Permanently delete "${account.name}"?\n\nThis cannot be undone. Associated visits, orders and tasks will also be removed.`)) return;
                  const ok = await db.dbDelAccount(dispatch, id);
                  if (ok) dispatch({type:'NAV', view:'accounts'});
                }}
                title="Delete account"
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Ic n="trash" cls="w-3.5 h-3.5"/>
              </button>
            )}
            <Btn size="sm" onClick={()=>dispatch({type:'NAV',view:'new-visit',params:{accountId:id}})}>
              <Ic n="plus" cls="w-3.5 h-3.5" /> Visit
            </Btn>
          </div>
        </div>

        {/* Health score */}
        <div className={`flex items-center gap-3 p-3 rounded-xl ${h.bg} mb-4`}>
          <div className={`w-10 h-10 rounded-full border-4 ${h.ring} ring-2 flex items-center justify-center`}>
            <span className={`text-sm font-bold ${h.color}`}>{score}</span>
          </div>
          <div>
            <p className={`text-sm font-semibold ${h.color}`}>{h.label}</p>
            <p className="text-xs text-gray-500">
              {account.lastVisit ? `Last visit ${daysSince(account.lastVisit)}d ago` : 'Never visited'} ·
              {account.lastOrder ? ` Last order ${daysSince(account.lastOrder)}d ago` : ' No orders'}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{totalSalesBottles}</p>
            <p className="text-xs text-gray-500">bottles all time</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
          {[
            { label:'Log Visit',   icon:'visits',   action:()=>setQuickVisitOpen(true),                                        color:'text-teal-600' },
            { label:'New Order',   icon:'orders',   action:()=>dispatch({type:'NAV',view:'new-order',params:{accountId:id}}),  color:'text-teal-600' },
            { label:'Log Tasting', icon:'tastings', action:()=>dispatch({type:'NAV',view:'new-tasting',params:{accountId:id}}),color:'text-teal-600' },
            { label:'Add Task',    icon:'tasks',    action:()=>setTaskOpen(true),                                              color:'text-teal-600' },
            { label:'Meta Ad',     icon:'ad',       action:()=>{ setAdOpen(v=>!v); setAdResult(null); setAdError(null); }, color:'text-yellow-600', gold:true },
            { label:'Scan Ads',    icon:'scanads',  action:()=>setScanOpen(v=>!v),                                            color:'text-blue-500' },
            { label:'Ad Creative', icon:'ad',       action:()=>{ setImgOpen(v=>!v); setImgResult(null); setImgError(null); setImgComposed(null); }, color:'text-purple-600', purple:true },
          ].map(a=>(
            <button key={a.label} onClick={a.action}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition text-center ${a.gold ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/40' : a.purple ? 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <Ic n={a.icon} cls={`w-4 h-4 ${a.color}`} />
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Visit Panel */}
      {quickVisitOpen && (
        <div className="mx-4 sm:mx-6 mb-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">Quick Visit Log — {account.name}</p>
            <button onClick={()=>setQuickVisitOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input type="date" value={qvForm.date} onChange={e=>setQvForm(f=>({...f,date:e.target.value}))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 outline-none"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={qvForm.type} onChange={e=>setQvForm(f=>({...f,type:e.target.value}))}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 outline-none">
                {VISIT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Contact</label>
            <input value={qvForm.contact} onChange={e=>setQvForm(f=>({...f,contact:e.target.value}))} placeholder={account.contact||'Who did you meet?'}
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 outline-none"/>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
            <textarea value={qvForm.notes} onChange={e=>setQvForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Quick notes..."
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 outline-none resize-none"/>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setQuickVisitOpen(false)} className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">Cancel</button>
            <button onClick={submitQuickVisit} disabled={qvSaving}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 transition">
              {qvSaving ? 'Saving…' : 'Log Visit'}
            </button>
          </div>
        </div>
      )}

      {/* ── Meta Ad Panel ────────────────────────────────────────────────────── */}
      {adOpen && (
        <div className="mx-4 sm:mx-6 mb-4 rounded-xl border overflow-hidden" style={{borderColor:'#e4bf70'}}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{background:'#1F1F1F'}}>
            <div className="flex items-center gap-2">
              <Ic n="ad" cls="w-4 h-4" style={{color:'#e4bf70'}}/>
              <span className="text-sm font-semibold" style={{color:'#e4bf70'}}>Meta Ad Spec — {account.name}</span>
            </div>
            <div className="flex gap-2 items-center">
              {adResult && !adLoading && (
                <button onClick={()=>{ setAdResult(null); setAdError(null); }} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition" style={{color:'#e4bf70'}}>← New Ad</button>
              )}
              <button onClick={()=>setAdOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none transition">✕</button>
            </div>
          </div>

          {/* ── Promo Form (shown when no result yet) ── */}
          {!adLoading && !adResult && !adError && (
            <div className="p-5 bg-white dark:bg-gray-900 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:'#e4bf70'}}>Running a Special Promo?</p>
                <p className="text-xs text-gray-400">Fill in what applies — leave blank for a general venue ad. The AI will make it sound incredible either way.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">🍹 Drink / Cocktail Name</label>
                  <input value={promo.drink} onChange={e=>setPromo(p=>({...p,drink:e.target.value}))}
                    placeholder="e.g. The Sueños Margarita"
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 outline-none" style={{'--tw-ring-color':'#e4bf70'}}/>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">💲 Promo Price</label>
                  <input value={promo.price} onChange={e=>setPromo(p=>({...p,price:e.target.value}))}
                    placeholder="e.g. $12 / 2-for-1 / Free with entry"
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 outline-none"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">🎉 Occasion / Event</label>
                  <input value={promo.occasion} onChange={e=>setPromo(p=>({...p,occasion:e.target.value}))}
                    placeholder="e.g. Grand Opening, Taco Tuesday, Happy Hour"
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 outline-none"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">📅 Start Date</label>
                    <input type="date" value={promo.start} onChange={e=>setPromo(p=>({...p,start:e.target.value}))}
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">📅 End Date</label>
                    <input type="date" value={promo.end} onChange={e=>setPromo(p=>({...p,end:e.target.value}))}
                      className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 outline-none"/>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">📍 Target Radius (km)</label>
                  <input
                    type="number" min="1" max="100"
                    value={promo.radius}
                    onChange={e=>setPromo(p=>({...p,radius:e.target.value}))}
                    placeholder="Auto (AI decides)"
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 outline-none"/>
                  <p className="text-[10px] text-gray-400 mt-0.5">Leave blank to let AI decide</p>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">📝 Description / What Makes It Special</label>
                <textarea value={promo.desc} onChange={e=>setPromo(p=>({...p,desc:e.target.value}))} rows={2}
                  placeholder="e.g. Made with Sueños Blanco, fresh lime juice, agave, and a tajín rim. Served frozen every Friday night."
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 outline-none resize-none"/>
              </div>
              {/* Cost estimate */}
              {(() => {
                // Rough token estimate: system ~850 + venue ~80 + promo fields
                const promoChars = [promo.drink, promo.price, promo.occasion, promo.desc].join(' ').length;
                const inputTokens  = 950 + Math.round(promoChars / 4);
                const outputTokens = 1500;
                // Claude Sonnet pricing: $3/M input, $15/M output
                const cost = (inputTokens * 3 + outputTokens * 15) / 1_000_000;
                return (
                  <p className="text-[11px] text-gray-400 text-center -mt-1">
                    Estimated cost: <strong className="text-gray-500">~${cost.toFixed(3)}</strong> USD per generation
                  </p>
                );
              })()}
              <button onClick={generateMetaAd}
                className="w-full py-2.5 rounded-lg text-sm font-bold tracking-wide transition hover:opacity-90"
                style={{background:'linear-gradient(135deg,#1B7873,#e4bf70)', color:'#1F1F1F'}}>
                ✦ Generate Meta Ad
              </button>
            </div>
          )}

          {/* Loading */}
          {adLoading && (
            <div className="flex items-center gap-3 px-5 py-8 bg-white dark:bg-gray-900">
              <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin flex-shrink-0"/>
              <p className="text-sm text-gray-500">Cooking up something 🔥 for <strong>{account.name}</strong>…</p>
            </div>
          )}

          {/* Error */}
          {adError && !adLoading && (
            <div className="px-5 py-6 bg-white dark:bg-gray-900">
              <p className="text-sm font-medium text-red-600 mb-1">Generation failed</p>
              <p className="text-xs text-gray-500 mb-3">{adError}</p>
              <button onClick={generateMetaAd} className="text-xs px-3 py-1.5 rounded-lg text-white font-medium transition" style={{background:'#1B7873'}}>Try Again</button>
            </div>
          )}

          {/* Result */}
          {adResult && !adLoading && (
            <div className="p-5 bg-white dark:bg-gray-900">
              {/* Objective + Geo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg p-3" style={{background:'#1F1F1F'}}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:'#e4bf70'}}>Objective</p>
                  <p className="text-sm text-white">{adResult.objective}</p>
                </div>
                <div className="rounded-lg p-3 border" style={{borderColor:'#1B7873'}}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:'#1B7873'}}>Geo Targeting</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{adResult.geo_targeting?.anchor} · {adResult.geo_targeting?.radius_km} km</p>
                  {adResult.geo_targeting?.note && <p className="text-xs text-gray-500 mt-0.5">{adResult.geo_targeting.note}</p>}
                </div>
              </div>

              {/* Audience */}
              <AdSection title="Audience">
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <span>Age {adResult.audience?.min_age}+</span>
                  <span>Gender: {adResult.audience?.gender}</span>
                </div>
                <div className="mb-1">{(adResult.audience?.interests||[]).map(i=><AdChip key={i} label={i}/>)}</div>
                {(adResult.audience?.behaviors||[]).length > 0 && <div>{adResult.audience.behaviors.map(b=><AdChip key={b} label={b}/>)}</div>}
              </AdSection>

              {/* Copy variants */}
              <AdSection title="Primary Text (pick one)" accent="#E63946">
                <div className="space-y-2">
                  {(adResult.primary_text_variants||[]).map((t,i)=>(
                    <div key={i} className="flex items-start gap-1 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800">
                      <span className="text-xs text-gray-800 dark:text-gray-200 flex-1 leading-relaxed">{t}</span>
                      <AdCopyBtn text={t}/>
                    </div>
                  ))}
                </div>
              </AdSection>

              <AdSection title="Headlines (pick one)" accent="#E63946">
                <div className="space-y-2">
                  {(adResult.headline_variants||[]).map((h,i)=>(
                    <div key={i} className="flex items-center gap-1 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1">{h}</span>
                      <AdCopyBtn text={h}/>
                    </div>
                  ))}
                </div>
              </AdSection>

              {/* Creative + CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <AdSection title="Creative Direction">
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{adResult.creative_direction}</p>
                </AdSection>
                <AdSection title="CTA Button">
                  <span className="inline-block text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{background:'#1B7873'}}>{adResult.cta_button}</span>
                </AdSection>
              </div>

              {/* Budget */}
              <AdSection title="Suggested Budget (CAD)">
                <div className="flex gap-3 flex-wrap">
                  {[
                    {label:'Test Daily',  val:`$${adResult.suggested_budget_cad?.test_daily}/day`},
                    {label:'Scale Daily', val:`$${adResult.suggested_budget_cad?.scale_daily}/day`},
                    {label:'Min Flight',  val:`${adResult.suggested_budget_cad?.min_flight_days} days`},
                  ].map(b=>(
                    <div key={b.label} className="rounded-lg px-3 py-2 text-center" style={{background:'#1F1F1F'}}>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{b.label}</p>
                      <p className="text-sm font-bold" style={{color:'#e4bf70'}}>{b.val}</p>
                    </div>
                  ))}
                </div>
              </AdSection>

              {/* Compliance */}
              {(adResult.compliance_notes||[]).length > 0 && (
                <AdSection title="Compliance Notes" accent="#E63946">
                  <ul className="space-y-1">
                    {adResult.compliance_notes.map((n,i)=>(
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                        <span className="mt-0.5 flex-shrink-0" style={{color:'#E63946'}}>⚠</span>{n}
                      </li>
                    ))}
                  </ul>
                </AdSection>
              )}

              {/* ── Email Spec ── */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => { setAdSendOpen(v => !v); setAdSendDone(false); }}
                  className="flex items-center gap-1.5 text-xs font-medium transition hover:opacity-75"
                  style={{color:'#1B7873'}}
                >
                  <span>📧</span>
                  <span>{adSendOpen ? 'Hide email options' : 'Send spec by email'}</span>
                </button>

                {adSendOpen && (
                  <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2.5">
                    {/* Rep */}
                    {(() => {
                      const repUser = (state.users||[]).find(u => u.id === account.assignedRep);
                      return repUser?.email ? (
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                          <input type="checkbox" checked={adSendRep} onChange={e => setAdSendRep(e.target.checked)} className="rounded accent-teal-700"/>
                          <span className="text-gray-700 dark:text-gray-300">Rep: <strong>{repUser.name}</strong> ({repUser.email})</span>
                        </label>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No rep assigned to this account</p>
                      );
                    })()}

                    {/* Account contact */}
                    {account.email ? (
                      <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                        <input type="checkbox" checked={adSendAccount} onChange={e => setAdSendAccount(e.target.checked)} className="rounded accent-teal-700"/>
                        <span className="text-gray-700 dark:text-gray-300">Account: <strong>{account.contact || account.name}</strong> ({account.email})</span>
                      </label>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No email on file for this account</p>
                    )}

                    {/* Always available — jason */}
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input type="checkbox" checked={adSendJason} onChange={e => setAdSendJason(e.target.checked)} className="rounded accent-teal-700"/>
                      <span className="text-gray-700 dark:text-gray-300">jason@suenos.ca</span>
                    </label>

                    {/* Custom */}
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Additional (comma-separated)</label>
                      <input
                        type="text"
                        value={adSendCustom}
                        onChange={e => setAdSendCustom(e.target.value)}
                        placeholder="e.g. manager@venue.ca, partner@co.com"
                        className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1"
                        style={{'--tw-ring-color':'#1B7873'}}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={sendAdSpec}
                        disabled={adSending}
                        className="text-xs px-4 py-1.5 rounded-lg text-white font-medium transition disabled:opacity-50"
                        style={{background: adSendDone ? '#1B7873' : '#1B7873'}}
                      >
                        {adSending ? 'Sending…' : adSendDone ? '✓ Sent!' : 'Send Spec'}
                      </button>
                      {adSendDone && <span className="text-xs text-green-600 font-medium">Spec delivered ✓</span>}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">AI-generated — review before launching. Verify Meta alcohol policy compliance.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Ad Creative Image Panel ──────────────────────────────────────────── */}
      {imgOpen && (
        <div className="mx-4 sm:mx-6 mb-4 rounded-xl border border-purple-200 dark:border-purple-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <span className="text-base">🎨</span>
              <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">Ad Creative — {account.name}</span>
            </div>
            <button onClick={()=>setImgOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
          </div>

          {/* Form */}
          {!imgResult && !imgLoading && (
            <div className="p-5 space-y-4">
              {/* Size picker */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Ad Size</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key:'1:1',  label:'1:1',  sub:'Feed Square',   dims:'1080×1080' },
                    { key:'4:5',  label:'4:5',  sub:'Feed Portrait', dims:'1080×1350' },
                    { key:'9:16', label:'9:16', sub:'Stories/Reels', dims:'1080×1920' },
                  ].map(s=>(
                    <button key={s.key} onClick={()=>setImgSize(s.key)}
                      className={`flex flex-col items-center px-4 py-2.5 rounded-lg border-2 text-xs transition ${imgSize===s.key ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{s.label}</span>
                      <span className="text-gray-500">{s.sub}</span>
                      <span className="text-gray-400 text-[10px]">{s.dims}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">🍹 Featured Drink (optional)</label>
                  <input value={imgDrink} onChange={e=>setImgDrink(e.target.value)}
                    placeholder="e.g. Sueños Margarita"
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 outline-none" style={{'--tw-ring-color':'#a855f7'}}/>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">🎉 Occasion / Vibe (optional)</label>
                  <input value={imgOccasion} onChange={e=>setImgOccasion(e.target.value)}
                    placeholder="e.g. Friday night, Happy Hour"
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 outline-none"/>
                </div>
              </div>

              {/* Logo status + inline uploads */}
              {(() => {
                const hasSuenos  = !!state.brandLogoUrl;
                const hasAccount = !!account.logoUrl;
                const allGood    = hasSuenos && hasAccount;
                return (
                  <div className={`rounded-lg px-3 py-3 text-xs border ${allGood ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'}`}>
                    {allGood
                      ? <span>🔒 Both logos ready — the AI never touches them, they're composited on top after generation.</span>
                      : <span className="font-medium">⚠ Upload logos before generating — they'll be composited on the final image.</span>
                    }
                    <div className="mt-2 flex flex-col gap-2">
                      {/* Sueños logo */}
                      <div className="flex items-center gap-2">
                        {hasSuenos
                          ? <><span className="text-green-600 dark:text-green-400">✓</span><img src={state.brandLogoUrl} alt="Sueños logo" className="h-6 object-contain bg-gray-800 rounded px-1"/><span className="text-green-600 dark:text-green-400">Sueños logo ready</span></>
                          : <><span>🏷</span><span className="text-amber-700 dark:text-amber-300">No Sueños logo — upload in</span><button onClick={()=>dispatch({type:'NAV',view:'users'})} className="underline font-medium ml-1">Settings → Brand Logo</button></>
                        }
                      </div>
                      {/* Account logo */}
                      <div className="flex items-center gap-2">
                        {hasAccount
                          ? <><span className="text-green-600 dark:text-green-400">✓</span><img src={account.logoUrl} alt="Account logo" className="h-6 object-contain bg-gray-800 rounded px-1"/><span className="text-green-600 dark:text-green-400">{account.name} logo ready</span></>
                          : <><span>🏢</span><span className="text-amber-700 dark:text-amber-300">No account logo — </span>
                              <label className="underline font-medium cursor-pointer ml-1">
                                Upload now
                                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                                  onChange={async e=>{
                                    const f=e.target.files?.[0]; if(!f) return;
                                    try { await dbUploadAccountLogo(dispatch, account, f); }
                                    catch(err){ alert('Upload failed: '+err.message); }
                                  }}/>
                              </label>
                            </>
                        }
                      </div>
                    </div>
                  </div>
                );
              })()}

              <button onClick={generateAdImage}
                className="w-full py-2.5 rounded-lg text-sm font-bold tracking-wide transition hover:opacity-90 text-white"
                style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}>
                🎨 Generate Ad Creative
              </button>
            </div>
          )}

          {/* Loading */}
          {imgLoading && (
            <div className="p-8 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin"/>
              <p className="text-sm text-gray-500">Generating your ad creative… this takes ~15 seconds</p>
            </div>
          )}

          {/* Error */}
          {imgError && !imgLoading && (
            <div className="p-5">
              <p className="text-sm font-medium text-red-600 mb-1">Generation failed</p>
              <p className="text-xs text-gray-500 mb-3">{imgError}</p>
              <button onClick={generateAdImage} className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{background:'#7c3aed'}}>Try Again</button>
            </div>
          )}

          {/* Result */}
          {imgResult && !imgLoading && (
            <div className="p-5 space-y-4">
              {/* Image */}
              <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {imgComposed ? (
                  <img src={imgComposed} alt="Generated ad creative"
                    className="w-full object-contain max-h-[500px]"/>
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-6 h-6 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin"/>
                  </div>
                )}
              </div>

              {/* Size badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300">{imgResult.label}</span>
                <span className="text-[10px] text-gray-400">Logos composited client-side — AI never touched them</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {imgComposed && (
                  <a href={imgComposed} download={`suenos-ad-${account.name.replace(/\s+/g,'-').toLowerCase()}-${imgResult.size.replace(':','x')}.jpg`}
                    className="text-xs px-4 py-1.5 rounded-lg text-white font-medium transition hover:opacity-90"
                    style={{background:'#7c3aed'}}>
                    ⬇ Download
                  </a>
                )}
                <button onClick={()=>{ setImgResult(null); setImgError(null); setImgComposed(null); }}
                  className="text-xs px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  Generate Another
                </button>
              </div>

              <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">AI-generated background — review before publishing. Commercial rights subject to Fal.ai terms.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Scan Ads Panel ───────────────────────────────────────────────────── */}
      {scanOpen && (()=>{
        const scanCity = extractCity(account.address)||'';
        const scanPostal = account.address?.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i)?.[0]||'BC';
        const mkMeta = kw => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CA&q=${encodeURIComponent(kw+' '+scanCity)}`;
        const mkGoogle = kw => `https://www.google.com/search?q=${encodeURIComponent(kw+' '+scanCity+' BC promotions ads')}`;
        const rows = [
          {emoji:'🍹', label:'All Liquor & Spirits',  meta:'liquor spirits alcohol',        google:'liquor spirits alcohol promotions'},
          {emoji:'🌵', label:'Tequila & Mezcal',       meta:'tequila mezcal agave',           google:'tequila mezcal deals promotions'},
          {emoji:'🥃', label:'Spirits & Whisky',       meta:'spirits whisky whiskey bourbon', google:'spirits whisky promotions'},
          {emoji:'🍸', label:'Cocktail Bars',           meta:'cocktail bar drinks nightlife',  google:'cocktail bar specials promotions'},
          {emoji:'🍺', label:'Beer & Cider',            meta:'beer cider craft brewery',       google:'beer cider deals specials'},
          {emoji:'🍷', label:'Wine & Spirits',          meta:'wine spirits vineyard',          google:'wine spirits deals promotions'},
          {emoji:'🏪', label:'Liquor Stores',           meta:'liquor store BCLIQUOR',          google:'liquor store deals sales'},
        ];
        return (
          <div className="mx-4 sm:mx-6 mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">🔍 Competitive Ad Scan</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">📍 {scanCity||'Local area'} · {scanPostal} · Active ads · Canada</p>
              </div>
              <button onClick={()=>setScanOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none ml-4">✕</button>
            </div>
            {/* Category rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map(({emoji,label,meta,google})=>(
                <div key={label} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{emoji} {label}</span>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <a href={mkMeta(meta)} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold px-2.5 py-1 rounded-md text-white transition hover:opacity-90"
                      style={{background:'#1B7873'}}>Meta ↗</a>
                    <a href={mkGoogle(google)} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Google ↗</a>
                  </div>
                </div>
              ))}
            </div>
            {/* Brand search */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Search a specific brand</p>
              <div className="flex gap-2">
                <input value={scanCustom} onChange={e=>setScanCustom(e.target.value)}
                  placeholder="e.g. Patrón, Don Julio, Casamigos…"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"/>
                {scanCustom.trim() && (<>
                  <a href={mkMeta(scanCustom.trim())} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white transition hover:opacity-90 flex-shrink-0"
                    style={{background:'#1B7873'}}>Meta ↗</a>
                  <a href={mkGoogle(scanCustom.trim())} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex-shrink-0">Google ↗</a>
                </>)}
              </div>
            </div>
            {/* Tip */}
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800/30">
              <p className="text-xs text-amber-700 dark:text-amber-400">💡 <strong>Meta tip:</strong> After opening, click <em>Location</em> in the filter bar → type the city → set radius to <strong>15 km</strong></p>
            </div>
          </div>
        );
      })()}

      {/* ── Ad Spec History ─────────────────────────────────────────────────── */}
      {state.adSpecs.length > 0 && (
        <div className="mx-4 sm:mx-6 mb-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={()=>setAdHistOpen(v=>!v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              📋 Past Meta Ad Specs ({state.adSpecs.length})
            </span>
            <span className="text-gray-400 text-sm">{adHistOpen ? '▲' : '▼'}</span>
          </button>
          {adHistOpen && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {state.adSpecs.map(spec => (
                <div key={spec.id} className="bg-white dark:bg-gray-900">
                  {/* Header row */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <button
                      onClick={()=>setExpandedSpec(expandedSpec===spec.id ? null : spec.id)}
                      className="flex-1 text-left">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {new Date(spec.created_at).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'})}
                        {' · '}
                        <span className="text-gray-500">{new Date(spec.created_at).toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'})}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{spec.ad_spec?.objective}</p>
                    </button>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={()=>{ setAdResult(spec.ad_spec); setAdOpen(true); setExpandedSpec(null); }}
                        className="text-[11px] px-2 py-1 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition font-medium">
                        View
                      </button>
                      <button
                        onClick={()=>dbDeleteAdSpec(dispatch, spec.id)}
                        className="text-[11px] px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                        ✕
                      </button>
                    </div>
                  </div>
                  {/* Expanded quick-view */}
                  {expandedSpec === spec.id && (
                    <div className="px-4 pb-3 space-y-1.5 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider pt-1">Headlines</p>
                      {(spec.ad_spec?.headline_variants||[]).map((h,i)=>(
                        <div key={i} className="flex items-center gap-1 text-xs text-gray-800 dark:text-gray-200">
                          <span className="flex-1">{h}</span>
                          <AdCopyBtn text={h}/>
                        </div>
                      ))}
                      <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider pt-1">Primary Text</p>
                      {(spec.ad_spec?.primary_text_variants||[]).map((t,i)=>(
                        <div key={i} className="flex items-start gap-1 text-xs text-gray-700 dark:text-gray-300">
                          <span className="flex-1 leading-relaxed">{t}</span>
                          <AdCopyBtn text={t}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6">
        <div className="flex gap-0 overflow-x-auto no-scrollbar">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 capitalize transition whitespace-nowrap ${tab===t?'border-teal-600 text-teal-700 dark:text-teal-400':'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t==='menu'?'Menu':t==='meta-ads'?'Meta Ads':t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-4">
        {/* OVERVIEW TAB */}
        {tab==='overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contact info */}
              <Card cls="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</p>
                  <button
                    onClick={()=>setGLookupOpen(v=>!v)}
                    title="Lookup on Google Places"
                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium transition">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.73h5.51c-.61 3.05-3.07 4.87-5.51 4.87-3.35 0-6.07-2.72-6.07-6.07s2.72-6.07 6.07-6.07c1.49 0 2.83.53 3.88 1.4l2.05-2.05C16.93 4.41 14.72 3.5 12.18 3.5 7.1 3.5 3 7.6 3 12.67S7.1 21.84 12.18 21.84c5.35 0 8.94-3.77 8.94-9.08 0-.61-.06-1.08-.14-1.56z"/></svg>
                    Lookup
                  </button>
                </div>
                <div className="space-y-2">
                  {account.contact && <div className="flex items-center gap-2 text-sm"><Ic n="users" cls="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-700 dark:text-gray-300">{account.contact}</span></div>}
                  {account.phone   && <a href={`tel:${account.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Ic n="phone" cls="w-3.5 h-3.5" />{account.phone}</a>}
                  {account.email   && <a href={`mailto:${account.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Ic n="mail" cls="w-3.5 h-3.5" /><span className="truncate">{account.email}</span></a>}
                  {account.address && <div className="flex items-start gap-2 text-xs text-gray-500"><Ic n="pin" cls="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{account.address}</div>}
                </div>
                {/* Google Places inline lookup */}
                {gLookupOpen && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 mb-1.5">Search for this business on Google:</p>
                    <input
                      ref={gInputRef}
                      type="text"
                      defaultValue={account.name}
                      placeholder="Start typing business name…"
                      className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none"
                    />
                    {gFound && (
                      <div className="mt-2 p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-xs space-y-1">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{gFound.name}</p>
                        {gFound.address && <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Address:</span> {gFound.address}</p>}
                        {gFound.phone   && <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Phone:</span> {gFound.phone}</p>}
                        {gFound.website && <p className="text-gray-600 dark:text-gray-400 truncate"><span className="font-medium">Website:</span> {gFound.website}</p>}
                        <div className="flex gap-2 pt-1">
                          <button onClick={saveGoogleData} disabled={gSaving}
                            className="flex-1 py-1 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition">
                            {gSaving ? 'Saving…' : 'Save to Account'}
                          </button>
                          <button onClick={()=>setGLookupOpen(false)}
                            className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
              {/* Account info */}
              <Card cls="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Region</span><span className="text-gray-900 dark:text-white font-medium">{account.region}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Assigned Rep</span><span className="text-gray-900 dark:text-white font-medium">{rep?.name||'—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">PST Number</span>{account.pstNumber
                    ? <span className="text-gray-900 dark:text-white font-medium">{account.pstNumber}</span>
                    : <span className="text-amber-600 dark:text-amber-400 font-medium">Not on file</span>}</div>
                  {account.pstOverride && (
                    <div className="flex justify-between"><span className="text-gray-500">PST Status</span>
                      <span className={account.pstOverride==='exempt' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                        {account.pstOverride==='exempt' ? 'Exempt (admin override)' : 'Charged (admin override)'}
                      </span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-500">Total Revenue</span><span className="text-gray-900 dark:text-white font-medium">{fmtCurrency(totalSalesRev)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Added</span><span className="text-gray-500">{fmtDate(account.createdAt)}</span></div>
                </div>
              </Card>
            </div>
            {/* ROI Card — only show if there's something to measure */}
            {(roiRevenue > 0 || totalSpentAll > 0) && (
              <Card cls="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Account ROI</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-400 mb-1">Revenue</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtCurrency(roiRevenue)}</p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-400 mb-1">Spent</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtCurrency(totalSpentAll)}</p>
                  </div>
                  <div className={`text-center p-2.5 rounded-lg ${roiNet >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <p className="text-xs text-gray-400 mb-1">Net</p>
                    <p className={`text-sm font-bold ${roiNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {roiNet >= 0 ? '+' : ''}{fmtCurrency(roiNet)}
                    </p>
                  </div>
                </div>
                {roiPct !== null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all ${roiNet >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`}
                        style={{width:`${Math.min(100, Math.abs(roiPct))}%`}}/>
                    </div>
                    <span className={`text-xs font-semibold flex-shrink-0 ${roiNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {roiPct >= 0 ? '+' : ''}{roiPct}% ROI
                    </span>
                  </div>
                )}
                {totalSpentAll === 0 && roiRevenue > 0 && (
                  <p className="text-xs text-gray-400 mt-1">No expenses logged — add them in the Budget tab to see ROI.</p>
                )}
              </Card>
            )}

            {account.notes && (
              <Card cls="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{account.notes}</p>
              </Card>
            )}
            {accTasks.length>0 && (
              <Card cls="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Open Tasks</p>
                <div className="space-y-2">
                  {accTasks.map(t=>(
                    <div key={t.id} className="flex items-start gap-2">
                      <button onClick={()=>dbUpdTask(dispatch,{...t,done:true})}
                        className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 hover:border-teal-400 transition flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 dark:text-gray-300">{t.title}</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtShort(t.dueDate)}</span>
                        </div>
                        {t.notes && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">{t.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* VISITS TAB */}
        {tab==='visits' && (
          <div className="space-y-2">
            <div className="flex justify-end mb-2">
              <Btn size="sm" onClick={()=>dispatch({type:'NAV',view:'new-visit',params:{accountId:id}})}>
                <Ic n="plus" cls="w-3.5 h-3.5" /> Log Visit
              </Btn>
            </div>
            {accVisits.length===0
              ? <EmptyState icon="visits" title="No visits yet" action={<Btn size="sm" onClick={()=>dispatch({type:'NAV',view:'new-visit',params:{accountId:id}})}>Log First Visit</Btn>} />
              : accVisits.map(v=>(
                  <Card key={v.id} cls="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">{v.type}</span>
                        <span className="text-xs text-gray-400 ml-2">{fmtDate(v.date)}</span>
                      </div>
                      <span className="text-xs text-gray-500">{v.contact}</span>
                    </div>
                    {v.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{v.notes}</p>}
                    {v.outcome && <p className="text-xs text-teal-700 dark:text-teal-400"><span className="font-medium">Outcome:</span> {v.outcome}</p>}
                    {v.followUpDate && <p className="text-xs text-gray-400 mt-1">Follow-up: {fmtDate(v.followUpDate)}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(v.checks||{}).filter(([,v])=>v).map(([k])=>(
                        <span key={k} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                          {k==='shelf'?'Shelf ✓':k==='menu'?'Menu ✓':k==='display'?'Display ✓':k==='samples'?'Samples ✓':'Sell Sheet ✓'}
                        </span>
                      ))}
                    </div>
                  </Card>
                ))
            }
          </div>
        )}

        {/* ORDERS TAB */}
        {tab==='orders' && (
          <div className="space-y-2">
            <div className="flex justify-end mb-2">
              <Btn size="sm" onClick={()=>dispatch({type:'NAV',view:'new-order',params:{accountId:id}})}>
                <Ic n="plus" cls="w-3.5 h-3.5" /> New Order
              </Btn>
            </div>
            {accOrders.length===0
              ? <EmptyState icon="orders" title="No orders yet" action={<Btn size="sm" onClick={()=>dispatch({type:'NAV',view:'new-order',params:{accountId:id}})}>Create Order</Btn>} />
              : accOrders.map(o=>{
                  const prod  = state.products.find(p=>p.id===o.productId);
                  const store = o.storeId==='BCLDB' ? {name:'BCLDB'} : state.stores.find(s=>s.id===o.storeId);
                  return (
                    <Card key={o.id} cls="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{prod?.name} × {o.bottles} btl</span>
                        <div className="flex items-center gap-2">
                          <Badge label={o.status} />
                          {isAdmin && (
                            <button onClick={()=>setEditingOrder(o)} title="Edit order"
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                              <Ic n="edit" cls="w-3.5 h-3.5"/>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{store?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Req. {fmtDate(o.requestedDate)} · Placed {fmtDate(o.createdAt)}</p>
                    </Card>
                  );
                })
            }
          </div>
        )}

        {/* MENU TAB */}
        {tab==='menu' && (
          <div>
            {!isOnPremise && (
              <div className="text-center py-6 text-sm text-gray-500">Menu placement tracking is for on-premise accounts (restaurants, bars, hotels).</div>
            )}
            {isOnPremise && (
              <div className="space-y-3">
                {MENU_ITEMS.map(item=>{
                  const current = account.menuPlacements?.[item] || 'Not Discussed';
                  return (
                    <Card key={item} cls="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item}</p>
                        <Badge label={current} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {MENU_STATUSES.map(s=>(
                          <button key={s} onClick={()=>{
                            const updated = {...account, menuPlacements:{...account.menuPlacements,[item]:s}};
                            dbUpdAccount(dispatch, updated);
                            showToast(dispatch,`${item} → ${s}`);
                          }}
                            className={`px-2 py-1 text-xs rounded-lg border transition ${current===s?'border-teal-600 bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {tab==='tasks' && (
          <div className="space-y-2">
            <div className="flex justify-end mb-2">
              <Btn size="sm" onClick={()=>setTaskOpen(true)}><Ic n="plus" cls="w-3.5 h-3.5" /> Add Task</Btn>
            </div>
            {state.tasks.filter(t=>t.accountId===id).length===0
              ? <EmptyState icon="tasks" title="No tasks" desc="Every account should have a next action." action={<Btn size="sm" onClick={()=>setTaskOpen(true)}>Add Task</Btn>} />
              : state.tasks.filter(t=>t.accountId===id).map(t=>(
                  <Card key={t.id} cls="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <button onClick={()=>dbUpdTask(dispatch,{...t,done:!t.done})}
                        className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${t.done?'bg-emerald-500 border-emerald-500':'border-gray-300 dark:border-gray-600 hover:border-teal-400'}`}>
                        {t.done && <Ic n="check" cls="w-2.5 h-2.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${t.done?'line-through text-gray-400':'text-gray-800 dark:text-gray-200'}`}>{t.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Due {fmtDate(t.dueDate)}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t.priority==='high'?'bg-red-100 text-red-600':t.priority==='medium'?'bg-teal-100 text-teal-700':'bg-gray-100 text-gray-500'}`}>
                        {t.priority}
                      </span>
                      <button onClick={()=>dispatch({type:'DEL_TASK',id:t.id})} className="p-1 text-gray-300 hover:text-red-400 transition">
                        <Ic n="trash" cls="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                ))
            }
          </div>
        )}

        {/* SALES TAB */}
        {tab==='sales' && (
          <div className="space-y-2">
            {accSales.length>0 && (
              <div className="flex items-center gap-4 mb-1 px-1">
                <span className="text-xs text-gray-500">{accSales.length} records</span>
                <span className="text-xs font-semibold text-teal-700">{totalSalesBottles} btl</span>
                {totalSalesRev>0 && <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{fmtCurrency(totalSalesRev)}</span>}
              </div>
            )}
            {accSales.length===0
              ? <EmptyState icon="reports" title="No sales records" desc="Add sales data from Sales Import in the admin menu." />
              : [...accSales].sort((a,b)=>b.month.localeCompare(a.month)).map(s=>{
                  const prod = state.products.find(p=>p.id===s.productId);
                  const rep  = state.users.find(u=>u.id===s.repId);
                  return (
                    <Card key={s.id} cls="p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{s.month}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {prod?.name||'Unknown product'}{rep ? ` · ${rep.name.split(' ')[0]}` : ''}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-teal-700">{s.bottles} btl</p>
                          {s.revenue>0 && <p className="text-xs text-gray-400">{fmtCurrency(s.revenue)}</p>}
                        </div>
                      </div>
                    </Card>
                  );
                })
            }
          </div>
        )}
      </div>

        {tab==='budget' && (() => {
          // ── Budget calculations ──────────────────────────────────────────
          const accOrders = state.orders.filter(o=>o.accountId===id&&o.status!=='Cancelled');
          const totalBottles = accOrders.reduce((s,o)=>s+(o.bottles||0),0);
          const totalCases = accOrders.reduce((s,o)=>{
            const prod = state.products.find(p=>p.id===o.productId);
            const cp = prod?.casePack||12;
            return s + (o.bottles||0)/cp;
          }, 0);
          const totalRev = accOrders.reduce((s,o)=>s+(o.subtotal||0),0);
          const bottleRev = totalRev; // revenue is all bottle-based
          const caseRev   = totalRev;

          const fixedCommit   = account.budgetTotal      ? Number(account.budgetTotal)      : 0;
          const perBotCommit  = account.budgetPerBottle  ? Number(account.budgetPerBottle)  * totalBottles : 0;
          const perCaseCommit = account.budgetPerCase    ? Number(account.budgetPerCase)    * totalCases   : 0;
          const pctBotCommit  = account.budgetPctBottle  ? (Number(account.budgetPctBottle)/100) * bottleRev : 0;
          const pctCaseCommit = account.budgetPctCase    ? (Number(account.budgetPctCase)/100)   * caseRev   : 0;
          const totalCommit   = fixedCommit + perBotCommit + perCaseCommit + pctBotCommit + pctCaseCommit;

          const accExpenses = state.expenses.filter(e=>e.accountId===id);
          const totalSpent  = accExpenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
          const remaining   = totalCommit - totalSpent;

          const bfv = k => budgetForm[k] ?? (account[k] != null ? String(account[k]) : '');
          const bset = (k,v) => setBudgetForm(f=>({...f,[k]:v}));

          const saveBudget = async () => {
            setBudgetSaving(true);
            try {
              await dbSaveAccountBudget(dispatch, account, {
                budgetTotal:      budgetForm.budgetTotal      !== undefined ? (budgetForm.budgetTotal===''?null:budgetForm.budgetTotal)      : account.budgetTotal,
                budgetPerBottle:  budgetForm.budgetPerBottle  !== undefined ? (budgetForm.budgetPerBottle===''?null:budgetForm.budgetPerBottle)  : account.budgetPerBottle,
                budgetPerCase:    budgetForm.budgetPerCase    !== undefined ? (budgetForm.budgetPerCase===''?null:budgetForm.budgetPerCase)    : account.budgetPerCase,
                budgetPctBottle:  budgetForm.budgetPctBottle  !== undefined ? (budgetForm.budgetPctBottle===''?null:budgetForm.budgetPctBottle)  : account.budgetPctBottle,
                budgetPctCase:    budgetForm.budgetPctCase    !== undefined ? (budgetForm.budgetPctCase===''?null:budgetForm.budgetPctCase)    : account.budgetPctCase,
              });
              showToast(dispatch,'Budget saved');
              setBudgetEdit(false); setBudgetForm({});
            } catch(e) { showToast(dispatch,'Save failed: '+e.message,'error'); }
            setBudgetSaving(false);
          };

          const addExpense = async () => {
            if (!expItem.trim()||!expAmount) return;
            setExpAdding(true);
            try {
              await dbAddExpense(dispatch, id, expItem.trim(), expAmount, expDate, state.user?.id);
              setExpItem(''); setExpAmount(''); setExpDate(today());
              showToast(dispatch,'Expense added');
            } catch(e) { showToast(dispatch,'Failed: '+e.message,'error'); }
            setExpAdding(false);
          };

          const $f = n => n==null||n===''?'—':`$${Number(n).toFixed(2)}`;
          const pf = n => n==null||n===''?'—':`${Number(n).toFixed(1)}%`;

          return (
            <div className="space-y-4">
              {/* ── Summary strip ── */}
              {totalCommit > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 bg-teal-50 dark:bg-teal-900/20 text-center">
                    <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{$f(totalCommit)}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Commitment</p>
                  </div>
                  <div className="rounded-xl p-3 bg-amber-50 dark:bg-amber-900/20 text-center">
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{$f(totalSpent)}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Spent</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${remaining>=0?'bg-green-50 dark:bg-green-900/20':'bg-red-50 dark:bg-red-900/20'}`}>
                    <p className={`text-lg font-bold ${remaining>=0?'text-green-700 dark:text-green-400':'text-red-600'}`}>{$f(Math.abs(remaining))}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{remaining>=0?'Remaining':'Over budget'}</p>
                  </div>
                </div>
              )}

              {/* ── Budget settings ── */}
              <Card cls="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">💰 Budget / Commitment</p>
                  {!budgetEdit
                    ? <button onClick={()=>{ setBudgetForm({}); setBudgetEdit(true); }}
                        className="text-xs text-teal-600 hover:underline font-medium">Edit</button>
                    : <div className="flex gap-2">
                        <button onClick={()=>{ setBudgetEdit(false); setBudgetForm({}); }}
                          className="text-xs text-gray-400 hover:text-gray-600 font-medium">Cancel</button>
                        <button onClick={saveBudget} disabled={budgetSaving}
                          className="text-xs text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1 rounded-lg font-medium disabled:opacity-50">
                          {budgetSaving?'Saving…':'Save'}
                        </button>
                      </div>
                  }
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {/* Row: Total $ */}
                  <div className="col-span-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total $</span>
                    {budgetEdit
                      ? <input type="number" min="0" step="0.01" value={bfv('budgetTotal')} onChange={e=>bset('budgetTotal',e.target.value)}
                          placeholder="0.00"
                          className="w-32 text-right text-sm px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent"/>
                      : <span className="text-sm font-semibold text-gray-800 dark:text-white">{$f(account.budgetTotal)}</span>
                    }
                  </div>
                  {/* $ per bottle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">$ / bottle</span>
                    {budgetEdit
                      ? <input type="number" min="0" step="0.01" value={bfv('budgetPerBottle')} onChange={e=>bset('budgetPerBottle',e.target.value)}
                          placeholder="0.00"
                          className="w-24 text-right text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400"/>
                      : <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{$f(account.budgetPerBottle)}</span>
                    }
                  </div>
                  {/* $ per case */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">$ / case</span>
                    {budgetEdit
                      ? <input type="number" min="0" step="0.01" value={bfv('budgetPerCase')} onChange={e=>bset('budgetPerCase',e.target.value)}
                          placeholder="0.00"
                          className="w-24 text-right text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400"/>
                      : <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{$f(account.budgetPerCase)}</span>
                    }
                  </div>
                  {/* % per bottle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">% / bottle</span>
                    {budgetEdit
                      ? <input type="number" min="0" max="100" step="0.1" value={bfv('budgetPctBottle')} onChange={e=>bset('budgetPctBottle',e.target.value)}
                          placeholder="0.0"
                          className="w-24 text-right text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400"/>
                      : <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{pf(account.budgetPctBottle)}</span>
                    }
                  </div>
                  {/* % per case */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">% / case</span>
                    {budgetEdit
                      ? <input type="number" min="0" max="100" step="0.1" value={bfv('budgetPctCase')} onChange={e=>bset('budgetPctCase',e.target.value)}
                          placeholder="0.0"
                          className="w-24 text-right text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400"/>
                      : <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{pf(account.budgetPctCase)}</span>
                    }
                  </div>
                </div>

                {/* Commitment breakdown (when order data applies) */}
                {totalCommit > 0 && (totalBottles > 0 || totalCases > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Calculation basis</p>
                    <p className="text-xs text-gray-400">{totalBottles} bottles ordered · {totalCases.toFixed(1)} cases · {fmtCurrency(totalRev)} revenue</p>
                    {fixedCommit   > 0 && <p className="text-xs text-gray-500">Fixed: <span className="font-medium">{$f(fixedCommit)}</span></p>}
                    {perBotCommit  > 0 && <p className="text-xs text-gray-500">$ × bottles: <span className="font-medium">{$f(perBotCommit)}</span></p>}
                    {perCaseCommit > 0 && <p className="text-xs text-gray-500">$ × cases: <span className="font-medium">{$f(perCaseCommit)}</span></p>}
                    {pctBotCommit  > 0 && <p className="text-xs text-gray-500">% of bottle rev: <span className="font-medium">{$f(pctBotCommit)}</span></p>}
                    {pctCaseCommit > 0 && <p className="text-xs text-gray-500">% of case rev: <span className="font-medium">{$f(pctCaseCommit)}</span></p>}
                  </div>
                )}
              </Card>

              {/* ── Expense tracker ── */}
              <Card cls="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📋 Expenses</p>
                {/* Add expense row */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <input value={expItem} onChange={e=>setExpItem(e.target.value)} placeholder="Item / description"
                    className="flex-1 min-w-36 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent"/>
                  <input type="number" min="0" step="0.01" value={expAmount} onChange={e=>setExpAmount(e.target.value)} placeholder="$0.00"
                    className="w-24 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent"/>
                  <input type="date" value={expDate} onChange={e=>setExpDate(e.target.value)}
                    className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent"/>
                  <button onClick={addExpense} disabled={expAdding||!expItem.trim()||!expAmount}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
                    style={{background:'#1B7873'}}>
                    {expAdding?'Adding…':'+ Add'}
                  </button>
                </div>
                {/* Expense list */}
                {accExpenses.length === 0
                  ? <p className="text-xs text-gray-400 italic text-center py-3">No expenses recorded yet</p>
                  : <>
                      <div className="space-y-1.5">
                        {[...accExpenses].sort((a,b)=>b.date?.localeCompare(a.date||'')).map(e=>(
                          <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{e.item}</p>
                              <p className="text-[11px] text-gray-400">{e.date||''}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">{$f(e.amount)}</p>
                            {isAdmin && (
                              <button onClick={()=>{ if(confirm('Delete this expense?')) dbDeleteExpense(dispatch,e.id); }}
                                className="p-1 rounded text-gray-300 hover:text-red-500 transition flex-shrink-0">
                                <Ic n="trash" cls="w-3.5 h-3.5"/>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500">Total spent</span>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{$f(totalSpent)}</span>
                      </div>
                    </>
                }
              </Card>
            </div>
          );
        })()}

      {/* META ADS TAB */}
      {tab==='meta-ads' && (() => {
        const acctCampaigns = (state.metaCampaigns||[]).filter(c=>c.clusterId===`single_${account.id}`);
        const acctDrafts    = (state.adDrafts||[]).filter(d=>d.accountId===account.id && d.status==='draft');
        const token  = localStorage.getItem('meta_access_token') || '';
        const AD_ACCOUNT = 'act_813974741538881';
        const PAGE_ID    = '244516122067785';
        const BASE  = 'https://graph.facebook.com/v25.0';
        const fmtMoney = n => n > 0 ? `$${parseFloat(n).toFixed(2)}` : '$0.00';
        const fmtNum   = n => n > 0 ? parseInt(n).toLocaleString() : '—';
        const fmtPct   = n => n > 0 ? `${parseFloat(n).toFixed(2)}%` : '—';
        const totalSpend  = acctCampaigns.reduce((s,c)=>s+c.spend,0);
        const totalImpr   = acctCampaigns.reduce((s,c)=>s+c.impressions,0);
        const totalClicks = acctCampaigns.reduce((s,c)=>s+c.clicks,0);
        const avgCtr      = totalImpr > 0 ? (totalClicks/totalImpr)*100 : 0;

        function openDraftModal(draft) {
          setDraftForm({ headline: draft.headline, bodyCopy: draft.bodyCopy, budgetCad: draft.budgetCad, radiusKm: draft.radiusKm, durationDays: draft.durationDays });
          setDraftGeo({ lat:'', lng:'', geocoding:false });
          setDraftModal(draft);
        }

        async function geocodeDraftAddress() {
          const addr = [account.address, account.city, account.province].filter(Boolean).join(', ');
          if (!addr) { showToast(dispatch,'No address on account','error'); return; }
          setDraftGeo(g=>({...g, geocoding:true}));
          try {
            const GKEY = 'AIzaSyAj-IjC1HtBEINhDDJnXE5XcLPAJ7L3kbI';
            const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${GKEY}`).then(x=>x.json());
            const loc = r.results?.[0]?.geometry?.location;
            if (loc) setDraftGeo({lat:String(loc.lat), lng:String(loc.lng), geocoding:false});
            else { showToast(dispatch,'Address not found — enter coordinates manually','error'); setDraftGeo(g=>({...g,geocoding:false})); }
          } catch(e) { showToast(dispatch,'Geocode failed','error'); setDraftGeo(g=>({...g,geocoding:false})); }
        }

        async function pushDraft() {
          if (!token) { showToast(dispatch,'No Meta access token — add it in settings','error'); return; }
          const lat = parseFloat(draftGeo.lat), lng = parseFloat(draftGeo.lng);
          if (!lat || !lng) { showToast(dispatch,'Enter or geocode coordinates first','error'); return; }
          setDraftPushing(true);
          try {
            const mq = (path, params) => fetch(`${BASE}/${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...params, access_token:token}) }).then(r=>r.json());
            const lifetimeBudgetCents = Math.round(draftForm.budgetCad * 100);
            const durationDays = parseInt(draftForm.durationDays) || 7;
            const endTime = Math.floor(Date.now()/1000) + durationDays * 86400;

            const campaign = await mq(`${AD_ACCOUNT}/campaigns`, { name:`${account.name} — Listing Launch`, objective:'OUTCOME_AWARENESS', status:'PAUSED', stop_time: endTime, special_ad_categories:[] });
            if (campaign.error) throw new Error(campaign.error.message);

            const adset = await mq(`${AD_ACCOUNT}/adsets`, {
              name:`${account.name} — 5km Launch`, campaign_id:campaign.id,
              lifetime_budget: lifetimeBudgetCents, end_time: endTime,
              billing_event:'IMPRESSIONS', optimization_goal:'REACH',
              targeting: { geo_locations:{ custom_locations:[{ latitude:lat, longitude:lng, radius:draftForm.radiusKm, distance_unit:'kilometer' }] }, age_min:21, age_max:65 },
              status:'ACTIVE',
            });
            if (adset.error) throw new Error(adset.error.message);

            const creative = await mq(`${AD_ACCOUNT}/adcreatives`, {
              name:`${account.name} Listing Creative`,
              object_story_spec:{ page_id:PAGE_ID, link_data:{ message:draftForm.bodyCopy, link:`https://www.facebook.com/${PAGE_ID}`, name:draftForm.headline } },
            });
            if (creative.error) throw new Error(creative.error.message);

            const ad = await mq(`${AD_ACCOUNT}/ads`, { name:`${account.name} Listing Ad`, adset_id:adset.id, creative:{ creative_id:creative.id }, status:'PAUSED' });
            if (ad.error) throw new Error(ad.error.message);

            await dbSaveMetaCampaign(dispatch, { id:genId(), campaignId:campaign.id, adsetId:adset.id, adId:ad.id, city:account.city||account.name, clusterId:`single_${account.id}`, createdBy:state.user?.id });
            await dbMarkDraftPushed(dispatch, draftModal.id, campaign.id);
            setDraftModal(null);
            showToast(dispatch, `✅ Campaign created — paused and ready in Ads Manager`);
          } catch(e) {
            showToast(dispatch, 'Push failed: '+String(e.message||e).slice(0,120), 'error');
          } finally { setDraftPushing(false); }
        }

        return (
          <div className="space-y-4 pb-8">
            {/* Draft push modal */}
            {draftModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e=>{if(e.target===e.currentTarget)setDraftModal(null)}}>
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Push Listing Ad to Meta</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Campaign will be created PAUSED — review in Ads Manager before activating</p>
                    </div>
                    <button onClick={()=>setDraftModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Headline</label>
                      <input className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        value={draftForm.headline||''} onChange={e=>setDraftForm(f=>({...f,headline:e.target.value}))} maxLength={40}/>
                      <p className="text-[10px] text-gray-400 mt-0.5">{(draftForm.headline||'').length}/40 chars</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Body Copy</label>
                      <textarea rows={4} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                        value={draftForm.bodyCopy||''} onChange={e=>setDraftForm(f=>({...f,bodyCopy:e.target.value}))}/>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Budget (CAD)</label>
                        <input type="number" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={draftForm.budgetCad||40} onChange={e=>setDraftForm(f=>({...f,budgetCad:parseFloat(e.target.value)||40}))}/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration (days)</label>
                        <input type="number" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={draftForm.durationDays||7} onChange={e=>setDraftForm(f=>({...f,durationDays:parseInt(e.target.value)||7}))}/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Radius (km)</label>
                        <input type="number" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={draftForm.radiusKm||5} onChange={e=>setDraftForm(f=>({...f,radiusKm:parseInt(e.target.value)||5}))}/>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Geo-targeting coordinates</label>
                        <button onClick={geocodeDraftAddress} disabled={draftGeo.geocoding}
                          className="text-xs px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-700 hover:bg-teal-100 disabled:opacity-50">
                          {draftGeo.geocoding ? 'Geocoding…' : '📍 Geocode Address'}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400">{[account.address, account.city, account.province].filter(Boolean).join(', ') || 'No address on account'}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Latitude</label>
                          <input className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            placeholder="e.g. 49.2827" value={draftGeo.lat} onChange={e=>setDraftGeo(g=>({...g,lat:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Longitude</label>
                          <input className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            placeholder="e.g. -123.1207" value={draftGeo.lng} onChange={e=>setDraftGeo(g=>({...g,lng:e.target.value}))}/>
                        </div>
                      </div>
                    </div>
                    <button onClick={pushDraft} disabled={draftPushing || !draftGeo.lat || !draftGeo.lng}
                      className="w-full py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors">
                      {draftPushing ? 'Creating Campaign…' : '🚀 Push to Meta (PAUSED)'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Draft cards */}
            {acctDrafts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                  <span>📝</span> Ad Drafts ({acctDrafts.length})
                </p>
                {acctDrafts.map(draft => (
                  <Card key={draft.id} cls="p-3 border-l-4 border-l-violet-400">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{draft.headline}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{draft.bodyCopy}</p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          {[`$${draft.budgetCad} budget`,`${draft.durationDays} days`,`${draft.radiusKm}km radius`].map(t=>(
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-medium">{t}</span>
                          ))}
                          <span className="text-[9px] text-gray-400">{draft.createdAt ? new Date(draft.createdAt).toLocaleDateString('en-CA',{month:'short',day:'numeric'}) : ''}</span>
                        </div>
                      </div>
                      <button onClick={()=>openDraftModal(draft)}
                        className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                        Push →
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Live campaigns */}
            {acctCampaigns.length === 0 && acctDrafts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-2">📡</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">No Meta ads for this account yet</p>
                <p className="text-xs text-gray-400 mb-4">A draft will be created automatically when this account goes Listed.</p>
                <button onClick={()=>dispatch({type:'NAV',view:'cluster-ads'})}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors">
                  Open Digital Ad Planner
                </button>
              </div>
            ) : acctCampaigns.length > 0 && (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {l:'Total Spend',  v:fmtMoney(totalSpend)},
                    {l:'Impressions',  v:fmtNum(totalImpr)},
                    {l:'Clicks',       v:fmtNum(totalClicks)},
                    {l:'Avg CTR',      v:fmtPct(avgCtr)},
                  ].map(m=>(
                    <Card key={m.l} cls="p-2 text-center">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{m.v}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{m.l}</p>
                    </Card>
                  ))}
                </div>
                {/* Campaign list */}
                <div className="space-y-2">
                  {acctCampaigns.map(c => {
                    const statusColors = {
                      ACTIVE:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                      PAUSED:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                      DELETED:'bg-red-100 text-red-600',ARCHIVED:'bg-gray-100 text-gray-500',
                    };
                    return (
                      <Card key={c.id} cls="p-3">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'}) : 'Campaign'}
                              </p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${statusColors[c.status]||statusColors.PAUSED}`}>{c.status}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{c.campaignId}</p>
                            {c.lastRefreshedAt && <p className="text-[10px] text-gray-400">Updated {new Date(c.lastRefreshedAt).toLocaleString('en-CA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>}
                          </div>
                          <div className="flex gap-1.5">
                            <a href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=813974741538881&selected_campaign_ids=${c.campaignId}`}
                              target="_blank" rel="noopener noreferrer"
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              Ads Manager ↗
                            </a>
                            {token && (
                              <button onClick={async()=>{
                                try {
                                  const [sr,ir] = await Promise.all([
                                    fetch(`${BASE}/${c.campaignId}?fields=status&access_token=${token}`).then(r=>r.json()),
                                    fetch(`${BASE}/${c.campaignId}/insights?fields=spend,impressions,clicks,reach,cpc,cpm,ctr&date_preset=last_30d&access_token=${token}`).then(r=>r.json()),
                                  ]);
                                  const ins = ir.data?.[0]||{};
                                  await dbUpdateCampaignMetrics(dispatch, c.id, {
                                    status: sr.status||c.status,
                                    spend: parseFloat(ins.spend||0), impressions: parseInt(ins.impressions||0),
                                    clicks: parseInt(ins.clicks||0), reach: parseInt(ins.reach||0),
                                    cpc: parseFloat(ins.cpc||0), cpm: parseFloat(ins.cpm||0), ctr: parseFloat(ins.ctr||0),
                                  });
                                  showToast(dispatch,'✅ Refreshed');
                                } catch(e){ showToast(dispatch,'Refresh failed: '+String(e).slice(0,80),'error'); }
                              }}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              ↻
                            </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                          {[
                            {l:'Spend',v:fmtMoney(c.spend)},{l:'Impressions',v:fmtNum(c.impressions)},
                            {l:'Clicks',v:fmtNum(c.clicks)},{l:'Reach',v:fmtNum(c.reach)},
                            {l:'CTR',v:fmtPct(c.ctr)},{l:'CPC',v:c.cpc>0?fmtMoney(c.cpc):'—'},
                          ].map(m=>(
                            <div key={m.l} className="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-2 py-1.5 text-center">
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{m.v}</p>
                              <p className="text-[10px] text-gray-400">{m.l}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Add Task Modal */}
      <Modal open={taskOpen} onClose={()=>setTaskOpen(false)} title="Add Task">
        <div className="space-y-3">
          <Input label="Task" value={taskTitle} onChange={setTaskTitle} placeholder="e.g. Follow up on listing" required />
          {isAdmin && (
            <Select label="Assign To"
              value={taskAssigneeId}
              onChange={setTaskAssigneeId}
              options={[
                {value:'',label:'— account rep —'},
                ...state.users.filter(u=>['rep','ambassador'].includes(u.role)&&u.active!==false)
                  .map(u=>({value:u.id,label:`${u.name} (${u.role})`}))
              ]} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Due Date" value={taskDue} onChange={setTaskDue} type="date" required />
            <Select label="Priority" value={taskPri} onChange={setTaskPri} options={['low','medium','high']} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
            <textarea value={taskNotes} onChange={e=>setTaskNotes(e.target.value)} rows={3}
              placeholder="Additional context, instructions, or background…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" onClick={()=>setTaskOpen(false)} cls="flex-1">Cancel</Btn>
            <Btn onClick={addTask} cls="flex-1" disabled={!taskTitle||!taskDue}>Add Task</Btn>
          </div>
        </div>
      </Modal>

      {/* Edit Account Modal */}
      <AccountFormModal open={editOpen} onClose={()=>setEditOpen(false)} existing={account} />
    </div>
  );
}

// ─── ACCOUNT FORM (New + Edit) ────────────────────────────────────────────────
function AccountFormModal({ open, onClose, existing }) {
  const { state, dispatch } = useApp();
  const isEdit = !!existing;
  const blank = { name:'', type:'', region:'', assignedRep:'', address:'', lat:'', lng:'', contact:'', email:'', phone:'', website:'', status:'Prospect', notes:'', pstNumber:'' };
  const [form, setForm] = useState(isEdit ? {...existing} : blank);
  const [sending, setSending] = useState(false);

  useEffect(() => { if(open) setForm(isEdit ? {...existing} : blank); }, [open]);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function submit(e) {
    e.preventDefault();
    if (!form.name||!form.type||!form.region) return;
    if (isEdit) {
      dbUpdAccount(dispatch, form);
      showToast(dispatch,'Account updated');
    } else {
      const newAcc = { ...form, id:genId(), menuPlacements:{}, lastVisit:null, lastOrder:null, createdAt:today() };
      dbAddAccount(dispatch, newAcc);
      if (form.email) {
        // Simulate sell sheet email
        setSending(true);
        setTimeout(()=>{
          setSending(false);
          showToast(dispatch,`Sell sheet sent to ${form.email}`,'info');
        },1000);
      } else {
        showToast(dispatch,'Account created');
      }
    }
    onClose();
  }

  const reps = state.users.filter(u=>u.role==='rep'||u.role==='admin');

  return (
    <Modal open={open} onClose={onClose} title={isEdit?'Edit Account':'New Account'} width="max-w-xl">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Account Name" value={form.name} onChange={v=>set('name',v)} required cls="sm:col-span-2" />
          <Select label="Type" value={form.type} onChange={v=>set('type',v)} options={ACCOUNT_TYPES} required />
          <Select label="Status" value={form.status} onChange={v=>set('status',v)} options={ACCOUNT_STATUSES} required />
          <Select label="Region" value={form.region} onChange={v=>set('region',v)} options={REGIONS} required />
          <Select label="Assigned Rep" value={form.assignedRep} onChange={v=>set('assignedRep',v)}
            options={reps.map(u=>({value:u.id,label:u.name}))} />
        </div>
        <Input label="Address" value={form.address} onChange={v=>set('address',v)} placeholder="Full street address" cls="" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="GPS Latitude" value={form.lat} onChange={v=>set('lat',v)} placeholder="49.2827" type="number" />
          <Input label="GPS Longitude" value={form.lng} onChange={v=>set('lng',v)} placeholder="-123.1207" type="number" />
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Contact Name" value={form.contact} onChange={v=>set('contact',v)} />
          <Input label="Phone" value={form.phone} onChange={v=>set('phone',v)} type="tel" />
          <Input label="Email" value={form.email} onChange={v=>set('email',v)} type="email" />
          <Input label="Website" value={form.website} onChange={v=>set('website',v)} />
        </div>
        <Input label="PST Number" value={form.pstNumber} onChange={v=>set('pstNumber',v)} placeholder="On file → PST exempt · blank → PST added to invoices" />
        <Input label="Notes" value={form.notes} onChange={v=>set('notes',v)} rows={3} />
        {!isEdit && form.email && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
            <Ic n="mail" cls="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Sell sheet will be emailed to {form.email} automatically.
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Btn variant="secondary" onClick={onClose} cls="flex-1">Cancel</Btn>
          <Btn type="submit" cls="flex-1" disabled={!form.name||!form.type||!form.region}>
            {sending ? 'Sending…' : isEdit ? 'Save Changes' : 'Create Account'}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function NewAccount() {
  const { dispatch } = useApp();
  return <AccountFormModal open={true} onClose={()=>dispatch({type:'NAV',view:'accounts'})} />;
}

// ─── VISIT LIST ───────────────────────────────────────────────────────────────
function VisitList() {
  const { state, dispatch } = useApp();
  const [q, setQ] = useState('');
  const [fType, setFType] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fRep, setFRep] = useState('');
  const [fRegion, setFRegion] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = state.user.role==='admin';
  const reps = (state.users||[]).filter(u=>u.role==='rep'&&u.active!==false);
  const regions = (state.regions||[]).filter(r=>r.active!==false).sort((a,b)=>a.name.localeCompare(b.name));

  const filtered = state.visits
    .filter(v => isAdmin || v.repId===state.user.id)
    .filter(v => !fType || v.type===fType)
    .filter(v => !fRep || v.repId===fRep)
    .filter(v => !fFrom || v.date>=fFrom)
    .filter(v => !fTo || v.date<=fTo)
    .filter(v => {
      if (!fRegion) return true;
      const acc = state.accounts.find(a=>a.id===v.accountId);
      return acc?.regionId===fRegion;
    })
    .filter(v => {
      if (!q) return true;
      const acc = state.accounts.find(a=>a.id===v.accountId);
      return acc?.name.toLowerCase().includes(q.toLowerCase()) || v.type.toLowerCase().includes(q.toLowerCase());
    })
    .sort((a,b)=>b.date.localeCompare(a.date));

  const hasActiveFilters = fType||fFrom||fTo||fRep||fRegion;

  const selCls = "px-2.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300";
  const inpCls = "w-full px-2.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent";

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{filtered.length} visit{filtered.length!==1?'s':''}</p>
        <div className="flex gap-2">
          <button onClick={()=>setShowFilters(f=>!f)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${hasActiveFilters ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <Ic n="filter" cls="w-3 h-3" /> Filters{hasActiveFilters ? ' ●' : ''}
          </button>
          <VoiceVisitButton className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700" />
          <Btn onClick={()=>dispatch({type:'NAV',view:'new-visit'})}><Ic n="plus" cls="w-4 h-4" /> Log Visit</Btn>
        </div>
      </div>

      {/* Search + type row */}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Ic n="search" cls="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search visits…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
        </div>
        <select value={fType} onChange={e=>setFType(e.target.value)} className={selCls}>
          <option value="">All Types</option>
          {VISIT_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3 space-y-2">
          {/* Date range */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500 w-10 flex-shrink-0">From</span>
            <input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} className={inpCls} />
            <span className="text-xs text-gray-500 flex-shrink-0">To</span>
            <input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} className={inpCls} />
          </div>
          {/* Rep + Region */}
          <div className="flex gap-2">
            {isAdmin && (
              <select value={fRep} onChange={e=>setFRep(e.target.value)} className={selCls + ' flex-1'}>
                <option value="">All Reps</option>
                {reps.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <select value={fRegion} onChange={e=>setFRegion(e.target.value)} className={selCls + ' flex-1'}>
              <option value="">All Regions</option>
              {regions.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={()=>{setFType('');setFFrom('');setFTo('');setFRep('');setFRegion('');}}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {filtered.length===0
        ? <EmptyState icon="visits" title="No visits found" action={<Btn onClick={()=>dispatch({type:'NAV',view:'new-visit'})}>Log Visit</Btn>} />
        : <div className="space-y-2">
            {filtered.map(v=>{
              const acc = state.accounts.find(a=>a.id===v.accountId);
              const rep = state.users.find(u=>u.id===v.repId);
              return (
                <Card key={v.id} cls="p-4" onClick={()=>acc&&dispatch({type:'NAV',view:'account-detail',params:{id:acc.id}})}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{acc?.name||'Unknown'}</span>
                      <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">{v.type}</span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(v.date)}</span>
                  </div>
                  {v.notes && <p className="text-xs text-gray-500 truncate mb-1">{v.notes}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{v.contact}</span>
                    {rep && <span>{rep.name.split(' ')[0]}</span>}
                  </div>
                  {v.followUpDate && <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">↻ Follow-up {fmtDate(v.followUpDate)}</p>}
                </Card>
              );
            })}
          </div>
      }
    </div>
  );
}

// ─── NEW VISIT FORM ───────────────────────────────────────────────────────────
function NewVisit() {
  const { state, dispatch } = useApp();
  const prefill = state.params?.accountId || '';
  const [form, setForm] = useState({
    accountId: prefill, date: today(), contact:'', type:'Follow Up', notes:'', outcome:'', followUpDate:'',
    checks:{ shelf:false, menu:false, display:false, samples:false, sellSheet:false }
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setCheck = (k,v) => setForm(f=>({...f, checks:{...f.checks,[k]:v}}));

  const myAccounts = state.user.role==='admin'
    ? state.accounts
    : state.accounts.filter(a=>a.assignedRep===state.user.id || !a.assignedRep);

  function submit(e) {
    e.preventDefault();
    if(!form.accountId||!form.type) return;
    const newVisit = { ...form, id:genId(), repId:state.user.id };
    dispatch({ type:'ADD_VISIT', payload:newVisit });
    // Update lastVisit on account
    const acc = state.accounts.find(a=>a.id===form.accountId);
    if (acc) dispatch({ type:'UPD_ACCOUNT', payload:{...acc, lastVisit:form.date} });
    if (form.checks.sellSheet) showToast(dispatch,'Visit logged + sell sheet marked sent','success');
    else showToast(dispatch,'Visit logged successfully');
    dispatch({ type:'NAV', view: prefill ? 'account-detail' : 'visits', params: prefill ? {id:prefill} : {} });
  }

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
      <button onClick={()=>dispatch({type:'NAV',view:prefill?'account-detail':'visits',params:prefill?{id:prefill}:{}})}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4 transition">
        <Ic n="chevronL" cls="w-3.5 h-3.5" /> Back
      </button>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Log a Visit</h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Account" value={form.accountId} onChange={v=>set('accountId',v)} required
            options={myAccounts.map(a=>({value:a.id,label:a.name}))} cls="sm:col-span-2" />
          <Input label="Date" value={form.date} onChange={v=>set('date',v)} type="date" required />
          <Select label="Visit Type" value={form.type} onChange={v=>set('type',v)} options={VISIT_TYPES} required />
        </div>
        <Input label="Contact Person" value={form.contact} onChange={v=>set('contact',v)} placeholder="Who did you meet?" />
        <Input label="Visit Notes" value={form.notes} onChange={v=>set('notes',v)} rows={3} placeholder="What was discussed?" />
        <Input label="Outcome / Next Step" value={form.outcome} onChange={v=>set('outcome',v)} rows={2} placeholder="What was agreed?" />
        <Input label="Follow-Up Date" value={form.followUpDate} onChange={v=>set('followUpDate',v)} type="date" />

        <Card cls="p-4">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Checklist</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k:'shelf',     label:'Shelf Placement Verified' },
              { k:'menu',      label:'Menu Placement Verified'  },
              { k:'display',   label:'Display Installed'        },
              { k:'samples',   label:'Samples Left'             },
              { k:'sellSheet', label:'Sell Sheet Sent'          },
            ].map(item=>(
              <label key={item.k} className="flex items-center gap-2 cursor-pointer group">
                <div onClick={()=>setCheck(item.k,!form.checks[item.k])}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${form.checks[item.k]?'bg-teal-600 border-teal-600':'border-gray-300 dark:border-gray-600 group-hover:border-teal-400'}`}>
                  {form.checks[item.k] && <Ic n="check" cls="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300">{item.label}</span>
              </label>
            ))}
          </div>
        </Card>

        <div className="flex gap-2 pt-1">
          <Btn variant="secondary" onClick={()=>dispatch({type:'NAV',view:prefill?'account-detail':'visits',params:prefill?{id:prefill}:{}})} cls="flex-1">Cancel</Btn>
          <Btn type="submit" cls="flex-1" disabled={!form.accountId}>Log Visit</Btn>
        </div>
      </form>
    </div>
  );
}

// ─── ORDER LIST ───────────────────────────────────────────────────────────────
// ─── EDIT ORDER MODAL ─────────────────────────────────────────────────────────
function EditOrderModal({ order, onClose }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    accountId:     order.accountId||'',
    productId:     order.productId||'',
    bottles:       order.bottles||'',
    requestedDate: order.requestedDate||'',
    storeId:       order.storeId||'',
    status:        order.status||'Submitted',
    notes:         order.notes||'',
    licenseNumber: order.licenseNumber||'',
    orderedBy:     order.orderedBy||'',
    billingEmail:  order.billingEmail||'',
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const acc = state.accounts.find(a=>a.id===form.accountId);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await dbUpdOrder(dispatch, { ...order, ...form, bottles: parseInt(form.bottles) });
      showToast(dispatch, 'Order updated');
      onClose();
    } catch(err) {
      showToast(dispatch, 'Save failed: '+err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const iStyle = { background:'transparent', border:'1px solid rgba(156,163,175,0.4)', borderRadius:8, padding:'6px 10px', fontSize:13, color:'inherit', width:'100%', outline:'none' };
  const lStyle = { fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:4 };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'var(--card-bg,#fff)',borderRadius:16,padding:24,width:'100%',maxWidth:500,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
        </div>
        <form onSubmit={save} className="space-y-3">
          {/* Account — read-only display */}
          <div>
            <label style={lStyle}>Account</label>
            <div style={{...iStyle, background:'rgba(0,0,0,0.03)', color:'#6b7280'}}>{acc?.name||form.accountId}</div>
          </div>
          {/* Product */}
          <div>
            <label style={lStyle}>Product</label>
            <select value={form.productId} onChange={e=>set('productId',e.target.value)} style={iStyle} required>
              <option value="">— select —</option>
              {state.products.filter(p=>p.active).map(p=>(
                <option key={p.id} value={p.id}>{p.name} ({p.size})</option>
              ))}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={lStyle}>Bottles</label>
              <input type="number" value={form.bottles} onChange={e=>set('bottles',e.target.value)} style={iStyle} required min="1"/>
            </div>
            <div>
              <label style={lStyle}>Requested Date</label>
              <input type="date" value={form.requestedDate} onChange={e=>set('requestedDate',e.target.value)} style={iStyle}/>
            </div>
          </div>
          {/* Store */}
          <div>
            <label style={lStyle}>Fulfillment Store</label>
            <select value={form.storeId} onChange={e=>set('storeId',e.target.value)} style={iStyle} required>
              <option value="">— select —</option>
              <option value="BCLDB">BCLDB</option>
              {state.stores.map(s=>(
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {/* Status */}
          <div>
            <label style={lStyle}>Status</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)} style={iStyle}>
              {ORDER_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={lStyle}>License #</label>
              <input value={form.licenseNumber} onChange={e=>set('licenseNumber',e.target.value)} style={iStyle} placeholder="LRS-12345"/>
            </div>
            <div>
              <label style={lStyle}>Ordered By</label>
              <input value={form.orderedBy} onChange={e=>set('orderedBy',e.target.value)} style={iStyle} placeholder="Buyer name"/>
            </div>
          </div>
          <div>
            <label style={lStyle}>Billing Email</label>
            <input type="email" value={form.billingEmail} onChange={e=>set('billingEmail',e.target.value)} style={iStyle} placeholder="billing@store.com"/>
          </div>
          <div>
            <label style={lStyle}>Notes</label>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} style={{...iStyle,resize:'vertical',minHeight:60}} rows={2}/>
          </div>
          {form.bottles && <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-xs text-teal-800 dark:text-teal-400">{form.bottles} bottles = {(parseInt(form.bottles)/12).toFixed(1)} cases</div>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} style={{flex:1,padding:'8px 16px',borderRadius:8,border:'1px solid rgba(156,163,175,0.4)',fontSize:13,cursor:'pointer',background:'transparent',color:'inherit'}}>Cancel</button>
            <button type="submit" disabled={saving} style={{flex:1,padding:'8px 16px',borderRadius:8,border:'none',fontSize:13,cursor:'pointer',background:'#0d9488',color:'white',fontWeight:600,opacity:saving?0.6:1}}>{saving?'Saving…':'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── LINK ORDER TO ACCOUNT MODAL ─────────────────────────────────────────────
function LinkOrderModal({ order, onClose }) {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const matches = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.accounts.slice().sort((a,b)=>a.name.localeCompare(b.name)).slice(0,50);
    return state.accounts.filter(a=>
      a.name.toLowerCase().includes(q) ||
      (a.region||'').toLowerCase().includes(q) ||
      (a.type||'').toLowerCase().includes(q)
    ).slice(0,50);
  }, [search, state.accounts]);

  async function linkTo(acc) {
    setSaving(true);
    const updated = { ...order, accountId: acc.id };
    await dbUpdOrder(dispatch, updated);
    dispatch({ type:'TOAST', payload:{ msg:`Linked to ${acc.name}`, type:'success' } });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Link Order to Account</h3>
            <p className="text-xs text-gray-500 mt-0.5">{order.id.slice(0,8)}… · {state.products.find(p=>p.id===order.productId)?.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <Ic n="x" cls="w-4 h-4"/>
          </button>
        </div>
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <input
            autoFocus
            type="text"
            placeholder="Search accounts…"
            value={search}
            onChange={e=>setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
          {matches.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No accounts found</p>
            : matches.map(acc => (
                <button key={acc.id} disabled={saving} onClick={()=>linkTo(acc)}
                  className="w-full text-left px-4 py-3 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition group">
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400">{acc.name}</p>
                  <p className="text-xs text-gray-400">{acc.type} · {acc.region}</p>
                </button>
              ))
          }
        </div>
      </div>
    </div>
  );
}

function OrderList() {
  const { state, dispatch } = useApp();
  const [fStatus, setFStatus] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [linkingOrder, setLinkingOrder] = useState(null);
  const [invoicingOrder, setInvoicingOrder] = useState(null);
  const isAdmin = state.user.role==='admin';

  // Accounts visible to this user
  const myAcctIds = new Set(
    state.accounts.filter(a=>isAdmin||a.assignedRep===state.user.id).map(a=>a.id)
  );

  // CRM orders — hide Cancelled from default "All" view; show only when Cancelled tab selected
  const myOrders = state.orders
    .filter(o=>isAdmin||o.repId===state.user.id)
    .filter(o=> fStatus ? o.status===fStatus : o.status!=='Cancelled');

  // Imported sales — only show when no status filter (sales have no status)
  // Deduplicate: skip sales for account+month already covered by a CRM order
  const orderKeys = new Set(myOrders.map(o=>o.accountId+'_'+(o.createdAt||'').slice(0,7)));
  const importedRows = !fStatus
    ? state.sales
        .filter(s=>myAcctIds.has(s.accountId) && !orderKeys.has(s.accountId+'_'+s.month))
        .map(s=>({...s, _imported:true, createdAt:s.month+'-01'}))
    : [];

  const combined = [...myOrders, ...importedRows]
    .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      {editingOrder && <EditOrderModal order={editingOrder} onClose={()=>setEditingOrder(null)} />}
      {linkingOrder && <LinkOrderModal order={linkingOrder} onClose={()=>setLinkingOrder(null)} />}
      <InvoiceModal open={!!invoicingOrder} onClose={()=>setInvoicingOrder(null)} order={invoicingOrder} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">
            {myOrders.length} CRM order{myOrders.length!==1?'s':''}
            {importedRows.length>0 && <span className="ml-1 text-gray-400">+ {importedRows.length} imported</span>}
          </p>
        </div>
        <Btn onClick={()=>dispatch({type:'NAV',view:'new-order'})}><Ic n="plus" cls="w-4 h-4" /> New Order</Btn>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['', ...ORDER_STATUSES].map(s=>(
          <button key={s} onClick={()=>setFStatus(s)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-lg border transition font-medium ${fStatus===s?'bg-teal-600 border-teal-600 text-white':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
            {s||'All'}
          </button>
        ))}
      </div>
      {combined.length===0
        ? <EmptyState icon="orders" title="No orders" action={<Btn onClick={()=>dispatch({type:'NAV',view:'new-order'})}>Create Order</Btn>} />
        : <div className="space-y-2">
            {combined.map(o=>{
              if (o._imported) {
                const acc  = state.accounts.find(a=>a.id===o.accountId);
                const prod = state.products.find(p=>p.id===o.productId);
                const rep  = state.users.find(u=>u.id===o.repId);
                return (
                  <Card key={'imp_'+o.id} cls="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        {acc
                          ? <button onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:acc.id}})}
                              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition text-left">
                              {acc.name}
                            </button>
                          : <p className="text-sm font-semibold text-gray-400">Unknown account</p>
                        }
                        <p className="text-xs text-gray-500">
                          {prod?.name||'Product'} · {o.bottles} bottles{o.revenue ? ` · ${fmtCurrency(o.revenue)}` : ''}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0">
                        Imported
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{o.month}</span>
                      {rep && isAdmin && <span>Rep: {rep.name}</span>}
                    </div>
                  </Card>
                );
              }
              // CRM order row
              const acc   = state.accounts.find(a=>a.id===o.accountId);
              const prod  = state.products.find(p=>p.id===o.productId);
              const store = o.storeId==='BCLDB' ? {name:'BCLDB'} : state.stores.find(s=>s.id===o.storeId);
              const rep   = state.users.find(u=>u.id===o.repId);
              const unlinked = !acc;
              return (
                <Card key={o.id} cls="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      {unlinked
                        ? <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Unlinked</span>
                            {isAdmin && (
                              <button onClick={()=>setLinkingOrder(o)}
                                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">
                                Link Account
                              </button>
                            )}
                          </div>
                        : <p className="text-sm font-semibold text-gray-900 dark:text-white">{acc.name}</p>
                      }
                      <p className="text-xs text-gray-500">{prod?.name} · {o.bottles} bottles</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge label={o.status} />
                      {isAdmin && o.status==='Submitted' && (
                        <Btn size="sm" variant="secondary" onClick={()=>dbUpdOrder(dispatch,{...o,status:'Accepted'})}>Accept</Btn>
                      )}
                      <button onClick={()=>setInvoicingOrder(o)} title="View & Send Invoice"
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition border border-gray-200 dark:border-gray-700">
                        <Ic n="tag" cls="w-3 h-3"/>Invoice
                      </button>
                      {isAdmin && (
                        <button onClick={()=>setEditingOrder(o)} title="Edit order"
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                          <Ic n="edit" cls="w-3.5 h-3.5"/>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{store?.name}</span>
                    <span>Req. {fmtDate(o.requestedDate)}</span>
                  </div>
                  {o.notes && <p className="text-xs text-gray-500 mt-1">{o.notes}</p>}
                  {rep && isAdmin && <p className="text-xs text-gray-400 mt-0.5">Rep: {rep.name}</p>}
                </Card>
              );
            })}
          </div>
      }
    </div>
  );
}

// ─── NEW ORDER FORM ───────────────────────────────────────────────────────────
function NewOrder() {
  const { state, dispatch } = useApp();
  const prefillAcc = state.params?.accountId || '';
  const [form, setForm] = useState({ accountId:prefillAcc, productId:'', bottles:'', requestedDate:'', storeId:'', notes:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const myAccounts = state.user.role==='admin' ? state.accounts : state.accounts.filter(a=>a.assignedRep===state.user.id || !a.assignedRep);
  const selectedAcc = state.accounts.find(a=>a.id===form.accountId);
  const availableStores = form.accountId
    ? state.stores.filter(s=>s.region===selectedAcc?.region)
    : state.stores;

  function submit(e) {
    e.preventDefault();
    if(!form.accountId||!form.productId||!form.bottles||!form.storeId) return;
    const store = state.stores.find(s=>s.id===form.storeId);
    const prod  = state.products.find(p=>p.id===form.productId);
    const acc   = state.accounts.find(a=>a.id===form.accountId);
    const order = { ...form, bottles:parseInt(form.bottles), id:genId(), status:'Submitted', repId:state.user.id, createdAt:today() };
    dbAddOrder(dispatch, order);
    dispatch({ type:'UPD_ACCOUNT', payload:{...acc, lastOrder:today()} });
    showToast(dispatch,`Order submitted → ${store?.name}`,'success');
    dispatch({ type:'NAV', view: prefillAcc ? 'account-detail' : 'orders', params: prefillAcc ? {id:prefillAcc} : {} });
  }

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
      <button onClick={()=>dispatch({type:'NAV',view:prefillAcc?'account-detail':'orders',params:prefillAcc?{id:prefillAcc}:{}})}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4 transition">
        <Ic n="chevronL" cls="w-3.5 h-3.5" /> Back
      </button>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Order</h2>
      <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
        <Ic n="info" cls="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        BC licensee-to-licensee model. Orders are sent directly to the fulfillment liquor store.
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Select label="Account" value={form.accountId} onChange={v=>set('accountId',v)} required
          options={myAccounts.map(a=>({value:a.id,label:a.name}))} />
        <Select label="Product" value={form.productId} onChange={v=>set('productId',v)} required
          options={state.products.filter(p=>p.active).map(p=>({value:p.id,label:`${p.name} (${p.size})`}))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bottle Quantity" value={form.bottles} onChange={v=>set('bottles',v)} type="number" placeholder="e.g. 12" required />
          <Input label="Requested Delivery" value={form.requestedDate} onChange={v=>set('requestedDate',v)} type="date" required />
        </div>
        <Select label="Fulfillment Liquor Store" value={form.storeId} onChange={v=>set('storeId',v)} required
          options={availableStores.map(s=>({value:s.id,label:s.name}))} />
        {form.storeId && (
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
            {(() => { const s=state.stores.find(st=>st.id===form.storeId); return s ? `📧 Order will be emailed to ${s.contact} (${s.email})` : ''; })()}
          </div>
        )}
        <Input label="Notes" value={form.notes} onChange={v=>set('notes',v)} rows={2} placeholder="Any special instructions?" />
        {form.bottles && form.productId && (
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-xs text-teal-800 dark:text-teal-400">
            {form.bottles} bottles = {(parseInt(form.bottles)/12).toFixed(1)} cases (internal reference)
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Btn variant="secondary" onClick={()=>dispatch({type:'NAV',view:prefillAcc?'account-detail':'orders',params:prefillAcc?{id:prefillAcc}:{}})} cls="flex-1">Cancel</Btn>
          <Btn type="submit" cls="flex-1" disabled={!form.accountId||!form.productId||!form.bottles||!form.storeId}>Submit Order</Btn>
        </div>
      </form>
    </div>
  );
}
