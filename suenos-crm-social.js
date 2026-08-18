// ─── SOCIAL (META) VIEW ───────────────────────────────────────────────────────
// Admin-only. Publish organic posts to Facebook + Instagram (now or scheduled),
// upload images, review recent posts' reactions/comments with inline reply, and
// manage scheduled posts on a calendar. Backed by meta-publish + scheduled_posts.

const SOCIAL_BUCKET = 'social-uploads';

function socialToLocalInput(iso) {
  const d = new Date(iso); const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function SocialCommentsPanel({ source, id }) {
  const { dispatch } = useApp();
  const [comments, setComments] = React.useState([]);
  const [err, setErr]         = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [replyFor, setReplyFor]   = React.useState(null);
  const [replyText, setReplyText] = React.useState('');
  const [posting, setPosting]     = React.useState(false);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const { data, error } = await sb.functions.invoke('meta-publish', { body:{ action:'comments', source, id } });
      if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Load failed');
      setComments(data.comments || []);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  };
  React.useEffect(() => { load(); }, [source, id]);

  const sendReply = async (targetId) => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      const { data, error } = await sb.functions.invoke('meta-publish', { body:{ action:'reply', source, targetId, message: replyText.trim() } });
      if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Reply failed');
      showToast(dispatch, 'Reply posted');
      setReplyText(''); setReplyFor(null);
      await load();
    } catch (e) { showToast(dispatch, 'Reply failed: '+(e.message||e), 'error'); }
    setPosting(false);
  };

  if (loading) return <p className="text-xs text-gray-500 py-2">Loading comments…</p>;
  if (err)     return <p className="text-xs text-red-600 dark:text-red-400 py-2">{err}</p>;
  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
      {comments.length===0 && <p className="text-xs text-gray-500">No comments yet.</p>}
      {comments.map(c => (
        <div key={c.id} className="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
          <p className="text-[11px] text-gray-500">{c.from}{c.createdTime ? ' · '+new Date(c.createdTime).toLocaleDateString() : ''}{c.likeCount ? ` · 👍 ${c.likeCount}` : ''}</p>
          <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{c.message || '(no text)'}</p>
          {replyFor===c.id ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <input value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Write a reply…"
                className="flex-1 min-w-[140px] text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700" />
              <button disabled={posting} onClick={()=>sendReply(c.id)} className="text-xs font-semibold text-white bg-teal-600 rounded px-3 py-1 disabled:opacity-50">{posting?'…':'Reply'}</button>
              <button onClick={()=>{setReplyFor(null);setReplyText('');}} className="text-xs text-gray-500">Cancel</button>
            </div>
          ) : (
            <button onClick={()=>{setReplyFor(c.id);setReplyText('');}} className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline mt-1">Reply</button>
          )}
        </div>
      ))}
      <button onClick={load} className="text-[11px] text-gray-500 underline">Refresh comments</button>
    </div>
  );
}

// Shared composer used for both "post now" and "schedule".
function SocialComposer({ cfg, onPublished, onScheduled }) {
  const { state, dispatch } = useApp();
  const [caption, setCaption]   = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [toFb, setToFb] = React.useState(true);
  const [toIg, setToIg] = React.useState(false);
  const [mode, setMode] = React.useState('now'); // 'now' | 'schedule'
  const [when, setWhen] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef(null);

  const igOff = cfg && !cfg.igConnected;
  const minWhen = socialToLocalInput(new Date(Date.now() + 60000));

  const uploadFile = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { showToast(dispatch, 'Please choose an image file', 'error'); return; }
    setUploading(true);
    try {
      const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${state.user.id}/${Date.now()}-${clean}`;
      const { error } = await sb.storage.from(SOCIAL_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = sb.storage.from(SOCIAL_BUCKET).getPublicUrl(path);
      setImageUrl(data.publicUrl);
      showToast(dispatch, 'Image uploaded');
    } catch (e) { showToast(dispatch, 'Upload failed: '+(e.message||e), 'error'); }
    setUploading(false);
  };

  const channels = () => { const c=[]; if(toFb)c.push('facebook'); if(toIg)c.push('instagram'); return c; };
  const validate = () => {
    const ch = channels();
    if (!ch.length) { showToast(dispatch, 'Pick at least one channel', 'error'); return null; }
    if (!caption.trim() && !imageUrl.trim()) { showToast(dispatch, 'Add a caption or an image', 'error'); return null; }
    if (toIg && !imageUrl.trim()) { showToast(dispatch, 'Instagram needs an image', 'error'); return null; }
    return ch;
  };
  const reset = () => { setCaption(''); setImageUrl(''); setWhen(''); if (fileRef.current) fileRef.current.value=''; };

  const publishNow = async () => {
    const ch = validate(); if (!ch) return;
    setBusy(true);
    try {
      const { data, error } = await sb.functions.invoke('meta-publish', { body:{ action:'publish', channels: ch, message: caption.trim(), imageUrl: imageUrl.trim() } });
      if (error && !data) throw new Error(error.message || 'Publish failed');
      const results = (data && data.results) || [];
      const ok = results.filter(r=>r.ok).map(r=>r.channel);
      results.filter(r=>!r.ok).forEach(b => showToast(dispatch, `${b.channel}: ${b.error}`, 'error'));
      if (data && data.error && !results.length) showToast(dispatch, data.error, 'error');
      if (ok.length) { showToast(dispatch, 'Posted to '+ok.join(' & ')); reset(); onPublished && onPublished(); }
    } catch (e) { showToast(dispatch, 'Publish failed: '+(e.message||e), 'error'); }
    setBusy(false);
  };

  const schedule = async () => {
    const ch = validate(); if (!ch) return;
    if (!when) { showToast(dispatch, 'Pick a date & time', 'error'); return; }
    const at = new Date(when);
    if (isNaN(at.getTime()) || at.getTime() < Date.now() + 30000) { showToast(dispatch, 'Pick a time in the future', 'error'); return; }
    setBusy(true);
    try {
      const { error } = await sb.from('scheduled_posts').insert({
        created_by: state.user.id, channels: ch, message: caption.trim(),
        image_url: imageUrl.trim(), scheduled_at: at.toISOString(), status: 'pending',
      });
      if (error) throw error;
      showToast(dispatch, 'Scheduled for '+at.toLocaleString());
      reset(); onScheduled && onScheduled();
    } catch (e) { showToast(dispatch, 'Could not schedule: '+(e.message||e), 'error'); }
    setBusy(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200">New post</h2>
      <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={4} placeholder="Write your caption…"
        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />

      {/* Image: upload or paste URL */}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" onChange={e=>uploadFile(e.target.files && e.target.files[0])} className="hidden" />
        <button type="button" onClick={()=>fileRef.current && fileRef.current.click()} disabled={uploading}
          className="text-xs font-semibold border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
          {uploading ? 'Uploading…' : '📷 Upload image'}
        </button>
        <span className="text-[11px] text-gray-400">or</span>
        <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="paste a public https:// image URL"
          className="flex-1 min-w-[180px] text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
        {imageUrl && <button onClick={()=>{setImageUrl(''); if(fileRef.current)fileRef.current.value='';}} className="text-[11px] text-gray-500 underline">clear</button>}
      </div>
      {imageUrl.trim() && /^https:\/\//i.test(imageUrl.trim()) && (
        <img src={imageUrl.trim()} alt="preview" className="max-h-40 rounded-lg border border-gray-200 dark:border-gray-700" onError={e=>{e.target.style.display='none';}} />
      )}

      {/* Channels */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={toFb} onChange={e=>setToFb(e.target.checked)} /> Facebook
        </label>
        <label className={`flex items-center gap-2 text-sm ${igOff ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
          <input type="checkbox" checked={toIg} disabled={igOff} onChange={e=>setToIg(e.target.checked)} /> Instagram
        </label>
      </div>

      {/* Timing */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
          <button onClick={()=>setMode('now')}      className={`px-3 py-1.5 ${mode==='now' ? 'bg-teal-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>Post now</button>
          <button onClick={()=>setMode('schedule')} className={`px-3 py-1.5 ${mode==='schedule' ? 'bg-teal-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>Schedule</button>
        </div>
        {mode==='schedule' && (
          <input type="datetime-local" value={when} min={minWhen} onChange={e=>setWhen(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700" />
        )}
        <div className="flex-1" />
        {mode==='now'
          ? <button disabled={busy} onClick={publishNow} className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-5 py-2 disabled:opacity-40">{busy?'Publishing…':'Publish'}</button>
          : <button disabled={busy} onClick={schedule}   className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-5 py-2 disabled:opacity-40">{busy?'Scheduling…':'Schedule'}</button>}
      </div>
      <p className="text-[11px] text-gray-400">Instagram requires an image and only Business/Creator accounts can publish (≈25/day). Facebook accepts text-only or image posts.</p>
    </div>
  );
}

function ScheduledPostModal({ post, cfg, onClose, onChanged }) {
  const { dispatch } = useApp();
  const editable = post.status === 'pending';
  const [message, setMessage]   = React.useState(post.message || '');
  const [imageUrl, setImageUrl] = React.useState(post.image_url || '');
  const [when, setWhen]         = React.useState(socialToLocalInput(post.scheduled_at));
  const [busy, setBusy]         = React.useState(false);
  const minWhen = socialToLocalInput(new Date(Date.now() + 60000));

  const save = async () => {
    const at = new Date(when);
    if (isNaN(at.getTime()) || at.getTime() < Date.now() + 30000) { showToast(dispatch, 'Pick a future time', 'error'); return; }
    if (!message.trim() && !imageUrl.trim()) { showToast(dispatch, 'Add a caption or image', 'error'); return; }
    if ((post.channels||[]).includes('instagram') && !imageUrl.trim()) { showToast(dispatch, 'Instagram needs an image', 'error'); return; }
    setBusy(true);
    try {
      const { error } = await sb.from('scheduled_posts').update({
        message: message.trim(), image_url: imageUrl.trim(), scheduled_at: at.toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', post.id).eq('status', 'pending');
      if (error) throw error;
      showToast(dispatch, 'Updated'); onChanged && onChanged(); onClose();
    } catch (e) { showToast(dispatch, 'Update failed: '+(e.message||e), 'error'); }
    setBusy(false);
  };

  const cancelPost = async () => {
    setBusy(true);
    try {
      const { error } = await sb.from('scheduled_posts').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('id', post.id).eq('status', 'pending');
      if (error) throw error;
      showToast(dispatch, 'Scheduled post canceled'); onChanged && onChanged(); onClose();
    } catch (e) { showToast(dispatch, 'Cancel failed: '+(e.message||e), 'error'); }
    setBusy(false);
  };

  const statusColor = { pending:'text-amber-600', published:'text-green-600', failed:'text-red-600', canceled:'text-gray-400', publishing:'text-blue-600' }[post.status] || 'text-gray-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg p-5 space-y-3" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Scheduled post</h3>
          <span className={`text-xs font-bold uppercase ${statusColor}`}>{post.status}</span>
        </div>
        <p className="text-xs text-gray-500">
          {(post.channels||[]).map(c=>c==='instagram'?'Instagram':'Facebook').join(' + ')} · {new Date(post.scheduled_at).toLocaleString()}
        </p>

        {editable ? (
          <>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="Image URL"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            <label className="block text-xs text-gray-500">Publish at
              <input type="datetime-local" value={when} min={minWhen} onChange={e=>setWhen(e.target.value)}
                className="mt-1 block text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700" />
            </label>
            <div className="flex items-center gap-2 pt-2">
              <button disabled={busy} onClick={save} className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-4 py-2 disabled:opacity-40">Save changes</button>
              <button disabled={busy} onClick={cancelPost} className="text-sm font-semibold text-red-600 border border-red-300 dark:border-red-800 rounded-lg px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20">Cancel post</button>
              <div className="flex-1" />
              <button onClick={onClose} className="text-sm text-gray-500">Close</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{post.message || '(no caption)'}</p>
            {post.image_url && <img src={post.image_url} alt="" className="max-h-40 rounded-lg border border-gray-200 dark:border-gray-700" onError={e=>{e.target.style.display='none';}} />}
            {post.error && <p className="text-xs text-red-600">{post.error}</p>}
            {Array.isArray(post.results) && post.results.map((r,i)=>(
              <p key={i} className="text-[11px] text-gray-500">{r.channel}: {r.ok ? 'published ✓' : ('failed — '+(r.error||''))}</p>
            ))}
            <div className="flex justify-end pt-2"><button onClick={onClose} className="text-sm text-gray-500">Close</button></div>
          </>
        )}
      </div>
    </div>
  );
}

function ScheduledCalendar({ cfg }) {
  const now = new Date();
  const [cursor, setCursor] = React.useState({ y: now.getFullYear(), m: now.getMonth() });
  const [posts, setPosts]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr]       = React.useState('');
  const [selected, setSelected] = React.useState(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const start = new Date(cursor.y, cursor.m, 1);
      const end   = new Date(cursor.y, cursor.m + 1, 1);
      const { data, error } = await sb.from('scheduled_posts')
        .select('*')
        .gte('scheduled_at', start.toISOString())
        .lt('scheduled_at', end.toISOString())
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      setPosts(data || []);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  };
  React.useEffect(() => { load(); }, [cursor.y, cursor.m]);

  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const firstDow  = new Date(cursor.y, cursor.m, 1).getDay();
  const daysIn    = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const byDay = {};
  posts.forEach(p => { const d = new Date(p.scheduled_at).getDate(); (byDay[d] = byDay[d] || []).push(p); });

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  const isToday = d => d && cursor.y===now.getFullYear() && cursor.m===now.getMonth() && d===now.getDate();
  const dot = st => ({ pending:'bg-amber-500', published:'bg-green-500', failed:'bg-red-500', canceled:'bg-gray-400', publishing:'bg-blue-500' }[st] || 'bg-gray-400');

  const shift = n => setCursor(c => { const dt = new Date(c.y, c.m + n, 1); return { y: dt.getFullYear(), m: dt.getMonth() }; });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={()=>shift(-1)} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded">‹</button>
          <span className="font-semibold text-sm w-40 text-center">{monthName}</span>
          <button onClick={()=>shift(1)} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded">›</button>
          <button onClick={()=>setCursor({y:now.getFullYear(),m:now.getMonth()})} className="ml-1 text-xs text-teal-600 dark:text-teal-400 underline">Today</button>
        </div>
        <button onClick={load} className="text-xs text-gray-500 underline">Refresh</button>
      </div>
      {err && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{err}</p>}
      <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-500 mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="text-center font-semibold">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <div key={i} className={`min-h-[84px] rounded-lg border p-1 ${d ? 'border-gray-200 dark:border-gray-700' : 'border-transparent'} ${isToday(d) ? 'ring-1 ring-teal-500' : ''}`}>
            {d && <div className="text-[11px] text-gray-400 mb-1">{d}</div>}
            <div className="space-y-1">
              {(byDay[d] || []).map(p => (
                <button key={p.id} onClick={()=>setSelected(p)}
                  className="w-full text-left text-[10px] leading-tight bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-1 py-0.5 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot(p.status)}`}></span>
                  <span className="truncate">{new Date(p.scheduled_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} {(p.channels||[]).map(c=>c==='instagram'?'IG':'FB').join('/')}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Pending</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>Published</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Failed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span>Canceled</span>
      </div>
      {loading && <p className="text-xs text-gray-500 mt-2">Loading…</p>}
      {selected && <ScheduledPostModal post={selected} cfg={cfg} onClose={()=>setSelected(null)} onChanged={load} />}
    </div>
  );
}

function SocialView() {
  const [cfg, setCfg]         = React.useState(null);
  const [cfgErr, setCfgErr]   = React.useState('');
  const [posts, setPosts]     = React.useState([]);
  const [loadingPosts, setLoadingPosts] = React.useState(true);
  const [postsErr, setPostsErr] = React.useState('');
  const [openThread, setOpenThread] = React.useState(null);
  const [tab, setTab]         = React.useState('compose'); // 'compose' | 'calendar'

  const loadConfig = async () => {
    setCfgErr('');
    try {
      const { data, error } = await sb.functions.invoke('meta-publish', { body:{ action:'config' } });
      if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Config failed');
      setCfg(data);
    } catch (e) { setCfgErr(e.message || String(e)); }
  };
  const loadPosts = async () => {
    setLoadingPosts(true); setPostsErr('');
    try {
      const { data, error } = await sb.functions.invoke('meta-publish', { body:{ action:'listPosts' } });
      if (error || (data && data.error)) throw new Error((data && data.error) || (error && error.message) || 'Load failed');
      setPosts(data.posts || []);
    } catch (e) { setPostsErr(e.message || String(e)); }
    setLoadingPosts(false);
  };
  React.useEffect(() => { loadConfig(); loadPosts(); }, []);

  const SourceBadge = ({ s }) => (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s==='instagram' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>{s==='instagram' ? 'Instagram' : 'Facebook'}</span>
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social</h1>
        <p className="text-sm text-gray-500 mt-1">
          {cfg
            ? <>Publishing to <b>{cfg.pageName}</b>{cfg.igConnected ? <> and Instagram <b>@{cfg.igUsername}</b></> : ' (no Instagram account linked)'}.</>
            : cfgErr
              ? <span className="text-red-600 dark:text-red-400">Not connected: {cfgErr}</span>
              : 'Connecting to Meta…'}
        </p>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
        <button onClick={()=>setTab('compose')}  className={`px-4 py-1.5 ${tab==='compose' ? 'bg-teal-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>Compose</button>
        <button onClick={()=>setTab('calendar')} className={`px-4 py-1.5 ${tab==='calendar' ? 'bg-teal-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>Scheduled</button>
      </div>

      {tab==='compose' && (
        <>
          <SocialComposer cfg={cfg} onPublished={loadPosts} onScheduled={()=>setTab('calendar')} />

          {/* Recent posts + engagement */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200">Recent posts</h2>
              <button onClick={loadPosts} className="text-xs text-gray-500 underline">Refresh</button>
            </div>
            {loadingPosts && <p className="text-sm text-gray-500">Loading posts…</p>}
            {postsErr && <p className="text-sm text-red-600 dark:text-red-400">{postsErr}</p>}
            {!loadingPosts && !postsErr && posts.length===0 && <p className="text-sm text-gray-500">No posts found yet.</p>}
            <div className="space-y-3">
              {posts.map(p => (
                <div key={p.source+p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start gap-3">
                    {p.image && <img src={p.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" onError={e=>{e.target.style.display='none';}} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SourceBadge s={p.source} />
                        <span className="text-[11px] text-gray-400">{p.createdTime ? new Date(p.createdTime).toLocaleDateString() : ''}</span>
                        {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline ml-auto">Open ↗</a>}
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap line-clamp-4">{p.message || '(no caption)'}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{p.source==='instagram' ? '❤️' : '👍'} {p.reactions} {p.source==='instagram' ? 'likes' : 'reactions'}</span>
                        <button onClick={()=>setOpenThread(openThread===(p.source+p.id) ? null : (p.source+p.id))}
                          className="hover:text-teal-600 dark:hover:text-teal-400">💬 {p.comments} comments{p.comments>0 ? (openThread===(p.source+p.id) ? ' ▲' : ' ▼') : ''}</button>
                      </div>
                    </div>
                  </div>
                  {openThread===(p.source+p.id) && <SocialCommentsPanel source={p.source} id={p.id} />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab==='calendar' && <ScheduledCalendar cfg={cfg} />}
    </div>
  );
}
