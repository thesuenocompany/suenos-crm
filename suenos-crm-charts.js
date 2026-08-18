// ── SVG CHART COMPONENTS (no external library) ───────────────────────────────

function AreaChart({ data=[], xKey='month', yKey='bottles', color='#f59e0b', h=180, label='', labelEvery=5 }) {
  if (!data.length) return <div style={{height:h}} className="flex items-center justify-center text-xs text-gray-400">No data</div>;
  const vals = data.map(d => Number(d[yKey])||0);
  const max  = Math.max(...vals, 1);
  const W = 600, H = 110;
  const pad = { l:4, r:4, t:8, b:26 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const pts = vals.map((v,i) => [
    pad.l + (i/(vals.length-1||1))*iW,
    pad.t + iH - (v/max)*iH
  ]);

  // Smooth cubic bezier path
  const linePath = pts.reduce((acc,[x,y],i) => {
    if (i===0) return `M ${x} ${y}`;
    const [px,py] = pts[i-1];
    const cp1x = px + (x-px)/3;
    const cp2x = x  - (x-px)/3;
    return `${acc} C ${cp1x} ${py}, ${cp2x} ${y}, ${x} ${y}`;
  }, '');
  const areaPath = `${linePath} L ${pts[pts.length-1][0]} ${pad.t+iH} L ${pts[0][0]} ${pad.t+iH} Z`;
  const gradId = `ag_${yKey}_${color.replace('#','')}`;

  // Subtle horizontal grid at 25 / 50 / 75 %
  const gridYs = [0.25, 0.5, 0.75].map(p => pad.t + iH - p*iH);

  // Date label formatter: YYYYMMDD → "Jun 22"
  const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtLbl = s => {
    s = String(s);
    if (s.length===8) return `${MO[parseInt(s.slice(4,6))-1]} ${parseInt(s.slice(6,8))}`;
    return s.slice(-5);
  };

  const last = pts[pts.length-1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:'100%',height:h}}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity=".18"/>
          <stop offset="75%"  stopColor={color} stopOpacity=".04"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {gridYs.map((y,i) => (
        <line key={i} x1={pad.l} y1={y} x2={W-pad.r} y2={y} stroke="#e5e7eb" strokeWidth="0.6" opacity="0.7"/>
      ))}
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`}/>
      {/* Smooth line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Glowing endpoint dot */}
      <circle cx={last[0]} cy={last[1]} r="7" fill={color} opacity="0.12"/>
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color}/>
      {/* X-axis labels — sparse */}
      {data.map((d,i) => {
        const show = i===0 || i===data.length-1 || i%labelEvery===0;
        if (!show) return null;
        return (
          <text key={i} x={pts[i][0]} y={H-4} textAnchor="middle"
            fontSize="9" fill="#9ca3af" fontFamily="system-ui, sans-serif">
            {fmtLbl(d[xKey])}
          </text>
        );
      })}
    </svg>
  );
}

function BarChart({ data=[], xKey='name', yKey='bottles', color='#f59e0b', h=180, horizontal=false }) {
  if (!data.length) return <div style={{height:h}} className="flex items-center justify-center text-xs text-gray-400">No data</div>;
  if (horizontal) {
    const max = Math.max(...data.map(d=>Number(d[yKey])||0), 1);
    const rowH = 88 / data.length;
    return (
      <svg viewBox="0 0 100 95" style={{width:'100%',height:h}}>
        {data.map((d,i) => {
          const bw = (Number(d[yKey])/max)*55;
          const y  = i*rowH + rowH*.15;
          const lbl = String(d[xKey]).split('/')[0].trim().slice(0,9);
          return (
            <g key={i}>
              <text x="0" y={y+rowH*.65} fontSize="5" fill="#9ca3af">{lbl}</text>
              <rect x="38" y={y} width={Math.max(bw,0.5)} height={rowH*.7} fill={color} rx="0.8"/>
              <text x={40+bw} y={y+rowH*.65} fontSize="4.5" fill={color} fontWeight="600">{d[yKey]}</text>
            </g>
          );
        })}
      </svg>
    );
  }
  const max = Math.max(...data.map(d=>Number(d[yKey])||0), 1);
  const bw  = 70 / data.length;
  return (
    <svg viewBox="0 0 100 95" style={{width:'100%',height:h}}>
      {data.map((d,i) => {
        const bh   = (Number(d[yKey])/max)*72;
        const x    = i*(100/data.length) + (100/data.length)*.15;
        const w    = (100/data.length)*.7;
        const fill = d.fill || color;
        const lbl  = String(d[xKey]).slice(0,5);
        return (
          <g key={i}>
            <rect x={x} y={78-bh} width={w} height={Math.max(bh,.5)} fill={fill} rx="1"/>
            {bh>10 && <text x={x+w/2} y={75-bh} textAnchor="middle" fontSize="4.5" fill={fill} fontWeight="600">{d[yKey]}</text>}
            <text x={x+w/2} y="90" textAnchor="middle" fontSize="5" fill="#9ca3af">{lbl}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ data=[], h=160 }) {
  if (!data.length) return <div style={{height:h}} className="flex items-center justify-center text-xs text-gray-400">No data</div>;
  const total = data.reduce((s,d)=>s+(Number(d.value)||0),0);
  if (!total) return null;
  const cx=50, cy=48, R=28, ri=17;
  let angle = -Math.PI/2;
  const COLORS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444'];
  const slices = data.map((d,i) => {
    const theta = (d.value/total)*2*Math.PI;
    const end   = angle + theta;
    const x1=cx+R*Math.cos(angle), y1=cy+R*Math.sin(angle);
    const x2=cx+R*Math.cos(end),   y2=cy+R*Math.sin(end);
    const ix1=cx+ri*Math.cos(angle),iy1=cy+ri*Math.sin(angle);
    const ix2=cx+ri*Math.cos(end),  iy2=cy+ri*Math.sin(end);
    const lg  = theta > Math.PI ? 1 : 0;
    const path= `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R},0,${lg},1,${x2.toFixed(2)},${y2.toFixed(2)} L${ix2.toFixed(2)},${iy2.toFixed(2)} A${ri},${ri},0,${lg},0,${ix1.toFixed(2)},${iy1.toFixed(2)} Z`;
    const fill = d.fill || COLORS[i%COLORS.length];
    angle = end;
    return { ...d, path, fill };
  });
  return (
    <svg viewBox="0 0 100 96" style={{width:'100%',height:h}}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.fill}/>)}
      <text x={cx} y={cy+2} textAnchor="middle" fontSize="9" fontWeight="700" fill="#374151" className="dark:fill-white">{total}</text>
      <text x={cx} y={cy+9} textAnchor="middle" fontSize="5" fill="#9ca3af">bottles</text>
      {/* legend */}
      {slices.map((s,i)=>(
        <g key={i} transform={`translate(0,${82+i*7})`}>
          <rect width="5" height="5" rx="1" fill={s.fill}/>
          <text x="7" y="5" fontSize="5" fill="#9ca3af">{s.name} — {s.value}</text>
        </g>
      ))}
    </svg>
  );
}

function MultiLineChart({ data=[], lines=[], h=180 }) {
  if (!data.length) return <div style={{height:h}} className="flex items-center justify-center text-xs text-gray-400">No data</div>;
  const allVals = lines.flatMap(l => data.map(d=>Number(d[l.key])||0));
  const max = Math.max(...allVals, 1);
  const W=300, H=80, padB=20, padT=6;
  const iH = H-padT-padB;
  const LCOLS = ['#f59e0b','#3b82f6','#10b981'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:'100%',height:h}}>
      <defs>
        {lines.map((l,i)=>(
          <linearGradient key={i} id={`mlg${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={l.color||LCOLS[i]} stopOpacity=".2"/>
            <stop offset="100%" stopColor={l.color||LCOLS[i]} stopOpacity="0"/>
          </linearGradient>
        ))}
      </defs>
      {lines.map((l,li)=>{
        const color = l.color||LCOLS[li];
        const pts = data.map((d,i)=>{
          const x = (i/(data.length-1||1))*(W);
          const y = padT + iH - ((Number(d[l.key])||0)/max)*iH;
          return [x,y];
        });
        const linePts = pts.map(([x,y])=>`${x},${y}`).join(' ');
        const areaPts = `0,${padT+iH} ${linePts} ${W},${padT+iH}`;
        return (
          <g key={li}>
            <polygon points={areaPts} fill={`url(#mlg${li})`}/>
            <polyline points={linePts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        );
      })}
      {data.map((d,i)=>{
        const x = (i/(data.length-1||1))*W;
        return <text key={i} x={x} y={H-2} textAnchor="middle" fontSize="7" fill="#9ca3af">{String(d.month||d.name||'').slice(-5)}</text>;
      })}
    </svg>
  );
}
