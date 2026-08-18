// PART 5: App Router + Root Component

// ─── APP ROUTER ───────────────────────────────────────────────────────────────
function AppRouter() {
  const { state, dispatch } = useApp();
  const { view, params, user } = state;

  // Guard views by role — redirect instead of showing error
  const adminOnly = ['products','stores','sales-import','targets','users','regions','retail-pricing','cluster-ads','media-desk','ad-creatives','licenses-admin','dashboard-email','manage-promo','manage-promo-categories','promo-orders-admin','promo-reporting','trade-leads','social','email-analytics'];
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
