// CLOUD PART 2: App shell (root component wires Supabase auth + data loading)
// All UI components (icons, cards, charts, views) are imported from the
// standard part files — only the App root changes.

// Capture hash immediately at page-load before any async work changes it
const _INITIAL_HASH = window.location.hash.slice(1); // e.g. "accounts" or "account-detail/abc123"
const _VALID_HASH_VIEWS = ['accounts','visits','orders','tastings','calendar','menu-placements',
  'reports','map','tasks','products','stores','sales-import','targets','users','regions',
  'retail-pricing','dashboard-email','cluster-ads','ad-creatives','ad-performance','licence-prospects',
  'order-promo','my-promo-orders','manage-promo','manage-promo-categories','promo-orders-admin','promo-reporting',
  'account-detail'];

// ── SET PASSWORD SCREEN (shown after clicking reset link) ──────
function SetPasswordScreen({ onDone, forced = false, userId = null }) {
  const [pass, setPass] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (pass.length < 8) return setErr('Password must be at least 8 characters.');
    if (pass !== confirm) return setErr('Passwords do not match.');
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: pass });
    if (error) { setBusy(false); return setErr(error.message); }
    if (forced && userId) {
      // Clear the admin-set "must change" flag
      await sb.from('profiles').update({ must_change_password: false }).eq('id', userId);
    }
    setBusy(false);
    setDone(true);
    setTimeout(() => {
      if (forced) onDone();                          // stay signed in, continue into the app
      else sb.auth.signOut().then(() => onDone());   // recovery-link flow: re-login with new password
    }, 1500);
  }

  const iCls = "w-full px-4 py-2.5 text-sm rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all";
  const iStyle = {background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)', color:'white'};

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      backgroundImage:'url(https://irp.cdn-website.com/4fdabf36/dms3rep/multi/CRMBG.jpg)',
      backgroundSize:'cover', backgroundPosition:'center',
    }}>
      <div style={{position:'absolute',inset:0,background:'rgba(5,10,20,0.6)'}}/>
      <div className="relative z-10 w-full max-w-sm px-6 fade-in">
        <div style={{background:'rgba(10,18,35,0.80)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:'20px',padding:'36px'}}>
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
              </div>
              <p className="text-white font-semibold text-sm mb-1">Password set!</p>
              <p className="text-slate-400 text-xs">Signing you in…</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white mb-1">{forced ? 'Set a new password' : 'Create your password'}</h2>
              <p className="text-slate-400 text-sm mb-6">{forced ? 'An admin reset your password — choose a new one to continue.' : 'Choose a password to secure your account'}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">New Password</label>
                  <input type="password" value={pass} onChange={e=>setPass(e.target.value)} required placeholder="Min. 8 characters" className={iCls} style={iStyle}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required placeholder="Repeat password" className={iCls} style={iStyle}/>
                </div>
                {err && <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{err}</p>}
                <button type="submit" disabled={busy}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#0d9488,#0f766e)',boxShadow:'0 4px 20px rgba(13,148,136,0.35)'}}>
                  {busy ? 'Saving…' : 'Set Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────
function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [recoverySession, setRecoverySession] = React.useState(null);

  // Sync URL hash → view
  useEffect(() => {
    if (state.user && state.view) {
      window.history.replaceState(null, '', '#' + state.view);
    }
  }, [state.view, state.user]);

  // Watch Supabase auth state
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_SESSION', payload: session });
      if (session) loadUserAndData(session);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link — show set-password screen, don't load the app
        setRecoverySession(session);
        return;
      }
      dispatch({ type: 'SET_SESSION', payload: session });
      if (session) {
        // Stamp last_login_at on actual sign-in (not page reload / token refresh)
        if (event === 'SIGNED_IN') {
          sb.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', session.user.id);
        }
        loadUserAndData(session);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadUserAndData(session) {
    // Load the profile row for the logged-in user
    const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
    if (profile) {
      dispatch({ type: 'SET_USER', payload: { ...mapProfile(profile), email: session.user.email } });
    } else {
      // Profile not yet created (trigger may be delayed) — use email as fallback
      dispatch({ type: 'SET_USER', payload: {
        id: session.user.id,
        name: session.user.email.split('@')[0],
        email: session.user.email,
        role: 'rep',
        region: null,
        initials: session.user.email[0].toUpperCase(),
        active: true,
      }});
    }
    await loadAllData(dispatch);
    // Navigate to hash-linked view captured at page-load time
    if (_INITIAL_HASH) {
      const [view, id] = _INITIAL_HASH.split('/');
      if (_VALID_HASH_VIEWS.includes(view)) {
        dispatch({ type: 'NAV', view, params: id ? { id } : {} });
      }
    }
  }

  async function handleSignOut() {
    await sb.auth.signOut();
    dispatch({ type: 'SET_SESSION', payload: null });
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_DATA', payload: { accounts:[], visits:[], orders:[], products:[], stores:[], tasks:[], tastings:[], sales:[], targets:[], users:[] } });
  }

  return (
    <AppCtx.Provider value={{ state, dispatch, handleSignOut,
      // Pass db helpers through context so views can call them
      db: { dbAddAccount, dbUpdAccount, dbDelAccount, dbAddVisit, dbAddOrder, dbUpdOrder,
            dbAddTask, dbUpdTask, dbDelTask, dbAddTasting, dbAddProduct,
            dbUpdProduct, dbAddStore, dbUpdStore, dbAddSales, dbSetTarget,
            dbAddMenuPlacement, dbUpdMenuPlacement } }}>
      <div className={[state.darkMode||state.neonMode?'dark':'',state.neonMode?'neon-theme':''].filter(Boolean).join(' ')} style={{height:'100vh',display:'flex',flexDirection:'column'}}>
        <div className="flex-1 flex flex-col overflow-hidden dark:bg-gray-950">
          {recoverySession
            ? <SetPasswordScreen onDone={() => setRecoverySession(null)} />
            : (state.authLoading || (state.session && !state.user))
              ? <div className="flex-1 flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 mx-auto mb-3 flex items-center justify-center">
                      <span className="text-white font-black text-lg">S</span>
                    </div>
                    <p className="text-slate-400 text-sm">Loading…</p>
                  </div>
                </div>
              : !state.session
                ? <LoginScreen />
                : state.user?.mustChangePassword
                  ? <SetPasswordScreen forced userId={state.user.id}
                      onDone={() => dispatch({ type:'SET_USER', payload: { ...state.user, mustChangePassword: false } })}/>
                  : <Layout><AppRouter /></Layout>
          }
          <Toast />
        </div>
      </div>
    </AppCtx.Provider>
  );
}

// ── UPDATED SIDEBAR: sign-out uses handleSignOut ──────────────
// (Overrides the Sidebar defined in p2b — this version calls handleSignOut)
function Sidebar({ mobile, onClose }) {
  const { state, dispatch, handleSignOut } = useApp();
  const isViewingAs = !!state.realUser;
  const isAdmin     = state.realUser?.role === 'admin' || (!isViewingAs && state.user?.role === 'admin');
  const nav = NAV_CFG[state.user?.role] || NAV_CFG.rep;
  const go  = v => { dispatch({type:'NAV',view:v}); if(mobile) onClose(); };
  const reps = (state.users||[]).filter(u=>u.role==='rep'&&u.active!==false);

  function handleViewAs(repId) {
    if (!repId) return;
    const rep = state.users.find(u=>u.id===repId);
    if (rep) dispatch({type:'VIEW_AS', payload:rep});
    if (mobile) onClose();
  }

  const GOLD = '#E4BF70';
  const SIDEBAR_BG = '#3c9ca8';

  return (
    <div className="flex flex-col h-full text-white" style={{background:SIDEBAR_BG}}>
      {/* View-as banner */}
      {isViewingAs && (
        <div className="mx-3 mt-3 mb-0 rounded-xl px-3 py-2 flex items-center gap-2" style={{background:'rgba(228,191,112,0.12)',border:'1px solid rgba(228,191,112,0.3)'}}>
          <span style={{color:GOLD,flexShrink:0}}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{color:GOLD}}>Viewing as</p>
            <p className="text-xs font-semibold truncate" style={{color:'rgba(228,191,112,0.8)'}}>{state.user?.name}</p>
          </div>
          <button onClick={()=>dispatch({type:'EXIT_VIEW_AS'})}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg transition flex-shrink-0"
            style={{color:GOLD,background:'rgba(228,191,112,0.15)'}}>
            Exit
          </button>
        </div>
      )}

      {/* Logo */}
      <div className="px-4 pt-5 pb-4" style={{borderBottom:'1px solid rgba(228,191,112,0.15)'}}>
        <img src="https://dowfjjthshbbgnvwxzjv.supabase.co/storage/v1/object/public/brand-assets/suenos-logo.png"
          alt="Suenos Tequila" style={{height:64,objectFit:'contain',objectPosition:'left'}}/>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[9px] font-bold uppercase tracking-[3px]" style={{color:'rgba(228,191,112,0.55)'}}>{isViewingAs ? 'Rep Preview' : (state.user?.role||'')}</p>
          {mobile && <button onClick={onClose} className="p-1" style={{color:'rgba(228,191,112,0.5)'}}><Ic n="x" cls="w-4 h-4"/></button>}
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
        {nav.map(sec=>(
          <div key={sec.s}>
            <p className="px-2.5 mb-1 text-[9px] font-bold uppercase tracking-[0.15em]" style={{color:'rgba(255,255,255,0.72)'}}>{sec.s}</p>
            <div className="space-y-0.5">
              {sec.items.map(it=>{
                const active = state.view===it.v;
                return (
                  <button key={it.v} onClick={()=>go(it.v)}
                    className={`sidebar-link${active?' active':''} w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left`}
                    style={active
                      ? {background:'rgba(255,255,255,0.20)',color:'#ffffff',fontWeight:600,boxShadow:'inset 3px 0 0 #ffffff'}
                      : {color:'rgba(255,255,255,0.72)'}}>
                    <Ic n={it.n} cls="w-4 h-4 flex-shrink-0"/><span className="flex-1 text-left leading-tight truncate">{it.l}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* View as Rep picker — admin only */}
      {isAdmin && !isViewingAs && reps.length > 0 && (
        <div className="px-3 pb-3 pt-3" style={{borderTop:'1px solid rgba(228,191,112,0.12)'}}>
          <p className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{color:GOLD}}>View as Rep</p>
          <select
            defaultValue=""
            onChange={e=>handleViewAs(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded-lg outline-none"
            style={{background:'rgba(228,191,112,0.08)',border:'1px solid rgba(228,191,112,0.2)',color:'rgba(255,255,255,0.75)'}}>
            <option value="" disabled>Select a rep…</option>
            {reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}

      {/* User footer */}
      <div className="px-3 py-4" style={{borderTop:'1px solid rgba(228,191,112,0.12)'}}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{background:'rgba(228,191,112,0.07)'}}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{background:GOLD,color:SIDEBAR_BG}}>
            {(isViewingAs ? state.realUser : state.user)?.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{(isViewingAs ? state.realUser : state.user)?.name}</p>
            <p className="text-[10px] truncate" style={{color:'rgba(228,191,112,0.45)'}}>{(isViewingAs ? state.realUser : state.user)?.email}</p>
          </div>
          {!isViewingAs && (
            <button onClick={handleSignOut} className="p-1.5 transition rounded-lg" style={{color:'rgba(228,191,112,0.35)'}} title="Sign out">
              <Ic n="x" cls="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── UPDATED VIEWS: use db helpers from context ─────────────────
// Wrap NewAccount, NewVisit, NewOrder etc. to call db helpers.
// The existing view components use dispatch directly for optimistic updates;
// we patch the key mutation points here by re-defining only the form submit handlers.

// Account form submit — cloud version
function AccountFormModal({ open, onClose, existing, onCreated }) {
  const { state, dispatch, db } = useApp();
  const isEdit = !!existing;
  const blank  = { name:'', type:'', region:'', assignedRep:'', address:'', lat:'', lng:'', contact:'', email:'', phone:'', website:'', status:'Prospect', notes:'', liquorLicenseName:'', licenseNumber:'', pstNumber:'', pstOverride:'' };
  const [form, setForm] = useState(isEdit ? {...existing} : blank);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus]   = useState('');
  const [forceCreate, setForceCreate] = useState(false);
  const [nameQ, setNameQ] = useState(isEdit ? existing?.name||'' : '');
  const [showGoogleSearch, setShowGoogleSearch] = useState(false);
  const nameRef        = React.useRef(null);
  const placesInputRef = React.useRef(null);
  const placesAcRef    = React.useRef(null);
  const nameDebTimer   = React.useRef(null);

  useEffect(() => {
    if (open) {
      setForm(isEdit ? {...existing} : blank);
      setNameQ(isEdit ? existing?.name||'' : '');
      setGeoStatus('');
      setForceCreate(false);
      setShowGoogleSearch(false);
      if (nameRef.current) nameRef.current.value = isEdit ? existing?.name||'' : '';
    }
  }, [open]);

  // Google Places attached ONLY to the separate search box, not the name input
  useEffect(() => {
    if (!showGoogleSearch || !placesInputRef.current) return;
    let cancelled = false;
    let attempts = 0;
    const tryInit = () => {
      if (cancelled) return;
      if (!window.google?.maps?.places) {
        attempts++;
        if (attempts > 16) { // ~5s — give up instead of freezing
          setGeoStatus('google-unavailable');
          setShowGoogleSearch(false);
          return;
        }
        setTimeout(tryInit, 300);
        return;
      }
      if (placesAcRef.current) return;
      const ac = new window.google.maps.places.Autocomplete(placesInputRef.current, {
        types: ['establishment'],
        fields: ['name','formatted_address','geometry','formatted_phone_number','website'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.name) return;
        // Fill name input (uncontrolled)
        if (nameRef.current) nameRef.current.value = place.name;
        setNameQ(place.name);
        setForm(f => ({
          ...f,
          address: place.formatted_address || f.address,
          phone:   place.formatted_phone_number || f.phone,
          website: place.website || f.website,
          lat:     place.geometry?.location ? place.geometry.location.lat().toFixed(6) : f.lat,
          lng:     place.geometry?.location ? place.geometry.location.lng().toFixed(6) : f.lng,
        }));
        setGeoStatus('ok');
        setShowGoogleSearch(false);
        document.querySelectorAll('.pac-container').forEach(el => el.remove());
        placesAcRef.current = null;
      });
      placesAcRef.current = ac;
      placesInputRef.current?.focus();
    };
    tryInit();
    return () => {
      cancelled = true;
      if (placesAcRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(placesAcRef.current);
        placesAcRef.current = null;
      }
      document.querySelectorAll('.pac-container').forEach(el => el.remove());
    };
  }, [showGoogleSearch]);

  // Duplicate detection — debounced from name input
  const normName = n => n.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
  const dupeMatches = useMemo(() => {
    if (!nameQ || nameQ.length < 3) return [];
    const q = normName(nameQ);
    return state.accounts
      .filter(a => isEdit ? a.id !== existing?.id : true)
      .map(a => {
        const an = normName(a.name);
        let level = null;
        if (an === q) level = 'exact';
        else if (an.includes(q) || q.includes(an)) level = 'contains';
        else {
          const qt = q.split(' ').filter(w=>w.length>2);
          const at = an.split(' ').filter(w=>w.length>2);
          const shared = qt.filter(w=>at.includes(w)).length;
          if (shared > 0 && shared >= Math.min(qt.length,at.length) * 0.6) level = 'similar';
        }
        return level ? { acc:a, level } : null;
      })
      .filter(Boolean)
      .sort((a,b)=>({exact:0,contains:1,similar:2}[a.level]-{exact:0,contains:1,similar:2}[b.level]));
  }, [nameQ, state.accounts]);
  const hasExact = dupeMatches.some(m=>m.level==='exact');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const reps = state.users.filter(u=>u.role==='rep'||u.role==='admin');

  async function geocode() {
    const addr = form.address?.trim();
    if (!addr) return;
    setGeoLoading(true); setGeoStatus('');
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`, { headers:{'Accept-Language':'en'} });
      const data = await res.json();
      if (data && data[0]) {
        setForm(f=>({...f, lat:parseFloat(data[0].lat).toFixed(6), lng:parseFloat(data[0].lon).toFixed(6)}));
        setGeoStatus('ok');
      } else { setGeoStatus('fail'); }
    } catch(e) { setGeoStatus('fail'); }
    setGeoLoading(false);
  }

  async function submit(e) {
    e.preventDefault();
    const finalName = (nameRef.current?.value || '').trim();
    if(!finalName||!form.type||!form.region) return;
    if (!isEdit && hasExact && !forceCreate) return; // blocked until checkbox ticked
    const formWithName = {...form, name: finalName};
    if (isEdit) {
      await db.dbUpdAccount(dispatch, formWithName);
      showToast(dispatch,'Account updated');
    } else {
      const newAcc = {...formWithName, id:genId(), menuPlacements:{}, lastVisit:null, lastOrder:null, createdAt:today()};
      await db.dbAddAccount(dispatch, newAcc);
      if (form.email) showToast(dispatch,`Account created — sell sheet sent to ${form.email}`,'info');
      else showToast(dispatch,'Account created');
      onClose();
      if (onCreated) onCreated(newAcc.id);
      return;
    }
    onClose();
  }

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={isEdit?'Edit Account':'New Account'} width="max-w-xl">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Account Name <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                ref={nameRef}
                type="text"
                defaultValue={form.name}
                onInput={e => {
                  const v = e.target.value;
                  clearTimeout(nameDebTimer.current);
                  nameDebTimer.current = setTimeout(() => setNameQ(v), 180);
                }}
                required
                placeholder="e.g. The Keg Steakhouse"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
              />
              <button type="button" onClick={()=>setShowGoogleSearch(s=>!s)}
                title="Search Google to auto-fill address & details"
                className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-all ${showGoogleSearch?'border-teal-400 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20':'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-teal-400 hover:text-teal-600'}`}>
                <Ic n="search" cls="w-3.5 h-3.5"/> Google
              </button>
            </div>
            {showGoogleSearch && (
              <div className="mt-2">
                <input
                  ref={placesInputRef}
                  type="text"
                  placeholder="Search Google for this business to auto-fill…"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-teal-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-400 mt-1">Pick a result to fill the form — or close and type manually.</p>
              </div>
            )}
            {geoStatus === 'google-unavailable' && (
              <p className="text-xs text-red-500 mt-1">⚠️ Google search didn't load — check your connection, refresh the page, and try again. You can still fill the form manually.</p>
            )}
          </div>
          {!isEdit && dupeMatches.length > 0 && (
            <div className={`sm:col-span-2 rounded-xl p-3 text-xs space-y-2 border ${hasExact ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
              <p className={`font-semibold flex items-center gap-1.5 ${hasExact ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                <Ic n="alert" cls="w-3.5 h-3.5 flex-shrink-0"/>
                {hasExact ? 'Exact match — this account already exists' : `${dupeMatches.length} similar account${dupeMatches.length>1?'s':''} found`}
              </p>
              <div className="space-y-1">
                {dupeMatches.slice(0,3).map(({acc,level})=>(
                  <div key={acc.id} className="flex items-center justify-between gap-2">
                    <span className={`${hasExact?'text-red-600 dark:text-red-300':'text-amber-700 dark:text-amber-300'}`}>{acc.name} <span className="opacity-60">· {acc.type} · {acc.region}</span></span>
                    <button type="button" onClick={()=>{ onClose(); dispatch({type:'NAV',view:'account-detail',params:{id:acc.id}}); }}
                      className={`flex-shrink-0 underline ${hasExact?'text-red-600 dark:text-red-400':'text-amber-600 dark:text-amber-400'}`}>View →</button>
                  </div>
                ))}
              </div>
              {hasExact && (
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input type="checkbox" checked={forceCreate} onChange={e=>setForceCreate(e.target.checked)}
                    className="rounded border-red-400 text-red-500 focus:ring-red-400"/>
                  <span className="text-red-700 dark:text-red-400">I understand this is a duplicate — create anyway</span>
                </label>
              )}
            </div>
          )}
          <FSelect label="Type"   value={form.type}   onChange={v=>set('type',v)}   options={ACCOUNT_TYPES}    required/>
          <FSelect label="Status" value={form.status} onChange={v=>set('status',v)} options={ACCOUNT_STATUSES} required/>
          <FSelect label="Region" value={form.region} onChange={v=>set('region',v)} options={state.regions?.length?state.regions.map(r=>r.name):REGIONS} required/>
          <FSelect label="Assigned Rep" value={form.assignedRep||''} onChange={v=>set('assignedRep',v)}
            options={reps.map(u=>({value:u.id,label:u.name}))}/>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address</label>
          <div className="flex gap-2">
            <input value={form.address||''} placeholder="123 Main St, Vancouver, BC"
              onChange={e=>{ set('address',e.target.value); setGeoStatus(''); }}
              onBlur={()=>{ if(form.address?.trim() && !form.lat) geocode(); }}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent"/>
            <button type="button" onClick={geocode} disabled={!form.address?.trim()||geoLoading}
              className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-all disabled:opacity-40 ${geoStatus==='ok'?'border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20':geoStatus==='fail'?'border-red-400 text-red-500':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-400 hover:text-teal-700'}`}>
              {geoLoading ? <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full"/> : <Ic n="pin" cls="w-3.5 h-3.5"/>}
              {geoLoading?'Locating…':geoStatus==='ok'?'Located ✓':geoStatus==='fail'?'Not found':'Locate'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FInput label="GPS Latitude"  value={form.lat||''} onChange={v=>{ set('lat',v); setGeoStatus(''); }} type="number" placeholder="49.28"/>
          <FInput label="GPS Longitude" value={form.lng||''} onChange={v=>{ set('lng',v); setGeoStatus(''); }} type="number" placeholder="-123.12"/>
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Contact</p>
        <FInput label="Liquor License Name" value={form.liquorLicenseName||''} onChange={v=>set('liquorLicenseName',v)} placeholder="Legal name as it appears on the liquor license"/>
        <FInput label="Liquor License #" value={form.licenseNumber||''} onChange={v=>set('licenseNumber',v)} placeholder="e.g. 123456"/>
        <FInput label="PST Number" value={form.pstNumber||''} onChange={v=>set('pstNumber',v)} placeholder="On file → PST exempt · blank → PST added to invoices"/>
        {state.user?.role === 'admin' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">PST Override <span className="font-normal text-gray-400">(admin)</span></label>
            <select value={form.pstOverride||''} onChange={e=>set('pstOverride', e.target.value)}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700">
              <option value="">Auto — exempt if PST # on file, otherwise charge PST</option>
              <option value="exempt">Force exempt — never charge PST</option>
              <option value="charge">Force charge — always add PST</option>
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Use "Force exempt" for an account that will be exempt but hasn't given its PST number yet.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FInput label="Contact Name" value={form.contact||''} onChange={v=>set('contact',v)}/>
          <FInput label="Phone"        value={form.phone||''}   onChange={v=>set('phone',v)} type="tel"/>
          <FInput label="Email"        value={form.email||''}   onChange={v=>set('email',v)} type="email"/>
          <FInput label="Website"      value={form.website||''} onChange={v=>set('website',v)}/>
        </div>
        <FInput label="Notes" value={form.notes||''} onChange={v=>set('notes',v)} rows={2}/>
        {!isEdit && form.email && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <Ic n="mail" cls="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
            Sell sheet will be emailed to {form.email} when you submit.
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Btn variant="secondary" onClick={onClose} cls="flex-1">Cancel</Btn>
          <Btn type="submit" cls="flex-1" disabled={!form.type||!form.region||(!isEdit&&hasExact&&!forceCreate)}>
            {isEdit ? 'Save Changes' : 'Create Account'}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
function NewAccount() {
  const { dispatch } = useApp();
  return <AccountFormModal open={true} onClose={()=>dispatch({type:'NAV',view:'accounts'})}/>;
}

// Visit submit — cloud version
function NewVisit() {
  const { state, dispatch, db } = useApp();
  const prefill = state.params?.accountId||'';
  const prefillAcc = state.accounts.find(a=>a.id===prefill);
  const [form, setForm] = useState({ accountId:prefill, date:today(), contact:prefillAcc?.contact||'', type:'Follow Up', notes:'', outcome:'', followUpDate:'', checks:{shelf:false,menu:false,display:false,samples:false,sellSheet:false} });
  const [showAddAcc, setShowAddAcc] = useState(false);
  const set      = (k,v) => setForm(f=>({...f,[k]:v}));
  const setCheck = (k,v) => setForm(f=>({...f,checks:{...f.checks,[k]:v}}));
  const myAccs   = state.user?.role==='admin' ? state.accounts : state.accounts.filter(a=>a.assignedRep===state.user?.id || !a.assignedRep || a.type?.toLowerCase()==='house');
  // Auto-fill contact when account changes
  useEffect(()=>{
    if(!form.accountId) return;
    const acc = state.accounts.find(a=>a.id===form.accountId);
    if(acc?.contact) set('contact', acc.contact);
  },[form.accountId]);

  async function submit(e) {
    e.preventDefault();
    if(!form.accountId||!form.type) return;
    const visit = {...form, id:genId(), repId:state.user.id};
    await db.dbAddVisit(dispatch, visit);
    const acc = state.accounts.find(a=>a.id===form.accountId);
    if (acc) await db.dbUpdAccount(dispatch, {...acc, lastVisit:form.date});
    showToast(dispatch,'Visit logged');
    dispatch({type:'NAV', view:prefill?'account-detail':'visits', params:prefill?{id:prefill}:{}});
  }

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
      <AccountFormModal
        open={showAddAcc}
        onClose={()=>setShowAddAcc(false)}
        onCreated={id=>{ set('accountId', id); setShowAddAcc(false); }}
      />
      <button onClick={()=>dispatch({type:'NAV',view:prefill?'account-detail':'visits',params:prefill?{id:prefill}:{}})} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4 transition">
        <Ic n="chevL" cls="w-3.5 h-3.5"/> Back
      </button>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Log a Visit</h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <FSelect label="Account" value={form.accountId} onChange={v=>set('accountId',v)} required options={myAccs.map(a=>({value:a.id,label:a.name}))}/>
            <button type="button" onClick={()=>setShowAddAcc(true)}
              className="mt-1.5 flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline">
              <Ic n="plus" cls="w-3 h-3"/> Account not listed? Add it now
            </button>
          </div>
          <FInput label="Date" value={form.date} onChange={v=>set('date',v)} type="date" required/>
          <FSelect label="Visit Type" value={form.type} onChange={v=>set('type',v)} options={VISIT_TYPES} required/>
        </div>
        <FInput label="Contact Person"       value={form.contact}       onChange={v=>set('contact',v)} placeholder="Who did you meet?"/>
        <FInput label="Notes"                value={form.notes}         onChange={v=>set('notes',v)} rows={3} placeholder="What was discussed?"/>
        <FInput label="Outcome / Next Step"  value={form.outcome}       onChange={v=>set('outcome',v)} rows={2} placeholder="What was agreed?"/>
        <FInput label="Follow-Up Date"       value={form.followUpDate}  onChange={v=>set('followUpDate',v)} type="date"/>
        <Card cls="p-4">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Checklist</p>
          <div className="grid grid-cols-2 gap-2">
            {[{k:'shelf',l:'Shelf Placement Verified'},{k:'menu',l:'Menu Placement Verified'},{k:'display',l:'Display Installed'},{k:'samples',l:'Samples Left'},{k:'sellSheet',l:'Sell Sheet Sent'}].map(item=>(
              <label key={item.k} className="flex items-center gap-2 cursor-pointer group">
                <div onClick={()=>setCheck(item.k,!form.checks[item.k])} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${form.checks[item.k]?'bg-teal-600 border-teal-600':'border-gray-300 dark:border-gray-600 group-hover:border-teal-400'}`}>
                  {form.checks[item.k] && <Ic n="check" cls="w-2.5 h-2.5 text-white"/>}
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300">{item.l}</span>
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

// Order submit — cloud version
function NewOrder() {
  const { state, dispatch, db } = useApp();
  const prefillAcc = state.params?.accountId||'';
  const PRICE_REGIONS = ['BC','AB','SK','MB','ON','QC','NB','NS','PE','NL','MX'];
  const PRICE_REGION_LABELS = {BC:'BC — British Columbia',AB:'AB — Alberta',SK:'SK — Saskatchewan',MB:'MB — Manitoba',ON:'ON — Ontario',QC:'QC — Québec',NB:'NB — New Brunswick',NS:'NS — Nova Scotia',PE:'PE — PEI',NL:'NL — Newfoundland',MX:'MX — Mexico (Export)'};

  // Try to infer province from account region text
  function inferProvince(region) {
    if (!region) return '';
    const r = region.toUpperCase();
    for (const code of PRICE_REGIONS) {
      if (r === code || r.includes(code + ' ') || r.startsWith(code)) return code;
    }
    const map = {BRITISH:' BC',ALBERTA:'AB',SASKATCHEWAN:'SK',MANITOBA:'MB',ONTARIO:'ON','QUÉBEC':'QC',QUEBEC:'QC','NEW BRUNSWICK':'NB','NOVA SCOTIA':'NS','PRINCE EDWARD':'PE',NEWFOUNDLAND:'NL',MEXICO:'MX'};
    for (const [k,v] of Object.entries(map)) { if (r.includes(k)) return v.trim(); }
    return '';
  }

  const [form, setForm] = useState({accountId:prefillAcc,productId:'',bottles:'',requestedDate:today(),storeId:'',notes:'',storeNote:'',licenseNumber:'',liquorLicenseName:'',orderedBy:'',billingEmail:'',pstNumber:'',province:''});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const tax = state.taxSettings || { enabled:true, pstRate:10, gstRate:7 };
  // Pre-select Blanco (or first product) once products load
  useEffect(()=>{
    if(!form.productId && state.products.length>0) {
      const blanco = state.products.find(p=>p.name.toLowerCase().includes('blanco')) || state.products[0];
      if(blanco) set('productId', blanco.id);
    }
  },[state.products.length]);
  // Auto-select region-matching store + pre-fill license fields when account changes
  useEffect(()=>{
    if(!form.accountId) return;
    const acc = state.accounts.find(a=>a.id===form.accountId);
    if(!acc) return;
    if(acc.region) {
      const match = state.stores.find(s=>s.region===acc.region);
      if(match) set('storeId', match.id);
      const prov = inferProvince(acc.region);
      if(prov) set('province', prov);
    }
    // Pre-populate license fields from account (user can override on the order)
    if(acc.licenseNumber)    set('licenseNumber',    acc.licenseNumber);
    if(acc.liquorLicenseName) set('liquorLicenseName', acc.liquorLicenseName);
    // Auto-fill the account's PST number if on file (rep can enter it if not)
    set('pstNumber', acc.pstNumber || '');
  },[form.accountId]);
  const myAccs = state.user?.role==='admin' ? state.accounts : state.accounts.filter(a=>a.assignedRep===state.user?.id);
  const selAcc = state.accounts.find(a=>a.id===form.accountId);
  // Show all stores; mark region-matched ones with ★ when an account is selected
  const accRegion = selAcc?.region;
  const availStores = state.stores.map(s=>({
    value: s.id,
    label: accRegion && s.region===accRegion ? `★ ${s.name}` : s.name,
  }));

  // Tax calculation — province rates from fulfillment store, fall back to global settings
  const selProd      = state.products.find(p=>p.id===form.productId);
  const selStore     = state.stores.find(s=>s.id===form.storeId);
  const provinceTax  = selStore?.province ? getProvinceTax(selStore.province, state.provinceTaxRates) : null;
  const provincePrice = form.province && selProd?.prices?.[form.province] ? parseFloat(selProd.prices[form.province]) : null;
  const unitPrice    = provincePrice ?? parseFloat(selProd?.price || 0);
  const qty          = parseInt(form.bottles) || 0;
  const subtotal     = parseFloat((unitPrice * qty).toFixed(2));
  const pstRate      = provinceTax ? provinceTax.pstRate   : (Number(tax.pstRate) || 0);
  const gstRate      = provinceTax ? provinceTax.gstRate   : ((tax.gstRate  > 0) ? tax.gstRate  : 5);
  const pstLabel     = provinceTax ? (provinceTax.pstLabel || 'PST') : 'PST';
  const gstLabel     = provinceTax ? (provinceTax.gstLabel || 'GST') : 'GST';
  // PST exemption: a PST number (entered here or on file) — or an admin override
  // on the account — exempts PST, matching the final invoice logic.
  const orderPstNumber = (form.pstNumber || selAcc?.pstNumber || '').trim();
  const pstOverride    = (selAcc?.pstOverride || '').trim();
  const pstExempt      = pstOverride === 'exempt' ? true : pstOverride === 'charge' ? false : !!orderPstNumber;
  const pstAmt       = (tax.enabled && !pstExempt) ? parseFloat((subtotal * pstRate / 100).toFixed(2)) : 0;
  const gstAmt       = tax.enabled ? parseFloat((subtotal * gstRate / 100).toFixed(2)) : 0;
  const total        = parseFloat((subtotal + pstAmt + gstAmt).toFixed(2));
  const hasTax       = tax.enabled && unitPrice > 0 && qty > 0;

  async function submit(e) {
    e.preventDefault();
    if(!form.accountId||!form.productId||!form.bottles||!form.storeId) return;
    const order = {...form, bottles:parseInt(form.bottles), id:genId(), status:'Submitted', repId:state.user.id, createdAt:today(),
      subtotal, pstAmount:pstAmt, gstAmount:gstAmt, total };
    const store = state.stores.find(s=>s.id===form.storeId);
    const acc   = state.accounts.find(a=>a.id===form.accountId);
    await db.dbAddOrder(dispatch, order);
    if (acc) {
      // Write license fields back to account if the rep entered/updated them on the order
      const accUpdates = { ...acc, lastOrder: today() };
      if (form.licenseNumber    && form.licenseNumber    !== acc.licenseNumber)    accUpdates.licenseNumber    = form.licenseNumber;
      if (form.liquorLicenseName && form.liquorLicenseName !== acc.liquorLicenseName) accUpdates.liquorLicenseName = form.liquorLicenseName;
      // Save the PST number back to the account if the rep entered/changed it on the order
      const pstEntered = (form.pstNumber||'').trim();
      const savePst    = pstEntered && pstEntered !== (acc.pstNumber||'').trim();
      if (savePst) accUpdates.pstNumber = pstEntered;
      await db.dbUpdAccount(dispatch, accUpdates);
      if (savePst) showToast(dispatch, 'PST number saved to '+(acc.name||'account'));
    }

    // Send invoice to fulfillment store + rep via EMAILJS_INVOICE_TEMPLATE_ID
    try {
      if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY'
          && EMAILJS_INVOICE_TEMPLATE_ID && EMAILJS_INVOICE_TEMPLATE_ID !== 'YOUR_EMAILJS_INVOICE_TEMPLATE_ID') {
        const rep       = state.users.find(u=>u.id===state.user.id);
        const prod      = state.products.find(p=>p.id===form.productId);
        const repEmail  = rep?.email || state.session?.user?.email || '';
        const storeEmail = store?.email || '';
        const accEmail  = acc?.email || '';
        const billEmail = form.billingEmail || '';
        const toEmails  = [...new Set([storeEmail, repEmail, ORDER_ADMIN_EMAIL, accEmail, billEmail].filter(e=>e&&e.includes('@')))].join(',');
        const invoiceNum  = order.id.replace(/-/g,'').slice(0,8).toUpperCase();
        const invoiceDate = order.createdAt || order.requestedDate || '';
        const footer      = state.invoiceFooter || '';
        const invoiceHtml = buildInvoiceHTML({ invoiceNum, invoiceDate, acc, prod, store, tax,
          footer, order, unitPrice, subtotal, pstAmt, gstAmt, total,
          pstRate, gstRate, pstLabel, gstLabel });
        emailjs.init(EMAILJS_PUBLIC_KEY);
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_INVOICE_TEMPLATE_ID, {
          email:              toEmails,
          to_name:            store?.name || 'Fulfillment Store',
          invoice_number:     invoiceNum,
          invoice_date:       invoiceDate,
          bill_to_name:       acc?.liquorLicenseName || acc?.name || '',
          bill_to_trade_name: acc?.name || '',
          bill_to_address:    [acc?.address, acc?.city, acc?.region].filter(Boolean).join(', '),
          bill_to_license:    form.licenseNumber || acc?.licenseNumber || '',
          bill_to_pst:        order.pstNumber || '',
          store_note:         form.storeNote || '',
          store_name:         store?.name || '',
          store_address:      store?.address || '',
          store_license:      store?.licenseNumber || '',
          store_gst:          store?.gstNumber || '',
          product_name:       prod ? `${prod.name} (${prod.size})` : '',
          quantity:           String(order.bottles || 0),
          unit_price:         '$' + unitPrice.toFixed(2),
          subtotal:           '$' + subtotal.toFixed(2),
          pst_rate:           String(pstRate),
          pst_amount:         '$' + pstAmt.toFixed(2),
          gst_rate:           String(gstRate),
          gst_amount:         '$' + gstAmt.toFixed(2),
          total:              '$' + total.toFixed(2),
          invoice_footer:     footer,
          invoice_html:       invoiceHtml,
        });
        showToast(dispatch, `Order submitted — invoice sent to ${store?.name||'store'}!`);
      } else {
        showToast(dispatch, `Order submitted to ${store?.name||'store'}`);
      }
    } catch(emailErr) {
      console.error('Email notification failed:', emailErr);
      showToast(dispatch, `Order submitted (email to store failed — resend from Orders)`);
    }

    setInvoiceOrder(order);
  }

  function closeInvoiceAndNav() {
    setInvoiceOrder(null);
    dispatch({type:'NAV', view:prefillAcc?'account-detail':'orders', params:prefillAcc?{id:prefillAcc}:{}});
  }

  return (
    <>
    <InvoiceModal open={!!invoiceOrder} onClose={closeInvoiceAndNav} order={invoiceOrder} />
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
      <button onClick={()=>dispatch({type:'NAV',view:prefillAcc?'account-detail':'orders',params:prefillAcc?{id:prefillAcc}:{}})} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4 transition">
        <Ic n="chevL" cls="w-3.5 h-3.5"/> Back
      </button>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Order</h2>
      <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
        <Ic n="info" cls="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>BC licensee-to-licensee model. Order routed directly to the fulfillment store.
      </div>
      <form onSubmit={submit} className="space-y-4">
        <FSelect label="Account" value={form.accountId} onChange={v=>set('accountId',v)} required options={myAccs.map(a=>({value:a.id,label:a.name}))}/>
        <FSelect label="Product" value={form.productId} onChange={v=>set('productId',v)} required options={state.products.filter(p=>p.active).map(p=>({value:p.id,label:`${p.name} (${p.size})`}))}/>
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Bottle Quantity"    value={form.bottles}       onChange={v=>set('bottles',v)} type="number" placeholder="12" required/>
          <FInput label="Requested Delivery" value={form.requestedDate} onChange={v=>set('requestedDate',v)} type="date" required/>
        </div>
        {/* Province / pricing region */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Pricing Province / Region <span className="text-gray-400 font-normal">(determines product price)</span>
          </label>
          <select value={form.province} onChange={e=>set('province',e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none">
            <option value="">— Select province —</option>
            {PRICE_REGIONS.map(r=>{
              const hasPrice = selProd?.prices?.[r];
              return <option key={r} value={r}>{PRICE_REGION_LABELS[r]}{hasPrice ? ` · $${parseFloat(selProd.prices[r]).toFixed(2)}` : ''}</option>;
            })}
          </select>
          {form.province && selProd && (
            <p className="text-xs text-gray-400 mt-1">
              {provincePrice !== null
                ? <span className="text-teal-600 dark:text-teal-400">Using {form.province} price: ${provincePrice.toFixed(2)}/bottle</span>
                : <span>No {form.province} price set — using default ${parseFloat(selProd.price||0).toFixed(2)}/bottle</span>}
            </p>
          )}
        </div>
        <FSelect label="Fulfillment Store" value={form.storeId} onChange={v=>set('storeId',v)} required options={availStores}/>
        {form.storeId && (
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
            {(() => { const s=state.stores.find(st=>st.id===form.storeId); return s ? `Order will be sent to ${s.contact} at ${s.email}` : ''; })()}
          </div>
        )}
        <FInput label="Liquor License Name" value={form.liquorLicenseName} onChange={v=>set('liquorLicenseName',v)} placeholder="Legal name on the liquor license"/>
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Liquor License #" value={form.licenseNumber} onChange={v=>set('licenseNumber',v)} placeholder="e.g. 123456"/>
          <FInput label="Ordered By"       value={form.orderedBy}     onChange={v=>set('orderedBy',v)}     placeholder="Buyer / manager name"/>
        </div>
        {tax.enabled && (
          <div>
            <FInput label="PST Number" value={form.pstNumber} onChange={v=>set('pstNumber',v)} placeholder="e.g. PST-1234-5678"/>
            {selAcc && (selAcc.pstNumber
              ? <p className="text-[11px] text-gray-400 mt-1">Auto-filled from {selAcc.name}'s account.</p>
              : <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">No PST # on file for this account — enter it and it'll be saved to the account.</p>)}
          </div>
        )}
        <FInput label="Billing Email" value={form.billingEmail} onChange={v=>set('billingEmail',v)} placeholder="billing@store.com" type="email"/>
        <FInput label="Notes" value={form.notes} onChange={v=>set('notes',v)} rows={2}/>
        <FInput label="Note to store (in the order email — not on the invoice)" value={form.storeNote} onChange={v=>set('storeNote',v)} rows={2} placeholder="e.g. Hold for pickup Friday · call before delivery"/>
        {form.bottles && <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-xs text-teal-800 dark:text-teal-400">{form.bottles} bottles = {(parseInt(form.bottles)/12).toFixed(1)} cases</div>}
        {/* Invoice / Order Summary */}
        {hasTax && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Preview</div>
            {/* Bill-to block */}
            {selAcc && (
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {form.liquorLicenseName || selAcc.liquorLicenseName || selAcc.name}
                </p>
                {(form.liquorLicenseName || selAcc.liquorLicenseName) && (form.liquorLicenseName||selAcc.liquorLicenseName) !== selAcc.name && (
                  <p className="text-gray-400">({selAcc.name})</p>
                )}
                {selAcc.address && <p>{selAcc.address}</p>}
                {form.licenseNumber && <p>License #: {form.licenseNumber}</p>}
                {form.pstNumber && <p>PST #: {form.pstNumber}</p>}
              </div>
            )}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <div className="flex justify-between px-4 py-2 text-gray-700 dark:text-gray-300">
                <span>{selProd?.name} × {qty} bottles</span><span>${subtotal.toFixed(2)}</span>
              </div>
              {pstRate > 0 && (
                <div className="flex justify-between px-4 py-1.5 text-gray-500 dark:text-gray-400 text-xs">
                  <span>{pstLabel} ({pstRate}%)</span><span>${pstAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-1.5 text-gray-500 dark:text-gray-400 text-xs">
                <span>{gstLabel} ({gstRate}%)</span><span>${gstAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Btn variant="secondary" onClick={()=>dispatch({type:'NAV',view:prefillAcc?'account-detail':'orders',params:prefillAcc?{id:prefillAcc}:{}})} cls="flex-1">Cancel</Btn>
          <Btn type="submit" cls="flex-1" disabled={!form.accountId||!form.productId||!form.bottles||!form.storeId}>Submit Order</Btn>
        </div>
      </form>
    </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
