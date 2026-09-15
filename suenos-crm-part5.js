// PART 5: App Router + Root Component

// ─── VIEW ERROR BOUNDARY ──────────────────────────────────────────────────────
// Catches a render error in one view and shows it (with the real message/stack)
// instead of letting it bubble to window.onerror and blank the whole CRM. Keyed
// by view in the shell so navigating away clears a broken screen.
class ViewErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { try { console.error('[View error]', err, info && info.componentStack); } catch(_) {} }
  render() {
    if (this.state.err) {
      const e = this.state.err;
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
            <p className="font-bold text-red-700 dark:text-red-400 mb-1">This screen hit an error</p>
            <p className="text-sm text-red-600 dark:text-red-300 mb-3">The rest of the CRM is fine — head back to the dashboard, and send this message to support so it can be fixed.</p>
            <pre className="text-[11px] bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/50 rounded-lg p-3 overflow-auto whitespace-pre-wrap text-gray-700 dark:text-gray-300 max-h-64">{String((e && (e.stack || e.message)) || e)}</pre>
            <button onClick={()=>{ this.setState({ err:null }); if (this.props.onReset) this.props.onReset(); }}
              className="mt-3 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">Back to dashboard</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── APP ROUTER ───────────────────────────────────────────────────────────────
function AppRouter() {
  const { state, dispatch } = useApp();
  const { view, params, user } = state;

  // Guard views by role — redirect instead of showing error
  const adminOnly = ['products','stores','sales-import','targets','users','regions','retail-pricing','cluster-ads','media-desk','weather-ads','ad-creatives','licenses-admin','dashboard-email','manage-promo','manage-promo-categories','promo-orders-admin','promo-reporting','trade-leads','social','email-analytics','volume-report','outreach'];
  if (adminOnly.includes(view) && user.role !== 'admin') {
    dispatch({ type:'NAV', view:'dashboard' });
    return null;
  }

  switch(view) {
    case 'dashboard':
      if (user.role === 'admin')      return <AdminDashboard />;
      if (user.role === 'ambassador') return <AmbassadorDashboard />;
      return <RepDashboard />;
    case 'accounts':        return <AccountList />;
    case 'account-detail':  return <AccountDetail />;
    case 'new-account':     return <NewAccount />;
    case 'visits':          return <VisitList />;
    case 'new-visit':       return <NewVisit />;
    case 'orders':          return <OrderList />;
    case 'new-order':       return <NewOrder />;
    case 'tasks':           return <TasksView />;
    case 'tastings':        return <TastingsView />;
    case 'calendar':        return <CalendarView />;
    case 'new-tasting':     return <NewTasting />;
    case 'sampling-request': return <SamplingRequestForm />;
    case 'menu-placements': return <MenuPlacementsView />;
    case 'products':        return <ProductsView />;
    case 'stores':          return <StoresView />;
    case 'reports':         return <ReportsView />;
    case 'volume-report':   return <VolumeReportView />;
    case 'outreach':        return <OutreachView />;
    case 'map':             return <MapView />;
    case 'users':           return <UsersView />;
    case 'targets':         return <TargetsView />;
    case 'sales-import':    return <SalesImportView />;
    case 'regions':         return <RegionsView />;
    case 'retail-pricing':  return <RetailPricingView />;
    case 'cluster-ads':    return <ClusterAdsView />;
    case 'ad-creatives':   return <AdCreativesView />;
    case 'ad-performance':    return <AdPerformanceView />;
    case 'social':            return <SocialView />;
    case 'media-desk':        return <MediaDeskView />;
    case 'weather-ads':       return <WeatherAdsView />;
    case 'email-analytics':   return <EmailAnalyticsView />;
    case 'trade-leads':       return <TradeLeadsView />;
    case 'web-analytics':     return <WebAnalyticsView />;
    case 'licenses-admin':    return <LicensesAdminView />;
    case 'licence-prospects': return <LicenseProspectsView />;
    case 'dashboard-email':   return <DashboardEmailView />;
    case 'order-promo':          return <OrderPromoMaterialsView />;
    case 'my-promo-orders':      return <MyPromoOrdersView />;
    case 'manage-promo':         return <ManagePromoMaterialsView />;
    case 'manage-promo-categories': return <PromoCategoriesView />;
    case 'promo-orders-admin':   return <PromoOrdersAdminView />;
    case 'promo-reporting':      return <PromoReportingView />;
    default:                  return <AdminDashboard />;
  }
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  return (
    <AppCtx.Provider value={{ state, dispatch }}>
      <div className={state.darkMode ? 'dark' : ''} style={{height:'100vh',display:'flex',flexDirection:'column'}}>
        <div className={`flex-1 flex flex-col overflow-hidden ${state.darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
          {!state.user
            ? <LoginScreen />
            : <Layout><AppRouter /></Layout>
          }
          <Toast />
        </div>
      </div>
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
