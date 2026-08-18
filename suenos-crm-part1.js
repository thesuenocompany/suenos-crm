// PART 1: Data, Utilities, Context, Icons, UI Primitives
// This file is concatenated into the final HTML by the build step.

const { useState, useEffect, useReducer, useContext, createContext, useRef, useMemo, useCallback } = React;
const { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } = Recharts;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const REGIONS = ['Vancouver','Victoria','Kelowna / Okanagan','Fraser Valley','Calgary','Edmonton','Red Deer','Lethbridge'];
const ACCOUNT_TYPES = ['Private Liquor Store','Government Liquor Store','Restaurant','Bar','Hotel','Golf Course','Resort','Festival','Event Organizer','Other'];
const ACCOUNT_STATUSES = ['Prospect','Sample Sent','Buyer Meeting','Listing Pending','Listed','Active','At Risk','Lost'];
const VISIT_TYPES = ['Cold Call','Follow Up','Buyer Meeting','Product Sampling','Staff Training','Tasting','Menu Placement','Order Collection','Merchandising'];
const ORDER_STATUSES = ['Draft','Submitted','Accepted','Delivered','Completed','Cancelled'];
const MENU_ITEMS = ['Margarita','Paloma','Ranch Water','House Cocktail'];
const MENU_STATUSES = ['Not Discussed','Discussing','Seasonal Feature','Permanent Placement'];

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const INIT_USERS = [
  { id:'u1', name:'Admin User',    email:'admin@suenostequila.com',  role:'admin',     region:null,              initials:'AU', active:true },
  { id:'u2', name:'Jordan Rivera', email:'jordan@suenostequila.com', role:'rep',       region:'Vancouver',        initials:'JR', active:true },
  { id:'u3', name:'Sam Chen',      email:'sam@suenostequila.com',    role:'rep',       region:'Calgary',          initials:'SC', active:true },
  { id:'u4', name:'Aria Vega',     email:'aria@suenostequila.com',   role:'ambassador',region:'Vancouver',        initials:'AV', active:true },
];

const INIT_PRODUCTS = [
  { id:'p1', name:'Sueños Blanco',     sku:'SB-750', size:'750ml', casePack:12, price:60, active:true },
  { id:'p2', name:'Sueños Reposado',   sku:'SR-750', size:'750ml', casePack:12, price:70, active:true },
  { id:'p3', name:'Sueños Añejo',      sku:'SA-750', size:'750ml', casePack:12, price:80, active:true },
  { id:'p4', name:'Sueños Cristalino', sku:'SC-750', size:'750ml', casePack:12, price:90, active:true },
];

const INIT_STORES = [
  { id:'fs1', name:'Liberty Wine Merchants – West Van', address:'1494 Marine Dr, West Vancouver, BC', contact:'Mike Torres',   email:'orders@libertywine.ca',           phone:'604-921-1182', region:'Vancouver' },
  { id:'fs2', name:'Everything Wine – Kelowna',         address:'1620 Dickson Ave, Kelowna, BC',        contact:'Lisa Park',    email:'kelowna@everythingwine.ca',       phone:'250-860-5600', region:'Kelowna / Okanagan' },
  { id:'fs3', name:'Kensington Wine Market – Calgary',  address:'1257 Kensington Rd NW, Calgary, AB',  contact:'David Walsh',  email:'orders@kensingtonwinemarket.com', phone:'403-283-8000', region:'Calgary' },
  { id:'fs4', name:'Willow Park Wines – Calgary',       address:'10801 Bonaventure Dr SE, Calgary, AB', contact:'Rachel Kim',   email:'orders@willowpark.net',           phone:'403-296-1640', region:'Calgary' },
];

const INIT_ACCOUNTS = [
  { id:'a1',  name:'Botanist Restaurant',          type:'Restaurant',           region:'Vancouver',          assignedRep:'u2', address:'1495 W Georgia St, Vancouver, BC',      lat:49.2899, lng:-123.1252, contact:'Marcus Webb',      email:'marcus@botanistvan.com',        phone:'604-682-8383', website:'botanistrestaurant.com', status:'Active',        notes:'Hotel restaurant. Strong Añejo cocktail program.',  lastVisit:'2026-05-28', lastOrder:'2026-05-15', menuPlacements:{ Margarita:'Permanent Placement', Paloma:'Seasonal Feature' },          createdAt:'2025-10-01' },
  { id:'a2',  name:'Nightingale Restaurant',       type:'Restaurant',           region:'Vancouver',          assignedRep:'u2', address:'1017 W Hastings St, Vancouver, BC',     lat:49.2866, lng:-123.1202, contact:'Sophie Chen',      email:'sophie@hawksworth.ca',          phone:'604-695-9115', website:'nightingalevan.com',     status:'Active',        notes:'Hawksworth property. Seasonal menus. Great cocktail program.', lastVisit:'2026-05-30', lastOrder:'2026-05-20', menuPlacements:{ Margarita:'Permanent Placement', 'Ranch Water':'Discussing' },     createdAt:'2025-09-15' },
  { id:'a3',  name:'Lobby Bar – Fairmont Hotel',   type:'Hotel',                region:'Vancouver',          assignedRep:'u2', address:'900 W Georgia St, Vancouver, BC',       lat:49.2833, lng:-123.1175, contact:'Thomas Lee',       email:'thomas.lee@fairmont.com',       phone:'604-684-3131', website:'fairmont.com/vancouver', status:'Listed',        notes:'Major hotel chain. Monthly buyer meeting with Thomas.', lastVisit:'2026-05-10', lastOrder:'2026-04-28', menuPlacements:{ Margarita:'Seasonal Feature' },                                    createdAt:'2025-11-01' },
  { id:'a4',  name:"Pat's Pub & Brewhouse",        type:'Bar',                  region:'Vancouver',          assignedRep:'u2', address:'403 E Hastings St, Vancouver, BC',      lat:49.2815, lng:-123.0965, contact:'Pat McGuire',      email:'info@patspub.ca',               phone:'604-255-4301', website:'patspub.ca',             status:'Prospect',      notes:'Independent pub, high volume. Tasting to be scheduled.', lastVisit:null, lastOrder:null, menuPlacements:{},                                                                 createdAt:'2026-01-15' },
  { id:'a5',  name:'Brix & Mortar',                type:'Restaurant',           region:'Vancouver',          assignedRep:'u2', address:'1138 Homer St, Vancouver, BC',          lat:49.2771, lng:-123.1145, contact:'Andrea Ramos',     email:'andrea@brixandmortar.ca',       phone:'604-915-9463', website:'brixandmortar.ca',       status:'Active',        notes:'Strong cocktail focus. Excellent reorder velocity.', lastVisit:'2026-06-01', lastOrder:'2026-05-25', menuPlacements:{ Margarita:'Permanent Placement', Paloma:'Permanent Placement', 'House Cocktail':'Discussing' }, createdAt:'2025-08-01' },
  { id:'a6',  name:'Marquis Wine Cellars',         type:'Private Liquor Store', region:'Vancouver',          assignedRep:'u2', address:'1034 Davie St, Vancouver, BC',          lat:49.2783, lng:-123.1290, contact:'Helena Croft',     email:'helena@marquiswines.com',       phone:'604-684-0445', website:'marquiswines.com',       status:'Active',        notes:'Premium private store. Staff training done. Consistent reorders.', lastVisit:'2026-05-22', lastOrder:'2026-05-10', menuPlacements:{},                           createdAt:'2025-07-15' },
  { id:'a7',  name:'Unsworth Vineyards Restaurant',type:'Restaurant',           region:'Victoria',           assignedRep:'u2', address:'2915 Cameron Taggart Rd, Mill Bay, BC', lat:48.6469, lng:-123.5418, contact:'Jessica Unsworth', email:'jessica@unsworthvineyards.com', phone:'250-929-2292', website:'unsworthvineyards.com',  status:'Sample Sent',   notes:'Winery restaurant. Premium positioning. Tequila cocktail pitch underway.', lastVisit:'2026-04-15', lastOrder:null, menuPlacements:{},                       createdAt:'2026-02-01' },
  { id:'a8',  name:'The Guild Bar',                type:'Bar',                  region:'Calgary',            assignedRep:'u3', address:'116 8 Ave SW, Calgary, AB',             lat:51.0458, lng:-114.0671, contact:"Ryan O'Brien",    email:'ryan@theguildcalgary.com',      phone:'403-770-9810', website:'theguildcalgary.com',    status:'Active',        notes:'High-volume craft bar. Tequila section growing rapidly.', lastVisit:'2026-05-29', lastOrder:'2026-05-20', menuPlacements:{ Margarita:'Permanent Placement', 'Ranch Water':'Permanent Placement' }, createdAt:'2025-09-01' },
  { id:'a9',  name:'Vin Room Mission',             type:'Restaurant',           region:'Calgary',            assignedRep:'u3', address:'2310 4 St SW, Calgary, AB',             lat:51.0283, lng:-114.0797, contact:'Michelle Tan',     email:'mission@vinroom.com',           phone:'403-457-5522', website:'vinroom.com',            status:'Active',        notes:'Wine bar with cocktail menu. Paloma performs very well.', lastVisit:'2026-06-02', lastOrder:'2026-05-28', menuPlacements:{ Paloma:'Permanent Placement' },                              createdAt:'2025-10-15' },
  { id:'a10', name:'Shochu Restaurant',            type:'Restaurant',           region:'Calgary',            assignedRep:'u3', address:'1116 Centre St NE, Calgary, AB',        lat:51.0601, lng:-114.0589, contact:'Kevin Park',       email:'kevin@shochucalgary.com',       phone:'403-277-7777', website:'shochucalgary.com',      status:'Buyer Meeting', notes:'Pan-Asian cocktail focus. Cristalino pitch in progress.', lastVisit:'2026-05-20', lastOrder:null, menuPlacements:{},                                          createdAt:'2026-03-01' },
  { id:'a11', name:'Cactus Club – Chinook',        type:'Restaurant',           region:'Calgary',            assignedRep:'u3', address:'6455 Macleod Trail SW, Calgary, AB',    lat:50.9960, lng:-114.0714, contact:'Jessica Williams', email:'chinook@cactusclubcafe.com',    phone:'403-252-0222', website:'cactusclubcafe.com',     status:'Listed',        notes:'National chain location. Listed through corporate.',  lastVisit:'2026-05-15', lastOrder:'2026-04-30', menuPlacements:{ Margarita:'Permanent Placement' },                                     createdAt:'2025-06-01' },
  { id:'a12', name:'Village Wines – Inglewood',   type:'Private Liquor Store', region:'Calgary',            assignedRep:'u3', address:'1220 9 Ave SE, Calgary, AB',            lat:51.0445, lng:-114.0306, contact:'Daniel Moreau',    email:'daniel@villagewines.ca',        phone:'403-265-5222', website:'villagewines.ca',        status:'Active',        notes:'Premium store in trendy neighbourhood. Great velocity.', lastVisit:'2026-05-31', lastOrder:'2026-05-22', menuPlacements:{},                                           createdAt:'2025-11-15' },
  { id:'a13', name:'Mission Hill Winery Estate',  type:'Resort',               region:'Kelowna / Okanagan', assignedRep:'u2', address:'1730 Mission Hill Rd, West Kelowna, BC', lat:49.8728, lng:-119.6087, contact:'Claire Fontaine',  email:'claire@missionhillwinery.com',  phone:'250-768-7611', website:'missionhillwinery.com',  status:'Prospect',      notes:'Premium estate winery. High-end clientele. Need buyer meeting.', lastVisit:'2026-03-10', lastOrder:null, menuPlacements:{},                                        createdAt:'2026-01-01' },
  { id:'a14', name:'BC Liquor Store – Granville', type:'Government Liquor Store',region:'Vancouver',        assignedRep:'u2', address:'1155 Granville St, Vancouver, BC',      lat:49.2793, lng:-123.1261, contact:'BCLDB Area Manager',email:'bcldb.orders@gov.bc.ca',       phone:'604-660-0704', website:'bcl.ca',                 status:'Listed',        notes:'Government store. Standard BCLDB ordering process.',  lastVisit:'2026-04-20', lastOrder:'2026-04-01', menuPlacements:{},                                            createdAt:'2025-05-01' },
  { id:'a15', name:'Sky 360 Restaurant',          type:'Restaurant',           region:'Calgary',            assignedRep:'u3', address:'101 9 Ave SW, Calgary, AB',             lat:51.0503, lng:-114.0637, contact:'Chris Leblanc',    email:'chris@sky360.ca',               phone:'403-532-7966', website:'sky360.ca',              status:'Active',        notes:'Revolving restaurant. Tourist-focused. High margin cocktails.', lastVisit:'2026-05-25', lastOrder:'2026-05-12', menuPlacements:{ Margarita:'Seasonal Feature', Paloma:'Seasonal Feature' },   createdAt:'2025-12-01' },
];

const INIT_VISITS = [
  { id:'v1',  accountId:'a1',  date:'2026-05-28', contact:'Marcus Webb',      type:'Follow Up',        notes:'Reviewed cocktail menu for summer. Marcus keen on Ranch Water addition.',    outcome:'Follow up in 2 weeks with Ranch Water recipe cards.',         followUpDate:'2026-06-11', repId:'u2', checks:{ shelf:true,  menu:true,  display:false, samples:false, sellSheet:false } },
  { id:'v2',  accountId:'a5',  date:'2026-06-01', contact:'Andrea Ramos',     type:'Order Collection', notes:'Collected June order. Shelves fully stocked. Discussed house cocktail.',     outcome:'Order submitted. Follow up on house cocktail next visit.',    followUpDate:'2026-06-15', repId:'u2', checks:{ shelf:true,  menu:true,  display:true,  samples:false, sellSheet:false } },
  { id:'v3',  accountId:'a8',  date:'2026-05-29', contact:"Ryan O'Brien",     type:'Staff Training',   notes:'Trained 6 staff on Sueños cocktail recipes. Blanco and Reposado featured.', outcome:'Great reception. Ranch Water confirmed as permanent on menu.', followUpDate:'2026-06-20', repId:'u3', checks:{ shelf:false, menu:true,  display:false, samples:true,  sellSheet:false } },
  { id:'v4',  accountId:'a9',  date:'2026-06-02', contact:'Michelle Tan',     type:'Follow Up',        notes:'Quick check-in. Sales going well. Michelle wants to trial Añejo.',           outcome:'Sending Añejo sample. Follow up in 1 week.',                  followUpDate:'2026-06-09', repId:'u3', checks:{ shelf:false, menu:true,  display:false, samples:true,  sellSheet:false } },
  { id:'v5',  accountId:'a6',  date:'2026-05-22', contact:'Helena Croft',     type:'Merchandising',    notes:'Restocked shelf. All 4 SKUs present. Installed new shelf talker.',           outcome:'All good. Next reorder in ~3 weeks.',                         followUpDate:'2026-06-12', repId:'u2', checks:{ shelf:true,  menu:false, display:true,  samples:false, sellSheet:false } },
  { id:'v6',  accountId:'a11', date:'2026-05-15', contact:'Jessica Williams', type:'Follow Up',        notes:'Margarita sales performing above target.',                                  outcome:'Discuss adding Reposado to cocktail menu.',                   followUpDate:'2026-06-15', repId:'u3', checks:{ shelf:false, menu:true,  display:false, samples:false, sellSheet:false } },
  { id:'v7',  accountId:'a12', date:'2026-05-31', contact:'Daniel Moreau',    type:'Merchandising',    notes:'Updated shelf placement. All 4 SKUs present. Shelf talkers installed.',     outcome:'Strong velocity. Will discuss end-cap display.',              followUpDate:'2026-06-14', repId:'u3', checks:{ shelf:true,  menu:false, display:true,  samples:false, sellSheet:false } },
  { id:'v8',  accountId:'a10', date:'2026-05-20', contact:'Kevin Park',       type:'Buyer Meeting',    notes:'Full line presented. Kevin very interested in Cristalino.',                 outcome:'Kevin to confirm listing within 2 weeks.',                    followUpDate:'2026-06-03', repId:'u3', checks:{ shelf:false, menu:false, display:false, samples:true,  sellSheet:true  } },
  { id:'v9',  accountId:'a2',  date:'2026-05-30', contact:'Sophie Chen',      type:'Menu Placement',   notes:'Summer menu discussion. Ranch Water confirmed for summer feature.',          outcome:'Ranch Water goes live June 15 on summer menu.',               followUpDate:'2026-06-15', repId:'u2', checks:{ shelf:false, menu:true,  display:false, samples:true,  sellSheet:false } },
  { id:'v10', accountId:'a3',  date:'2026-05-10', contact:'Thomas Lee',       type:'Product Sampling', notes:'Presented Añejo and Cristalino. Thomas keen on Cristalino upgrade.',        outcome:'Pending F&B director approval.',                              followUpDate:'2026-05-31', repId:'u2', checks:{ shelf:false, menu:false, display:false, samples:true,  sellSheet:true  } },
];

const INIT_ORDERS = [
  { id:'o1', accountId:'a5',  productId:'p1', bottles:24, requestedDate:'2026-06-10', storeId:'fs1', status:'Submitted', notes:'Standard Blanco reorder',          repId:'u2', createdAt:'2026-05-25' },
  { id:'o2', accountId:'a5',  productId:'p2', bottles:12, requestedDate:'2026-06-10', storeId:'fs1', status:'Submitted', notes:'Reposado reorder',                  repId:'u2', createdAt:'2026-05-25' },
  { id:'o3', accountId:'a8',  productId:'p1', bottles:36, requestedDate:'2026-06-08', storeId:'fs3', status:'Accepted',  notes:'High-volume Blanco reorder',        repId:'u3', createdAt:'2026-05-28' },
  { id:'o4', accountId:'a9',  productId:'p2', bottles:12, requestedDate:'2026-06-12', storeId:'fs3', status:'Submitted', notes:'',                                  repId:'u3', createdAt:'2026-05-30' },
  { id:'o5', accountId:'a6',  productId:'p1', bottles:24, requestedDate:'2026-06-05', storeId:'fs1', status:'Delivered', notes:'Shelf restock',                     repId:'u2', createdAt:'2026-05-22' },
  { id:'o6', accountId:'a12', productId:'p1', bottles:12, requestedDate:'2026-06-06', storeId:'fs4', status:'Accepted',  notes:'',                                  repId:'u3', createdAt:'2026-05-31' },
  { id:'o7', accountId:'a1',  productId:'p3', bottles:6,  requestedDate:'2026-06-08', storeId:'fs1', status:'Submitted', notes:'Añejo for cocktail menu',           repId:'u2', createdAt:'2026-05-28' },
  { id:'o8', accountId:'a15', productId:'p2', bottles:24, requestedDate:'2026-06-07', storeId:'fs3', status:'Delivered', notes:'Standard reorder',                  repId:'u3', createdAt:'2026-05-25' },
];

const INIT_TASKS = [
  { id:'t1', accountId:'a10', title:'Follow up on Cristalino listing decision', dueDate:'2026-06-03', repId:'u3', done:false, priority:'high'   },
  { id:'t2', accountId:'a4',  title:'Schedule tasting event',                    dueDate:'2026-06-10', repId:'u2', done:false, priority:'medium' },
  { id:'t3', accountId:'a7',  title:'Follow up after sample sent',               dueDate:'2026-06-05', repId:'u2', done:false, priority:'high'   },
  { id:'t4', accountId:'a3',  title:'F&B Director approval follow-up',           dueDate:'2026-06-05', repId:'u2', done:false, priority:'high'   },
  { id:'t5', accountId:'a13', title:'Cold call – schedule buyer meeting',         dueDate:'2026-06-15', repId:'u2', done:false, priority:'low'    },
  { id:'t6', accountId:'a1',  title:'Send Ranch Water recipe cards',              dueDate:'2026-06-11', repId:'u2', done:false, priority:'medium' },
  { id:'t7', accountId:'a9',  title:'Deliver Añejo sample',                      dueDate:'2026-06-09', repId:'u3', done:false, priority:'medium' },
  { id:'t8', accountId:'a11', title:'Discuss Reposado cocktail addition',         dueDate:'2026-06-15', repId:'u3', done:false, priority:'low'    },
];

const INIT_TASTINGS = [
  { id:'ta1', accountId:'a6',  date:'2026-05-18', location:'Marquis Wine Cellars – Store Tasting', staff:'Aria Vega',    bottlesUsed:2, samplesServed:45, notes:'Strong Reposado interest. 8 post-tasting bottles sold.' },
  { id:'ta2', accountId:'a8',  date:'2026-05-25', location:'The Guild Bar – Industry Night',       staff:'Jordan Rivera', bottlesUsed:3, samplesServed:60, notes:'Industry event. Great brand exposure. Staff converted.' },
  { id:'ta3', accountId:'a12', date:'2026-05-30', location:'Village Wines – Weekend Tasting',      staff:'Aria Vega',    bottlesUsed:2, samplesServed:38, notes:'Saturday afternoon. Añejo standout. Same-day reorder.' },
];

const INIT_SALES = [
  { id:'s1',  month:'2026-01', accountId:'a1',  productId:'p3', bottles:18,  revenue:1440  },
  { id:'s2',  month:'2026-01', accountId:'a5',  productId:'p1', bottles:48,  revenue:2880  },
  { id:'s3',  month:'2026-01', accountId:'a6',  productId:'p1', bottles:36,  revenue:2160  },
  { id:'s4',  month:'2026-01', accountId:'a8',  productId:'p1', bottles:60,  revenue:3600  },
  { id:'s5',  month:'2026-01', accountId:'a9',  productId:'p2', bottles:24,  revenue:1680  },
  { id:'s6',  month:'2026-02', accountId:'a1',  productId:'p3', bottles:24,  revenue:1920  },
  { id:'s7',  month:'2026-02', accountId:'a5',  productId:'p1', bottles:60,  revenue:3600  },
  { id:'s8',  month:'2026-02', accountId:'a6',  productId:'p2', bottles:48,  revenue:3360  },
  { id:'s9',  month:'2026-02', accountId:'a8',  productId:'p1', bottles:72,  revenue:4320  },
  { id:'s10', month:'2026-02', accountId:'a11', productId:'p1', bottles:36,  revenue:2160  },
  { id:'s11', month:'2026-03', accountId:'a1',  productId:'p3', bottles:30,  revenue:2400  },
  { id:'s12', month:'2026-03', accountId:'a5',  productId:'p1', bottles:72,  revenue:4320  },
  { id:'s13', month:'2026-03', accountId:'a8',  productId:'p1', bottles:84,  revenue:5040  },
  { id:'s14', month:'2026-03', accountId:'a9',  productId:'p2', bottles:36,  revenue:2520  },
  { id:'s15', month:'2026-03', accountId:'a12', productId:'p1', bottles:48,  revenue:2880  },
  { id:'s16', month:'2026-04', accountId:'a1',  productId:'p3', bottles:24,  revenue:1920  },
  { id:'s17', month:'2026-04', accountId:'a2',  productId:'p1', bottles:36,  revenue:2160  },
  { id:'s18', month:'2026-04', accountId:'a5',  productId:'p1', bottles:84,  revenue:5040  },
  { id:'s19', month:'2026-04', accountId:'a8',  productId:'p1', bottles:96,  revenue:5760  },
  { id:'s20', month:'2026-04', accountId:'a11', productId:'p2', bottles:48,  revenue:3360  },
  { id:'s21', month:'2026-04', accountId:'a14', productId:'p1', bottles:60,  revenue:3600  },
  { id:'s22', month:'2026-05', accountId:'a1',  productId:'p3', bottles:30,  revenue:2400  },
  { id:'s23', month:'2026-05', accountId:'a2',  productId:'p1', bottles:48,  revenue:2880  },
  { id:'s24', month:'2026-05', accountId:'a5',  productId:'p1', bottles:96,  revenue:5760  },
  { id:'s25', month:'2026-05', accountId:'a8',  productId:'p1', bottles:108, revenue:6480  },
  { id:'s26', month:'2026-05', accountId:'a9',  productId:'p2', bottles:48,  revenue:3360  },
  { id:'s27', month:'2026-05', accountId:'a11', productId:'p1', bottles:60,  revenue:3600  },
  { id:'s28', month:'2026-05', accountId:'a12', productId:'p1', bottles:72,  revenue:4320  },
  { id:'s29', month:'2026-05', accountId:'a14', productId:'p1', bottles:84,  revenue:5040  },
  { id:'s30', month:'2026-05', accountId:'a15', productId:'p2', bottles:36,  revenue:2520  },
];

const INIT_TARGETS = [
  { id:'tg1', repId:'u2', month:'2026-06', visits:20, newAccounts:3, newListings:2, bottles:300, revenue:21000 },
  { id:'tg2', repId:'u3', month:'2026-06', visits:18, newAccounts:2, newListings:2, bottles:350, revenue:24500 },
  { id:'tg3', repId:'u2', month:'2026-05', visits:20, newAccounts:2, newListings:2, bottles:280, revenue:19600 },
  { id:'tg4', repId:'u3', month:'2026-05', visits:18, newAccounts:3, newListings:2, bottles:320, revenue:22400 },
];

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const fmtDate  = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-CA',{ year:'numeric',month:'short',day:'numeric'}) : '—';
const fmtShort = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-CA',{ month:'short',day:'numeric'}) : '—';
const fmtCurrency = n => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n||0);
const daysSince = d => d ? Math.floor((Date.now()-new Date(d+'T12:00:00'))/86400000) : 999;
const genId = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().slice(0,10);

function calcHealth(account) {
  let score = 50;
  const vd = daysSince(account.lastVisit);
  const od = daysSince(account.lastOrder);
  if      (vd < 14)  score += 20;
  else if (vd < 30)  score += 10;
  else if (vd > 60)  score -= 20;
  if      (od < 30)  score += 20;
  else if (od < 60)  score += 5;
  else if (od > 90)  score -= 20;
  const perms = Object.values(account.menuPlacements||{}).filter(p=>p==='Permanent Placement').length;
  score += perms * 8;
  if (account.status==='Active')   score += 5;
  if (account.status==='At Risk'||account.status==='Lost') score -= 15;
  if (!account.lastVisit)          score -= 10;
  return Math.max(0, Math.min(100, score));
}
function healthInfo(score) {
  if (score>=70) return { label:'Healthy',    color:'text-emerald-600 dark:text-emerald-400', bg:'bg-emerald-50 dark:bg-emerald-900/20', dot:'bg-emerald-500', ring:'ring-emerald-200 dark:ring-emerald-800' };
  if (score>=40) return { label:'Watch List', color:'text-amber-600 dark:text-amber-400',   bg:'bg-amber-50 dark:bg-amber-900/20',   dot:'bg-amber-500',   ring:'ring-amber-200 dark:ring-amber-800'   };
  return           { label:'At Risk',    color:'text-red-600 dark:text-red-400',       bg:'bg-red-50 dark:bg-red-900/20',       dot:'bg-red-500',     ring:'ring-red-200 dark:ring-red-800'       };
}

// ─── CONTEXT & REDUCER ────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const INITIAL_STATE = {
  user: null,
  view: 'dashboard', params: {},
  darkMode: false, sidebarOpen: true,
  users: INIT_USERS, products: INIT_PRODUCTS, stores: INIT_STORES,
  accounts: INIT_ACCOUNTS, visits: INIT_VISITS, orders: INIT_ORDERS,
  tasks: INIT_TASKS, tastings: INIT_TASTINGS, sales: INIT_SALES, targets: INIT_TARGETS,
  toast: null,
};

function reducer(s, a) {
  switch(a.type) {
    case 'LOGIN':          return {...s, user:a.payload};
    case 'LOGOUT':         return {...s, user:null, view:'dashboard'};
    case 'NAV':            return {...s, view:a.view, params:a.params||{}};
    case 'TOGGLE_DARK':    return {...s, darkMode:!s.darkMode};
    case 'TOGGLE_SIDEBAR': return {...s, sidebarOpen:!s.sidebarOpen};
    case 'ADD_ACCOUNT':    return {...s, accounts:[...s.accounts, a.payload]};
    case 'UPD_ACCOUNT':    return {...s, accounts:s.accounts.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'ADD_VISIT':      return {...s, visits:[...s.visits, a.payload]};
    case 'ADD_ORDER':      return {...s, orders:[...s.orders, a.payload]};
    case 'UPD_ORDER':      return {...s, orders:s.orders.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'ADD_TASK':       return {...s, tasks:[...s.tasks, a.payload]};
    case 'UPD_TASK':       return {...s, tasks:s.tasks.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'DEL_TASK':       return {...s, tasks:s.tasks.filter(x=>x.id!==a.id)};
    case 'ADD_TASTING':    return {...s, tastings:[...s.tastings, a.payload]};
    case 'ADD_PRODUCT':    return {...s, products:[...s.products, a.payload]};
    case 'UPD_PRODUCT':    return {...s, products:s.products.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'ADD_STORE':      return {...s, stores:[...s.stores, a.payload]};
    case 'UPD_STORE':      return {...s, stores:s.stores.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'ADD_USER':       return {...s, users:[...s.users, a.payload]};
    case 'UPD_USER':       return {...s, users:s.users.map(x=>x.id===a.payload.id?a.payload:x)};
    case 'ADD_SALES':      return {...s, sales:[...s.sales, ...a.payload]};
    case 'SET_TARGET': {
      const idx = s.targets.findIndex(t=>t.repId===a.payload.repId&&t.month===a.payload.month);
      if(idx>=0){ const t=[...s.targets]; t[idx]=a.payload; return {...s, targets:t}; }
      return {...s, targets:[...s.targets, a.payload]};
    }
    case 'TOAST':  return {...s, toast:a.payload};
    case 'UNTOAST':return {...s, toast:null};
    default:       return s;
  }
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const PATHS = {
  dashboard:  'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  accounts:   'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  visits:     'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  orders:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  products:   'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  stores:     'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  reports:    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  map:        'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  tasks:      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  tastings:   'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  menu:       'M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z',
  users:      'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  targets:    'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  settings:   'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  plus:       'M12 4v16m8-8H4',
  search:     'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  sun:        'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  moon:       'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  chevronD:   'M19 9l-7 7-7-7',
  chevronR:   'M9 5l7 7-7 7',
  chevronL:   'M15 19l-7-7 7-7',
  x:          'M6 18L18 6M6 6l12 12',
  check:      'M5 13l4 4L19 7',
  edit:       'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash:      'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  upload:     'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  phone:      'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  mail:       'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  pin:        'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  alert:      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info:       'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  bell:       'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  download:   'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  arrowRight: 'M14 5l7 7m0 0l-7 7m7-7H3',
  star:       'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  bars:       'M4 6h16M4 12h16M4 18h16',
};
function Ic({ n, cls='w-5 h-5' }) {
  const parts = (PATHS[n]||'').split(' M ');
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      {(PATHS[n]||'').split('M ').filter(Boolean).map((seg,i)=>(
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={'M '+seg.trim()} />
      ))}
    </svg>
  );
}

// ─── STATUS BADGES ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  // Account statuses
  Prospect:        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Sample Sent':   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Buyer Meeting': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Listing Pending':'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Listed:          'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Active:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'At Risk':       'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Lost:            'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  // Order statuses
  Draft:           'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Submitted:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Accepted:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Delivered:       'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Completed:       'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Cancelled:       'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};
function Badge({ label, cls='' }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[label]||'bg-gray-100 text-gray-700'} ${cls}`}>{label}</span>;
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Btn({ children, variant='primary', size='md', onClick, type='button', disabled, cls='' }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm:'px-2.5 py-1.5 text-xs', md:'px-3.5 py-2 text-sm', lg:'px-5 py-2.5 text-sm' };
  const variants = {
    primary:  'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400 shadow-sm',
    secondary:'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-300',
    danger:   'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400',
    ghost:    'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-300',
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${cls}`}>{children}</button>;
}

function Card({ children, cls='', onClick }) {
  return (
    <div onClick={onClick} className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm ${onClick?'cursor-pointer hover:shadow-md transition-shadow':''} ${cls}`}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color='amber', trend }) {
  const colors = {
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    blue:    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple:  'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    rose:    'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    teal:    'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
  };
  return (
    <Card cls="p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
        </div>
        <div className={`ml-3 p-2.5 rounded-xl ${colors[color]}`}>
          <Ic n={icon} cls="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

function Input({ label, value, onChange, type='text', placeholder, required, cls='', rows }) {
  const base = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-400 focus:border-transparent transition';
  return (
    <div className={cls}>
      {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}{required&&<span className="text-red-400 ml-0.5">*</span>}</label>}
      {rows
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} className={base} />
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} className={base} />
      }
    </div>
  );
}

function Select({ label, value, onChange, options, required, cls='' }) {
  const base = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent transition';
  return (
    <div className={cls}>
      {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}{required&&<span className="text-red-400 ml-0.5">*</span>}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)} required={required} className={base}>
        <option value="">— Select —</option>
        {options.map(o=> typeof o==='string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  );
}

function Modal({ open, onClose, title, children, width='max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl fade-in`}>
        <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <Ic n="x" cls="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="text-center py-14 px-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 mb-4">
        <Ic n={icon} cls="w-7 h-7" />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      {desc && <p className="mt-1 text-xs text-gray-500">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ProgressBar({ value, max, color='amber' }) {
  const pct = Math.min(100, Math.round((value/Math.max(max,1))*100));
  const colors = { amber:'bg-amber-500', emerald:'bg-emerald-500', blue:'bg-blue-500', rose:'bg-rose-500' };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full progress-bar ${colors[color]||colors.amber}`} style={{width:`${pct}%`}} />
      </div>
      <span className="text-xs font-medium text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function Toast() {
  const { state, dispatch } = useApp();
  useEffect(() => {
    if (state.toast) {
      const t = setTimeout(() => dispatch({type:'UNTOAST'}), 3500);
      return () => clearTimeout(t);
    }
  }, [state.toast]);
  if (!state.toast) return null;
  const colors = { success:'bg-emerald-600', error:'bg-red-600', info:'bg-blue-600' };
  return (
    <div className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] toast-anim px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ${colors[state.toast.type]||colors.info}`}>
      <Ic n={state.toast.type==='success'?'check':state.toast.type==='error'?'alert':'info'} cls="w-4 h-4 flex-shrink-0" />
      {state.toast.msg}
    </div>
  );
}

function showToast(dispatch, msg, type='success') {
  dispatch({ type:'TOAST', payload:{ msg, type } });
}
