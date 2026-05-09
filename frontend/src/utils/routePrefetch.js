const createCachedLoader = (loader) => {
  let promise = null;

  return () => {
    if (!promise) {
      promise = loader().catch((error) => {
        promise = null;
        throw error;
      });
    }

    return promise;
  };
};

export const loadLandingPage = createCachedLoader(() => import('../components/LandingPage'));
export const loadAccountsPage = createCachedLoader(() => import('../components/AccountsPage'));
export const loadActivityPage = createCachedLoader(() => import('../components/ActivityPage'));
export const loadBillingPage = createCachedLoader(() => import('../components/BillingPage'));
export const loadBudgetPage = createCachedLoader(() => import('../components/BudgetPage'));
export const loadDashboardPage = createCachedLoader(() => import('../components/DashboardPage'));
export const loadEmailVerificationPage = createCachedLoader(() => import('../components/EmailVerificationPage'));
export const loadGoalsPage = createCachedLoader(() => import('../components/GoalsPage'));
export const loadLoginPage = createCachedLoader(() => import('../components/LoginPage'));
export const loadNotFoundPage = createCachedLoader(() => import('../components/NotFoundPage'));
export const loadOnboardingPage = createCachedLoader(() => import('../components/OnboardingPage'));
export const loadPasswordRecoveryPage = createCachedLoader(() => import('../components/PasswordRecoveryPage'));
export const loadPricingPage = createCachedLoader(() => import('../components/PricingPage'));
export const loadRecurringPage = createCachedLoader(() => import('../components/RecurringPage'));
export const loadReportsPage = createCachedLoader(() => import('../components/ReportsPage'));
export const loadSettingsPage = createCachedLoader(() => import('../components/SettingsPage'));
export const loadSupportPage = createCachedLoader(() => import('../components/SupportPage'));
export const loadTransactionsPage = createCachedLoader(() => import('../components/TransactionsPage'));

const routeLoaders = {
  '/': loadLandingPage,
  '/accounts': loadAccountsPage,
  '/activity': loadActivityPage,
  '/billing': loadBillingPage,
  '/budget': loadBudgetPage,
  '/dashboard': loadDashboardPage,
  '/forgot-password': loadPasswordRecoveryPage,
  '/goals': loadGoalsPage,
  '/help': loadSupportPage,
  '/login': loadLoginPage,
  '/onboarding': loadOnboardingPage,
  '/pricing': loadPricingPage,
  '/recurring': loadRecurringPage,
  '/reports': loadReportsPage,
  '/reset-password': loadPasswordRecoveryPage,
  '/settings': loadSettingsPage,
  '/signup': loadLoginPage,
  '/transactions': loadTransactionsPage,
  '/verify-email': loadEmailVerificationPage,
};

const normalizePath = (path) => String(path || '').split('#')[0].split('?')[0];

export const prefetchRoute = (path) => {
  const loader = routeLoaders[normalizePath(path)];

  if (loader) {
    void loader();
  }
};

export const scheduleRoutePrefetch = (path) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const warmRoute = () => prefetchRoute(path);

  if (typeof window.requestIdleCallback === 'function') {
    const callbackId = window.requestIdleCallback(warmRoute, {
      timeout: 1200,
    });

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(callbackId);
      }
    };
  }

  const timeoutId = window.setTimeout(warmRoute, 240);

  return () => {
    window.clearTimeout(timeoutId);
  };
};
