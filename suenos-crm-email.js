// ─── EMAIL (MAILCHIMP) ANALYTICS VIEW ─────────────────────────────────────────
// Admin-only. Campaign performance + audience health from Mailchimp, via the
// mailchimp-analytics edge function.

function CampaignDetailModal({ campaign, onClose }) {
  const [d, setD] = React.useState(null);
  const [links, setLinks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');
  React.useEffect(() => { (async () => {
    setLoading(true); setErr('');
    try {
      const { data: res, error } = await sb.functions.invoke('mailchimp-analytics', { body: { action: 'campaign', id: campaign.id } });
      if (error || (res && res.error)) throw new Error((res && res.error) || (error && error.message) || 'Load failed');
      setD(res.detail); setLinks(res.links || []);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  })(); }, [campaign.id]);

  const pct = n => `${(Number(n) * 100).toFixed(1)}%`;
  const num = n => Number(n || 0).toLocaleString('en-CA');
  const dt  = s => s ? new Date(s).toLocaleString('en-CA', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }) : '—';
  const Stat = ({ v, l }) => (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 text-center">
      <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{v}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-0.5">{l}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{campaign.title}</h3>
            {d?.subject && <p className="text-xs text-gray-500">{d.subject}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        {d && (
          <>
            <p className="text-[11px] text-gray-400">Sent {dt(d.sentAt)}{d.list ? ` · ${d.list}` : ''}</p>
            <div className="grid grid-cols-3 gap-2">
              <Stat v={num(d.emailsSent)}    l="Recipients" />
              <Stat v={pct(d.openRate)}      l="Open rate" />
              <Stat v={pct(d.clickRate)}     l="Click rate" />
              <Stat v={num(d.uniqueOpens)}   l="Unique opens" />
              <Stat v={num(d.uniqueClicks)}  l="Unique clicks" />
              <Stat v={num(d.unsubs)}        l="Unsubscribes" />
              <Stat v={num(d.opensTotal)}    l="Total opens" />
              <Stat v={num(d.clicksTotal)}   l="Total clicks" />
              <Stat v={num((d.hardBounces||0)+(d.softBounces||0))} l="Bounces" />
            </div>
            {d.revenue > 0 && <div className="text-xs text-gray-600 dark:text-gray-300">🛒 {num(d.orders)} orders · ${num(d.revenue)} revenue</div>}
            {links.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Top clicked links</p>
                <div className="space-y-1">
                  {links.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 truncate max-w-[300px] hover:underline">{l.url}</a>
                      <span className="text-gray-500 whitespace-nowrap">{num(l.clicks)} · {pct(l.pct)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-gray-400">Last open {dt(d.lastOpen)} · Last click {dt(d.lastClick)}</p>
          </>
        )}
      </div>
    </div>
  );
}

function EmailAnalyticsView() {
  const [data, setData]       = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr]         = React.useState('');
  const [selCampaign, setSelCampaign] = React.useState(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const { data: res, error } = await sb.functions.invoke('mailchimp-analytics', { body: { count: 25 } });
      if (error || (res && res.error)) throw new Error((res && res.error) || (error && error.message) || 'Load failed');
      setData(res);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  };
  React.useEffect(() => { load(); }, []);

  const pct = n => `${(Number(n) * 100).toFixed(1)}%`;
  const num = n => Number(n || 0).toLocaleString('en-CA');
  const dt  = s => s ? new Date(s).toLocaleDateString('en-CA', { month:'short', day:'numeric', year:'numeric' }) : '—';

  const Kpi = ({ value, label }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
      <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">{label}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email · Mailchimp</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.audienceName ? <>Audience: <b>{data.audienceName}</b></> : 'Campaign performance and audience health.'}
          </p>
        </div>
        <button onClick={load} className="text-xs text-gray-500 underline">Refresh</button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading Mailchimp…</p>}

      {err && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Not connected</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{err}</p>
          <p className="text-[11px] text-gray-500 mt-2">Add your Mailchimp API key as the <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">MAILCHIMP_API_KEY</code> secret in Supabase → Edge Functions → Secrets, then refresh. Create a key in Mailchimp → Account &amp; billing → Extras → API keys.</p>
        </div>
      )}

      {!loading && !err && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi value={num(data.totals?.totalMembers)}   label="Total Subscribers" />
            <Kpi value={pct(data.totals?.avgOpenRate)}    label="Avg Open Rate" />
            <Kpi value={pct(data.totals?.avgClickRate)}   label="Avg Click Rate" />
            <Kpi value={num(data.totals?.emailsSent)}     label="Emails Sent (recent)" />
          </div>

          {/* Recent campaigns */}
          <div>
            <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-2">Recent campaigns</h2>
            {(!data.campaigns || data.campaigns.length === 0) ? (
              <p className="text-sm text-gray-500">No sent campaigns found.</p>
            ) : (
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-100 dark:border-gray-700">
                      <th className="px-3 py-2">Campaign</th>
                      <th className="px-3 py-2">Sent</th>
                      <th className="px-3 py-2 text-right">Recipients</th>
                      <th className="px-3 py-2 text-right">Opens</th>
                      <th className="px-3 py-2 text-right">Clicks</th>
                      <th className="px-3 py-2 text-right">Unsub</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map(c => (
                      <tr key={c.id} onClick={()=>setSelCampaign(c)} className="border-b border-gray-50 dark:border-gray-800/60 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[220px]">{c.title}</p>
                          {c.list && <p className="text-[11px] text-gray-400 truncate max-w-[220px]">{c.list}</p>}
                        </td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{dt(c.sentAt)}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{num(c.emailsSent)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-teal-700 dark:text-teal-400">{pct(c.openRate)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">{pct(c.clickRate)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{num(c.unsubs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audiences */}
          {data.audience && data.audience.length > 0 && (
            <div>
              <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-2">Audiences</h2>
              <div className="space-y-2">
                {data.audience.map(a => (
                  <div key={a.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{a.name}</p>
                      <p className="text-[11px] text-gray-400">{num(a.members)} subscribers{a.growthSinceSend ? ` · ${a.growthSinceSend>0?'+':''}${num(a.growthSinceSend)} since last send` : ''}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <span className="mr-3">Open {pct(a.openRate)}</span>
                      <span>Click {pct(a.clickRate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selCampaign && <CampaignDetailModal campaign={selCampaign} onClose={()=>setSelCampaign(null)} />}
    </div>
  );
}
