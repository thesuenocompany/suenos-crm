// ─── VOICE VISIT LOGGER ───────────────────────────────────────────────────────
// A rep taps the mic and speaks a natural note ("Stopped at The Cobblestone
// Liquor Store, all good, reordering next week"). The browser transcribes it,
// Claude turns it into a structured visit (matched to a real account), and the
// rep confirms before it saves. Uses the same browser-side Anthropic key as the
// ad-copy generator — no new backend.

async function parseVisitFromSpeech(transcript, accounts) {
  const key = localStorage.getItem('anthropic_api_key') || '';
  if (!key) throw new Error('No Anthropic API key set — an admin can add it in Settings → API Credentials.');

  const acctLines = accounts.slice(0, 700).map(a =>
    `${a.id}\t${a.name}${a.city ? ' · ' + a.city : ''}${a.region ? ' · ' + a.region : ''}`
  ).join('\n');
  const todayStr = new Date().toISOString().slice(0, 10);

  const system = `You extract structured sales-visit data from a Sueños Tequila rep's spoken note. Match the business the rep mentions to exactly ONE account from the provided list (fuzzy match on name — ignore filler words like "the", "liquor", "store", "bar"). If nothing clearly matches, leave accountId empty. Return ONLY raw JSON, no markdown.`;

  const user = `Today is ${todayStr}.

Rep's spoken note:
"""${transcript}"""

Accounts (id <tab> name · city · region):
${acctLines}

Return ONLY this JSON object:
{"accountId":"<best-match id, or empty string>","accountName":"<matched account name, or the business you heard>","type":"<one of: Drop-in, Follow Up, Meeting, Phone Call, Tasting, Delivery>","outcome":"<short result phrase, e.g. 'All good, reorder next week'>","notes":"<cleaned first-person summary of what the rep said>","followUpDate":"<YYYY-MM-DD if a follow-up time is implied (e.g. 'next week' = 7 days from today), else empty>","contact":"<person's name if mentioned, else empty>"}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Anthropic ${res.status}: ${t.slice(0, 160)}`); }
  const data = await res.json();
  const raw = (data.content?.[0]?.text || '{}').trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  let p = {};
  try { p = JSON.parse(raw); } catch { p = { notes: transcript }; }
  return {
    accountId:    p.accountId || '',
    accountName:  p.accountName || '',
    type:         p.type || 'Drop-in',
    outcome:      p.outcome || '',
    notes:        p.notes || transcript,
    followUpDate: /^\d{4}-\d{2}-\d{2}$/.test(p.followUpDate || '') ? p.followUpDate : '',
    contact:      p.contact || '',
  };
}

function VoiceVisitModal({ onClose }) {
  const { state, dispatch, db } = useApp();
  const isAdmin = state.user?.role === 'admin';
  const myAccs = isAdmin
    ? state.accounts
    : state.accounts.filter(a => a.assignedRep === state.user?.id || !a.assignedRep || a.type?.toLowerCase() === 'house');
  const sortedAccs = [...myAccs].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const SR = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const recRef = React.useRef(null);
  const wantRef = React.useRef(false);      // true while the user still wants to listen
  const finalRef = React.useRef('');        // accumulated final transcript
  const [listening, setListening] = React.useState(false);
  const [micError, setMicError] = React.useState('');
  const [transcript, setTranscript] = React.useState('');
  const [stage, setStage] = React.useState('capture');   // capture | review
  const [parsing, setParsing] = React.useState(false);
  const [form, setForm] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => () => { wantRef.current = false; try { recRef.current && recRef.current.stop(); } catch (e) {} }, []);

  const buildRec = () => {
    const rec = new SR();
    rec.lang = 'en-CA'; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + ' '; else interim += t;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      const code = e && e.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        wantRef.current = false; setListening(false);
        setMicError('Microphone access is blocked. Allow mic access for this site in your browser, then try again — or just type the note below.');
      } else if (code === 'network') {
        setMicError('Network issue reaching the speech service — check your connection, or type the note below.');
      } else if (code && code !== 'no-speech' && code !== 'aborted') {
        setMicError('Voice error (' + code + '). You can type the note instead.');
      }
      // 'no-speech' / 'aborted' are ignored — onend will restart if still wanted.
    };
    rec.onend = () => {
      // Mobile ends recognition on every pause — restart while the user is still listening.
      if (wantRef.current) {
        try { rec.start(); } catch (e) { setTimeout(() => { try { wantRef.current && rec.start(); } catch (e2) {} }, 300); }
      } else {
        setListening(false);
      }
    };
    return rec;
  };

  const startListen = async () => {
    if (!SR) return;
    setMicError('');
    // Proactively trigger the mic permission prompt (this is what desktop was missing).
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach(t => t.stop());
      }
    } catch (e) {
      setMicError('Microphone access was denied. Allow it for this site in your browser, or type your note below.');
      return;
    }
    try {
      finalRef.current = transcript ? transcript + ' ' : '';
      recRef.current = buildRec();
      wantRef.current = true;
      recRef.current.start();
      setListening(true);
    } catch (e) { setListening(false); setMicError('Could not start the mic — type your note instead.'); }
  };

  const stopListen = () => {
    wantRef.current = false;
    try { recRef.current && recRef.current.stop(); } catch (e) {}
    try { recRef.current && recRef.current.abort && recRef.current.abort(); } catch (e) {}
    setListening(false);
  };

  const parse = async () => {
    if (!transcript.trim()) { showToast(dispatch, 'Say or type something first', 'error'); return; }
    stopListen(); setParsing(true);
    try {
      const r = await parseVisitFromSpeech(transcript.trim(), sortedAccs);
      setForm({ accountId: r.accountId, date: today(), contact: r.contact, type: r.type, outcome: r.outcome, notes: r.notes, followUpDate: r.followUpDate, _heard: r.accountName });
      setStage('review');
    } catch (e) { showToast(dispatch, 'Could not read that: ' + (e.message || e), 'error'); }
    setParsing(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.accountId) { showToast(dispatch, 'Pick which account this was', 'error'); return; }
    setBusy(true);
    try {
      const visit = { id: genId(), accountId: form.accountId, date: form.date || today(), contact: form.contact || '', type: form.type || 'Drop-in', outcome: form.outcome || '', notes: form.notes || '', followUpDate: form.followUpDate || '', repId: state.user.id, checks: {} };
      await db.dbAddVisit(dispatch, visit);
      const acc = state.accounts.find(a => a.id === form.accountId);
      if (acc) await db.dbUpdAccount(dispatch, { ...acc, lastVisit: visit.date });
      showToast(dispatch, 'Visit logged 🎤');
      onClose();
    } catch (e) { showToast(dispatch, 'Save failed: ' + (e.message || e), 'error'); }
    setBusy(false);
  };

  const inp = 'w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700';
  const VISIT_TYPES = ['Drop-in', 'Follow Up', 'Meeting', 'Phone Call', 'Tasting', 'Delivery'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">🎤 Log a visit by voice</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        {stage === 'capture' && (
          <>
            <p className="text-xs text-gray-500">Tap the mic and just talk — e.g. “Stopped at The Cobblestone Liquor Store, they were all good, planning to reorder next week.” We’ll turn it into a visit for you to confirm.</p>
            <div className="flex flex-col items-center gap-3 py-2">
              {SR ? (
                <button onClick={listening ? stopListen : startListen}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow transition ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                  {listening ? '■' : '🎤'}
                </button>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center">Voice input isn’t supported in this browser — type your note below and it still works.</p>
              )}
              {SR && listening
                ? <button onClick={stopListen} className="text-sm font-semibold text-red-600 border border-red-300 dark:border-red-800 rounded-lg px-5 py-2 hover:bg-red-50 dark:hover:bg-red-900/20">■ Stop listening</button>
                : <p className="text-[11px] text-gray-400">{SR ? 'Tap the mic to start talking' : ''}</p>}
              {micError && <p className="text-xs text-amber-600 dark:text-amber-400 text-center max-w-xs">{micError}</p>}
            </div>
            <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={4}
              placeholder="Your spoken note appears here — you can also just type it." className={inp} />
            <div className="flex items-center gap-2">
              <button disabled={parsing || !transcript.trim()} onClick={parse}
                className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-5 py-2 disabled:opacity-40">{parsing ? 'Reading…' : 'Create visit from this →'}</button>
              <div className="flex-1" />
              <button onClick={onClose} className="text-sm text-gray-500">Cancel</button>
            </div>
          </>
        )}

        {stage === 'review' && form && (
          <>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 p-2.5 text-[11px] text-gray-500 italic">“{transcript}”</div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Account {!form.accountId && <span className="text-amber-600 dark:text-amber-400">— couldn’t match “{form._heard}”, pick it</span>}
              </label>
              <select value={form.accountId} onChange={e => set('accountId', e.target.value)} className={inp}>
                <option value="">— Select account —</option>
                {sortedAccs.map(a => <option key={a.id} value={a.id}>{a.name}{a.city ? ` · ${a.city}` : ''}</option>)}
              </select>
              {form.accountId && form._heard && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">✓ Matched “{form._heard}” → {sortedAccs.find(a => a.id === form.accountId)?.name}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} className={inp}>{VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inp} /></div>
            </div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Outcome</label>
              <input value={form.outcome} onChange={e => set('outcome', e.target.value)} className={inp} /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inp} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Follow-up date</label>
                <input type="date" value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Contact</label>
                <input value={form.contact} onChange={e => set('contact', e.target.value)} className={inp} /></div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button disabled={busy} onClick={save} className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-5 py-2 disabled:opacity-40">Save visit</button>
              <button onClick={() => setStage('capture')} className="text-sm text-gray-500">← Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VoiceVisitButton({ className }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className={className || 'flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700'}>
        🎤 Voice
      </button>
      {open && <VoiceVisitModal onClose={() => setOpen(false)} />}
    </>
  );
}
