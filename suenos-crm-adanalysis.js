// ══════════════════════════════════════════════════════════════════════════════
//  AI AD PERFORMANCE ANALYSIS — UI (bundled before part5)
//  Opens from the Ad Performance page. Uses the centralized analyzeAdWithAI service.
// ══════════════════════════════════════════════════════════════════════════════

const AD_OBJECTIVES = ['Awareness','Engagement','Traffic','Video views','Leads','Online sales','Store visits','Event promotion','Restaurant or bar visits','Retail product sell-through','Other'];
const AD_REC_STATUS = ['Accepted','Rejected','Completed','Revisit later'];
const AD_REC_STATUS_CLS = {
  'Accepted':'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Rejected':'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Completed':'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Revisit later':'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};
const AD_PRIORITY_CLS = {
  'Immediate':'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Next test':'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Monitor':'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'No change needed':'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};
function adScoreColor(n){ n=Number(n)||0; return n>=8?'#10b981':n>=5?'#f59e0b':'#ef4444'; }

// Small building blocks
function AdAnSection({ title, n, children }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{n?`${n}. `:''}{title}</p>
      {children}
    </div>
  );
}
function adCopyText(t){ try{ navigator.clipboard.writeText(t); }catch{} }
// Build a readable name for a saved analysis (custom name wins; else auto-generate)
function adAnalysisTitle(a, allCampaigns) {
  if (a.context?.title) return a.context.title;
  if (a.mode === 'compare' && Array.isArray(a.campaignIds) && a.campaignIds.length) {
    const names = a.campaignIds.map(id => (allCampaigns||[]).find(c=>c.id===id)?.city || 'Ad');
    return names.join(' vs ');
  }
  const label = a.mode === 'quick' ? 'Quick review' : 'Full analysis';
  const parts = [label];
  if (a.result?.assessment) parts.push(a.result.assessment);
  if (a.result?.overallScore != null) parts.push(`${a.result.overallScore}/100`);
  return parts.join(' · ');
}

function AdAnalysisModal({ campaign, creative, allCampaigns, benchmarks, onClose }) {
  const { state, dispatch } = useApp();
  const [mode, setMode] = React.useState('full');           // quick|full|compare
  const [ctx, setCtx] = React.useState({ objective:'', goal:'', product:'Sueños Tequila', target:'', market:'', desiredAction:'', targetCPR:'', landingUrl: localStorage.getItem('meta_website_url')||'', notes:'' });
  const [compareIds, setCompareIds] = React.useState([]);   // extra campaign ids for compare
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [analysisId, setAnalysisId] = React.useState(null);
  const [recStatus, setRecStatus] = React.useState({});
  const [genAt, setGenAt] = React.useState(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [showHistory, setShowHistory] = React.useState(false);
  const setC = (k,v)=>setCtx(x=>({...x,[k]:v}));

  // Elapsed-time ticker while analyzing
  React.useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed(e => e + 0.1), 100);
    return () => clearInterval(t);
  }, [busy]);
  const AD_LOADING_MSGS = ['Reading the creative and copy…','Weighing results against the objective…','Checking your account benchmarks…','Finding the biggest drop-off…','Writing prioritized recommendations…','Drafting copy variations and a test plan…'];
  const loadingMsg = AD_LOADING_MSGS[Math.min(AD_LOADING_MSGS.length-1, Math.floor(elapsed/4))];

  const allForCampaign = (state.adAnalyses||[]).filter(a => a.campaignId === campaign.id);
  const history = allForCampaign.slice(0,10);
  const spentThisAd = allForCampaign.reduce((s,a)=>s+(a.costUsd||0), 0);

  const metrics = {
    spend:campaign.spend, impressions:campaign.impressions, reach:campaign.reach, clicks:campaign.clicks,
    ctr:campaign.ctr, cpc:campaign.cpc, cpm:campaign.cpm, status:campaign.status,
    createdAt:campaign.createdAt, startTime:campaign.startTime, stopTime:campaign.stopTime,
  };
  const missing = Object.entries({ Reach:campaign.reach, Clicks:campaign.clicks, CTR:campaign.ctr })
    .filter(([,v])=>!v).map(([k])=>k);

  async function run() {
    setBusy(true); setResult(null); setAnalysisId(null);
    try {
      let comparisonAds = null;
      if (mode === 'compare') {
        const chosen = [campaign, ...(allCampaigns||[]).filter(c=>compareIds.includes(c.id))];
        if (chosen.length < 2) { showToast(dispatch, 'Pick at least one more ad to compare', 'error'); setBusy(false); return; }
        comparisonAds = chosen.map(c=>({ name:c.city, metrics:{ spend:c.spend, impressions:c.impressions, reach:c.reach, clicks:c.clicks, ctr:c.ctr, cpc:c.cpc, cpm:c.cpm } }));
      }
      const ad = { campaignName:`Suenos — ${campaign.city}`, city:campaign.city, brand:'Sueños Tequila', status:campaign.status };
      const cre = creative ? { headline:creative.headline, primaryText:creative.body, thumbnail:creative.thumbnail } : null;
      const out = await analyzeAdWithAI({ ad, metrics, creative:cre, context:ctx, mode, benchmarks, comparisonAds });
      setResult(out); setGenAt(new Date());
      // Auto-save every analysis with the ad so it's always in the history
      try {
        const saved = await dbSaveAdAnalysis(dispatch, { campaignId: campaign.id, campaignIds: mode==='compare'?[campaign.id,...compareIds]:null, mode, context:ctx, metrics, result:out });
        setAnalysisId(saved.id); setRecStatus(saved.recStatus||{});
        showToast(dispatch, '✨ Analysis ready — saved to history');
      } catch(se) { showToast(dispatch, '✨ Analysis ready (couldn\'t save: '+String(se.message||se)+')', 'error'); }
    } catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
    finally { setBusy(false); }
  }
  async function setRec(i, status) {
    const next = { ...recStatus, [i]: recStatus[i]===status ? undefined : status };
    setRecStatus(next);
    if (analysisId) { try { await dbUpdateAdRecStatus(dispatch, analysisId, next); } catch(e){} }
  }
  async function recToTask(rec) {
    try {
      await dbAddTask(dispatch, { id: genId(), accountId:null, title:`[Ad] ${rec.change}`.slice(0,120), dueDate:null, repId: state.user?.id, priority: rec.priority==='Immediate'?'high':'medium', notes:`${campaign.city} · ${rec.reason||''}`.slice(0,400) });
      showToast(dispatch, 'Added to your task list');
    } catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
  }
  function copyRecs() {
    const recs = result.recommendations || result.topRecommendations || [];
    const txt = recs.map((r,i)=>`${i+1}. [${r.priority}] ${r.change}\n   Why: ${r.reason||''}\n   Watch: ${r.metricToWatch||''}`).join('\n\n');
    adCopyText(txt); showToast(dispatch, 'Recommendations copied');
  }
  function loadPast(a) { setResult(a.result); setCtx(a.context||ctx); setMode(a.mode); setAnalysisId(a.id); setRecStatus(a.recStatus||{}); setGenAt(new Date(a.createdAt)); }
  async function rename(a) {
    const cur = adAnalysisTitle(a, state.metaCampaigns);
    const name = window.prompt('Name this analysis', cur);
    if (name == null) return;
    const clean = name.trim();
    try { await dbRenameAdAnalysis(dispatch, a.id, clean, a.context); showToast(dispatch, clean ? 'Renamed' : 'Name cleared'); }
    catch(e){ showToast(dispatch, 'Rename failed', 'error'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm no-print" onClick={onClose}/>
      <div id="ad-analysis-panel" className="relative w-full max-w-2xl bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] text-white px-5 py-4 no-print">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">Analyze Ad &amp; Suggest Improvements</h2>
              <p className="text-xs text-teal-100/70">{campaign.city} · {campaign.status}{spentThisAd>0?` · AI analysis spend $${spentThisAd.toFixed(3)}`:''}{genAt?` · generated ${genAt.toLocaleString('en-CA',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`:''}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><Ic n="x" cls="w-4 h-4"/></button>
          </div>
          <div className="flex gap-1.5 mt-3">
            {[['quick','Quick Review'],['full','Full Analysis'],['compare','Compare Ads']].map(([k,l])=>(
              <button key={k} onClick={()=>setMode(k)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${mode===k?'bg-white text-[#2E8A97]':'bg-white/10 text-white/80 hover:bg-white/20'}`}>{l}</button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Analyzing loader */}
          {busy && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative w-16 h-16 mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-violet-100 dark:border-violet-900/40"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">✨</div>
              </div>
              <p className="text-3xl font-black tabular-nums text-gray-800 dark:text-gray-100">{elapsed.toFixed(1)}<span className="text-lg text-gray-400">s</span></p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-2">Analyzing {campaign.city}…</p>
              <p className="text-xs text-gray-400 mt-1 h-4 transition-all">{loadingMsg}</p>
              <div className="w-48 h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{width:`${Math.min(95, elapsed/25*100)}%`}}></div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">{mode==='full'?'Full analysis usually takes 15–30s':'Usually a few seconds'}</p>
            </div>
          )}

          {/* Context form */}
          {!busy && !result && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Optional context sharpens the analysis. The AI judges results against the objective you pick.</p>
              <FSelect label="Campaign type / objective" value={ctx.objective} onChange={v=>setC('objective',v)} options={AD_OBJECTIVES}/>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FInput label="Primary campaign goal" value={ctx.goal} onChange={v=>setC('goal',v)}/>
                <FInput label="Product / offer" value={ctx.product} onChange={v=>setC('product',v)}/>
                <FInput label="Target customer" value={ctx.target} onChange={v=>setC('target',v)}/>
                <FInput label="Geographic market" value={ctx.market} onChange={v=>setC('market',v)}/>
                <FInput label="Desired customer action" value={ctx.desiredAction} onChange={v=>setC('desiredAction',v)}/>
                <FInput label="Target cost per result" value={ctx.targetCPR} onChange={v=>setC('targetCPR',v)}/>
              </div>
              <FInput label="Landing page URL" value={ctx.landingUrl} onChange={v=>setC('landingUrl',v)}/>
              <FInput label="Additional context or notes" value={ctx.notes} onChange={v=>setC('notes',v)} rows={2}/>

              {mode==='compare' && (
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Compare against (pick one or more)</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {(allCampaigns||[]).filter(c=>c.id!==campaign.id).map(c=>(
                      <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={compareIds.includes(c.id)} onChange={e=>setCompareIds(ids=>e.target.checked?[...ids,c.id]:ids.filter(x=>x!==c.id))}/>
                        {c.city} <span className="text-[11px] text-gray-400">· {(c.ctr||0).toFixed(2)}% CTR · ${(c.spend||0).toFixed(0)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {missing.length>0 && <p className="text-[11px] text-amber-600">⚠️ Missing metrics: {missing.join(', ')} — refresh the campaign first for a fuller analysis.</p>}
              <Btn onClick={run} disabled={busy} cls="w-full">{busy?'Analyzing…':'✨ Run Analysis'}</Btn>

              {history.length>0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Previous analyses</p>
                  {history.map(a=>(
                    <div key={a.id} className="flex items-center gap-1 group">
                      <button onClick={()=>loadPast(a)} className="flex-1 text-left text-xs px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between min-w-0">
                        <span className="truncate">{adAnalysisTitle(a, state.metaCampaigns)}</span>
                        <span className="text-gray-400 flex-shrink-0 ml-2">{String(a.createdAt).slice(0,10)}</span>
                      </button>
                      <button onClick={()=>rename(a)} title="Rename" className="p-1 text-gray-300 hover:text-teal-600 opacity-0 group-hover:opacity-100"><Ic n="edit" cls="w-3 h-3"/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {result && (
            <div>
              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap mb-3 no-print">
                <button onClick={run} disabled={busy} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">↻ Regenerate</button>
                <button onClick={copyRecs} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Copy recommendations</button>
                <button onClick={()=>{ document.body.classList.add('print-analysis'); const done=()=>{document.body.classList.remove('print-analysis');window.removeEventListener('afterprint',done);}; window.addEventListener('afterprint',done); setTimeout(()=>window.print(),80); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">⬇ PDF</button>
                {history.length>0 && <button onClick={()=>setShowHistory(v=>!v)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">🕘 History ({history.length})</button>}
                {analysisId && <span className="text-[11px] text-emerald-600 font-semibold">✓ Saved</span>}
                <button onClick={()=>{ setResult(null); setShowHistory(false); }} className="px-3 py-1.5 text-xs text-gray-400 hover:underline ml-auto">← New</button>
              </div>

              {/* History drawer */}
              {showHistory && (
                <div className="mb-3 rounded-xl border border-gray-100 dark:border-gray-800 p-2 bg-gray-50 dark:bg-gray-800/40">
                  <div className="flex items-center justify-between mb-1 px-1">
                    <p className="text-[11px] font-semibold text-gray-500">Saved analyses for {campaign.city}</p>
                    {spentThisAd>0 && <p className="text-[11px] text-gray-400">total ${spentThisAd.toFixed(3)}</p>}
                  </div>
                  {history.map(a=>(
                    <div key={a.id} className={`group flex items-center gap-1 rounded-lg ${a.id===analysisId?'bg-white dark:bg-gray-900':''}`}>
                      <button onClick={()=>{ loadPast(a); setShowHistory(false); }} className="flex-1 min-w-0 text-left text-xs px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{adAnalysisTitle(a, state.metaCampaigns)}</span>
                          {a.result?.overallScore!=null && <span className="font-bold flex-shrink-0" style={{color:adScoreColor(a.result.overallScore/10)}}>{a.result.overallScore}</span>}
                        </span>
                        <span className="flex items-center gap-2 text-gray-400 flex-shrink-0 ml-2">
                          {a.costUsd>0 && <span>${a.costUsd.toFixed(3)}</span>}
                          <span>{new Date(a.createdAt).toLocaleDateString('en-CA',{month:'short',day:'numeric'})}</span>
                        </span>
                      </button>
                      <button onClick={()=>rename(a)} title="Rename" className="p-1 text-gray-300 hover:text-teal-600 opacity-0 group-hover:opacity-100 flex-shrink-0"><Ic n="edit" cls="w-3 h-3"/></button>
                    </div>
                  ))}
                </div>
              )}

              {mode==='compare' ? <AdCompareResult r={result}/> : <AdFullResult r={result} mode={mode} recStatus={recStatus} setRec={setRec} recToTask={recToTask}/>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Full / Quick result renderer ─────────────────────────────────────────────
function AdFullResult({ r, mode, recStatus, setRec, recToTask }) {
  const recs = r.recommendations || r.topRecommendations || [];
  return (
    <div>
      {/* Executive summary */}
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/40 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{background:adScoreColor((r.overallScore||0)/10)+'22',color:adScoreColor((r.overallScore||0)/10)}}>{r.assessment||'—'}</span>
          {r.overallScore!=null && <span className="text-sm font-black" style={{color:adScoreColor(r.overallScore/10)}}>{r.overallScore}/100</span>}
          {r.dataConfidence && <span className="text-[10px] text-gray-400">data confidence: {r.dataConfidence}</span>}
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-200">{r.executiveSummary}</p>
      </div>

      {(r.missingData?.length>0) && <p className="text-[11px] text-amber-600 mt-2">⚠️ Analysis limited by missing data: {r.missingData.join(', ')}.</p>}

      {/* Scorecard (full only) */}
      {r.scorecard && (
        <AdAnSection title="Performance Scorecard" n="2">
          <div className="space-y-1.5">
            {r.scorecard.map((s,i)=>(
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-sm font-black text-right" style={{color:adScoreColor(s.score)}}>{s.score}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{s.category}</p>
                  <p className="text-[11px] text-gray-400">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </AdAnSection>
      )}

      {r.working && <AdAnSection title="What Is Working" n="3"><ul className="space-y-1.5">{r.working.map((w,i)=><li key={i} className="text-sm"><span className="text-emerald-600">✓ {w.point}</span> <span className="text-gray-400 text-xs">— {w.evidence}</span></li>)}</ul></AdAnSection>}
      {r.underperforming && <AdAnSection title="What Is Underperforming" n="4"><ul className="space-y-1.5">{r.underperforming.map((w,i)=><li key={i} className="text-sm"><span className="text-red-500">▲ {w.point}</span> <span className="text-gray-400 text-xs">— {w.why}</span></li>)}</ul></AdAnSection>}

      {r.creativeAnalysis && <AdAnSection title="Creative Analysis" n="5"><p className="text-sm text-gray-600 dark:text-gray-300">{r.creativeAnalysis.summary}</p>{r.creativeAnalysis.recommendedChanges?.length>0 && <ul className="mt-1.5 list-disc pl-4 text-xs text-gray-500 space-y-0.5">{r.creativeAnalysis.recommendedChanges.map((c,i)=><li key={i}>{c}</li>)}</ul>}</AdAnSection>}
      {r.copyAnalysis && <AdAnSection title="Copy Analysis" n="6"><p className="text-sm text-gray-600 dark:text-gray-300">{r.copyAnalysis.summary}</p>{r.copyAnalysis.recommendedChanges?.length>0 && <ul className="mt-1.5 list-disc pl-4 text-xs text-gray-500 space-y-0.5">{r.copyAnalysis.recommendedChanges.map((c,i)=><li key={i}>{c}</li>)}</ul>}</AdAnSection>}
      {r.audienceAnalysis && <AdAnSection title="Audience &amp; Delivery" n="7"><p className="text-sm text-gray-600 dark:text-gray-300">{r.audienceAnalysis}</p></AdAnSection>}
      {r.funnelAnalysis && <AdAnSection title="Funnel Analysis" n="8"><p className="text-sm text-gray-600 dark:text-gray-300"><strong>Biggest drop-off:</strong> {r.funnelAnalysis.largestDropOff} <span className="text-gray-400">(likely: {r.funnelAnalysis.likelyCause})</span></p><p className="text-xs text-gray-500 mt-0.5">{r.funnelAnalysis.detail}</p></AdAnSection>}
      {r.businessImpact && <AdAnSection title="Business Impact" n="9"><p className="text-sm text-gray-600 dark:text-gray-300">{r.businessImpact}</p></AdAnSection>}

      {/* Recommendations */}
      {recs.length>0 && (
        <AdAnSection title="Recommended Changes" n="10">
          <div className="space-y-2">
            {recs.map((rec,i)=>(
              <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${AD_PRIORITY_CLS[rec.priority]||'bg-gray-100 text-gray-500'}`}>{rec.priority}</span>
                  {rec.effort && <span className="text-[10px] text-gray-400">effort: {rec.effort}</span>}
                  {recStatus[i] && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${AD_REC_STATUS_CLS[recStatus[i]]}`}>{recStatus[i]}</span>}
                </div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{rec.change}</p>
                {rec.reason && <p className="text-[11px] text-gray-400 mt-0.5">{rec.reason}</p>}
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                  {rec.expectedImpact && <span>Impact: {rec.expectedImpact}</span>}
                  {rec.metricToWatch && <span>Watch: {rec.metricToWatch}</span>}
                </div>
                <div className="flex items-center gap-1 mt-2 no-print">
                  {AD_REC_STATUS.map(st=><button key={st} onClick={()=>setRec(i,st)} className={`text-[10px] px-1.5 py-0.5 rounded ${recStatus[i]===st?AD_REC_STATUS_CLS[st]:'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{st}</button>)}
                  <button onClick={()=>recToTask(rec)} className="text-[10px] px-1.5 py-0.5 rounded text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 ml-auto">＋ Task</button>
                </div>
              </div>
            ))}
          </div>
        </AdAnSection>
      )}

      {/* Copy edits */}
      {r.copyEdits && (
        <AdAnSection title="Suggested Copy Edits" n="11">
          {[['recommended','Recommended'],['directPerformance','More direct (performance)'],['emotionalBrand','More emotional (brand)']].map(([k,l])=>{
            const v = r.copyEdits[k]; if(!v) return null;
            const txt = `${v.primaryText||''}\n\n${v.headline||''}\n${v.description||''}\n[${v.cta||''}]`;
            return (
              <div key={k} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 mb-2">
                <div className="flex items-center justify-between mb-1"><p className="text-xs font-semibold text-gray-500">{l}</p><button onClick={()=>{adCopyText(txt);}} className="text-[11px] text-teal-600 hover:underline no-print">Copy</button></div>
                {v.primaryText && <p className="text-sm text-gray-700 dark:text-gray-200">{v.primaryText}</p>}
                {v.headline && <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{v.headline}</p>}
                {v.description && <p className="text-xs text-gray-500">{v.description}</p>}
                {v.cta && <p className="text-[11px] text-teal-600 mt-0.5">[{v.cta}]</p>}
              </div>
            );
          })}
        </AdAnSection>
      )}

      {/* Creative brief */}
      {r.creativeBrief && (
        <AdAnSection title="Suggested Creative Brief" n="12">
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-xs space-y-1 text-gray-600 dark:text-gray-300">
            {Object.entries({ Goal:r.creativeBrief.goal, Audience:r.creativeBrief.audience, Message:r.creativeBrief.mainMessage, Proposition:r.creativeBrief.proposition, Visual:r.creativeBrief.visualDirection, Product:r.creativeBrief.productPlacement, Headline:r.creativeBrief.headline, Copy:r.creativeBrief.supportingCopy, CTA:r.creativeBrief.cta, Dimensions:r.creativeBrief.dimensions, Avoid:r.creativeBrief.avoid }).map(([k,v])=> v ? <p key={k}><span className="text-gray-400">{k}:</span> {v}</p> : null)}
          </div>
        </AdAnSection>
      )}

      {/* Testing plan */}
      {r.testingPlan?.length>0 && (
        <AdAnSection title="Testing Plan" n="13">
          {r.testingPlan.slice(0,3).map((t,i)=>(
            <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 mb-2 text-xs space-y-0.5">
              <p className="font-semibold text-gray-700 dark:text-gray-200">Test {i+1}: {t.variable}</p>
              <p className="text-gray-500"><span className="text-gray-400">Hypothesis:</span> {t.hypothesis}</p>
              <p className="text-gray-500"><span className="text-gray-400">Control:</span> {t.control} · <span className="text-gray-400">Variation:</span> {t.variation}</p>
              <p className="text-gray-500"><span className="text-gray-400">Metric:</span> {t.primaryMetric}{t.secondaryMetric?` (also ${t.secondaryMetric})`:''} · <span className="text-gray-400">Run:</span> {t.minDuration}</p>
              <p className="text-gray-500"><span className="text-gray-400">Decision:</span> {t.decisionRule}</p>
            </div>
          ))}
        </AdAnSection>
      )}

      {/* Final */}
      {r.finalRecommendation && (
        <div className="mt-4 rounded-2xl bg-[#2E8A97] text-white p-4">
          <p className="text-[10px] uppercase tracking-widest text-teal-100/60 font-bold">Final Recommendation</p>
          <p className="text-base font-black mt-0.5">{r.finalRecommendation}</p>
          {r.finalExplanation && <p className="text-xs text-teal-100/80 mt-1">{r.finalExplanation}</p>}
        </div>
      )}
    </div>
  );
}

// ── Compare result renderer ──────────────────────────────────────────────────
function AdCompareResult({ r }) {
  return (
    <div>
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/40 p-4"><p className="text-sm text-gray-700 dark:text-gray-200">{r.executiveSummary}</p></div>
      {r.winner && <p className="text-sm mt-3"><span className="text-gray-400">Likely winner:</span> <strong>{r.winner}</strong></p>}
      {r.comparison?.length>0 && (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-400 border-b border-gray-100 dark:border-gray-800"><th className="text-left p-2">Dimension</th><th className="text-left p-2">A</th><th className="text-left p-2">B</th><th className="text-left p-2">Verdict</th></tr></thead>
            <tbody>{r.comparison.map((c,i)=><tr key={i} className="border-b border-gray-50 dark:border-gray-800/50"><td className="p-2 font-semibold">{c.dimension}</td><td className="p-2 text-gray-500">{c.adA}</td><td className="p-2 text-gray-500">{c.adB}</td><td className="p-2">{c.verdict}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {r.whyWinnerWon && <AdAnSection title="Why it won"><p className="text-sm text-gray-600 dark:text-gray-300">{r.whyWinnerWon}</p></AdAnSection>}
      {r.carryForward?.length>0 && <AdAnSection title="Carry into next campaign"><ul className="list-disc pl-4 text-sm text-gray-600 dark:text-gray-300 space-y-0.5">{r.carryForward.map((c,i)=><li key={i}>{c}</li>)}</ul></AdAnSection>}
      {r.finalRecommendation && <div className="mt-4 rounded-2xl bg-[#2E8A97] text-white p-4"><p className="text-base font-black">{r.finalRecommendation}</p></div>}
    </div>
  );
}
