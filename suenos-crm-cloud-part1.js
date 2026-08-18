// CLOUD PART 1: Supabase init, data layer, auth, core state

// ── CONFIG — replace these values ────────────────────────────
const SUPABASE_URL  = 'YOUR_SUPABASE_URL';   // e.g. https://abcxyz.supabase.co
const SUPABASE_KEY  = 'YOUR_SUPABASE_ANON_KEY'; // from Settings → API → anon/public

// ── EMAIL CONFIG (EmailJS) ────────────────────────────────────
// Sign up free at https://emailjs.com → Email Services → Email Templates
// Paste your IDs below once configured (see setup guide)
const EMAILJS_PUBLIC_KEY  = 'YOUR_EMAILJS_PUBLIC_KEY';
const EMAILJS_SERVICE_ID  = 'YOUR_EMAILJS_SERVICE_ID';
const EMAILJS_TEMPLATE_ID          = 'YOUR_EMAILJS_TEMPLATE_ID';
const EMAILJS_SAMPLING_TEMPLATE_ID = 'YOUR_EMAILJS_SAMPLING_TEMPLATE_ID';
const EMAILJS_TASK_TEMPLATE_ID     = 'YOUR_EMAILJS_TASK_TEMPLATE_ID';
const EMAILJS_INVOICE_TEMPLATE_ID  = 'template_5yfs6yl';
const EMAILJS_AD_SPEC_TEMPLATE_ID  = 'YOUR_EMAILJS_AD_SPEC_TEMPLATE_ID';
const ORDER_ADMIN_EMAIL            = 'jason@suenos.ca';
const EDGE_FN_URL         = `${SUPABASE_URL}/functions/v1`;

// ── Ad Creative Image Generator (Fal.ai + Canvas compositing) ────────────────
const FAL_API_KEY             = 'YOUR_FAL_API_KEY'; // fal.ai → Dashboard → Keys
const GENERATE_IMAGE_FN       = 'generate-ad-image'; // Supabase Edge Function name
const SUENOS_LOGO_URL         = 'YOUR_SUENOS_LOGO_URL'; // public URL to master Sueños logo PNG

// ── Meta Ad Tool ──────────────────────────────────────────────────────────────
// Endpoint for the generate-ad Supabase Edge Function.
// After deploying the function, this resolves automatically from EDGE_FN_URL.
const GENERATE_AD_FN      = 'generate-ad';      // deployed fn name — change only if you rename it
const GENERATE_AD_COPY_FN = 'generate-ad-copy'; // AI ad copy generator — requires ANTHROPIC_API_KEY secret
const AD_RADIUS_URBAN   = 10;            // km — dense metro markets (Vancouver, etc.)
const AD_RADIUS_TOWN    = 20;            // km — smaller BC markets

const { useState, useEffect, useReducer, useContext, createContext, useRef, useMemo } = React;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CONSTANTS ─────────────────────────────────────────────────
const REGIONS        = ['Vancouver','Victoria','Kelowna / Okanagan','Fraser Valley','Calgary','Edmonton','Red Deer','Lethbridge'];
const ACCOUNT_TYPES  = ['Private Liquor Store','Government Liquor Store','Restaurant','Bar','Hotel','Golf Course','Resort','Festival','Event Organizer','Other'];
const ACCOUNT_STATUSES = ['Prospect','Sample Sent','Buyer Meeting','Listing Pending','Listed','Active','At Risk','Lost'];
const VISIT_TYPES    = ['Cold Call','Follow Up','Buyer Meeting','Product Sampling','Staff Training','Tasting','Menu Placement','Order Collection','Merchandising'];
const ORDER_STATUSES = ['Draft','Submitted','Accepted','Delivered','Completed','Cancelled'];
const MENU_ITEMS     = ['Margarita','Paloma','Ranch Water','House Cocktail'];
const MENU_STATUSES  = ['Not Discussed','Discussing','Seasonal Feature','Permanent Placement'];

// Province-specific tax rates (Canada) — DEFAULTS ONLY.
// These are overridden by the per-province rates configured in Settings → Province Tax Rates.
const PROVINCE_TAX = {
  BC: { pstRate:7,     gstRate:5,   pstLabel:'PST', gstLabel:'GST' },
  AB: { pstRate:0,     gstRate:5,   pstLabel:'',    gstLabel:'GST' },
  SK: { pstRate:6,     gstRate:5,   pstLabel:'PST', gstLabel:'GST' },
  MB: { pstRate:7,     gstRate:5,   pstLabel:'PST', gstLabel:'GST' },
  ON: { pstRate:0,     gstRate:13,  pstLabel:'',    gstLabel:'HST' },
  QC: { pstRate:9.975, gstRate:5,   pstLabel:'QST', gstLabel:'GST' },
  NB: { pstRate:0,     gstRate:15,  pstLabel:'',    gstLabel:'HST' },
  NS: { pstRate:0,     gstRate:15,  pstLabel:'',    gstLabel:'HST' },
  PE: { pstRate:0,     gstRate:15,  pstLabel:'',    gstLabel:'HST' },
  NL: { pstRate:0,     gstRate:15,  pstLabel:'',    gstLabel:'HST' },
  NT: { pstRate:0,     gstRate:5,   pstLabel:'',    gstLabel:'GST' },
  YT: { pstRate:0,     gstRate:5,   pstLabel:'',    gstLabel:'GST' },
  NU: { pstRate:0,     gstRate:5,   pstLabel:'',    gstLabel:'GST' },
};
const PROVINCE_OPTIONS = [
  {value:'BC',label:'BC — British Columbia'},{value:'AB',label:'AB — Alberta'},
  {value:'SK',label:'SK — Saskatchewan'},{value:'MB',label:'MB — Manitoba'},
  {value:'ON',label:'ON — Ontario'},{value:'QC',label:'QC — Quebec'},
  {value:'NB',label:'NB — New Brunswick'},{value:'NS',label:'NS — Nova Scotia'},
  {value:'PE',label:'PE — Prince Edward Island'},{value:'NL',label:'NL — Newfoundland & Labrador'},
  {value:'NT',label:'NT — Northwest Territories'},{value:'YT',label:'YT — Yukon'},
  {value:'NU',label:'NU — Nunavut'},
];

// Look up the effective tax rates for a province, merging custom saved rates over the defaults.
// customRates = state.provinceTaxRates (loaded from app_settings).
function getProvinceTax(province, customRates) {
  if (!province) return null;
  const def    = PROVINCE_TAX[province];
  const custom = customRates?.[province];
  if (!def && !custom) return null;
  return {
    pstRate:  custom?.pstRate  !== undefined ? parseFloat(custom.pstRate)  : (def?.pstRate  ?? 0),
    gstRate:  custom?.gstRate  !== undefined ? parseFloat(custom.gstRate)  : (def?.gstRate  ?? 5),
    pstLabel: def?.pstLabel || 'PST',
    gstLabel: def?.gstLabel || 'GST',
  };
}

// ── DB ↔ APP MAPPING ──────────────────────────────────────────
// Converts snake_case DB rows to camelCase app objects
function mapAccount(r) {
  return { id:r.id, name:r.name, type:r.type, region:r.region, assignedRep:r.assigned_rep,
    address:r.address, lat:r.lat, lng:r.lng, contact:r.contact, email:r.email,
    phone:r.phone, website:r.website, status:r.status||'Prospect', notes:r.notes||'',
    liquorLicenseName:r.liquor_license_name||'', licenseNumber:r.license_number||'',
    pstNumber:r.pst_number||'', pstOverride:r.pst_override||'',
    menuPlacements:r.menu_placements||{}, lastVisit:r.last_visit, lastOrder:r.last_order,
    logoUrl:r.logo_url||null, createdAt:r.created_at?.slice(0,10)||today(),
    budgetTotal:r.budget_total||null, budgetPerBottle:r.budget_per_bottle||null,
    budgetPerCase:r.budget_per_case||null, budgetPctBottle:r.budget_pct_bottle||null,
    budgetPctCase:r.budget_pct_case||null };
}
function mapVisit(r) {
  return { id:r.id, accountId:r.account_id, date:r.date, contact:r.contact||'',
    type:r.type||'Follow Up', notes:r.notes||'', outcome:r.outcome||'',
    followUpDate:r.follow_up_date, repId:r.rep_id, checks:r.checks||{} };
}
function mapOrder(r) {
  return { id:r.id, accountId:r.account_id, productId:r.product_id, bottles:r.bottles,
    requestedDate:r.requested_date, storeId:r.store_id, status:r.status,
    notes:r.notes||'', repId:r.rep_id, createdAt:r.created_at?.slice(0,10)||today(),
    licenseNumber:r.license_number||'', orderedBy:r.ordered_by||'', billingEmail:r.billing_email||'',
    pstNumber:r.pst_number||'', subtotal:r.subtotal||0,
    pstAmount:r.pst_amount||0, gstAmount:r.gst_amount||0, total:r.total||0 };
}
function mapProduct(r) {
  return { id:r.id, name:r.name, sku:r.sku, size:r.size, casePack:r.case_pack,
    price:r.price, active:r.active, prices:r.prices||{},
    upc:r.upc||'', scc:r.scc||'', cspc:r.cspc||'', imageUrl:r.image_url||null };
}
function mapStore(r) {
  return { id:r.id, name:r.name, address:r.address, contact:r.contact,
    email:r.email, phone:r.phone, region:r.region,
    licenseNumber: r.license_number || '', gstNumber: r.gst_number || '',
    province: r.province || '' };
}
function mapTask(r) {
  return { id:r.id, accountId:r.account_id, title:r.title, dueDate:r.due_date,
    repId:r.rep_id, priority:r.priority||'medium', done:r.done||false };
}
function mapTasting(r) {
  return { id:r.id, accountId:r.account_id, date:r.date, location:r.location||'',
    staff:r.staff||'', bottlesUsed:r.bottles_used||0, samplesServed:r.samples_served||0,
    notes:r.notes||'', repId:r.rep_id };
}
function mapSale(r) {
  return { id:r.id, month:r.month, accountId:r.account_id, productId:r.product_id,
    bottles:r.bottles, revenue:r.revenue, repId:r.rep_id||null };
}
function mapTarget(r) {
  return { id:r.id, repId:r.rep_id, month:r.month, visits:r.visits,
    newAccounts:r.new_accounts, newListings:r.new_listings, bottles:r.bottles, revenue:r.revenue };
}
function mapProfile(r) {
  return { id:r.id, name:r.name, email:r.email||'', role:r.role, regions:r.regions||[],
    initials:r.initials||(r.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
    active:r.active!==false, sellSheetPath:r.sell_sheet_path||null,
    lastLoginAt:r.last_login_at||null, mustChangePassword:r.must_change_password===true,
    marketingAlertsEnabled:r.marketing_alerts_enabled!==false };
}
function mapTastingEvent(r) {
  return { id:r.id, title:r.title, eventDate:r.event_date, eventTime:r.event_time||'',
    location:r.location||'', accountId:r.account_id||null,
    staffedByName:r.staffed_by_name||null,
    notes:r.notes||'', createdBy:r.created_by||null };
}
function mapPlacement(r) {
  return { id:r.id, accountId:r.account_id, repId:r.rep_id,
    listingType:r.listing_type, itemName:r.item_name,
    price:r.price||null, includesTax:r.includes_tax||false,
    description:r.description||'', photoUrl:r.photo_url||null,
    startDate:r.start_date||null, endDate:r.end_date||null,
    createdAt:r.created_at?.slice(0,10)||today() };
}

// ── UTILITIES ──────────────────────────────────────────────────
const fmtDate     = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'}) : '—';
const fmtShort    = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-CA',{month:'short',day:'numeric'}) : '—';
const fmtCurrency = n => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n||0);
const daysSince   = d => d ? Math.floor((Date.now()-new Date(d+'T12:00:00'))/86400000) : 999;
const genId       = () => Math.random().toString(36).slice(2,10);
const today       = () => new Date().toISOString().slice(0,10);

function calcHealth(account) {
  let score = 50;
  const vd = daysSince(account.lastVisit), od = daysSince(account.lastOrder);
  if (vd<14) score+=20; else if (vd<30) score+=10; else if (vd>60) score-=20;
  if (od<30) score+=20; else if (od<60) score+=5;  else if (od>90) score-=20;
  const perms = Object.values(account.menuPlacements||{}).filter(p=>p==='Permanent Placement').length;
  score += perms*8;
  if (account.status==='Active') score+=5;
  if (account.status==='At Risk'||account.status==='Lost') score-=15;
  if (!account.lastVisit) score-=10;
  return Math.max(0, Math.min(100, score));
}
function healthInfo(score) {
  if (score>=70) return {label:'Healthy',    color:'text-emerald-600 dark:text-emerald-400',bg:'bg-emerald-50 dark:bg-emerald-900/20',dot:'bg-emerald-500',ring:'ring-emerald-300'};
  if (score>=40) return {label:'Watch List', color:'text-teal-700 dark:text-teal-400',  bg:'bg-teal-50 dark:bg-teal-900/20',  dot:'bg-teal-600',  ring:'ring-teal-300'};
  return               {label:'At Risk',    color:'text-red-600 dark:text-red-400',      bg:'bg-red-50 dark:bg-red-900/20',      dot:'bg-red-500',    ring:'ring-red-300'};
}

// ── CONTEXT & REDUCER ──────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const INITIAL_STATE = {
  // auth
  session: null, user: null, authLoading: true,
  // data
  accounts:[], visits:[], orders:[], products:[], stores:[],
  tasks:[], tastings:[], tastingEvents:[], sales:[], targets:[], users:[], regions:[], placements:[],
  pricingData:[], pricingRuns:[], pricingSettings:{provinces:['BC','ON'], enabled:true}, pricingFetching:false,
  // ui
  view:'dashboard', params:{}, darkMode:false, neonMode: localStorage.getItem('crm-neon')==='1', toast:null, loading:false,
  // notice bar
  notice: { text:'', active:false },
  // tax settings
  taxSettings: { enabled: true, pstRate: 0, gstRate: 5 },
  // per-province custom tax rates (overrides PROVINCE_TAX defaults)
  provinceTaxRates: {},
  // meta ad specs history (keyed array, loaded per account on open)
  adSpecs: [],
  // invoice
  invoiceFooter: '',
  bottleDeposit: 0,   // flat per-bottle container deposit (tax-exempt), applied to invoices
  // voice & tone brand guidelines (pasted text, stored in app_settings)
  voiceTone: '',
  // structured brand voice controls for the AI writer (stored in app_settings as JSON)
  voiceProfile: null,  // { tone, humour, formality, emoji, spanish, banned, examples }
  // Sueños master brand logo URL (stored in brand-assets bucket, set in Settings)
  brandLogoUrl: '',
  // account expenses
  expenses: [],
  // ad creative library (images uploaded to Supabase Storage)
  adCreatives: [],
  // meta campaigns created via Cluster Ad Planner (with cached Insights metrics)
  metaCampaigns: [],
  adDrafts: [],
  licenseDismissals: [],  // { id, licenceNumber, reason, dismissedBy }
  dashEmailConfig: null,  // { id, emails, sendHour, sendDays, enabled, timezone, lastSentAt }
  // ── Promotional Materials module ──
  promoCategories: [],
  promoMaterials: [],      // each material carries .variants[]
  promoOrders: [],         // each order carries .items[]
  promoRepCostVisible: false, // admin toggle — show unit cost to reps
  adAnalyses: [],             // saved AI ad-performance analyses
  marketingAlerts: [],        // declining-ad performance alerts
  tradeSettings: { houseAccountOwnerId:'', adminNotifyAll:false, adminNotifyRecipientIds:[] }, // Trade Inquiries config
  promoSettings: { orderNotifyRecipientIds:[] }, // Promo order notification recipients (empty = all admins)
};

function reducer(s, a) {
  switch(a.type) {
    case 'SET_SESSION':    return {...s, session:a.payload, authLoading:false};
    case 'SET_USER':       return {...s, user:a.payload};
    case 'VIEW_AS':        return {...s, realUser:s.user, user:a.payload, view:'dashboard', params:{}};
    case 'EXIT_VIEW_AS':   return {...s, user:s.realUser, realUser:null, view:'dashboard', params:{}};
    case 'SET_DATA':       return {...s, ...a.payload};
    case 'NAV':            return {...s, view:a.view, params:a.params||{}};
    case 'TOGGLE_DARK':    return {...s, darkMode:!s.darkMode};
    case 'TOGGLE_NEON':    { const nn=!s.neonMode; localStorage.setItem('crm-neon',nn?'1':'0'); return {...s, neonMode:nn}; }
    case 'LOADING':        return {...s, loading:a.value};
    case 'SET_NOTICE':     return {...s, notice:a.payload};
    case 'ADD_ACCOUNT':    return {...s, accounts:[...s.accounts, a.payload]};
    case 'ADD_PLACEMENT':  return {...s, placements:[a.payload, ...s.placements]};
    case 'UPD_PLACEMENT':  return {...s, placements:s.placements.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'UPD_ACCOUNT':    return {...s, accounts:s.accounts.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'DEL_ACCOUNT':    return {...s, accounts:s.accounts.filter(x=>x.id!==a.id)};
    case 'ADD_VISIT':      return {...s, visits:[...s.visits, a.payload]};
    case 'ADD_ORDER':      return {...s, orders:[...s.orders, a.payload]};
    case 'UPD_ORDER':      return {...s, orders:s.orders.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'DEL_ORDER':      return {...s, orders:s.orders.filter(x=>x.id!==a.id)};
    case 'ADD_TASK':       return {...s, tasks:[...s.tasks, a.payload]};
    case 'UPD_TASK':       return {...s, tasks:s.tasks.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'DEL_TASK':       return {...s, tasks:s.tasks.filter(x=>x.id!==a.id)};
    case 'ADD_TASTING':         return {...s, tastings:[...s.tastings, a.payload]};
    case 'ADD_TASTING_EVENT':   return {...s, tastingEvents:[...s.tastingEvents, a.payload]};
    case 'UPD_TASTING_EVENT':   return {...s, tastingEvents:s.tastingEvents.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'DEL_TASTING_EVENT':   return {...s, tastingEvents:s.tastingEvents.filter(x=>x.id!==a.id)};
    case 'ADD_PRODUCT':    return {...s, products:[...s.products, a.payload]};
    case 'UPD_PRODUCT':    return {...s, products:s.products.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'DEL_PRODUCT':    return {...s, products:s.products.filter(x=>x.id!==a.id)};
    case 'ADD_STORE':      return {...s, stores:[...s.stores, a.payload]};
    case 'UPD_STORE':      return {...s, stores:s.stores.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'DEL_STORE':      return {...s, stores:s.stores.filter(x=>x.id!==a.id)};
    case 'ADD_USER':       return {...s, users:[...s.users, a.payload]};
    case 'UPD_USER':       return {...s, users:s.users.map(x=>x.id===a.payload.id?{...x,...a.payload}:x)};
    case 'DEL_USER':       return {...s, users:s.users.filter(x=>x.id!==a.id)};
    case 'ADD_SALES':      return {...s, sales:[...s.sales, ...a.payload]};
    case 'SET_SALES':      return {...s, sales:a.payload};
    case 'UPD_SALE':       return {...s, sales:s.sales.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'DEL_SALE':       return {...s, sales:s.sales.filter(x=>x.id!==a.id)};
    case 'ADD_REGION':     return {...s, regions:[...s.regions, a.payload].sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name))};
    case 'DEL_REGION':     return {...s, regions:s.regions.filter(x=>x.id!==a.id)};
    case 'UPD_REGION':     return {...s, regions:s.regions.map(x=>x.id===a.payload.id?{...x,...a.payload}:x)};
    case 'SET_TARGET': {
      const idx = s.targets.findIndex(t=>t.repId===a.payload.repId&&t.month===a.payload.month);
      if(idx>=0){ const t=[...s.targets]; t[idx]=a.payload; return {...s,targets:t}; }
      return {...s, targets:[...s.targets, a.payload]};
    }
    case 'SET_PRICING_DATA':     return {...s, pricingData:a.payload};
    case 'SET_PRICING_RUNS':     return {...s, pricingRuns:a.payload};
    case 'SET_PRICING_SETTINGS': return {...s, pricingSettings:a.payload};
    case 'SET_TAX_SETTINGS':        return {...s, taxSettings:a.payload};
    case 'SET_PROVINCE_TAX_RATES':  return {...s, provinceTaxRates:a.payload};
    case 'SET_AD_SPECS':            return {...s, adSpecs:a.payload};
    case 'ADD_AD_SPEC':             return {...s, adSpecs:[a.payload, ...s.adSpecs]};
    case 'DELETE_AD_SPEC':          return {...s, adSpecs:s.adSpecs.filter(x=>x.id!==a.payload)};
    case 'SET_BRAND_LOGO':          return {...s, brandLogoUrl:a.payload};
    case 'SET_EXPENSES':       return {...s, expenses:a.payload};
    case 'ADD_EXPENSE':        return {...s, expenses:[...s.expenses, a.payload]};
    case 'DEL_EXPENSE':        return {...s, expenses:s.expenses.filter(x=>x.id!==a.id)};
    case 'SET_AD_CREATIVES':   return {...s, adCreatives:a.payload};
    case 'ADD_AD_CREATIVE':    return {...s, adCreatives:[a.payload, ...s.adCreatives]};
    case 'DEL_AD_CREATIVE':    return {...s, adCreatives:s.adCreatives.filter(x=>x.id!==a.id)};
    case 'UPD_AD_CREATIVE':    return {...s, adCreatives:s.adCreatives.map(x=>x.id===a.payload.id?{...x,...a.payload}:x)};
    case 'SET_META_CAMPAIGNS': return {...s, metaCampaigns:a.payload};
    case 'ADD_META_CAMPAIGN':  return {...s, metaCampaigns:[a.payload, ...s.metaCampaigns]};
    case 'UPD_META_CAMPAIGN':  return {...s, metaCampaigns:s.metaCampaigns.map(x=>x.id===a.payload.id?{...x,...a.payload}:x)};
    case 'SET_AD_DRAFTS':      return {...s, adDrafts:a.payload};
    case 'ADD_AD_DRAFT':       return {...s, adDrafts:[a.payload, ...s.adDrafts]};
    case 'UPD_AD_DRAFT':       return {...s, adDrafts:s.adDrafts.map(d=>d.id===a.payload.id?{...d,...a.payload}:d)};
    case 'SET_DISMISSALS':       return {...s, licenseDismissals:a.payload};
    case 'ADD_DISMISSAL':        return {...s, licenseDismissals:[...s.licenseDismissals, a.payload]};
    case 'SET_DASH_EMAIL_CONFIG': return {...s, dashEmailConfig:a.payload};
    case 'SET_PROMO_CATEGORIES': return {...s, promoCategories:a.payload};
    case 'SET_PROMO_MATERIALS':  return {...s, promoMaterials:a.payload};
    case 'ADD_PROMO_MATERIAL':   return {...s, promoMaterials:[a.payload, ...s.promoMaterials]};
    case 'UPD_PROMO_MATERIAL':   return {...s, promoMaterials:s.promoMaterials.map(m=>m.id===a.payload.id?{...m,...a.payload}:m)};
    case 'SET_PROMO_ORDERS':     return {...s, promoOrders:a.payload};
    case 'ADD_PROMO_ORDER':      return {...s, promoOrders:[a.payload, ...s.promoOrders]};
    case 'UPD_PROMO_ORDER':      return {...s, promoOrders:s.promoOrders.map(o=>o.id===a.payload.id?{...o,...a.payload}:o)};
    case 'SET_PROMO_REP_COST':   return {...s, promoRepCostVisible:a.payload};
    case 'SET_AD_ANALYSES':      return {...s, adAnalyses:a.payload};
    case 'ADD_AD_ANALYSIS':      return {...s, adAnalyses:[a.payload, ...s.adAnalyses]};
    case 'UPD_AD_ANALYSIS':      return {...s, adAnalyses:s.adAnalyses.map(x=>x.id===a.payload.id?{...x,...a.payload}:x)};
    case 'SET_MARKETING_ALERTS': return {...s, marketingAlerts:a.payload};
    case 'UPD_MARKETING_ALERT':  return {...s, marketingAlerts:s.marketingAlerts.map(x=>x.id===a.payload.id?{...x,...a.payload}:x)};
    case 'SET_TRADE_SETTINGS':   return {...s, tradeSettings:{...s.tradeSettings, ...a.payload}};
    case 'SET_PROMO_SETTINGS':   return {...s, promoSettings:{...s.promoSettings, ...a.payload}};
    case 'SET_INVOICE_FOOTER':      return {...s, invoiceFooter:a.payload};
    case 'SET_BOTTLE_DEPOSIT':      return {...s, bottleDeposit:a.payload};
    case 'SET_VOICE_TONE':          return {...s, voiceTone:a.payload};
    case 'SET_VOICE_PROFILE':       return {...s, voiceProfile:a.payload};
    case 'PRICING_FETCHING':     return {...s, pricingFetching:a.payload};
    case 'TOAST':   return {...s, toast:a.payload};
    case 'UNTOAST': return {...s, toast:null};
    default:        return s;
  }
}

// ── SUPABASE DATA LOADER ───────────────────────────────────────
async function loadAllData(dispatch) {
  dispatch({type:'LOADING', value:true});
  try {
    const [
      {data:accounts}, {data:visits}, {data:orders}, {data:products},
      {data:stores},   {data:tasks},  {data:tastings},{data:sales},
      {data:targets},  {data:users},  {data:regions}, {data:placements},
      {data:tastingEvents}
    ] = await Promise.all([
      sb.from('accounts').select('*').order('name'),
      sb.from('visits').select('*').order('date', {ascending:false}),
      sb.from('orders').select('*').order('created_at', {ascending:false}),
      sb.from('products').select('*').order('name'),
      sb.from('stores').select('*').order('name'),
      sb.from('tasks').select('*').order('due_date'),
      sb.from('tastings').select('*').order('date', {ascending:false}),
      sb.from('sales').select('*'),
      sb.from('targets').select('*'),
      sb.from('profiles').select('*').order('name'),
      sb.from('regions').select('*').order('sort_order').order('name'),
      sb.from('menu_placements').select('*').order('created_at', {ascending:false}),
      sb.from('tasting_events').select('*').order('event_date'),
    ]);
    dispatch({type:'SET_DATA', payload:{
      accounts: (accounts||[]).map(mapAccount),
      visits:   (visits||[]).map(mapVisit),
      orders:   (orders||[]).map(mapOrder),
      products: (products||[]).map(mapProduct),
      stores:   (stores||[]).map(mapStore),
      tasks:    (tasks||[]).map(mapTask),
      tastings: (tastings||[]).map(mapTasting),
      sales:    (sales||[]).map(mapSale),
      targets:  (targets||[]).map(mapTarget),
      users:    (users||[]).map(mapProfile),
      regions:  (regions||[]).map(r=>({id:r.id, name:r.name, sortOrder:r.sort_order||0, active:r.active!==false, boundary:r.boundary||null, color:r.color||null})),
      placements:    (placements||[]).map(mapPlacement),
      tastingEvents: (tastingEvents||[]).map(mapTastingEvent),
    }});
    // Load app_settings (notice bar + tax) — separate try so it never breaks main load
    try {
      const { data: settings, error: sErr } = await sb.from('app_settings').select('*');
      console.log('[AppSettings] fetch:', settings, sErr);
      if (settings?.length) {
        const textRow   = settings.find(r=>r.key==='notice_text');
        const activeRow = settings.find(r=>r.key==='notice_active');
        dispatch({ type:'SET_NOTICE', payload:{
          text:   textRow?.value   || '',
          active: activeRow?.value === 'true',
        }});
        const taxEnabledRow = settings.find(r=>r.key==='tax_enabled');
        const taxPstRow     = settings.find(r=>r.key==='tax_pst_rate');
        const taxGstRow     = settings.find(r=>r.key==='tax_gst_rate');
        dispatch({ type:'SET_TAX_SETTINGS', payload:{
          enabled: taxEnabledRow ? taxEnabledRow.value === 'true' : true,
          pstRate: taxPstRow     ? parseFloat(taxPstRow.value)    : 0,
          gstRate: taxGstRow     ? parseFloat(taxGstRow.value)    : 5,
        }});
        const footerRow = settings.find(r=>r.key==='invoice_footer');
        if (footerRow) dispatch({ type:'SET_INVOICE_FOOTER', payload: footerRow.value || '' });
        const depositRow = settings.find(r=>r.key==='bottle_deposit');
        if (depositRow) dispatch({ type:'SET_BOTTLE_DEPOSIT', payload: parseFloat(depositRow.value) || 0 });
        const provRatesRow = settings.find(r=>r.key==='province_tax_rates');
        if (provRatesRow?.value) {
          try { dispatch({ type:'SET_PROVINCE_TAX_RATES', payload: JSON.parse(provRatesRow.value) }); } catch(e) {}
        }
        const brandLogoRow = settings.find(r=>r.key==='brand_logo_url');
        if (brandLogoRow?.value) dispatch({ type:'SET_BRAND_LOGO', payload: brandLogoRow.value });
        const voiceToneRow = settings.find(r=>r.key==='voice_tone_instructions');
        if (voiceToneRow) dispatch({ type:'SET_VOICE_TONE', payload: voiceToneRow.value || '' });
        const voiceProfileRow = settings.find(r=>r.key==='voice_profile');
        if (voiceProfileRow?.value) {
          try { dispatch({ type:'SET_VOICE_PROFILE', payload: JSON.parse(voiceProfileRow.value) }); } catch(e) {}
        }
        // Trade Inquiries config (House Account owner + admin notifications)
        {
          const owner = settings.find(r=>r.key==='trade_house_account_owner_id');
          const notifyAll = settings.find(r=>r.key==='trade_admin_notify_all');
          const recips = settings.find(r=>r.key==='trade_admin_notify_recipient_ids');
          let recipientIds = [];
          try { const p = JSON.parse(recips?.value || '[]'); if (Array.isArray(p)) recipientIds = p.map(String); } catch(e) {}
          dispatch({ type:'SET_TRADE_SETTINGS', payload:{
            houseAccountOwnerId: owner?.value || '',
            adminNotifyAll: notifyAll?.value === 'true',
            adminNotifyRecipientIds: recipientIds,
          }});
        }
        // Promo order notification recipients (empty = fall back to all admins)
        {
          const pr = settings.find(r=>r.key==='promo_order_notify_recipient_ids');
          let ids = [];
          try { const p = JSON.parse(pr?.value || '[]'); if (Array.isArray(p)) ids = p.map(String); } catch(e) {}
          dispatch({ type:'SET_PROMO_SETTINGS', payload:{ orderNotifyRecipientIds: ids } });
        }
        // Sync API credentials (Meta + Anthropic) from DB → this device.
        // Any device that saved creds pushes them to app_settings; every login pulls them down.
        ['anthropic_api_key','meta_access_token','meta_page_id','meta_website_url'].forEach(k=>{
          const row = settings.find(r=>r.key===k);
          if (row?.value) localStorage.setItem(k, row.value);
        });
      }
    } catch(ne) { console.warn('[AppSettings] load failed:', ne); }
    // Load expenses
    try { await dbLoadExpenses(dispatch); } catch(ee) { console.warn('[Expenses] load failed:', ee); }
    // Load ad creative library
    try { await dbLoadAdCreatives(dispatch); } catch(ce) { console.warn('[AdCreatives] load failed:', ce); }
    // Load meta campaigns
    try { await dbLoadMetaCampaigns(dispatch); } catch(me) { console.warn('[MetaCampaigns] load failed:', me); }
    // Load ad drafts
    try { await dbLoadAdDrafts(dispatch); } catch(de) { console.warn('[AdDrafts] load failed:', de); }
    // Backfill: any accounts that went Listed in the last 24h with no draft yet
    try { await backfillListingDrafts(dispatch); } catch(be) { console.warn('[Backfill] draft backfill failed:', be); }
    // Resolve current user id/role once (this loader only has `dispatch` in scope)
    let _uid = null, _role = null;
    try {
      _uid = (await sb.auth.getUser())?.data?.user?.id || null;
      if (_uid) { const { data:_p } = await sb.from('profiles').select('role').eq('id', _uid).maybeSingle(); _role = _p?.role || null; }
    } catch(_) {}
    // Load licence dismissals for current user
    try { if(_uid) await dbLoadDismissals(dispatch, _uid); } catch(de) { console.warn('[Dismissals] load failed:', de); }
    // Load dashboard email config (admin only)
    try { await dbLoadDashEmailConfig(dispatch); } catch(de) { console.warn('[DashEmail] load failed:', de); }
    // Load promotional materials module (catalog + orders scoped by RLS)
    try { await dbLoadPromo(dispatch, _role === 'admin'); } catch(pe) { console.warn('[Promo] load failed:', pe); }
    // Load saved AI ad analyses
    try { await dbLoadAdAnalyses(dispatch); } catch(ae) { console.warn('[AdAnalyses] load failed:', ae); }
    // Load marketing alerts (declining ad performance)
    try { await dbLoadMarketingAlerts(dispatch); } catch(ma) { console.warn('[MarketingAlerts] load failed:', ma); }
  } catch(e) {
    console.error('Data load error:', e);
  } finally {
    dispatch({type:'LOADING', value:false});
  }
}

async function dbSaveNotice(dispatch, text, active) {
  dispatch({ type:'SET_NOTICE', payload:{ text, active } });
  await sb.from('app_settings').upsert([
    { key:'notice_text',   value: text },
    { key:'notice_active', value: active ? 'true' : 'false' },
  ], { onConflict:'key' });
}

async function dbSaveInvoiceFooter(dispatch, text) {
  dispatch({ type:'SET_INVOICE_FOOTER', payload: text });
  await sb.from('app_settings').upsert([
    { key:'invoice_footer', value: text },
  ], { onConflict:'key' });
}
async function dbSaveBottleDeposit(dispatch, amount) {
  const val = Number(amount) || 0;
  dispatch({ type:'SET_BOTTLE_DEPOSIT', payload: val });
  await sb.from('app_settings').upsert([
    { key:'bottle_deposit', value: String(val) },
  ], { onConflict:'key' });
}
async function dbSaveVoiceTone(dispatch, text) {
  dispatch({ type:'SET_VOICE_TONE', payload: text });
  await sb.from('app_settings').upsert([
    { key:'voice_tone_instructions', value: text },
  ], { onConflict:'key' });
}

// Save an API credential to this device AND the shared DB so it syncs to all devices.
async function dbSaveApiCred(key, value) {
  localStorage.setItem(key, value || '');
  try {
    await sb.from('app_settings').upsert([{ key, value: value || '' }], { onConflict:'key' });
  } catch(e) { console.warn('[ApiCred] DB sync failed (saved locally):', e); }
}

async function dbSaveVoiceProfile(dispatch, profile) {
  dispatch({ type:'SET_VOICE_PROFILE', payload: profile });
  await sb.from('app_settings').upsert([
    { key:'voice_profile', value: JSON.stringify(profile) },
  ], { onConflict:'key' });
}

// Turn the structured voice profile into explicit style directives for the AI writer.
function buildVoiceDirectives(p) {
  if (!p) return '';
  const L = [];
  const tone = {
    premium:  'Refined and premium — elegant, understated confidence. Let quality speak.',
    balanced: 'Balanced — premium quality with an approachable, human feel.',
    playful:  'Playful and bold — energetic, fun, a little irreverent. Grab attention.',
  };
  const humour = {
    none:    'No humour. Sincere and straight.',
    subtle:  'Subtle wit — a light clever touch, never jokey.',
    playful: 'Playful humour — fun wordplay and warmth welcome.',
    cheeky:  'Cheeky — bold, confident humour that stops the scroll.',
  };
  const formality = {
    casual:   'Casual, conversational language — like texting a friend.',
    balanced: 'Balanced register — polished but relaxed.',
    polished: 'Sophisticated, polished language throughout.',
  };
  const emoji = {
    none:     'Never use emojis.',
    light:    'At most one well-chosen emoji.',
    generous: 'Use 2–3 fitting emojis.',
  };
  const spanish = {
    none:  'English only — no Spanish words.',
    light: 'A light touch of Spanish where it feels natural (salud, sueños, agave).',
    bold:  'Weave Spanish phrases in confidently — the brand is proudly Mexican.',
  };
  if (p.tone      && tone[p.tone])           L.push(`Tone: ${tone[p.tone]}`);
  if (p.humour    && humour[p.humour])       L.push(`Humour: ${humour[p.humour]}`);
  if (p.formality && formality[p.formality]) L.push(`Formality: ${formality[p.formality]}`);
  if (p.emoji     && emoji[p.emoji])         L.push(`Emoji: ${emoji[p.emoji]}`);
  if (p.spanish   && spanish[p.spanish])     L.push(`Spanish: ${spanish[p.spanish]}`);
  if (p.banned?.trim())   L.push(`BANNED — never use these words or phrases: ${p.banned.trim()}`);
  if (p.examples?.trim()) L.push(`Example ads that nail our voice — match their style and energy:\n${p.examples.trim()}`);
  return L.length ? `\n\nStyle Directives (follow strictly):\n- ${L.join('\n- ')}` : '';
}

// ── AI AD COPY GENERATOR ──────────────────────────────────────────────────────
// Calls the Anthropic API directly from the browser.
// API key stored in localStorage (same pattern as Meta token — internal tool only).
// Anthropic supports direct browser calls via the 'anthropic-dangerous-direct-browser-access' header.
async function generateAdCopyWithAI({ city, dominantType, region, voiceTone, voiceProfile, existingCopy, instructions }) {
  const key = localStorage.getItem('anthropic_api_key') || '';
  if (!key) throw new Error('No Anthropic API key set. Add it in Settings → AI Copy.');

  const base = voiceTone
    ? `You are a copywriter for Sueños Tequila, a premium Mexican craft tequila brand sold in Canada.\n\nBrand Voice & Tone Guidelines:\n${voiceTone}\n\nAlways follow these guidelines when writing copy.`
    : `You are a copywriter for Sueños Tequila, a premium Mexican craft tequila brand sold in Canada. Write bold, authentic copy rooted in Mexican heritage. Warm and inviting, never corporate.`;
  const systemPrompt = base + buildVoiceDirectives(voiceProfile);

  const userPrompt = `Write a Facebook/Instagram ad for a ${city}${region ? `, ${region}` : ''} campaign targeting customers near ${(dominantType||'restaurant and bar').toLowerCase()} accounts that carry Sueños Tequila.

Return ONLY a JSON object with exactly these three fields:
- "headline": a punchy ad headline (max 40 characters)
- "copy": the main ad body text (2–3 sentences, conversational, max 200 characters)
- "description": a short link description (max 80 characters, e.g. "Now available at select bars in ${city}.")

Return only the raw JSON object, no markdown, no explanation.${existingCopy ? `\n\nExisting copy for reference / improvement:\n"${existingCopy}"` : ''}${instructions ? `\n\nExtra instructions for this generation:\n${instructions}` : ''}`;

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
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0,200)}`);
  }

  const data = await res.json();
  const raw = (data.content?.[0]?.text || '{}').trim()
    .replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/,'');
  let parsed = {};
  try { parsed = JSON.parse(raw); } catch { parsed = { copy: raw }; }
  return {
    headline:    (parsed.headline    || '').slice(0, 40),
    copy:        (parsed.copy        || '').slice(0, 500),
    description: (parsed.description || '').slice(0, 120),
  };
}

// ── AI RADIO SCRIPT GENERATOR (Spotify audio ads) ─────────────────────────────
async function generateRadioScriptWithAI({ city, dominantType, voiceTone, voiceProfile, instructions }) {
  const key = localStorage.getItem('anthropic_api_key') || '';
  if (!key) throw new Error('No Anthropic API key set. Add it in Settings → API Credentials.');

  const base = voiceTone
    ? `You are an audio copywriter for Sueños Tequila, a premium Mexican craft tequila brand sold in Canada.\n\nBrand Voice & Tone Guidelines:\n${voiceTone}\n\nAlways follow these guidelines.`
    : `You are an audio copywriter for Sueños Tequila, a premium Mexican craft tequila brand sold in Canada. Write bold, authentic copy rooted in Mexican heritage. Warm and inviting, never corporate.`;
  const systemPrompt = base + buildVoiceDirectives(voiceProfile);

  const userPrompt = `Write a 30-second Spotify audio ad script for Sueños Tequila, aimed at listeners in ${city}${dominantType ? ` near ${dominantType.toLowerCase()} venues that carry the brand` : ''}.

Rules:
- 60–75 words (reads naturally in ~30 seconds)
- Written to be SPOKEN aloud by one voice — conversational rhythm, no visual references
- Optional [SFX: ...] or [PAUSE] cues are allowed
- Must mention the brand name at least twice and end with a clear call to action
- Responsible drinking tone — adults only, never encourage overconsumption

Return ONLY a JSON object:
{"script": "the full spoken script", "tagline": "on-screen tagline, max 40 characters"}${instructions ? `\n\nExtra instructions:\n${instructions}` : ''}`;

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
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0,200)}`);
  const data = await res.json();
  const raw = (data.content?.[0]?.text || '{}').trim()
    .replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/,'');
  let parsed = {};
  try { parsed = JSON.parse(raw); } catch { parsed = { script: raw }; }
  return {
    script:  (parsed.script  || '').slice(0, 1200),
    tagline: (parsed.tagline || '').slice(0, 40),
  };
}

async function dbSaveProvinceTaxRates(dispatch, rates) {
  dispatch({ type:'SET_PROVINCE_TAX_RATES', payload: rates });
  await sb.from('app_settings').upsert([
    { key:'province_tax_rates', value: JSON.stringify(rates) },
  ], { onConflict:'key' });
}

async function dbLoadAdSpecs(dispatch, accountId) {
  const { data } = await sb.from('meta_ad_specs')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(20);
  dispatch({ type:'SET_AD_SPECS', payload: data || [] });
}
async function dbSaveAdSpec(dispatch, { accountId, userId, adSpec }) {
  const row = { account_id: accountId, created_by: userId, ad_spec: adSpec };
  const { data, error } = await sb.from('meta_ad_specs').insert([row]).select().single();
  if (!error && data) dispatch({ type:'ADD_AD_SPEC', payload: data });
}
async function dbDeleteAdSpec(dispatch, id) {
  dispatch({ type:'DELETE_AD_SPEC', payload: id });
  await sb.from('meta_ad_specs').delete().eq('id', id);
}

// ── AD CREATIVE LIBRARY ───────────────────────────────────────
const FORMAT_LABELS = {
  feed_square:    'Feed Square (1:1)',
  feed_portrait:  'Feed Portrait (4:5)',
  stories_reels:  'Stories / Reels (9:16)',
  right_column:   'Right Column (1.91:1)',
  radio_15:       'Radio :15 (audio)',
  radio_30:       'Radio :30 (audio)',
  other:          'Other',
};
function mapCreative(row) {
  return {
    id:          row.id,
    name:        row.name,
    format:      row.format,
    formatLabel: FORMAT_LABELS[row.format] || row.format,
    width:       row.width  || null,
    height:      row.height || null,
    storagePath: row.storage_path,
    publicUrl:   row.public_url,
    notes:       row.notes  || '',
    group:       row.group_name || null,
    createdAt:   row.created_at,
  };
}
async function dbLoadAdCreatives(dispatch) {
  const { data, error } = await sb.from('ad_creatives')
    .select('*')
    .order('created_at', { ascending: false });
  if (!error) dispatch({ type:'SET_AD_CREATIVES', payload: (data||[]).map(mapCreative) });
}
async function dbSaveCreative(dispatch, { name, format, notes, file, group }) {
  // 1. Upload image to Supabase Storage
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const { error: upErr } = await sb.storage.from('ad-images').upload(path, file, {
    upsert: false, contentType: file.type,
  });
  if (upErr) throw new Error('Upload failed: ' + upErr.message);

  // 2. Get public URL
  const { data: urlData } = sb.storage.from('ad-images').getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // 3. Insert DB row
  const row = { name, format, notes: notes||'', storage_path: path, public_url: publicUrl, group_name: (group||'').trim() || null };
  const { data, error: dbErr } = await sb.from('ad_creatives').insert([row]).select().single();
  if (dbErr) throw new Error('DB insert failed: ' + dbErr.message);

  dispatch({ type:'ADD_AD_CREATIVE', payload: mapCreative(data) });
  return mapCreative(data);
}
async function dbSetCreativeGroup(dispatch, id, group) {
  const g = (group || '').trim() || null;
  dispatch({ type:'UPD_AD_CREATIVE', payload:{ id, group: g } });
  await sb.from('ad_creatives').update({ group_name: g }).eq('id', id);
}
async function dbDeleteCreative(dispatch, id, storagePath) {
  dispatch({ type:'DEL_AD_CREATIVE', id });
  await sb.from('ad_creatives').delete().eq('id', id);
  if (storagePath) await sb.storage.from('ad-images').remove([storagePath]);
}

// Trade Inquiries config → app_settings (admin-only write enforced by app_settings RLS)
async function dbSaveTradeSettings(dispatch, { houseAccountOwnerId, adminNotifyAll, adminNotifyRecipientIds }) {
  const ids = Array.isArray(adminNotifyRecipientIds) ? adminNotifyRecipientIds.map(String) : [];
  dispatch({ type:'SET_TRADE_SETTINGS', payload:{ houseAccountOwnerId: houseAccountOwnerId||'', adminNotifyAll: !!adminNotifyAll, adminNotifyRecipientIds: ids } });
  const { error } = await sb.from('app_settings').upsert([
    { key:'trade_house_account_owner_id',     value: houseAccountOwnerId || '' },
    { key:'trade_admin_notify_all',           value: adminNotifyAll ? 'true' : 'false' },
    { key:'trade_admin_notify_recipient_ids', value: JSON.stringify(ids) },
  ], { onConflict:'key' });
  if (error) throw error;
}

// Promo order notification recipients → app_settings (admin-only write)
async function dbSavePromoSettings(dispatch, { orderNotifyRecipientIds }) {
  const ids = Array.isArray(orderNotifyRecipientIds) ? orderNotifyRecipientIds.map(String) : [];
  dispatch({ type:'SET_PROMO_SETTINGS', payload:{ orderNotifyRecipientIds: ids } });
  const { error } = await sb.from('app_settings').upsert([
    { key:'promo_order_notify_recipient_ids', value: JSON.stringify(ids) },
  ], { onConflict:'key' });
  if (error) throw error;
}

async function dbSaveTaxSettings(dispatch, { enabled, pstRate, gstRate }) {
  dispatch({ type:'SET_TAX_SETTINGS', payload:{ enabled, pstRate, gstRate } });
  await sb.from('app_settings').upsert([
    { key:'tax_enabled',  value: enabled  ? 'true' : 'false' },
    { key:'tax_pst_rate', value: String(pstRate) },
    { key:'tax_gst_rate', value: String(gstRate) },
  ], { onConflict:'key' });
}

// ── SUPABASE WRITE HELPERS ────────────────────────────────────
// Each helper: optimistic local dispatch → async DB write → rollback on error
async function dbAddAccount(dispatch, account) {
  dispatch({type:'ADD_ACCOUNT', payload:account});
  const {error} = await sb.from('accounts').insert({
    id:account.id, name:account.name, type:account.type, region:account.region,
    assigned_rep:account.assignedRep||null, address:account.address,
    lat:account.lat||null, lng:account.lng||null,
    contact:account.contact, email:account.email, phone:account.phone,
    website:account.website, status:account.status, notes:account.notes,
    liquor_license_name:account.liquorLicenseName||null,
    license_number:account.licenseNumber||null,
    pst_number:account.pstNumber||null,
    pst_override:account.pstOverride||null,
    menu_placements:account.menuPlacements||{},
  });
  if (error) { console.error(error); dispatch({type:'TOAST',payload:{msg:'Save failed: '+error.message,type:'error'}}); }
}
async function dbDelAccount(dispatch, id) {
  const {error} = await sb.from('accounts').delete().eq('id', id);
  if (error) {
    console.error('Delete account error:', error);
    dispatch({type:'TOAST', payload:{msg:'Delete failed: '+error.message, type:'error'}});
    return false;
  }
  dispatch({type:'DEL_ACCOUNT', id});
  return true;
}
async function dbUpdAccount(dispatch, account) {
  dispatch({type:'UPD_ACCOUNT', payload:account});
  const {error} = await sb.from('accounts').update({
    name:account.name, type:account.type, region:account.region,
    assigned_rep:account.assignedRep||null, address:account.address,
    lat:account.lat||null, lng:account.lng||null,
    contact:account.contact, email:account.email, phone:account.phone,
    website:account.website, status:account.status, notes:account.notes,
    liquor_license_name:account.liquorLicenseName||null,
    license_number:account.licenseNumber||null,
    pst_number:account.pstNumber||null,
    pst_override:account.pstOverride||null,
    menu_placements:account.menuPlacements||{},
    last_visit:account.lastVisit||null, last_order:account.lastOrder||null,
  }).eq('id', account.id);
  if (error) console.error(error);
}
async function dbUploadAccountLogo(dispatch, account, file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${account.id}.${ext}`;
  const { error: upErr } = await sb.storage.from('account-logos').upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (upErr) {
    console.error('[logo upload]', upErr);
    showToast(dispatch, 'Upload failed: ' + (upErr.message || 'Storage error — check bucket exists'), 'error');
    return null;
  }
  const { data } = sb.storage.from('account-logos').getPublicUrl(path);
  const logoUrl = data?.publicUrl || null;
  if (logoUrl) {
    await sb.from('accounts').update({ logo_url: logoUrl }).eq('id', account.id);
    dispatch({ type:'UPD_ACCOUNT', payload:{ ...account, logoUrl } });
  }
  return logoUrl;
}
async function dbRemoveAccountLogo(dispatch, account) {
  const ext = (account.logoUrl||'').split('.').pop();
  await sb.storage.from('account-logos').remove([`${account.id}.${ext}`]);
  await sb.from('accounts').update({ logo_url: null }).eq('id', account.id);
  dispatch({ type:'UPD_ACCOUNT', payload:{ ...account, logoUrl: null } });
}
async function dbSaveAccountBudget(dispatch, account, budget) {
  const { error } = await sb.from('accounts').update({
    budget_total:      budget.budgetTotal      != null ? Number(budget.budgetTotal)      : null,
    budget_per_bottle: budget.budgetPerBottle  != null ? Number(budget.budgetPerBottle)  : null,
    budget_per_case:   budget.budgetPerCase    != null ? Number(budget.budgetPerCase)    : null,
    budget_pct_bottle: budget.budgetPctBottle  != null ? Number(budget.budgetPctBottle)  : null,
    budget_pct_case:   budget.budgetPctCase    != null ? Number(budget.budgetPctCase)    : null,
  }).eq('id', account.id);
  if (error) throw error;
  dispatch({ type:'UPD_ACCOUNT', payload:{ ...account, ...budget } });
}
async function dbLoadExpenses(dispatch) {
  const { data } = await sb.from('account_expenses').select('*').order('expense_date', { ascending: false });
  dispatch({ type:'SET_EXPENSES', payload: (data||[]).map(r=>({
    id:r.id, accountId:r.account_id, item:r.item,
    amount:r.amount, date:r.expense_date, createdBy:r.created_by, createdAt:r.created_at,
  }))});
}
async function dbAddExpense(dispatch, accountId, item, amount, date, userId) {
  const { data, error } = await sb.from('account_expenses').insert({
    account_id:accountId, item, amount:Number(amount), expense_date:date, created_by:userId,
  }).select().single();
  if (error) throw error;
  dispatch({ type:'ADD_EXPENSE', payload:{
    id:data.id, accountId:data.account_id, item:data.item,
    amount:data.amount, date:data.expense_date, createdBy:data.created_by,
  }});
  return data;
}
async function dbDeleteExpense(dispatch, id) {
  await sb.from('account_expenses').delete().eq('id', id);
  dispatch({ type:'DEL_EXPENSE', id });
}
async function dbLoadBrandLogo(dispatch) {
  const { data } = await sb.from('app_settings').select('value').eq('key','brand_logo_url').maybeSingle();
  if (data?.value) dispatch({ type:'SET_BRAND_LOGO', payload: data.value });
}
async function dbUploadBrandLogo(dispatch, file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `suenos-logo.${ext}`;
  const { error } = await sb.storage.from('brand-assets').upload(path, file, { upsert:true, contentType: file.type });
  if (error) throw error;
  const { data } = sb.storage.from('brand-assets').getPublicUrl(path);
  const url = data?.publicUrl;
  if (!url) throw new Error('Could not get public URL');
  // Store in app_settings
  await sb.from('app_settings').upsert({ key:'brand_logo_url', value:url }, { onConflict:'key' });
  dispatch({ type:'SET_BRAND_LOGO', payload: url });
  return url;
}
async function _uploadPlacementPhoto(id, photoFile) {
  const ext = photoFile.name.split('.').pop();
  const path = `${id}.${ext}`;
  const { error } = await sb.storage.from('menu-placement-photos').upload(path, photoFile, {upsert:true});
  if (error) return null;
  const { data } = sb.storage.from('menu-placement-photos').getPublicUrl(path);
  return data?.publicUrl || null;
}
async function dbAddMenuPlacement(dispatch, p, photoFile) {
  const photoUrl = photoFile ? await _uploadPlacementPhoto(p.id, photoFile) : null;
  const record = {...p, photoUrl};
  dispatch({type:'ADD_PLACEMENT', payload:record});
  const {error} = await sb.from('menu_placements').insert({
    id:record.id, account_id:record.accountId, rep_id:record.repId,
    listing_type:record.listingType, item_name:record.itemName,
    price:record.price||null, includes_tax:record.includesTax||false,
    description:record.description||null, photo_url:record.photoUrl||null,
    start_date:record.startDate||null, end_date:record.endDate||null,
  });
  if (error) { console.error(error); dispatch({type:'TOAST',payload:{msg:'Save failed: '+error.message,type:'error'}}); }
}
async function dbUpdMenuPlacement(dispatch, p, photoFile) {
  const photoUrl = photoFile ? await _uploadPlacementPhoto(p.id, photoFile) : p.photoUrl;
  const record = {...p, photoUrl};
  dispatch({type:'UPD_PLACEMENT', payload:record});
  const {error} = await sb.from('menu_placements').update({
    account_id:record.accountId, rep_id:record.repId,
    listing_type:record.listingType, item_name:record.itemName,
    price:record.price||null, includes_tax:record.includesTax||false,
    description:record.description||null, photo_url:record.photoUrl||null,
    start_date:record.startDate||null, end_date:record.endDate||null,
  }).eq('id', record.id);
  if (error) { console.error(error); dispatch({type:'TOAST',payload:{msg:'Update failed: '+error.message,type:'error'}}); }
}
async function dbAddVisit(dispatch, visit) {
  dispatch({type:'ADD_VISIT', payload:visit});
  const {error} = await sb.from('visits').insert({
    id:visit.id, account_id:visit.accountId, date:visit.date,
    contact:visit.contact, type:visit.type, notes:visit.notes,
    outcome:visit.outcome, follow_up_date:visit.followUpDate||null,
    rep_id:visit.repId, checks:visit.checks||{},
  });
  if (error) console.error(error);
}
async function dbAddOrder(dispatch, order) {
  dispatch({type:'ADD_ORDER', payload:order});
  // Try full insert (includes tax columns added in later migration)
  const fullRow = {
    id:order.id, account_id:order.accountId, product_id:order.productId,
    bottles:order.bottles, requested_date:order.requestedDate||null,
    store_id:order.storeId, status:order.status, notes:order.notes,
    rep_id:order.repId, license_number:order.licenseNumber||null,
    ordered_by:order.orderedBy||null, billing_email:order.billingEmail||null,
    pst_number:order.pstNumber||null, subtotal:order.subtotal||0,
    pst_amount:order.pstAmount||0, gst_amount:order.gstAmount||0, total:order.total||0,
  };
  let {error} = await sb.from('orders').insert(fullRow);
  // If insert failed (e.g. missing tax columns), fall back to core columns only
  if (error) {
    console.warn('[dbAddOrder] Full insert failed, trying core columns:', error.message);
    const coreRow = {
      id:order.id, account_id:order.accountId, product_id:order.productId,
      bottles:order.bottles, requested_date:order.requestedDate||null,
      store_id:order.storeId, status:order.status, notes:order.notes,
      rep_id:order.repId, license_number:order.licenseNumber||null,
      ordered_by:order.orderedBy||null, billing_email:order.billingEmail||null,
    };
    const fallback = await sb.from('orders').insert(coreRow);
    if (fallback.error) {
      console.error('[dbAddOrder] Core insert also failed:', fallback.error);
      showToast(dispatch, `Order not saved: ${fallback.error.message}`, 'error');
      // Remove optimistic entry from state so user knows it didn't persist
      dispatch({type:'DEL_ORDER', id:order.id});
      return;
    }
    // Core insert succeeded — show a warning so admin knows to run the SQL migration
    console.warn('[dbAddOrder] Saved with core columns only — run orders SQL migration to add tax fields');
  }
  // Auto-promote account to Listed if still in a pre-listing status
  if (order.accountId) {
    const preListed = ['Prospect','Sample Sent','Buyer Meeting','Listing Pending'];
    const { data: acc } = await sb.from('accounts').select('status').eq('id', order.accountId).single();
    if (acc && preListed.includes(acc.status)) {
      await sb.from('accounts').update({ status:'Listed' }).eq('id', order.accountId);
      dispatch({ type:'UPD_ACCOUNT', payload:{ id:order.accountId, status:'Listed' } });
      createListingAdDraft(dispatch, order.accountId).catch(e => console.warn('Ad draft:', e));
    }
  }
}
async function dbMarkOrderedAccountsListed(dispatch, accounts, orders) {
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear()-1);
  const cutoffStr = cutoff.toISOString().slice(0,10);
  const preListed = ['Prospect','Sample Sent','Buyer Meeting','Listing Pending'];
  // Accounts with an order in the past year that are still in a pre-listing status
  const orderedIds = new Set(orders.filter(o=>o.status!=='Cancelled'&&o.createdAt>=cutoffStr).map(o=>o.accountId));
  const toUpdate = accounts.filter(a=>orderedIds.has(a.id)&&preListed.includes(a.status));
  if (!toUpdate.length) return 0;
  const ids = toUpdate.map(a=>a.id);
  const {error} = await sb.from('accounts').update({status:'Listed'}).in('id', ids);
  if (error) { console.error(error); return 0; }
  toUpdate.forEach(a=>dispatch({type:'UPD_ACCOUNT', payload:{id:a.id, status:'Listed'}}));
  return toUpdate.length;
}
async function dbUpdOrder(dispatch, order) {
  dispatch({type:'UPD_ORDER', payload:order});
  await sb.from('orders').update({
    status:         order.status,
    product_id:     order.productId,
    bottles:        order.bottles,
    requested_date: order.requestedDate,
    store_id:       order.storeId,
    notes:          order.notes||null,
    license_number: order.licenseNumber||null,
    ordered_by:     order.orderedBy||null,
    billing_email:  order.billingEmail||null,
    account_id:     order.accountId||null,
    pst_number:     order.pstNumber||null,
    subtotal:       order.subtotal||0,
    pst_amount:     order.pstAmount||0,
    gst_amount:     order.gstAmount||0,
    total:          order.total||0,
  }).eq('id', order.id);
}
async function dbCompleteOrder(dispatch, order) {
  const updated = { ...order, status: 'completed' };
  dispatch({ type: 'UPD_ORDER', payload: updated });
  await sb.from('orders').update({ status: 'completed' }).eq('id', order.id);
}
async function dbAddTask(dispatch, task) {
  dispatch({type:'ADD_TASK', payload:task});
  const {error} = await sb.from('tasks').insert({
    id:task.id, account_id:task.accountId, title:task.title,
    due_date:task.dueDate, rep_id:task.repId, priority:task.priority, done:false, notes:task.notes||null,
  });
  if (error) console.error(error);
}
async function sendTaskNotification({ assignedUser, assignerName, taskTitle, accountName, dueDate, priority }) {
  console.log('[TaskEmail] called', { assignedUser, assignerName, taskTitle });
  if (!assignedUser?.email) { console.warn('[TaskEmail] no email on assignedUser', assignedUser); return; }
  if (typeof emailjs === 'undefined') { console.warn('[TaskEmail] emailjs not loaded'); return; }
  if (!EMAILJS_TASK_TEMPLATE_ID || !EMAILJS_SERVICE_ID) { console.warn('[TaskEmail] missing template or service ID'); return; }
  try {
    console.log('[TaskEmail] sending to', assignedUser.email, 'template', EMAILJS_TASK_TEMPLATE_ID);
    emailjs.init(EMAILJS_PUBLIC_KEY);
    const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TASK_TEMPLATE_ID, {
      to_email:      assignedUser.email,
      assignee_name: assignedUser.name || assignedUser.email,
      assigner_name: assignerName || 'Admin',
      task_title:    taskTitle,
      account_name:  accountName || 'N/A',
      due_date:      dueDate || 'N/A',
      priority:      priority || 'medium',
    });
    console.log('[TaskEmail] success', result);
  } catch(e) {
    console.error('[TaskEmail] failed:', e);
  }
}
async function dbUpdTask(dispatch, task) {
  dispatch({type:'UPD_TASK', payload:task});
  await sb.from('tasks').update({done:task.done, title:task.title}).eq('id', task.id);
}
async function dbDelTask(dispatch, id) {
  dispatch({type:'DEL_TASK', id});
  await sb.from('tasks').delete().eq('id', id);
}
async function dbAddTastingEvent(dispatch, evt) {
  dispatch({type:'ADD_TASTING_EVENT', payload:evt});
  const {error} = await sb.from('tasting_events').insert({
    id:evt.id, title:evt.title, event_date:evt.eventDate, event_time:evt.eventTime||null,
    location:evt.location||null, account_id:evt.accountId||null,
    staffed_by_name:evt.staffedByName||null, notes:evt.notes||null, created_by:evt.createdBy||null,
  });
  if (error) console.error(error);
}
async function dbUpdTastingEvent(dispatch, evt) {
  dispatch({type:'UPD_TASTING_EVENT', payload:evt});
  const {error} = await sb.from('tasting_events').update({
    title:evt.title, event_date:evt.eventDate, event_time:evt.eventTime||null,
    location:evt.location||null, account_id:evt.accountId||null,
    staffed_by_name:evt.staffedByName||null, notes:evt.notes||null,
  }).eq('id', evt.id);
  if (error) console.error(error);
}
async function dbDelTastingEvent(dispatch, id) {
  dispatch({type:'DEL_TASTING_EVENT', id});
  const {error} = await sb.from('tasting_events').delete().eq('id', id);
  if (error) console.error(error);
}
async function sendTastingEventNotification({ staffedUser, assignerName, eventTitle, location, eventDate, eventTime, notes }) {
  if (!staffedUser || !staffedUser.email) return;
  if (typeof emailjs === 'undefined') return;
  if (!EMAILJS_TASK_TEMPLATE_ID || !EMAILJS_SERVICE_ID) return;
  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TASK_TEMPLATE_ID, {
      to_email:      staffedUser.email,
      assignee_name: staffedUser.name || staffedUser.email,
      assigner_name: assignerName || 'Admin',
      task_title:    eventTitle,
      account_name:  location || 'TBD',
      due_date:      eventDate + (eventTime ? ' at ' + eventTime : ''),
      priority:      'tasting event',
    });
  } catch(e) {
    console.error('[TastingEventEmail] failed:', e);
  }
}
async function dbAddTasting(dispatch, tasting) {
  dispatch({type:'ADD_TASTING', payload:tasting});
  const {error} = await sb.from('tastings').insert({
    id:tasting.id, account_id:tasting.accountId||null, date:tasting.date,
    location:tasting.location, staff:tasting.staff,
    bottles_used:tasting.bottlesUsed, samples_served:tasting.samplesServed,
    notes:tasting.notes, rep_id:tasting.repId,
  });
  if (error) console.error(error);
}
async function _uploadProductImage(id, file) {
  const ext = file.name.split('.').pop();
  const path = `${id}.${ext}`;
  const { error } = await sb.storage.from('product-images').upload(path, file, {upsert:true});
  if (error) return null;
  const { data } = sb.storage.from('product-images').getPublicUrl(path);
  return data?.publicUrl || null;
}
async function dbAddProduct(dispatch, product, imageFile) {
  const imageUrl = imageFile ? await _uploadProductImage(product.id, imageFile) : null;
  const record = {...product, imageUrl};
  dispatch({type:'ADD_PRODUCT', payload:record});
  await sb.from('products').insert({ id:record.id, name:record.name, sku:record.sku, size:record.size, case_pack:record.casePack, price:record.price||0, active:record.active, prices:record.prices||{}, upc:record.upc||null, scc:record.scc||null, cspc:record.cspc||null, image_url:record.imageUrl||null });
}
async function dbUpdProduct(dispatch, product, imageFile) {
  const imageUrl = imageFile ? await _uploadProductImage(product.id, imageFile) : product.imageUrl||null;
  const record = {...product, imageUrl};
  dispatch({type:'UPD_PRODUCT', payload:record});
  await sb.from('products').update({ name:record.name, sku:record.sku, size:record.size, case_pack:record.casePack, price:record.price||0, active:record.active, prices:record.prices||{}, upc:record.upc||null, scc:record.scc||null, cspc:record.cspc||null, image_url:record.imageUrl||null }).eq('id', record.id);
}
async function dbDelProduct(dispatch, id) {
  dispatch({type:'DEL_PRODUCT', id});
  const {error} = await sb.from('products').delete().eq('id', id);
  if (error) console.error('Delete product error:', error);
}
async function dbDelStore(dispatch, id) {
  dispatch({type:'DEL_STORE', id});
  const {error} = await sb.from('stores').delete().eq('id', id);
  if (error) console.error('Delete store error:', error);
}
async function dbAddStore(dispatch, store) {
  dispatch({type:'ADD_STORE', payload:store});
  await sb.from('stores').insert({ id:store.id, name:store.name, address:store.address, contact:store.contact, email:store.email, phone:store.phone, region:store.region, license_number:store.licenseNumber||null, gst_number:store.gstNumber||null, province:store.province||null });
}
async function dbUpdStore(dispatch, store) {
  dispatch({type:'UPD_STORE', payload:store});
  await sb.from('stores').update({ name:store.name, address:store.address, contact:store.contact, email:store.email, phone:store.phone, region:store.region, license_number:store.licenseNumber||null, gst_number:store.gstNumber||null, province:store.province||null }).eq('id', store.id);
}
async function dbAddSales(dispatch, rows) {
  dispatch({type:'ADD_SALES', payload:rows});
  const {error} = await sb.from('sales').insert(rows.map(r=>({ id:r.id, month:r.month, account_id:r.accountId, product_id:r.productId, bottles:r.bottles, revenue:r.revenue, rep_id:r.repId||null })));
  if (error) { console.error('Sales insert error:', error); }
  // Auto-promote accounts to Listed when a sale is imported against them
  const preListed = ['Prospect','Sample Sent','Buyer Meeting','Listing Pending'];
  const accountIds = [...new Set(rows.map(r=>r.accountId).filter(Boolean))];
  if (accountIds.length > 0) {
    const { data: accs } = await sb.from('accounts').select('id,status').in('id', accountIds);
    const toPromote = (accs||[]).filter(a => preListed.includes(a.status)).map(a => a.id);
    if (toPromote.length > 0) {
      await sb.from('accounts').update({ status:'Listed' }).in('id', toPromote);
      toPromote.forEach(id => dispatch({ type:'UPD_ACCOUNT', payload:{ id, status:'Listed' } }));
      toPromote.forEach(id => createListingAdDraft(dispatch, id).catch(e => console.warn('Ad draft:', e)));
    }
  }
}
async function dbUpdSale(dispatch, sale) {
  dispatch({type:'UPD_SALE', payload:sale});
  const {error} = await sb.from('sales').update({ month:sale.month, account_id:sale.accountId, product_id:sale.productId, bottles:sale.bottles, revenue:sale.revenue, rep_id:sale.repId||null }).eq('id', sale.id);
  if (error) { console.error('Sale update error:', error); dispatch({type:'TOAST',payload:{msg:'Update failed: '+error.message,type:'error'}}); }
}
async function dbBulkReassignProduct(dispatch, newProductId, sales) {
  const updated = sales.map(s=>({...s, productId:newProductId}));
  dispatch({type:'SET_SALES', payload:updated});
  const {error} = await sb.from('sales').update({product_id:newProductId}).neq('id','00000000-0000-0000-0000-000000000000');
  if (error) { console.error('Bulk reassign error:', error); dispatch({type:'TOAST',payload:{msg:'Bulk update failed: '+error.message,type:'error'}}); return false; }
  return true;
}
async function dbDelSale(dispatch, id) {
  dispatch({type:'DEL_SALE', id});
  const {error} = await sb.from('sales').delete().eq('id', id);
  if (error) { console.error('Sale delete error:', error); }
}
async function dbSetTarget(dispatch, target) {
  dispatch({type:'SET_TARGET', payload:target});
  await sb.from('targets').upsert({ id:target.id, rep_id:target.repId, month:target.month, visits:target.visits, new_accounts:target.newAccounts, new_listings:target.newListings, bottles:target.bottles, revenue:target.revenue }, {onConflict:'rep_id,month'});
}
async function dbAddRegion(dispatch, name, sortOrder=0) {
  const id = genId();
  const region = {id, name, sortOrder, active:true};
  dispatch({type:'ADD_REGION', payload:region});
  const {error} = await sb.from('regions').insert({id, name, sort_order:sortOrder, active:true});
  if (error) { dispatch({type:'DEL_REGION', id}); throw error; }
  return region;
}
async function dbDelRegion(dispatch, id) {
  dispatch({type:'DEL_REGION', id});
  const {error} = await sb.from('regions').delete().eq('id', id);
  if (error) console.error('Delete region error:', error);
}
async function dbUpdRegion(dispatch, id, updates) {
  dispatch({type:'UPD_REGION', payload:{id, ...updates}});
  const dbUpdates = {};
  if ('boundary' in updates) dbUpdates.boundary = updates.boundary;
  if ('color' in updates) dbUpdates.color = updates.color;
  if ('name' in updates) dbUpdates.name = updates.name;
  const {error} = await sb.from('regions').update(dbUpdates).eq('id', id);
  if (error) console.error('Update region error:', error);
}
async function dbUploadSellSheet(dispatch, userId, file) {
  const path = `${userId}.pdf`;
  const { error: upErr } = await sb.storage.from('sell-sheets').upload(path, file, { upsert: true, contentType: 'application/pdf' });
  if (upErr) { console.error('Upload error:', upErr); throw upErr; }
  const { error: dbErr } = await sb.from('profiles').update({ sell_sheet_path: path }).eq('id', userId);
  if (dbErr) console.error('Profile update error:', dbErr);
  dispatch({ type:'UPD_USER', payload:{ id:userId, sellSheetPath:path } });
}
async function dbDelUser(dispatch, id) {
  dispatch({type:'DEL_USER', id});
  // Deactivate rather than delete — keeps profile intact so re-adding works cleanly
  await sb.from('profiles').update({active: false}).eq('id', id);
}
async function dbUpdUser(dispatch, user) {
  const initials = user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const updated = {...user, initials};
  dispatch({type:'UPD_USER', payload:updated});
  const {error} = await sb.from('profiles').update({
    name: user.name, role: user.role, regions: user.regions||[], initials, active: user.active,
    marketing_alerts_enabled: user.marketingAlertsEnabled !== false,
  }).eq('id', user.id);
  if (error) console.error('dbUpdUser error:', error);
}

function showToast(dispatch, msg, type='success') { dispatch({type:'TOAST', payload:{msg,type}}); }

// ── RETAIL PRICING DB FUNCTIONS ────────────────────────────────────────────────
async function dbLoadPricingData(dispatch, filters={}) {
  let q = sb.from('retail_pricing').select('*').order('checked_at', {ascending:false}).limit(500);
  if (filters.province) q = q.eq('province', filters.province);
  if (filters.category) q = q.eq('category', filters.category);
  const { data, error } = await q;
  if (!error) dispatch({type:'SET_PRICING_DATA', payload: data||[]});
}

async function dbLoadPricingRuns(dispatch) {
  const { data, error } = await sb.from('pricing_run_log')
    .select('*').order('started_at', {ascending:false}).limit(50);
  if (!error) dispatch({type:'SET_PRICING_RUNS', payload: data||[]});
}

async function dbLoadPricingSettings(dispatch) {
  const { data } = await sb.from('pricing_settings').select('*').eq('id',1).single();
  if (data) dispatch({type:'SET_PRICING_SETTINGS', payload:{provinces:data.provinces||['BC','ON'], enabled:data.enabled!==false}});
}

// ── META CAMPAIGNS ────────────────────────────────────────────────────────────
function mapMetaCampaign(r) {
  return {
    id: r.id, campaignId: r.campaign_id, adsetId: r.adset_id, adId: r.ad_id,
    platform: r.platform || 'meta',
    city: r.city, clusterId: r.cluster_id, createdBy: r.created_by,
    createdAt: r.created_at, status: r.status || 'PAUSED',
    spend: parseFloat(r.spend || 0), impressions: parseInt(r.impressions || 0),
    clicks: parseInt(r.clicks || 0), reach: parseInt(r.reach || 0),
    cpc: parseFloat(r.cpc || 0), cpm: parseFloat(r.cpm || 0),
    ctr: parseFloat(r.ctr || 0), lastRefreshedAt: r.last_refreshed_at || null,
  };
}
async function dbLoadMetaCampaigns(dispatch) {
  const { data } = await sb.from('meta_campaigns').select('*').order('created_at', { ascending: false });
  dispatch({ type:'SET_META_CAMPAIGNS', payload: (data||[]).map(mapMetaCampaign) });
}
async function dbSaveMetaCampaign(dispatch, { id, campaignId, adsetId, adId, city, clusterId, createdBy, platform }) {
  const row = { id, campaign_id: campaignId, adset_id: adsetId, ad_id: adId, city, cluster_id: clusterId, created_by: createdBy || null, status: 'PAUSED', platform: platform || 'meta' };
  const { data, error } = await sb.from('meta_campaigns').insert([row]).select().single();
  if (!error && data) dispatch({ type:'ADD_META_CAMPAIGN', payload: mapMetaCampaign(data) });
  if (error) console.warn('[dbSaveMetaCampaign]', error);
}
async function dbUpdateCampaignMetrics(dispatch, id, metrics) {
  const upd = {
    spend: metrics.spend || 0, impressions: metrics.impressions || 0,
    clicks: metrics.clicks || 0, reach: metrics.reach || 0,
    cpc: metrics.cpc || 0, cpm: metrics.cpm || 0, ctr: metrics.ctr || 0,
    status: metrics.status || 'PAUSED',
    last_refreshed_at: new Date().toISOString(),
  };
  const { data } = await sb.from('meta_campaigns').update(upd).eq('id', id).select().single();
  if (data) dispatch({ type:'UPD_META_CAMPAIGN', payload: {
    ...mapMetaCampaign(data),
    // stopTime/startTime + engagement not stored in DB — held in memory after refresh
    stopTime:  metrics.stopTime  || null,
    startTime: metrics.startTime || null,
    reactions: metrics.reactions || 0,
    comments:  metrics.comments  || 0,
    shares:    metrics.shares    || 0,
  }});
}

// ── AD DRAFTS ─────────────────────────────────────────────────────────────────
function mapAdDraft(r) {
  return {
    id: r.id, accountId: r.account_id, accountName: r.account_name,
    city: r.city || '', province: r.province || '',
    headline: r.headline || '', bodyCopy: r.body_copy || '',
    radiusKm: r.radius_km || 5, budgetCad: parseFloat(r.budget_cad || 40),
    durationDays: r.duration_days || 7, status: r.status || 'draft',
    pushedCampaignId: r.pushed_campaign_id || null, createdAt: r.created_at,
  };
}
async function dbLoadAdDrafts(dispatch) {
  const { data } = await sb.from('account_ad_drafts').select('*').order('created_at', { ascending: false });
  dispatch({ type: 'SET_AD_DRAFTS', payload: (data||[]).map(mapAdDraft) });
}
async function dbSaveAdDraft(dispatch, draft) {
  const { data, error } = await sb.from('account_ad_drafts').insert([{
    id: draft.id, account_id: draft.accountId, account_name: draft.accountName,
    city: draft.city, province: draft.province, headline: draft.headline,
    body_copy: draft.bodyCopy, radius_km: draft.radiusKm,
    budget_cad: draft.budgetCad, duration_days: draft.durationDays, status: 'draft',
  }]).select().single();
  if (!error && data) dispatch({ type: 'ADD_AD_DRAFT', payload: mapAdDraft(data) });
  if (error) console.warn('[dbSaveAdDraft]', error);
}
async function dbMarkDraftPushed(dispatch, draftId, campaignId) {
  await sb.from('account_ad_drafts').update({ status: 'pushed', pushed_campaign_id: campaignId }).eq('id', draftId);
  dispatch({ type: 'UPD_AD_DRAFT', payload: { id: draftId, status: 'pushed', pushedCampaignId: campaignId } });
}
async function createListingAdDraft(dispatch, accountId) {
  try {
    const { data: acc } = await sb.from('accounts').select('id,name,city,province,address').eq('id', accountId).single();
    if (!acc) return;
    const apiKey = localStorage.getItem('anthropic_api_key') || '';
    let headline = `Sueños Now at ${acc.name}`;
    let bodyCopy = `Great news! Sueños Tequila is now available at ${acc.name}${acc.city ? ' in ' + acc.city : ''}. Stop by and discover why Sueños is one of Canada's most exciting premium tequilas.`;
    if (apiKey) {
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001', max_tokens: 300,
            messages: [{ role: 'user', content: `Write a Facebook ad for Sueños Tequila announcing it is now available at "${acc.name}"${acc.city ? ' in ' + acc.city : ''}. Return only valid JSON with two fields: "headline" (max 40 chars, exciting launch) and "body" (2-3 sentences, warm and local, invites people to come try it).` }]
          })
        });
        const d = await resp.json();
        const text = d.content?.[0]?.text || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const p = JSON.parse(match[0]);
          if (p.headline) headline = p.headline;
          if (p.body)     bodyCopy = p.body;
        }
      } catch(e) { /* use defaults */ }
    }
    const draft = {
      id: genId(), accountId: acc.id, accountName: acc.name,
      city: acc.city || '', province: acc.province || '',
      headline, bodyCopy, radiusKm: 5, budgetCad: 40, durationDays: 7, status: 'draft',
    };
    await dbSaveAdDraft(dispatch, draft);
    showToast(dispatch, `📢 Ad draft created for ${acc.name}`, 'success');
    // Create a task for Jason to review and push the draft
    try {
      const { data: jason } = await sb.from('profiles').select('id,name,email').eq('email', 'jason@suenos.ca').single();
      if (jason) {
        const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 2 days out
        const task = {
          id: genId(), accountId: acc.id,
          title: `Review & push listing ad for ${acc.name}`,
          dueDate, repId: jason.id, priority: 'high', done: false,
        };
        await dbAddTask(dispatch, task);
        await sendTaskNotification({
          assignedUser: jason, assignerName: 'CRM Auto',
          taskTitle: task.title, accountName: acc.name,
          dueDate, priority: 'high',
        });
      }
    } catch(te) { console.warn('Ad draft task creation failed:', te); }
  } catch(e) { console.error('createListingAdDraft:', e); }
}

async function backfillListingDrafts(dispatch) {
  // Find accounts that became Listed in the last 24h and have no draft yet
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentlyListed } = await sb
    .from('accounts')
    .select('id')
    .eq('status', 'Listed')
    .gte('updated_at', since);
  if (!recentlyListed?.length) return;
  const { data: existingDrafts } = await sb
    .from('account_ad_drafts')
    .select('account_id')
    .in('account_id', recentlyListed.map(a => a.id));
  const alreadyHasDraft = new Set((existingDrafts || []).map(d => d.account_id));
  const toBackfill = recentlyListed.filter(a => !alreadyHasDraft.has(a.id));
  for (const acc of toBackfill) {
    await createListingAdDraft(dispatch, acc.id).catch(e => console.warn('Backfill draft:', e));
  }
}

// ── BC Liquor Licence helpers ─────────────────────────────────────────────────

const CITY_REGION_MAP = {
  // Vancouver / Lower Mainland
  'vancouver':'Vancouver','north vancouver':'Vancouver','west vancouver':'Vancouver',
  'burnaby':'Vancouver','richmond':'Vancouver','new westminster':'Vancouver',
  'coquitlam':'Vancouver','port coquitlam':'Vancouver','port moody':'Vancouver',
  'maple ridge':'Vancouver','pitt meadows':'Vancouver','squamish':'Vancouver',
  'whistler':'Vancouver','pemberton':'Vancouver','bowen island':'Vancouver',
  'lions bay':'Vancouver','anmore':'Vancouver','belcarra':'Vancouver',
  'langley':'Vancouver',
  // Fraser Valley
  'surrey':'Fraser Valley','delta':'Fraser Valley','white rock':'Fraser Valley',
  'abbotsford':'Fraser Valley','chilliwack':'Fraser Valley','mission':'Fraser Valley',
  'agassiz':'Fraser Valley','hope':'Fraser Valley','harrison hot springs':'Fraser Valley',
  'kent':'Fraser Valley','harrison':'Fraser Valley','langley city':'Fraser Valley',
  'aldergrove':'Fraser Valley',
  // Victoria / Island
  'victoria':'Victoria','saanich':'Victoria','oak bay':'Victoria',
  'esquimalt':'Victoria','view royal':'Victoria','colwood':'Victoria',
  'langford':'Victoria','metchosin':'Victoria','north saanich':'Victoria',
  'central saanich':'Victoria','sidney':'Victoria','sooke':'Victoria',
  'duncan':'Victoria','nanaimo':'Victoria','courtenay':'Victoria',
  'campbell river':'Victoria','parksville':'Victoria','qualicum beach':'Victoria',
  'comox':'Victoria','port alberni':'Victoria','powell river':'Victoria',
  'ladysmith':'Victoria','lake cowichan':'Victoria','chemainus':'Victoria',
  'cobble hill':'Victoria','mill bay':'Victoria','port hardy':'Victoria',
  'port mcneill':'Victoria','tofino':'Victoria','ucluelet':'Victoria',
  'salt spring island':'Victoria','gulf islands':'Victoria',
  // Kelowna / Okanagan
  'kelowna':'Kelowna / Okanagan','west kelowna':'Kelowna / Okanagan',
  'penticton':'Kelowna / Okanagan','vernon':'Kelowna / Okanagan',
  'kamloops':'Kelowna / Okanagan','salmon arm':'Kelowna / Okanagan',
  'lake country':'Kelowna / Okanagan','osoyoos':'Kelowna / Okanagan',
  'oliver':'Kelowna / Okanagan','summerland':'Kelowna / Okanagan',
  'peachland':'Kelowna / Okanagan','armstrong':'Kelowna / Okanagan',
  'enderby':'Kelowna / Okanagan','merritt':'Kelowna / Okanagan',
  'revelstoke':'Kelowna / Okanagan','golden':'Kelowna / Okanagan',
  'chase':'Kelowna / Okanagan','clearwater':'Kelowna / Okanagan',
};

function cityToRegion(rawCity) {
  if (!rawCity) return null;
  const key = rawCity.trim().toLowerCase();
  return CITY_REGION_MAP[key] || null;
}

function normalizeLicenceName(n) {
  return (n||'').toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
}

async function dbLoadDismissals(dispatch, userId) {
  const { data } = await sb.from('license_dismissals').select('*').eq('dismissed_by', userId);
  dispatch({ type:'SET_DISMISSALS', payload:(data||[]).map(r=>({
    id:r.id, licenceNumber:r.licence_number, reason:r.reason, dismissedBy:r.dismissed_by,
  }))});
}

async function dbDismissLicense(dispatch, licenceNumber, reason, userId) {
  const id = genId();
  const row = { id, licence_number:licenceNumber, dismissed_by:userId, reason };
  dispatch({ type:'ADD_DISMISSAL', payload:{ id, licenceNumber, reason, dismissedBy:userId } });
  await sb.from('license_dismissals').upsert(row, { onConflict:'licence_number,dismissed_by' });
}

async function dbUpsertLicenses(rows) {
  // rows: array of objects matching the licenses table schema
  // Batch in chunks of 500 to stay under Supabase payload limits
  const CHUNK = 500;
  let inserted = 0, updated = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { data, error } = await sb.from('licenses')
      .upsert(chunk, { onConflict:'licence_number', returning:'representation' });
    if (error) throw error;
    // Supabase upsert doesn't differentiate insert vs update natively;
    // we track by whether updated_at was just set (approximation)
    if (data) { inserted += data.length; }
  }
  return { inserted, total: rows.length };
}

async function dbSavePricingSettings(dispatch, settings) {
  dispatch({type:'SET_PRICING_SETTINGS', payload:settings});
  await sb.from('pricing_settings').update({provinces:settings.provinces, enabled:settings.enabled, updated_at:new Date().toISOString()}).eq('id',1);
}

async function dbFetchPricingNow(dispatch, provinces) {
  dispatch({type:'PRICING_FETCHING', payload:true});
  try {
    const { data, error } = await sb.functions.invoke('fetch-retail-pricing', {
      body: { provinces, triggered_by:'manual' }
    });
    if (error) throw error;
    await dbLoadPricingData(dispatch);
    await dbLoadPricingRuns(dispatch);
    return data;
  } finally {
    dispatch({type:'PRICING_FETCHING', payload:false});
  }
}

// ── LOGIN SCREEN ───────────────────────────────────────────────
function LoginScreen() {
  const { dispatch } = useApp();
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [err,   setErr]   = useState('');
  const [busy,  setBusy]  = useState(false);
  const [mode,  setMode]  = useState('login'); // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false);

  async function signIn(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password:pass });
    if (error) setErr(error.message);
    setBusy(false);
  }

  async function resetPassword(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) setErr(error.message);
    else setResetSent(true);
    setBusy(false);
  }

  const iCls = "w-full px-4 py-2.5 text-sm rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all";
  const iStyle = {background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)', color:'white'};

  return (
    <div className="min-h-screen flex items-center justify-end" style={{
      backgroundImage:'url(https://irp.cdn-website.com/4fdabf36/dms3rep/multi/CRMBG.jpg)',
      backgroundSize:'cover',
      backgroundPosition:'center',
    }}>
      {/* Dark overlay on the right to ensure readability */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to right, transparent 30%, rgba(5,10,20,0.75) 100%)'}}/>

      {/* Login panel — right side */}
      <div className="relative z-10 flex items-center justify-center w-full lg:w-auto lg:pr-16 p-6">
        <div className="w-full max-w-sm fade-in">
          <div style={{background:'rgba(10,18,35,0.72)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:'20px',padding:'36px'}}>
            {mode==='login' ? (
              <>
                <h2 className="text-lg font-bold text-white mb-1">Welcome back</h2>
                <p className="text-slate-400 text-sm mb-6">Sign in to your account</p>
                <form onSubmit={signIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@suenos.ca" className={iCls} style={iStyle}/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                    <input type="password" value={pass} onChange={e=>setPass(e.target.value)} required placeholder="••••••••" className={iCls} style={iStyle}/>
                  </div>
                  {err && <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{err}</p>}
                  <button type="submit" disabled={busy}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50"
                    style={{background:'linear-gradient(135deg,#0d9488,#0f766e)',boxShadow:'0 4px 20px rgba(13,148,136,0.35)'}}>
                    {busy ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
                <button onClick={()=>setMode('reset')} className="mt-4 w-full text-xs text-slate-500 hover:text-teal-400 transition">
                  Forgot password?
                </button>
              </>
            ) : resetSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                </div>
                <p className="text-white font-semibold text-sm mb-1">Check your email</p>
                <p className="text-slate-400 text-xs mb-4">Reset link sent to {email}</p>
                <button onClick={()=>{ setMode('login'); setResetSent(false); }} className="text-xs text-teal-400 hover:underline">Back to sign in</button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1">Reset password</h2>
                <p className="text-slate-400 text-sm mb-6">We'll send you a reset link</p>
                <form onSubmit={resetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@suenos.ca" className={iCls} style={iStyle}/>
                  </div>
                  {err && <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{err}</p>}
                  <button type="submit" disabled={busy}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50"
                    style={{background:'linear-gradient(135deg,#0d9488,#0f766e)',boxShadow:'0 4px 20px rgba(13,148,136,0.35)'}}>
                    {busy ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
                <button onClick={()=>setMode('login')} className="mt-4 w-full text-xs text-slate-500 hover:text-teal-400 transition">Back to sign in</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Email Config DB helpers ─────────────────────────────────────────
function mapDashEmailConfig(r) {
  return {
    id:         r.id,
    emails:     r.emails     || [],
    sendHour:   r.send_hour  ?? 8,
    sendDays:   r.send_days  || ['monday'],
    enabled:    r.enabled    || false,
    timezone:   r.timezone   || 'America/Vancouver',
    lastSentAt: r.last_sent_at || null,
    sections:   (r.sections && r.sections.length) ? r.sections : null,
  };
}

async function dbLoadDashEmailConfig(dispatch) {
  const { data } = await sb
    .from('dashboard_email_config')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();
  if (data) dispatch({ type:'SET_DASH_EMAIL_CONFIG', payload: mapDashEmailConfig(data) });
}

async function dbSaveDashEmailConfig(dispatch, cfg) {
  const { data } = await sb
    .from('dashboard_email_config')
    .update({
      emails:     cfg.emails,
      send_hour:  cfg.sendHour,
      send_days:  cfg.sendDays,
      enabled:    cfg.enabled,
      timezone:   cfg.timezone,
      sections:   (cfg.sections && cfg.sections.length) ? cfg.sections : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .select().maybeSingle();
  if (data) dispatch({ type:'SET_DASH_EMAIL_CONFIG', payload: mapDashEmailConfig(data) });
}

// ══════════════════════════════════════════════════════════════════════════════
//  PROMOTIONAL MATERIALS MODULE
// ══════════════════════════════════════════════════════════════════════════════
function mapPmCategory(r) {
  return { id:r.id, name:r.name, normalizedName:r.normalized_name||'', description:r.description||'',
    internalNotes:r.internal_notes||'', sortOrder:r.sort_order||0, isActive:r.is_active!==false,
    createdAt:r.created_at, updatedAt:r.updated_at };
}
function pmNormalizeName(s) { return String(s||'').trim().replace(/\s+/g,' ').toLowerCase(); }
function mapPmVariant(r) {
  return { id:r.id, materialId:r.material_id, size:r.size||'', colour:r.colour||'', style:r.style||'', fit:r.fit||'',
    sku:r.sku||'', inventoryTracking:r.inventory_tracking_enabled!==false, quantityAvailable:r.quantity_available||0,
    lowStockThreshold:r.low_stock_threshold||0, isActive:r.is_active!==false,
    label:[r.colour,r.size,r.fit].filter(Boolean).join(' · ') };
}
function mapPmMaterial(r) {
  return {
    id:r.id, sku:r.sku||'', name:r.name, categoryId:r.category_id||null,
    shortDescription:r.short_description||'', description:r.description||'', imageUrl:r.image_url||null,
    unitOfMeasure:r.unit_of_measure||'Each', packSize:r.pack_size||null, unitCost:parseFloat(r.unit_cost||0),
    minimumOrderQuantity:r.minimum_order_quantity||1, maximumOrderQuantity:r.maximum_order_quantity||null,
    inventoryTracking:r.inventory_tracking_enabled===true, quantityAvailable:r.quantity_available||0,
    lowStockThreshold:r.low_stock_threshold||0, availabilityStatus:r.availability_status||'in_stock',
    hasVariants:r.has_variants===true, isActive:r.is_active!==false, sortOrder:r.sort_order||0,
    internalNotes:r.internal_notes||'', updatedAt:r.updated_at, createdAt:r.created_at,
    variants:(r.pm_variants||[]).map(mapPmVariant),
  };
}
function mapPmOrder(r) {
  return {
    id:r.id, orderNumber:r.order_number, submittedBy:r.submitted_by, representativeName:r.representative_name||'',
    orderForType:r.order_for_type, accountId:r.account_id||null, regionId:r.region_id||null,
    shippingCompany:r.shipping_company||'', shippingAddress1:r.shipping_address1||'', shippingAddress2:r.shipping_address2||'',
    shippingCity:r.shipping_city||'', shippingProvince:r.shipping_province||'', shippingPostalCode:r.shipping_postal_code||'',
    shippingCountry:r.shipping_country||'Canada', shippingPhone:r.shipping_phone||'', shippingEmail:r.shipping_email||'',
    deliveryInstructions:r.delivery_instructions||'', representativeNotes:r.representative_notes||'',
    internalAdminNotes:r.internal_admin_notes||'', requestedDeliveryDate:r.requested_delivery_date||null,
    eventOrProgramName:r.event_or_program_name||'', status:r.status||'Submitted',
    trackingNumber:r.tracking_number||'', shippingCarrier:r.shipping_carrier||'',
    submittedAt:r.submitted_at, shippedAt:r.shipped_at, createdAt:r.created_at,
    items:(r.pm_order_items||[]).map(it=>({
      id:it.id, materialId:it.material_id, variantId:it.variant_id, name:it.item_name_snapshot,
      sku:it.sku_snapshot||'', variantLabel:it.variant_label||'', unitCost:parseFloat(it.unit_cost_snapshot||0),
      quantityRequested:it.quantity_requested||0, quantityApproved:it.quantity_approved,
      quantityShipped:it.quantity_shipped, lineCost:parseFloat(it.line_cost||0),
      status:it.status||'Requested', adminNote:it.admin_note||'',
      categoryIdSnapshot:it.category_id_snapshot||null, categoryNameSnapshot:it.category_name_snapshot||'',
    })),
  };
}

async function dbLoadPromo(dispatch, isAdmin) {
  try {
    const { data: cats } = await sb.from('pm_categories').select('*').order('sort_order');
    dispatch({ type:'SET_PROMO_CATEGORIES', payload:(cats||[]).map(mapPmCategory) });
    const { data: mats } = await sb.from('pm_materials').select('*, pm_variants(*)').order('sort_order');
    dispatch({ type:'SET_PROMO_MATERIALS', payload:(mats||[]).map(mapPmMaterial) });
    const { data: ords } = await sb.from('pm_orders').select('*, pm_order_items(*)').order('created_at', { ascending:false });
    dispatch({ type:'SET_PROMO_ORDERS', payload:(ords||[]).map(mapPmOrder) });
    // rep cost visibility flag (app_settings)
    const { data: cv } = await sb.from('app_settings').select('value').eq('key','promo_rep_cost_visible').maybeSingle();
    dispatch({ type:'SET_PROMO_REP_COST', payload: cv?.value === 'true' });
  } catch(e) { console.warn('[Promo] load failed:', e); }
}

// Admin — create/update a material
async function dbSavePromoMaterial(dispatch, mat, userId) {
  const row = {
    sku:mat.sku||null, name:mat.name, category_id:mat.categoryId||null,
    short_description:mat.shortDescription||'', description:mat.description||'', image_url:mat.imageUrl||null,
    unit_of_measure:mat.unitOfMeasure||'Each', pack_size:mat.packSize?parseInt(mat.packSize):null,
    unit_cost:parseFloat(mat.unitCost||0), minimum_order_quantity:parseInt(mat.minimumOrderQuantity||1),
    maximum_order_quantity:mat.maximumOrderQuantity?parseInt(mat.maximumOrderQuantity):null,
    inventory_tracking_enabled:!!mat.inventoryTracking, quantity_available:parseInt(mat.quantityAvailable||0),
    low_stock_threshold:parseInt(mat.lowStockThreshold||0), availability_status:mat.availabilityStatus||'in_stock',
    is_active:mat.isActive!==false, sort_order:parseInt(mat.sortOrder||0), internal_notes:mat.internalNotes||'',
    updated_at:new Date().toISOString(), updated_by:userId||null,
  };
  if (mat.id) {
    const { data } = await sb.from('pm_materials').update(row).eq('id', mat.id).select('*, pm_variants(*)').single();
    if (data) dispatch({ type:'UPD_PROMO_MATERIAL', payload: mapPmMaterial(data) });
    return data ? mapPmMaterial(data) : null;
  } else {
    row.created_by = userId||null;
    const { data, error } = await sb.from('pm_materials').insert(row).select('*, pm_variants(*)').single();
    if (error) throw new Error(error.message);
    dispatch({ type:'ADD_PROMO_MATERIAL', payload: mapPmMaterial(data) });
    return mapPmMaterial(data);
  }
}

async function dbUploadPromoImage(file) {
  const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const { error } = await sb.storage.from('promo-materials').upload(path, file, { upsert:false, contentType:file.type });
  if (error) throw new Error('Upload failed: ' + error.message);
  return sb.storage.from('promo-materials').getPublicUrl(path).data.publicUrl;
}

async function dbSavePromoVariant(materialId, v) {
  const row = { material_id:materialId, size:v.size||null, colour:v.colour||null, style:v.style||null, fit:v.fit||null,
    sku:v.sku||null, quantity_available:parseInt(v.quantityAvailable||0), low_stock_threshold:parseInt(v.lowStockThreshold||0),
    inventory_tracking_enabled:v.inventoryTracking!==false, is_active:v.isActive!==false };
  if (v.id) { await sb.from('pm_variants').update(row).eq('id', v.id); }
  else { await sb.from('pm_variants').insert(row); }
}
async function dbDeletePromoVariant(id) { await sb.from('pm_variants').delete().eq('id', id); }

async function dbAdjustPromoInventory(materialId, variantId, delta, reason, note) {
  const { error } = await sb.rpc('pm_adjust_inventory', {
    p_material_id: materialId, p_variant_id: variantId || null, p_delta: parseInt(delta), p_reason: reason, p_note: note || null });
  if (error) throw new Error(error.message);
}

async function dbSubmitPromoOrder(order, items) {
  const { data, error } = await sb.rpc('pm_submit_order', { p_order: order, p_items: items });
  if (error) throw new Error(error.message);
  return data; // { order_id, order_number }
}

async function dbSetPromoOrderStatus(orderId, status, note, tracking, carrier) {
  const { error } = await sb.rpc('pm_set_order_status', {
    p_order_id: orderId, p_status: status, p_note: note || null, p_tracking: tracking || null, p_carrier: carrier || null });
  if (error) throw new Error(error.message);
}
async function dbApprovePromoLine(itemId, qtyApproved, status, note) {
  const { error } = await sb.rpc('pm_approve_line', { p_item_id: itemId, p_qty_approved: parseInt(qtyApproved), p_status: status || 'Approved', p_note: note || null });
  if (error) throw new Error(error.message);
}
async function dbSetPromoAdminNotes(orderId, notes) {
  await sb.from('pm_orders').update({ internal_admin_notes: notes, updated_at:new Date().toISOString() }).eq('id', orderId);
}
// Write a category audit entry (admin-only via RLS). Best-effort.
async function dbLogCategoryAudit(action, { categoryId, materialId, prev, next }) {
  try { await sb.from('pm_category_audit').insert({ category_id:categoryId||null, material_id:materialId||null, action, previous_values:prev||null, new_values:next||null }); }
  catch(e) { console.warn('[CatAudit]', e); }
}
// Create/update a category. Returns the saved category (mapped) or throws a friendly error.
async function dbSavePromoCategory(dispatch, cat, userId, existing) {
  const name = String(cat.name||'').trim();
  if (!name) throw new Error('Category name is required.');
  const norm = pmNormalizeName(name);
  const order = parseInt(cat.sortOrder);
  if (isNaN(order) || order < 0) throw new Error('Display order must be a positive number.');
  const row = { name, description:cat.description||'', internal_notes:cat.internalNotes||'',
    sort_order:order, is_active:cat.isActive!==false, updated_by:userId||null };
  try {
    let data;
    if (cat.id) {
      ({ data } = await sb.from('pm_categories').update(row).eq('id', cat.id).select('*').single());
      // Audit — record changed fields
      const prev = existing || {};
      const changes = [];
      if (prev.name !== name) changes.push('renamed');
      if ((prev.description||'') !== (cat.description||'')) changes.push('description_changed');
      if ((prev.sortOrder||0) !== order) changes.push('reordered');
      if ((prev.isActive!==false) !== (cat.isActive!==false)) changes.push(cat.isActive!==false?'activated':'deactivated');
      for (const a of changes) await dbLogCategoryAudit(a, { categoryId:cat.id, prev:{ name:prev.name, description:prev.description, sortOrder:prev.sortOrder, isActive:prev.isActive }, next:{ name, description:cat.description, sortOrder:order, isActive:cat.isActive!==false } });
    } else {
      row.created_by = userId||null;
      ({ data } = await sb.from('pm_categories').insert(row).select('*').single());
      await dbLogCategoryAudit('created', { categoryId:data?.id, next:{ name, sortOrder:order } });
    }
    await dbLoadPromo(dispatch, true);
    return data ? mapPmCategory(data) : null;
  } catch(e) {
    const msg = String(e.message||e);
    if (/duplicate key|uq_pm_cat_active_name|unique/i.test(msg)) throw new Error('A category with this name already exists.');
    throw new Error(msg);
  }
}
// Toggle active/inactive
async function dbSetCategoryActive(dispatch, cat, active, userId) {
  await sb.from('pm_categories').update({ is_active:active, updated_by:userId||null }).eq('id', cat.id);
  await dbLogCategoryAudit(active?'activated':'deactivated', { categoryId:cat.id, prev:{ isActive:cat.isActive }, next:{ isActive:active } });
  await dbLoadPromo(dispatch, true);
}
// Reorder (swap sort_order with neighbour)
async function dbReorderCategory(dispatch, cat, newOrder, userId) {
  await sb.from('pm_categories').update({ sort_order:newOrder, updated_by:userId||null }).eq('id', cat.id);
  await dbLogCategoryAudit('reordered', { categoryId:cat.id, prev:{ sortOrder:cat.sortOrder }, next:{ sortOrder:newOrder } });
  await dbLoadPromo(dispatch, true);
}
// Permanent delete (only when unused — enforced server-side by RPC)
async function dbDeletePromoCategory(dispatch, catId) {
  const { error } = await sb.rpc('pm_delete_category', { p_id: catId });
  if (error) throw new Error(error.message);
  await dbLoadPromo(dispatch, true);
}
// Bulk move items to a category (guarded server-side against inactive targets)
async function dbBulkMoveCategory(dispatch, materialIds, categoryId, userId) {
  const { error } = await sb.from('pm_materials').update({ category_id:categoryId, updated_by:userId||null }).in('id', materialIds);
  if (error) { if (/inactive/i.test(error.message)) throw new Error('This category is inactive and cannot be assigned to new promotional materials.'); throw new Error(error.message); }
  for (const mid of materialIds) await dbLogCategoryAudit('item_moved', { categoryId, materialId:mid });
  await dbLoadPromo(dispatch, true);
}
async function dbSetPromoRepCostVisible(dispatch, on) {
  dispatch({ type:'SET_PROMO_REP_COST', payload: on });
  await sb.from('app_settings').upsert([{ key:'promo_rep_cost_visible', value: on ? 'true' : 'false' }], { onConflict:'key' });
}

// ══════════════════════════════════════════════════════════════════════════════
//  AI AD PERFORMANCE ANALYSIS — centralized service
//  Swap the model here to upgrade every analysis without touching the UI.
// ══════════════════════════════════════════════════════════════════════════════
const AD_ANALYSIS_MODEL = 'claude-haiku-4-5-20251001';
// Estimated pricing (USD per token) for the analysis model — update if the model changes.
const AD_ANALYSIS_PRICE = { input: 1 / 1e6, output: 5 / 1e6 }; // Haiku 4.5: $1/MTok in, $5/MTok out
function adAnalysisCost(usage) {
  if (!usage) return 0;
  const c = (usage.input_tokens||0) * AD_ANALYSIS_PRICE.input + (usage.output_tokens||0) * AD_ANALYSIS_PRICE.output;
  return Math.round(c * 10000) / 10000; // 4 decimals
}

// Parse possibly-truncated JSON from an LLM: try as-is, then repair by removing
// trailing commas and closing any unterminated string / open braces & brackets.
function pmTolerantJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch(_) {}
  let s = text;
  // Walk the string tracking structure so we can close what's open.
  const stack = []; let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  if (inStr) s += '"';                        // close an open string
  s = s.replace(/,\s*$/, '');                 // drop a dangling comma
  while (stack.length) { const o = stack.pop(); s += (o === '{' ? '}' : ']'); }
  s = s.replace(/,(\s*[}\]])/g, '$1');        // remove trailing commas before closers
  try { return JSON.parse(s); } catch(_) { return null; }
}

// Build the internal-benchmark block from the account's own history (no outside benchmarks).
function pmBuildBenchmarks(campaign, allCampaigns) {
  const others = (allCampaigns||[]).filter(c => c.id !== campaign.id && (c.impressions||0) > 0);
  const avg = (arr,f) => arr.length ? arr.reduce((s,c)=>s+(f(c)||0),0)/arr.length : null;
  const acct = {
    ctr: avg(others, c=>c.ctr), cpc: avg(others, c=>c.cpc), cpm: avg(others, c=>c.cpm),
    count: others.length,
  };
  return acct;
}

// Returns structured JSON. Throws with a clear message on failure/malformed output.
async function analyzeAdWithAI({ ad, metrics, creative, context, mode, benchmarks, comparisonAds }) {
  const key = localStorage.getItem('anthropic_api_key') || '';
  if (!key) throw new Error('No Anthropic API key set. Add it in Settings → API Credentials.');

  const isCompare = mode === 'compare';
  const sys = `You are a senior paid-social strategist reviewing Meta (Facebook/Instagram) ads for Sueños Tequila, a premium Mexican craft tequila brand in Canada. Write for a marketing manager, not a data scientist: specific, direct, actionable, plain language. Rules you MUST follow:
- Judge performance against the stated campaign objective (an awareness ad is not judged on purchases; a sales ad is not praised for engagement).
- Distinguish fact from interpretation. Reference the actual numbers when making claims.
- Never invent metrics, results, or outside industry benchmarks. If data is missing, say so and lower data confidence.
- Don't reward vanity metrics (impressions, reactions) as business results.
- Don't assume correlation is causation. Flag tracking gaps, short reporting periods, or low spend.
- Don't repeat the same observation across sections. Prioritize recommendations.
- When internal benchmarks are provided, compare against them; prioritize internal history over any generic notion.
Return ONLY a raw JSON object — no markdown, no prose outside JSON.`;

  const dataBlock = JSON.stringify({ ad, metrics, creative, context, internalBenchmarks: benchmarks }, null, 1);

  let schema;
  if (mode === 'quick') {
    schema = `{
  "assessment": "strong|average|weak|inconclusive",
  "executiveSummary": "3-5 sentences",
  "overallScore": 0,
  "dataConfidence": "high|medium|low",
  "missingData": ["list of important metrics that were unavailable"],
  "topRecommendations": [ { "priority":"Immediate|Next test|Monitor|No change needed", "change":"specific action", "reason":"", "metricToWatch":"" } ],
  "finalRecommendation": "Continue unchanged|Continue with minor edits|Launch a new creative test|Adjust targeting|Adjust budget|Fix tracking before making decisions|Pause the ad|Insufficient data to judge",
  "finalExplanation": ""
}`;
  } else if (isCompare) {
    schema = `{
  "executiveSummary": "which ad performed better and the core reason",
  "winner": "ad name or id",
  "comparison": [ { "dimension":"Creative|Copy|Audience|Spend|Efficiency|Conversion|Business result", "adA":"", "adB":"", "verdict":"" } ],
  "whyWinnerWon": "",
  "carryForward": ["elements to keep in the next campaign"],
  "finalRecommendation": ""
}`;
  } else {
    schema = `{
  "assessment": "strong|average|weak|inconclusive",
  "executiveSummary": "3-5 sentences incl. single most important action",
  "scorecard": [ { "category":"Campaign objective alignment", "score":0, "note":"" }, { "category":"Creative effectiveness","score":0,"note":"" }, { "category":"Copy effectiveness","score":0,"note":"" }, { "category":"Audience response","score":0,"note":"" }, { "category":"Media efficiency","score":0,"note":"" }, { "category":"Conversion performance","score":0,"note":"" }, { "category":"Business impact","score":0,"note":"" }, { "category":"Data confidence","score":0,"note":"" } ],
  "overallScore": 0,
  "dataConfidence": "high|medium|low",
  "missingData": [],
  "working": [ { "point":"", "evidence":"" } ],
  "underperforming": [ { "point":"", "why":"" } ],
  "creativeAnalysis": { "summary":"", "recommendedChanges":["specific visual changes"] },
  "copyAnalysis": { "summary":"", "recommendedChanges":["specific copy changes"] },
  "audienceAnalysis": "creative vs targeting/delivery attribution",
  "funnelAnalysis": { "largestDropOff":"", "likelyCause":"creative|copy|offer|audience|landing page|campaign setup|tracking|insufficient data", "detail":"" },
  "businessImpact": "translate platform metrics into real business meaning; separate platform activity vs customer behaviour vs verified results",
  "recommendations": [ { "priority":"Immediate|Next test|Monitor|No change needed", "change":"specific", "reason":"", "expectedImpact":"", "effort":"Low|Medium|High", "metricToWatch":"" } ],
  "copyEdits": { "recommended": { "primaryText":"", "headline":"", "description":"", "cta":"" }, "directPerformance": { "primaryText":"", "headline":"", "description":"", "cta":"" }, "emotionalBrand": { "primaryText":"", "headline":"", "description":"", "cta":"" } },
  "creativeBrief": { "goal":"", "audience":"", "mainMessage":"", "proposition":"", "visualDirection":"", "productPlacement":"", "headline":"", "supportingCopy":"", "cta":"", "dimensions":"", "avoid":"" },
  "testingPlan": [ { "hypothesis":"", "variable":"", "control":"", "variation":"", "primaryMetric":"", "secondaryMetric":"", "minDuration":"", "decisionRule":"" } ],
  "finalRecommendation": "Continue unchanged|Continue with minor edits|Launch a new creative test|Adjust targeting|Adjust budget|Fix tracking before making decisions|Pause the ad|Insufficient data to judge",
  "finalExplanation": ""
}`;
  }

  const userPrompt = isCompare
    ? `Compare these Meta ads for the same brand. Data:\n${JSON.stringify(comparisonAds, null, 1)}\n\nReturn ONLY JSON in exactly this shape:\n${schema}`
    : `Analyze this Meta ad. All available data (missing fields are absent — do not invent them):\n${dataBlock}\n\nMode: ${mode}. Scores are 1-10; overallScore 0-100. Cap testingPlan at 3 tests. Return ONLY JSON in exactly this shape:\n${schema}`;

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'content-type': 'application/json' },
      body: JSON.stringify({ model: AD_ANALYSIS_MODEL, max_tokens: mode==='quick'?1500:8000, system: sys, messages: [{ role:'user', content: userPrompt }] }),
    });
  } catch(e) { throw new Error('Could not reach the AI service. Check your connection and try again.'); }
  if (!res.ok) { const t = await res.text(); throw new Error(`AI error ${res.status}: ${t.slice(0,160)}`); }
  const data = await res.json();
  const stop = data.stop_reason;
  let raw = (data.content?.[0]?.text || '').trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/,'');
  const s = raw.indexOf('{');
  if (s > 0) raw = raw.slice(s);            // drop any leading prose
  const parsed = pmTolerantJson(raw);
  if (!parsed) {
    const hint = stop === 'max_tokens' ? ' (response was cut off — try Quick Review, or switch the model to Sonnet in AD_ANALYSIS_MODEL)' : '';
    throw new Error('The AI returned a malformed response. Please regenerate.' + hint);
  }
  // Attach an estimated cost for this analysis (based on token usage)
  parsed.__cost = adAnalysisCost(data.usage);
  parsed.__tokens = { input:data.usage?.input_tokens||0, output:data.usage?.output_tokens||0 };
  return parsed;
}

function mapAdAnalysis(r) {
  return { id:r.id, campaignId:r.campaign_id, campaignIds:r.campaign_ids||null, mode:r.mode||'full',
    context:r.context||{}, metrics:r.metrics_snapshot||{}, result:r.result||{}, recStatus:r.rec_status||{},
    model:r.model||'', costUsd: parseFloat(r.cost_usd ?? r.result?.__cost ?? 0),
    createdBy:r.created_by, createdAt:r.created_at };
}
async function dbLoadAdAnalyses(dispatch) {
  try {
    const { data } = await sb.from('ad_analyses').select('*').order('created_at',{ascending:false}).limit(200);
    dispatch({ type:'SET_AD_ANALYSES', payload:(data||[]).map(mapAdAnalysis) });
  } catch(e) { console.warn('[AdAnalyses] load failed:', e); }
}
async function dbSaveAdAnalysis(dispatch, { campaignId, campaignIds, mode, context, metrics, result }) {
  const { data:{ user } } = await sb.auth.getUser();
  const row = { campaign_id:campaignId||null, campaign_ids:campaignIds||null, mode, context:context||{},
    metrics_snapshot:metrics||{}, result:result||{}, model:AD_ANALYSIS_MODEL, cost_usd:(result&&result.__cost)||0, created_by:user?.id||null };
  const { data, error } = await sb.from('ad_analyses').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  const mapped = mapAdAnalysis(data);
  dispatch({ type:'ADD_AD_ANALYSIS', payload: mapped });
  return mapped;
}
async function dbUpdateAdRecStatus(dispatch, analysisId, recStatus) {
  dispatch({ type:'UPD_AD_ANALYSIS', payload:{ id:analysisId, recStatus } });
  await sb.from('ad_analyses').update({ rec_status: recStatus }).eq('id', analysisId);
}
// Give a saved analysis a custom name (stored on the context jsonb — no new column)
async function dbRenameAdAnalysis(dispatch, analysisId, name, existingContext) {
  const next = { ...(existingContext||{}), title: name };
  dispatch({ type:'UPD_AD_ANALYSIS', payload:{ id:analysisId, context: next } });
  await sb.from('ad_analyses').update({ context: next }).eq('id', analysisId);
}

// ── MARKETING ALERTS (declining ad performance) ───────────────────────────────
function mapMarketingAlert(r) {
  return {
    id: r.id, campaignId: r.campaign_id, metaCampaignId: r.meta_campaign_id, city: r.city,
    alertTypes: r.alert_types || [], severity: r.severity || 'warning',
    headline: r.headline || '', details: r.details || {}, status: r.status || 'new',
    createdAt: r.created_at, updatedAt: r.updated_at,
    acknowledgedBy: r.acknowledged_by || null, acknowledgedAt: r.acknowledged_at || null, resolvedAt: r.resolved_at || null,
  };
}
async function dbLoadMarketingAlerts(dispatch) {
  const { data } = await sb.from('marketing_alerts').select('*').order('created_at', { ascending: false });
  dispatch({ type:'SET_MARKETING_ALERTS', payload:(data||[]).map(mapMarketingAlert) });
}
async function dbUpdateAlertStatus(dispatch, alertId, status, userId) {
  const patch = { status };
  if (status === 'acknowledged') { patch.acknowledged_by = userId || null; patch.acknowledged_at = new Date().toISOString(); }
  if (status === 'resolved')     { patch.resolved_at = new Date().toISOString(); }
  dispatch({ type:'UPD_MARKETING_ALERT', payload:{ id:alertId, status, acknowledgedBy:patch.acknowledged_by, acknowledgedAt:patch.acknowledged_at, resolvedAt:patch.resolved_at } });
  await sb.from('marketing_alerts').update(patch).eq('id', alertId);
}
// Per-user on/off for receiving marketing alert emails (admins). Stored on profiles.
async function dbSetMarketingAlertsEnabled(dispatch, userId, enabled) {
  await sb.from('profiles').update({ marketing_alerts_enabled: enabled }).eq('id', userId);
  dispatch({ type:'UPD_USER', payload:{ id:userId, marketingAlertsEnabled: enabled } });
}

// Best-effort email notification for promo orders (reuses the generic task template).
// Never exposes internal admin notes. Silent no-op if EmailJS isn't configured.
async function notifyPromo({ toEmail, title, orderNumber, statusOrNote, repVisibleNote }) {
  if (!toEmail || typeof emailjs === 'undefined') return;
  if (!EMAILJS_TASK_TEMPLATE_ID || !EMAILJS_SERVICE_ID) return;
  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TASK_TEMPLATE_ID, {
      to_email: toEmail,
      assignee_name: 'Sueños Team',
      assigner_name: 'Sueños Promo Materials',
      task_title: `${title} · ${orderNumber||''}`,
      account_name: statusOrNote || '',
      due_date: repVisibleNote || '',
      priority: 'normal',
    });
  } catch(e) { console.warn('[PromoNotify] failed:', e); }
}
