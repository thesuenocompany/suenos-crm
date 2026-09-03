import re, sys, os

# Resolve source files relative to this script so the build works anywhere
# (local sandbox, Netlify's /opt/build/repo, etc.) — never a hardcoded path.
BASE = os.path.dirname(os.path.abspath(__file__)) or '.'

# Read source files
with open(f'{BASE}/suenos-crm-cloud-part1.js') as f: cloud1 = f.read()
with open(f'{BASE}/suenos-crm-ui.js')          as f: ui = f.read()
with open(f'{BASE}/suenos-crm-p2b.js')         as f: p2b_src = f.read()
with open(f'{BASE}/suenos-crm-part3.js')        as f: p3_src = f.read()
with open(f'{BASE}/suenos-crm-p4b.js')          as f: p4b = f.read()
with open(f'{BASE}/suenos-crm-promo.js')        as f: promo = f.read()
with open(f'{BASE}/suenos-crm-adanalysis.js')   as f: adanalysis = f.read()
with open(f'{BASE}/suenos-crm-social.js')       as f: social = f.read()
with open(f'{BASE}/suenos-crm-mediadesk.js')    as f: mediadesk = f.read()
with open(f'{BASE}/suenos-crm-voicevisit.js')   as f: voicevisit = f.read()
with open(f'{BASE}/suenos-crm-weather.js')      as f: weather = f.read()
with open(f'{BASE}/suenos-crm-email.js')        as f: email = f.read()
with open(f'{BASE}/suenos-crm-part5.js')        as f: p5_src = f.read()
with open(f'{BASE}/suenos-crm-cloud-part2.js')  as f: cloud2 = f.read()

# Patch credentials
SUPABASE_URL = 'https://dowfjjthshbbgnvwxzjv.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvd2ZqanRoc2hiYmdudnd4emp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzMxNjMsImV4cCI6MjA5NjI0OTE2M30.KnXWIp7BXqoxTv2-os77_7FphL5ZVn1XbB1HTwbxKsU'
EMAILJS_PUBLIC_KEY  = '-JnTsI7cYkBxvm7x-'
EMAILJS_SERVICE_ID  = 'service_llwic8v'
EMAILJS_TEMPLATE_ID = 'template_wxt97cv'
EMAILJS_SAMPLING_TEMPLATE_ID = 'template_y92jxkn'
EMAILJS_TASK_TEMPLATE_ID     = 'template_6ns3oh9'
EMAILJS_AD_SPEC_TEMPLATE_ID  = 'template_90mt01i'
FAL_API_KEY     = '57423b31-b38d-49ec-bd13-741a417f0fbd:62ce8032d4750d6b36df9dc152b1689a'
SUENOS_LOGO_URL = 'YOUR_SUENOS_LOGO_URL'  # paste public URL after uploading logo
GOOGLE_MAPS_KEY = 'AIzaSyAj-IjC1HtBEINhDDJnXE5XcLPAJ7L3kbI'
cloud1 = cloud1.replace("'YOUR_SUPABASE_URL'", f"'{SUPABASE_URL}'")\
               .replace("'YOUR_SUPABASE_ANON_KEY'", f"'{SUPABASE_KEY}'")\
               .replace("'YOUR_EMAILJS_PUBLIC_KEY'", f"'{EMAILJS_PUBLIC_KEY}'")\
               .replace("'YOUR_EMAILJS_SERVICE_ID'", f"'{EMAILJS_SERVICE_ID}'")\
               .replace("'YOUR_EMAILJS_TEMPLATE_ID'", f"'{EMAILJS_TEMPLATE_ID}'")\
               .replace("'YOUR_EMAILJS_SAMPLING_TEMPLATE_ID'", f"'{EMAILJS_SAMPLING_TEMPLATE_ID}'")\
               .replace("'YOUR_EMAILJS_TASK_TEMPLATE_ID'", f"'{EMAILJS_TASK_TEMPLATE_ID}'")\
               .replace("'YOUR_EMAILJS_AD_SPEC_TEMPLATE_ID'", f"'{EMAILJS_AD_SPEC_TEMPLATE_ID}'")\
               .replace("'YOUR_FAL_API_KEY'", f"'{FAL_API_KEY}'")\
               .replace("'YOUR_SUENOS_LOGO_URL'", f"'{SUENOS_LOGO_URL}'")

# p2b: strip LoginScreen, NAV_CFG, Sidebar duplicates
# Keep first 3 lines (file comment + blank + LOGIN section comment), skip through closing }
# of LoginScreen (1-indexed lines 4-119, 0-indexed 3-118), resume at // ─── HEADER ─── (0-indexed 119)
p2b_lines = p2b_src.split('\n')
p2b = '\n'.join(p2b_lines[:3] + ['// (stripped duplicate LoginScreen/NAV_CFG/Sidebar)'] + p2b_lines[119:])

# part3: keep AccountList+Detail, VisitList, EditOrderModal+OrderList+LinkOrderModal
# strip: AccountFormModal/NewAccount, NewVisit, NewOrder (duplicated in cloud2)
# Line refs (1-indexed): AccountFormModal=2342, NewAccount=2418, VisitList=2424, NewVisit=2550, EditOrderModal=2629, NewOrder=2950
p3 = p3_src.split('\n')
def _p3find(name):
    for i, l in enumerate(p3):
        if l.startswith('function ' + name):
            return i
    raise SystemExit('assemble: could not find function ' + name + ' in part3')
iAFM = _p3find('AccountFormModal')   # skip AccountFormModal + NewAccount ...
iVL  = _p3find('VisitList')          # ... up to VisitList
iNV  = _p3find('NewVisit')           # keep VisitList, skip NewVisit ...
iEOM = _p3find('EditOrderModal')     # ... resume at EditOrderModal
iNO  = _p3find('NewOrder')           # keep EditOrderModal/OrderList/LinkOrderModal, skip NewOrder
part3 = '\n'.join(
    p3[:iAFM] +
    ['// (stripped duplicate AccountFormModal/NewAccount)'] +
    p3[iVL:iNV] +
    ['// (stripped duplicate NewVisit)'] +
    p3[iEOM:iNO] +
    ['// (stripped duplicate NewOrder)']
)

# part5: AppRouter only — find the line after `default:` case + closing braces
# Dynamically find the closing } of AppRouter (top-level }, no indent)
_p5_lines = p5_src.split('\n')
_saw_switch = False
_p5_cut = 46  # fallback
for _i, _l in enumerate(_p5_lines):
    if 'switch(view)' in _l or 'switch (view)' in _l:
        _saw_switch = True
    if _saw_switch and _l == '}':  # top-level closing brace, no indent
        _p5_cut = _i + 1
        break
part5 = '\n'.join(_p5_lines[:_p5_cut])

HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover"/>
  <title>Suenos Tequila CRM</title>
  <!-- PWA -->
  <link rel="manifest" href="manifest.json"/>
  <meta name="theme-color" content="#2E8A97"/>
  <link rel="apple-touch-icon" href="https://dowfjjthshbbgnvwxzjv.supabase.co/storage/v1/object/public/brand-assets/pwa/apple-touch-icon.png"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
  <meta name="apple-mobile-web-app-title" content="Sueños CRM"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script>tailwind.config = { darkMode: 'class' };</script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <script src="https://maps.googleapis.com/maps/api/js?key=GOOGLE_MAPS_KEY_PLACEHOLDER&libraries=places" async defer></script>
  <style>
    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F5F0E6; }
    /* Brand cream background — override Tailwind bg-gray-50 */
    .bg-gray-50 { background-color: #F5F0E6 !important; }
    .fade-in { animation: fadeIn 0.2s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .dark { color-scheme: dark; }
    .dark body { background: #030712; }
    .dark .bg-gray-50 { background-color: #030712 !important; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
    .dark ::-webkit-scrollbar-thumb { background: #475569; }
    /* ── iOS PWA safe areas (notch / home indicator) ─────────────── */
    @media (display-mode: standalone) {
      body { padding-top: env(safe-area-inset-top); }
      body { padding-bottom: env(safe-area-inset-bottom); }
    }

    /* ── PDF export — isolate the AI analysis panel ─────────────── */
    @media print {
      body.print-analysis * { visibility: hidden; }
      body.print-analysis #ad-analysis-panel, body.print-analysis #ad-analysis-panel * { visibility: visible; }
      body.print-analysis #ad-analysis-panel { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; box-shadow: none; }
      body.print-analysis .no-print { display: none !important; }
    }

    /* ── PDF export (print) — isolate #ad-performance-print ─────── */
    @media print {
      body.print-adperf { background: white !important; }
      body.print-adperf * { visibility: hidden; }
      body.print-adperf #ad-performance-print, body.print-adperf #ad-performance-print * { visibility: visible; }
      body.print-adperf #ad-performance-print { position: absolute; left: 0; top: 0; width: 100%; padding: 12px !important; }
      body.print-adperf #ad-performance-print .no-print { display: none !important; }
      body.print-adperf #ad-performance-print * { box-shadow: none !important; }
    }
    /* Brand sidebar active state — gold accent */
    .sidebar-link.active { background: rgba(255,255,255,0.20) !important; }
    button.sidebar-link:hover:not(.active) { background: rgba(255,255,255,0.10) !important; color: rgba(255,255,255,0.95) !important; }

    /* ── NEON NIGHTS THEME ─────────────────────────────────────── */
    .neon-theme {
      --nn-pink:  #ff2d78;
      --nn-cyan:  #00e5ff;
      --nn-gold:  #ffc947;
      --nn-bg0:   #05040e;
      --nn-bg1:   #0c091c;
      --nn-glass: rgba(18,16,44,0.82);
      --nn-bc:    rgba(0,229,255,0.20);
      --nn-bp:    rgba(255,45,120,0.28);
      --nn-gc:    0 0 20px rgba(0,229,255,0.13);
      --nn-gp:    0 0 20px rgba(255,45,120,0.18);
    }
    /* smooth transitions when toggling */
    .bg-white, .dark\\:bg-gray-900 {
      transition: background-color 0.25s ease, border-color 0.2s ease, box-shadow 0.25s ease;
    }
    .neon-theme { animation: neonFadeIn 0.3s ease; }
    @keyframes neonFadeIn { from { opacity:0.6; } to { opacity:1; } }

    /* page backgrounds */
    .neon-theme body,
    .neon-theme .bg-gray-50 { background-color: var(--nn-bg0) !important; }
    .neon-theme .dark\\:bg-gray-950 { background-color: var(--nn-bg0) !important; }

    /* sidebar */
    .neon-theme .bg-gradient-to-b {
      background: linear-gradient(180deg, #0d0a20 0%, var(--nn-bg0) 100%) !important;
      border-right: 1px solid var(--nn-bc) !important;
    }
    .neon-theme .sidebar-link.active {
      background: rgba(0,229,255,0.10) !important;
      color: var(--nn-cyan) !important;
      text-shadow: 0 0 8px rgba(0,229,255,0.55);
      border-right: 2px solid var(--nn-cyan);
    }
    .neon-theme a.sidebar-link:hover:not(.active),
    .neon-theme button.sidebar-link:hover:not(.active) {
      background: rgba(0,229,255,0.05) !important;
    }

    /* header */
    .neon-theme .h-14 {
      background: rgba(10,7,22,0.92) !important;
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--nn-bc) !important;
    }

    /* cards, panels — bg-white + dark:bg-gray-900 both become glass */
    .neon-theme .bg-white,
    .neon-theme .dark\\:bg-gray-900 {
      background: var(--nn-glass) !important;
      border-color: var(--nn-bc) !important;
      box-shadow: var(--nn-gc) !important;
    }
    /* modals get a pink-tinted border */
    .neon-theme .shadow-xl.rounded-2xl,
    .neon-theme .rounded-2xl.shadow-xl {
      border: 1px solid var(--nn-bp) !important;
      box-shadow: var(--nn-gp), 0 25px 50px rgba(0,0,0,0.75) !important;
    }

    /* inputs / selects / textareas */
    .neon-theme input:not([type="checkbox"]):not([type="radio"]),
    .neon-theme select,
    .neon-theme textarea {
      background: rgba(8,6,18,0.88) !important;
      border-color: rgba(0,229,255,0.22) !important;
      color: #eeeeff !important;
    }
    .neon-theme input:focus:not([type="checkbox"]):not([type="radio"]),
    .neon-theme select:focus,
    .neon-theme textarea:focus {
      border-color: var(--nn-pink) !important;
      box-shadow: 0 0 0 2px rgba(255,45,120,0.22), 0 0 10px rgba(255,45,120,0.10) !important;
      outline: none;
    }
    .neon-theme input::placeholder,
    .neon-theme textarea::placeholder { color: rgba(0,229,255,0.28) !important; }

    /* primary buttons (teal → hot pink) */
    .neon-theme .bg-teal-600 {
      background: linear-gradient(135deg, var(--nn-pink) 0%, #cc0055 100%) !important;
      box-shadow: 0 0 14px rgba(255,45,120,0.38) !important;
      border: none !important;
    }
    .neon-theme .bg-teal-700,
    .neon-theme .hover\\:bg-teal-700:hover {
      background: linear-gradient(135deg, #ff5599 0%, var(--nn-pink) 100%) !important;
      box-shadow: 0 0 22px rgba(255,45,120,0.55) !important;
    }

    /* accent text / bg overrides */
    .neon-theme .text-teal-600,
    .neon-theme .text-teal-700   { color: var(--nn-cyan) !important; }
    .neon-theme .bg-teal-50      { background: rgba(0,229,255,0.07) !important; }
    .neon-theme .bg-teal-100     { background: rgba(0,229,255,0.12) !important; }
    .neon-theme .text-teal-800,
    .neon-theme .dark\\:text-teal-400 { color: var(--nn-cyan) !important; }

    .neon-theme .text-emerald-600 { color: #00ff9d !important; }
    .neon-theme .bg-emerald-100   { background: rgba(0,255,157,0.09) !important; }
    .neon-theme .text-emerald-700 { color: #00e580 !important; }

    .neon-theme .text-red-500,
    .neon-theme .text-red-600 { color: #ff4466 !important; }
    .neon-theme .bg-red-100   { background: rgba(255,50,80,0.09) !important; }
    .neon-theme .text-red-700 { color: #ff6688 !important; }

    .neon-theme .text-amber-500,
    .neon-theme .text-amber-600 { color: var(--nn-gold) !important; }
    .neon-theme .bg-amber-100   { background: rgba(255,201,71,0.09) !important; }
    .neon-theme .text-amber-700 { color: var(--nn-gold) !important; }
    .neon-theme .bg-amber-400,
    .neon-theme .bg-amber-500   { background-color: var(--nn-gold) !important; }

    .neon-theme .text-blue-600  { color: var(--nn-cyan) !important; }
    .neon-theme .bg-blue-50     { background: rgba(0,229,255,0.06) !important; }
    .neon-theme .bg-blue-100    { background: rgba(0,229,255,0.10) !important; }
    .neon-theme .text-blue-700,
    .neon-theme .dark\\:text-blue-300 { color: var(--nn-cyan) !important; }

    .neon-theme .text-purple-600 { color: #c084fc !important; }
    .neon-theme .bg-purple-100   { background: rgba(192,132,252,0.09) !important; }
    .neon-theme .bg-purple-50    { background: rgba(192,132,252,0.05) !important; }

    .neon-theme .bg-slate-800    { background: rgba(18,14,38,0.85) !important; }
    .neon-theme .bg-slate-900    { background: var(--nn-bg1) !important; }

    /* borders */
    .neon-theme .border-gray-100,
    .neon-theme .border-gray-200 { border-color: rgba(0,229,255,0.10) !important; }
    .neon-theme .dark\\:border-gray-800 { border-color: rgba(0,229,255,0.10) !important; }

    /* hover rows in tables/lists */
    .neon-theme .hover\\:bg-gray-50:hover { background-color: rgba(0,229,255,0.04) !important; }
    .neon-theme .hover\\:bg-gray-100:hover { background-color: rgba(0,229,255,0.06) !important; }

    /* bottom mobile nav */
    .neon-theme .lg\\:hidden.flex-shrink-0.bg-white {
      background: rgba(10,7,22,0.95) !important;
      border-top: 1px solid var(--nn-bc) !important;
    }

    /* body text that would render dark on dark glass → make it light */
    .neon-theme .text-gray-700,
    .neon-theme .text-gray-800 { color: rgba(205,210,240,0.88) !important; }

    /* primary names, account names, headings → neon pink */
    .neon-theme .font-semibold.text-gray-900,
    .neon-theme .font-bold.text-gray-900,
    .neon-theme .font-medium.text-gray-900,
    .neon-theme .font-semibold.dark\:text-white,
    .neon-theme .font-bold.dark\:text-white,
    .neon-theme .font-medium.dark\:text-white {
      color: var(--nn-pink) !important;
      text-shadow: 0 0 8px rgba(255,45,120,0.22);
    }

    /* scrollbar */
    .neon-theme ::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.22) !important; }

    /* moon icon glow when neon is active */
    .neon-icon-glow {
      color: var(--nn-pink, #ff2d78);
      filter: drop-shadow(0 0 5px rgba(255,45,120,0.75));
      animation: neonIconPulse 2.5s ease-in-out infinite;
    }
    @keyframes neonIconPulse {
      0%,100% { filter: drop-shadow(0 0 4px rgba(255,45,120,0.65)); }
      50%      { filter: drop-shadow(0 0 10px rgba(255,45,120,0.95)) drop-shadow(0 0 20px rgba(255,45,120,0.50)); }
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
'''

FOOT = '''
  </script>
  <script>
    // Error reporter — shows any crash on-screen instead of blank page
    window.addEventListener('error', function(e) {
      var d = document.getElementById('root');
      d.innerHTML = '<div style="font-family:monospace;padding:24px;background:#1e1e2e;color:#f38ba8;min-height:100vh">'
        + '<h2 style="color:#cba6f7;margin-bottom:12px">CRM Error</h2>'
        + '<p><b>' + (e.message||'Unknown error') + '</b></p>'
        + '<p style="color:#a6e3a1;margin-top:8px">File: ' + (e.filename||'') + '</p>'
        + '<p style="color:#89dceb">Line: ' + (e.lineno||'?') + ', Col: ' + (e.colno||'?') + '</p>'
        + (e.error ? '<pre style="color:#fab387;font-size:11px;margin-top:12px;white-space:pre-wrap">' + e.error.stack + '</pre>' : '')
        + '</div>';
    });
    window.addEventListener('unhandledrejection', function(e) {
      var d = document.getElementById('root');
      if (!d.innerHTML.includes('CRM Error')) {
        d.innerHTML = '<div style="font-family:monospace;padding:24px;background:#1e1e2e;color:#f38ba8;min-height:100vh">'
          + '<h2 style="color:#cba6f7;margin-bottom:12px">CRM Async Error</h2>'
          + '<pre style="color:#fab387;font-size:11px;white-space:pre-wrap">' + (e.reason?.stack || String(e.reason)) + '</pre>'
          + '</div>';
      }
    });
  </script>
  <!-- PWA: register service worker for install + offline shell -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function (err) {
          console.warn('[PWA] Service worker registration failed:', err);
        });
      });
    }
  </script>
</body>
</html>'''

assembled = HEAD + cloud1 + '\n' + ui + '\n' + p2b + '\n' + part3 + '\n' + p4b + '\n' + promo + '\n' + adanalysis + '\n' + social + '\n' + mediadesk + '\n' + voicevisit + '\n' + weather + '\n' + email + '\n' + part5 + '\n' + cloud2 + FOOT
assembled = assembled.replace('GOOGLE_MAPS_KEY_PLACEHOLDER', GOOGLE_MAPS_KEY)

# authLoading fix is baked into suenos-crm-cloud-part2.js directly

# Fix setup warning: credential substitution makes condition always-true; suppress it
assembled = assembled.replace(
    f"SUPABASE_URL === '{SUPABASE_URL}'",
    "false /* credentials configured */"
)

with open(f'{BASE}/index.html', 'w') as f:
    f.write(assembled)

# Check for duplicate function names that would cause issues
import re
funcs = re.findall(r'(?:^|\n)(?:async )?function ([A-Z][a-zA-Z]+)\s*\(', assembled)
from collections import Counter
dupes = {k:v for k,v in Counter(funcs).items() if v > 1}
if dupes:
    print(f"WARNING - Duplicate functions: {dupes}")
else:
    print("OK - No duplicate top-level function names")

# Check for duplicate const declarations of key items
for name in ['NAV_CFG', 'LoginScreen', 'AccountFormModal', 'NewAccount', 'NewVisit', 'NewOrder', 'RegionsView']:
    count = assembled.count(f'function {name}')
    const_count = assembled.count(f'const {name}')
    if count > 1 or const_count > 1:
        print(f"WARNING - {name} defined {count} times (function) / {const_count} times (const)")
    else:
        print(f"OK - {name}: {count} function def, {const_count} const def")

size_kb = len(assembled) / 1024
print(f"\nOutput: index.html ({size_kb:.0f} KB)")
