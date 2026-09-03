// UI-ONLY: icons, primitives, charts — no state/constants (shared by both builds)

const ICONS = {
  dashboard:[['M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6']],
  accounts: [['M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4']],
  visits:   [['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z']],
  orders:   [['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01']],
  products: [['M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4']],
  stores:   [['M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z']],
  reports:  [['M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z']],
  map:      [['M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7']],
  tasks:    [['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4']],
  tastings: [['M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z']],
  menu:     [['M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z']],
  users:    [['M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z']],
  targets:  [['M15 10.5a3 3 0 11-6 0 3 3 0 016 0z'],['M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z']],
  settings: [['M12 15a3 3 0 100-6 3 3 0 000 6z'],['M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z']],
  plus:     [['M12 4v16m8-8H4']],
  search:   [['M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z']],
  sun:      [['M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z']],
  moon:     [['M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z']],
  x:        [['M6 18L18 6M6 6l12 12']],
  check:    [['M5 13l4 4L19 7']],
  edit:     [['M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z']],
  trash:    [['M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16']],
  upload:   [['M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12']],
  download: [['M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4']],
  phone:    [['M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z']],
  mail:     [['M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z']],
  pin:      [['M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'],['M15 11a3 3 0 11-6 0 3 3 0 016 0z']],
  alert:    [['M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z']],
  info:     [['M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z']],
  bell:     [['M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9']],
  bars:     [['M4 6h16M4 12h16M4 18h16']],
  star:     [['M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z']],
  chevL:    [['M15 19l-7-7 7-7']],
  chevR:    [['M9 5l7 7-7 7']],
  calendar: [['M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z'],['M16 3v4M8 3v4M3 9h18']],
  tag:      [['M9.568 3H5a2 2 0 00-2 2v4.568c0 .53.21 1.04.586 1.414L14 20.414a2 2 0 002.828 0l4.586-4.586a2 2 0 000-2.828L12 3.586A2 2 0 0010.414 3H9.568z'],['M6 6h.01']],
  // Meta Ad Tool icons
  ad:       [['M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z']],
  scanads:  [['M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z']],
  globe:    [['M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9']],
  refresh:  [['M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15']],
};
function Ic({ n, cls='w-5 h-5' }) {
  const paths = ICONS[n] || ICONS.info;
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      {paths.map((d,i) => <path key={i} strokeLinecap="round" strokeLinejoin="round" d={d[0]}/>)}
    </svg>
  );
}

const SC = {
  Prospect:'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Sample Sent':'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Buyer Meeting':'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Listing Pending':'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  Listed:'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Active:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'At Risk':'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Lost:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Draft:'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Submitted:'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Accepted:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Delivered:'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Completed:'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Cancelled:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};
function Badge({ label, cls='' }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${SC[label]||'bg-gray-100 text-gray-600'} ${cls}`}>{label}</span>;
}

function Btn({ children, variant='primary', size='md', onClick, type='button', disabled, cls='' }) {
  const base='inline-flex items-center gap-1.5 font-medium rounded-xl transition-all focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed';
  const sz={sm:'px-2.5 py-1.5 text-xs',md:'px-4 py-2 text-sm',lg:'px-5 py-2.5 text-sm'};
  const vr={
    primary:'bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-sm shadow-teal-600/20',
    secondary:'bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 hover:border-gray-300',
    danger:'bg-red-500 hover:bg-red-600 text-white shadow-sm',
    ghost:'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60'
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sz[size]} ${vr[variant]||vr.primary} ${cls}`}>{children}</button>;
}

function Card({ children, cls='', onClick }) {
  return <div onClick={onClick} className={`bg-white dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-sm ${onClick?'cursor-pointer hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all':''} ${cls}`}>{children}</div>;
}

function BrandKpiIcon({ icon, size=56 }) {
  const TEAL='#2D656F', GOLD='#E4BF70';
  const circle = <circle cx="500" cy="500" r="430" fill={TEAL}/>;
  const strokeProps = {fill:'none',stroke:GOLD,strokeWidth:'34',strokeLinecap:'round',strokeLinejoin:'round'};
  let inner = null;
  if (icon === 'visits') {
    inner = <g {...strokeProps}><path d="M500 700 L500 275"/><path d="M500 650 L360 340"/><path d="M500 650 L640 340"/><path d="M500 675 L285 455"/><path d="M500 675 L715 455"/><path d="M500 700 L350 560"/><path d="M500 700 L650 560"/></g>;
  } else if (icon === 'products') {
    inner = <g {...strokeProps}><path d="M430 235 H570 V360 Q570 390 600 425 L640 470 V720 Q640 770 590 770 H410 Q360 770 360 720 V470 L400 425 Q430 390 430 360 Z"/><path d="M430 300 H570"/><rect x="415" y="520" width="170" height="120" rx="10"/></g>;
  } else if (icon === 'reports') {
    inner = <g {...strokeProps}><rect x="290" y="560" width="90" height="180" rx="10"/><rect x="455" y="430" width="90" height="310" rx="10"/><rect x="620" y="300" width="90" height="440" rx="10"/><path d="M260 760 H740"/></g>;
  } else if (icon === 'accounts') {
    inner = <g fill="none" stroke={GOLD} strokeWidth="32" strokeLinejoin="round"><rect x="335" y="280" width="330" height="470" rx="18"/><path d="M300 750 H700"/><rect x="445" y="590" width="110" height="160"/><rect x="395" y="360" width="60" height="70"/><rect x="545" y="360" width="60" height="70"/><rect x="395" y="475" width="60" height="70"/><rect x="545" y="475" width="60" height="70"/></g>;
  } else if (icon === 'tastings') {
    /* wine glass */
    inner = <g {...strokeProps}><path d="M380 240 H620 Q640 380 560 480 Q530 510 500 520 Q470 510 440 480 Q360 380 380 240Z"/><path d="M500 520 L500 720"/><path d="M390 720 H610"/></g>;
  } else {
    /* star / generic */
    inner = <g fill={GOLD}><path d="M500 280 L539 399 H665 L563 471 L600 590 L500 518 L400 590 L437 471 L335 399 H461Z"/></g>;
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
      width={size} height={size} style={{flexShrink:0}}>
      {circle}{inner}
    </svg>
  );
}

function StatCard({ label, value, sub, icon, color='amber', onClick, trend }) {
  // trend: { pct: number, label: string } — pct is % change, label is e.g. "vs last month"
  const trendEl = trend && trend.pct !== null ? (() => {
    const pct = trend.pct;
    const isUp   = pct > 0;
    const isFlat = pct === 0;
    const col  = isFlat ? '#9ca3af' : isUp ? '#16a34a' : '#dc2626';
    const arrow = isFlat ? '—' : isUp ? '▲' : '▼';
    const txt  = isFlat ? 'No change' : `${arrow} ${Math.abs(pct)}%`;
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold mt-0.5" style={{color:col}}>
        {txt}
        {!isFlat && <span className="text-gray-400 font-normal ml-1">{trend.label||'vs last period'}</span>}
      </span>
    );
  })() : null;

  const inner = (
    <div className="flex items-center gap-4">
      <BrandKpiIcon icon={icon} size={56}/>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest truncate" style={{color:'#E4BF70'}}>{label}</p>
        <p className="text-2xl font-bold leading-tight" style={{color:'#3c9ca8'}}>{value}</p>
        {trendEl || (sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>)}
      </div>
    </div>
  );
  if (onClick) return (
    <button onClick={onClick} className="w-full text-left rounded-2xl shadow-sm p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-95"
      style={{background:'#fff',border:'1px solid rgba(23,52,58,0.1)'}}>
      {inner}
    </button>
  );
  return <div className="rounded-2xl p-4 sm:p-5 shadow-sm" style={{background:'#fff',border:'1px solid rgba(23,52,58,0.1)'}}>{inner}</div>;
}

function FInput({ label, value, onChange, type='text', placeholder, required, cls='', rows }) {
  const base='w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition';
  return (
    <div className={cls}>
      {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}{required&&<span className="text-red-400 ml-0.5">*</span>}</label>}
      {rows ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} className={base}/> : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} className={base}/>}
    </div>
  );
}

function FSelect({ label, value, onChange, options=[], required, cls='' }) {
  const base='w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent transition';
  return (
    <div className={cls}>
      {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}{required&&<span className="text-red-400 ml-0.5">*</span>}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)} required={required} className={base}>
        <option value="">— Select —</option>
        {options.map(o=> typeof o==='string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
const Input  = FInput;
const Select = FSelect;

function Modal({ open, onClose, title, children, width='max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative w-full ${width} max-h-screen sm:max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl fade-in`}>
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"><Ic n="x" cls="w-4 h-4"/></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon='info', title, desc, action }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 mb-3"><Ic n={icon} cls="w-6 h-6"/></div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      {desc && <p className="mt-1 text-xs text-gray-500">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ProgressBar({ value, max, color='amber' }) {
  const pct = Math.min(100, Math.round((value/Math.max(max,1))*100));
  const cc={amber:'bg-teal-600',emerald:'bg-emerald-500',blue:'bg-blue-500',rose:'bg-rose-500'};
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full progress-bar ${cc[color]||cc.amber}`} style={{width:`${pct}%`}}/>
      </div>
      <span className="text-xs text-gray-400 w-7 text-right flex-shrink-0">{pct}%</span>
    </div>
  );
}

function Toast() {
  const { state, dispatch } = useApp();
  useEffect(()=>{ if(state.toast){ const t=setTimeout(()=>dispatch({type:'UNTOAST'}),3200); return ()=>clearTimeout(t); } },[state.toast]);
  if(!state.toast) return null;
  const cc={success:'bg-emerald-600',error:'bg-red-600',info:'bg-sky-600'};
  return (
    <div className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] toast-anim px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 max-w-xs ${cc[state.toast.type]||cc.info}`}>
      <Ic n={state.toast.type==='success'?'check':'info'} cls="w-4 h-4 flex-shrink-0"/>
      {state.toast.msg}
    </div>
  );
}

// ── SVG CHARTS ────────────────────────────────────────────────
function AreaChart({ data=[], xKey='month', yKey='bottles', color='#f59e0b', h=180, onPointClick=null, selectedX=null, labelEvery=1 }) {
  if (!data.length) return <div style={{height:h}} className="flex items-center justify-center text-xs text-gray-400">No data</div>;
  const vals=data.map(d=>Number(d[yKey])||0), max=Math.max(...vals,1);
  const W=600,H=110,padB=24,padT=8,padL=4,padR=4,iH=H-padT-padB,iW=W-padL-padR;
  const pts=vals.map((v,i)=>[padL+(i/(vals.length-1||1))*iW,(padT+iH-(v/max)*iH)]);
  // Smooth cubic bezier
  const linePath=pts.reduce((acc,[x,y],i)=>{
    if(i===0) return `M ${x} ${y}`;
    const [px,py]=pts[i-1], c1=px+(x-px)/3, c2=x-(x-px)/3;
    return `${acc} C ${c1} ${py}, ${c2} ${y}, ${x} ${y}`;
  },'');
  const areaPath=`${linePath} L ${pts[pts.length-1][0]} ${padT+iH} L ${pts[0][0]} ${padT+iH} Z`;
  const gId=`ag_${yKey}${Math.random().toString(36).slice(2,6)}`;
  // Date label: YYYYMMDD → "Jun 22", else raw
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtLbl=s=>{s=String(s);return /^\d{8}$/.test(s)?`${MO[parseInt(s.slice(4,6))-1]} ${parseInt(s.slice(6,8))}`:s;};
  const last=pts[pts.length-1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:'100%',height:h,cursor:onPointClick?'pointer':'default'}}>
      <defs><linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity=".18"/>
        <stop offset="75%" stopColor={color} stopOpacity=".04"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      {/* Subtle grid */}
      {[0.25,0.5,0.75].map((p,i)=>(
        <line key={i} x1={padL} y1={padT+iH-p*iH} x2={W-padR} y2={padT+iH-p*iH} stroke="#e5e7eb" strokeWidth="0.6" opacity="0.7"/>
      ))}
      <path d={areaPath} fill={`url(#${gId})`}/>
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Click targets + selection markers (dots only when interactive or selected) */}
      {pts.map(([x,y],i)=>{
        const d=data[i], isSelected=selectedX&&String(d[xKey])===String(selectedX);
        if(!onPointClick&&!isSelected) return null;
        return (
          <g key={i} onClick={onPointClick?()=>onPointClick(d):undefined}>
            {onPointClick&&<rect x={x-(iW/(pts.length-1||1))/2} y={padT} width={iW/(pts.length-1||1)} height={iH+padB} fill="transparent"/>}
            {(isSelected||onPointClick)&&<circle cx={x} cy={y} r={isSelected?4.5:2.5} fill={isSelected?'white':color} stroke={isSelected?color:'none'} strokeWidth={isSelected?2.5:0} opacity={isSelected?1:0.55}/>}
            {isSelected&&<line x1={x} y1={padT} x2={x} y2={padT+iH} stroke={color} strokeWidth="0.9" strokeDasharray="3,3"/>}
          </g>
        );
      })}
      {/* Glowing endpoint */}
      <circle cx={last[0]} cy={last[1]} r="7" fill={color} opacity="0.12"/>
      <circle cx={last[0]} cy={last[1]} r="3.2" fill={color}/>
      {/* Sparse labels */}
      {data.map((d,i)=>{
        const isSelected=selectedX&&String(d[xKey])===String(selectedX);
        const showLabel = i===0 || i===data.length-1 || (labelEvery>1 ? i%labelEvery===0 : data.length<=13);
        if (!showLabel && !isSelected) return null;
        return <text key={i} x={pts[i][0]} y={H-4} textAnchor="middle" fontSize="9" fontFamily="system-ui,sans-serif" fill={isSelected?color:"#9ca3af"} fontWeight={isSelected?"bold":"normal"}>{fmtLbl(d[xKey])}</text>;
      })}
    </svg>
  );
}

function BarChart({ data=[], xKey='name', yKey='bottles', color='#f59e0b', h=180, horizontal=false, onBarClick=null }) {
  if (!data.length) return <div style={{height:h}} className="flex items-center justify-center text-xs text-gray-400">No data</div>;
  if (horizontal) {
    const max=Math.max(...data.map(d=>Number(d[yKey])||0),1), rowH=88/data.length;
    return (
      <svg viewBox="0 0 100 95" style={{width:'100%',height:h}}>
        {data.map((d,i)=>{const bw=(Number(d[yKey])/max)*55,y=i*rowH+rowH*.15,lbl=String(d[xKey]).split('/')[0].trim().slice(0,9),clickable=!!onBarClick;return(
          <g key={i} pointerEvents={clickable?"all":"none"} onClick={clickable?()=>onBarClick(d):undefined} style={clickable?{cursor:'pointer'}:{}}>
            <rect x="0" y={y} width="100" height={rowH*.9} fill="rgba(0,0,0,0.001)"/>
            <text x="0" y={y+rowH*.65} fontSize="5" fill={clickable?"#e2e8f0":"#9ca3af"}>{lbl}</text>
            <rect x="38" y={y} width={Math.max(bw,.5)} height={rowH*.7} fill={color} rx=".8"/>
            <text x={40+bw} y={y+rowH*.65} fontSize="4.5" fill={color} fontWeight="600">{d[yKey]}</text>
            {clickable&&<text x="96" y={y+rowH*.65} fontSize="4" fill="#9ca3af" textAnchor="end">›</text>}
          </g>
        );})}
      </svg>
    );
  }
  const max=Math.max(...data.map(d=>Number(d[yKey])||0),1);
  return (
    <svg viewBox="0 0 100 95" style={{width:'100%',height:h}}>
      {data.map((d,i)=>{const bh=(Number(d[yKey])/max)*72,x=i*(100/data.length)+(100/data.length)*.15,w=(100/data.length)*.7,fill=d.fill||color,lbl=String(d[xKey]).slice(0,5),clickable=!!onBarClick;return(
        <g key={i} onClick={clickable?()=>onBarClick(d):undefined} style={clickable?{cursor:'pointer'}:{}}>
          <rect x={x} y={78-bh} width={w} height={Math.max(bh,.5)} fill={fill} rx="1"/>
          {bh>10&&<text x={x+w/2} y={75-bh} textAnchor="middle" fontSize="4.5" fill={fill} fontWeight="600">{d[yKey]}</text>}
          <text x={x+w/2} y="90" textAnchor="middle" fontSize="5" fill="#9ca3af">{lbl}</text>
        </g>
      );})}
    </svg>
  );
}

function DonutChart({ data=[], h=160 }) {
  if (!data.length) return <div style={{height:h}} className="flex items-center justify-center text-xs text-gray-400">No data</div>;
  const total=data.reduce((s,d)=>s+(Number(d.value)||0),0);
  if (!total) return null;
  const cx=50,cy=48,R=28,ri=17;
  let angle=-Math.PI/2;
  const COLS=['#f59e0b','#10b981','#3b82f6','#8b5cf6'];
  const slices=data.map((d,i)=>{const theta=(d.value/total)*2*Math.PI,end=angle+theta,x1=cx+R*Math.cos(angle),y1=cy+R*Math.sin(angle),x2=cx+R*Math.cos(end),y2=cy+R*Math.sin(end),ix1=cx+ri*Math.cos(angle),iy1=cy+ri*Math.sin(angle),ix2=cx+ri*Math.cos(end),iy2=cy+ri*Math.sin(end),lg=theta>Math.PI?1:0,path=`M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R},0,${lg},1,${x2.toFixed(2)},${y2.toFixed(2)} L${ix2.toFixed(2)},${iy2.toFixed(2)} A${ri},${ri},0,${lg},0,${ix1.toFixed(2)},${iy1.toFixed(2)} Z`,fill=d.fill||COLS[i%COLS.length];angle=end;return{...d,path,fill};});
  return (
    <svg viewBox="0 0 100 96" style={{width:'100%',height:h}}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.fill}/>)}
      <text x={cx} y={cy+3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#374151">{total}</text>
      <text x={cx} y={cy+9} textAnchor="middle" fontSize="5" fill="#9ca3af">bottles</text>
      {slices.map((s,i)=><g key={i} transform={`translate(0,${82+i*7})`}><rect width="5" height="5" rx="1" fill={s.fill}/><text x="7" y="5" fontSize="5" fill="#9ca3af">{s.name} — {s.value}</text></g>)}
    </svg>
  );
}

// NAV config (used by Sidebar)
const NAV_CFG = {
  admin:[
    {s:'Main',    items:[{v:'dashboard',n:'dashboard',l:'Dashboard'},{v:'accounts',n:'accounts',l:'Accounts'},{v:'visits',n:'visits',l:'Visits'},{v:'tasks',n:'tasks',l:'Tasks'}]},
    {s:'Sales',   items:[{v:'orders',n:'orders',l:'Orders'},{v:'trade-leads',n:'accounts',l:'Trade Leads'},{v:'menu-placements',n:'menu',l:'Menu Placements'},{v:'retail-pricing',n:'tag',l:'Retail Pricing'}]},
    {s:'Field',   items:[{v:'tastings',n:'tastings',l:'Tastings'},{v:'calendar',n:'calendar',l:'Calendar'},{v:'sampling-request',n:'mail',l:'Sampling'}]},
    {s:'Marketing',items:[{v:'cluster-ads',n:'ad',l:'Ad Planner'},{v:'media-desk',n:'ad',l:'Media Desk'},{v:'weather-ads',n:'ad',l:'Weather Ads'},{v:'ad-creatives',n:'upload',l:'Creatives'},{v:'ad-performance',n:'reports',l:'Ad Performance'},{v:'social',n:'globe',l:'Social'},{v:'email-analytics',n:'mail',l:'Email'}]},
    {s:'Insights',items:[{v:'reports',n:'reports',l:'Reports'},{v:'map',n:'map',l:'Account Map'},{v:'web-analytics',n:'globe',l:'Website'}]},
    {s:'Promo Materials',items:[{v:'promo-orders-admin',n:'orders',l:'Orders'},{v:'manage-promo',n:'products',l:'Materials'},{v:'manage-promo-categories',n:'tag',l:'Categories'},{v:'promo-reporting',n:'reports',l:'Reporting'}]},
    {s:'Setup',   items:[{v:'products',n:'products',l:'Products'},{v:'stores',n:'stores',l:'Stores'},{v:'targets',n:'targets',l:'Targets'},{v:'sales-import',n:'download',l:'Sales Import'},{v:'users',n:'settings',l:'Team'},{v:'regions',n:'pin',l:'Regions'},{v:'licenses-admin',n:'accounts',l:'BC Licences'},{v:'dashboard-email',n:'mail',l:'Email Snapshot'},{v:'licence-prospects',n:'accounts',l:'Prospects'}]},
  ],
  rep:[
    {s:'Main',    items:[{v:'dashboard',n:'dashboard',l:'Dashboard'},{v:'accounts',n:'accounts',l:'Accounts'},{v:'visits',n:'visits',l:'Visits'},{v:'tasks',n:'tasks',l:'Tasks'},{v:'licence-prospects',n:'accounts',l:'Prospects'}]},
    {s:'Sales',   items:[{v:'orders',n:'orders',l:'Orders'},{v:'menu-placements',n:'menu',l:'Menu Placements'},{v:'calendar',n:'calendar',l:'Calendar'},{v:'sampling-request',n:'mail',l:'Sampling'}]},
    {s:'Insights',items:[{v:'reports',n:'reports',l:'Reports'},{v:'map',n:'map',l:'Account Map'},{v:'ad-performance',n:'reports',l:'Ad Performance'}]},
    {s:'Promo Materials',items:[{v:'order-promo',n:'products',l:'Order Materials'},{v:'my-promo-orders',n:'orders',l:'My Orders'}]},
  ],
  ambassador:[
    {s:'Main', items:[{v:'dashboard',n:'dashboard',l:'Dashboard'},{v:'accounts',n:'accounts',l:'Accounts'},{v:'tastings',n:'tastings',l:'Tastings'},{v:'calendar',n:'calendar',l:'Calendar'}]},
    {s:'Forms',items:[{v:'sampling-request',n:'mail',l:'Sampling Request'}]},
  ],
};
