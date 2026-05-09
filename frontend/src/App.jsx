import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import AppErrorBoundary from './components/AppErrorBoundary';
import AppShellState from './components/AppShellState';
import { BillingAccessProvider } from './context/BillingAccessContext.jsx';
import { ServiceCapabilitiesProvider } from './context/ServiceCapabilitiesProvider.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import { authStore } from './utils/authStore';
import { API_UNAUTHORIZED_EVENT, getSupportReferenceLabel } from './utils/apiClient';
import {
  loadAccountsPage,
  loadActivityPage,
  loadBillingPage,
  loadBudgetPage,
  loadDashboardPage,
  loadEmailVerificationPage,
  loadGoalsPage,
  loadLandingPage,
  loadLoginPage,
  loadNotFoundPage,
  loadOnboardingPage,
  loadPasswordRecoveryPage,
  loadPricingPage,
  loadRecurringPage,
  loadReportsPage,
  loadSettingsPage,
  loadSupportPage,
  loadTransactionsPage,
} from './utils/routePrefetch';
import { settingsStore } from './utils/settingsStore';
import { setSentryUser } from './utils/sentry';

const LandingPage = lazy(loadLandingPage);
const AccountsPage = lazy(loadAccountsPage);
const ActivityPage = lazy(loadActivityPage);
const BillingPage = lazy(loadBillingPage);
const BudgetPage = lazy(loadBudgetPage);
const DashboardPage = lazy(loadDashboardPage);
const EmailVerificationPage = lazy(loadEmailVerificationPage);
const GoalsPage = lazy(loadGoalsPage);
const LoginPage = lazy(loadLoginPage);
const NotFoundPage = lazy(loadNotFoundPage);
const OnboardingPage = lazy(loadOnboardingPage);
const PasswordRecoveryPage = lazy(loadPasswordRecoveryPage);
const PricingPage = lazy(loadPricingPage);
const RecurringPage = lazy(loadRecurringPage);
const ReportsPage = lazy(loadReportsPage);
const SettingsPage = lazy(loadSettingsPage);
const SupportPage = lazy(loadSupportPage);
const TransactionsPage = lazy(loadTransactionsPage);

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/accounts': 'Wallets',
  '/transactions': 'Transactions',
  '/budget': 'Budgets',
  '/goals': 'Goals',
  '/recurring': 'Subscriptions',
  '/reports': 'Insights',
  '/activity': 'Activity',
  '/billing': 'Billing',
  '/': 'Personal finance',
  '/pricing': 'Pricing',
  '/onboarding': 'Onboarding',
  '/settings': 'Settings',
  '/forgot-password': 'Reset password',
  '/verify-email': 'Verify email',
  '/reset-password': 'Reset password',
  '/help': 'Help',
};

const protectedWorkspacePaths = new Set([
  '/accounts',
  '/activity',
  '/billing',
  '/budget',
  '/dashboard',
  '/goals',
  '/help',
  '/onboarding',
  '/recurring',
  '/reports',
  '/settings',
  '/transactions',
]);

const withProtectedWorkspace = (currentUser, onLogout, element) => (
  <ProtectedRoute currentUser={currentUser}>
    <BillingAccessProvider onLogout={onLogout}>{element}</BillingAccessProvider>
  </ProtectedRoute>
);

function AppServiceState({ error, onRetry }) {
  const supportReference = getSupportReferenceLabel(error);

  return (
    <AppShellState
      body={error?.message || 'Rivo could not reach the finance service.'}
      eyebrow="Service unavailable"
      note={supportReference}
      primaryAction={{
        label: 'Retry',
        onClick: onRetry,
      }}
      title="Rivo cannot load your workspace right now."
    />
  );
}

function AppLoadingState({ currentUser, isWorkspace }) {
  return (
    <AppShellState
      body={
        isWorkspace
          ? 'We are reconnecting your workspace, syncing preferences, and restoring session state.'
          : 'We are checking for an existing secure session so the public shell can route you correctly.'
      }
      eyebrow={currentUser ? 'Restoring session' : 'Preparing access'}
      loading
      note={isWorkspace ? 'This should only take a moment.' : ''}
      title={isWorkspace ? 'Opening your workspace.' : 'Preparing Rivo.'}
    />
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => authStore.getSession());
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authBootstrapError, setAuthBootstrapError] = useState(null);
  const location = useLocation();
  const isProtectedWorkspacePath = protectedWorkspacePaths.has(location.pathname);

  const loadCurrentSession = async () => {
    setIsAuthLoading(true);
    setAuthBootstrapError('');

    try {
      const user = await authStore.fetchCurrentUser();
      setCurrentUser(user);

      if (user?.id) {
        try {
          await settingsStore.syncRemoteSettings(user.id, user.fullName);
        } catch (error) {
          console.error('Rivo could not sync workspace settings during bootstrap.', error);
        }
      }
    } catch (error) {
      setCurrentUser(null);

      if (error.status !== 401) {
        setAuthBootstrapError(error);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    setSentryUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (location.pathname === '/') {
      document.title = 'Rivo | Personal finance';
      return;
    }

    if (location.pathname === '/pricing') {
      document.title = 'Rivo | Pricing';
      return;
    }

    if (!currentUser) {
      document.title = 'Rivo | Access';
      return;
    }

    const pageTitle = pageTitles[location.pathname] || 'Dashboard';
    document.title = `Rivo | ${pageTitle}`;
  }, [currentUser, location.pathname]);

  useEffect(() => {
    loadCurrentSession();
  }, []);

  useEffect(() => {
    const handleUnauthorized = async () => {
      await authStore.logout();
      setAuthBootstrapError(null);
      setCurrentUser(null);
      setIsAuthLoading(false);
    };

    globalThis.addEventListener?.(API_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      globalThis.removeEventListener?.(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const handleLogin = async (credentials) => {
    const result = await authStore.login(credentials);

    if (result?.requiresMfa) {
      return result;
    }

    const user = result;
    await settingsStore.syncRemoteSettings(user.id, user.fullName).catch(() => null);
    setAuthBootstrapError(null);
    setCurrentUser(user);
    return user;
  };

  const handleSignUp = async (payload) => {
    const user = await authStore.signup(payload);
    await settingsStore.syncRemoteSettings(user.id, user.fullName).catch(() => null);
    setAuthBootstrapError(null);
    setCurrentUser(user);
    return user;
  };

  const handleCompleteMfaLogin = async (payload) => {
    const result = await authStore.completeMfaLogin(payload);
    await settingsStore.syncRemoteSettings(result.user.id, result.user.fullName).catch(() => null);
    setAuthBootstrapError(null);
    setCurrentUser(result.user);
    return result;
  };

  const handleLogout = async () => {
    await authStore.logout();
    setAuthBootstrapError(null);
    setCurrentUser(null);
  };

  const handleUpdateProfile = async (payload) => {
    const result = await authStore.updateProfile(currentUser.id, payload);
    setCurrentUser(result.user);
    return result;
  };

  const shouldBlockForAuth = isAuthLoading && (Boolean(currentUser) || isProtectedWorkspacePath);

  if (shouldBlockForAuth) {
    return <AppLoadingState currentUser={currentUser} isWorkspace={isProtectedWorkspacePath} />;
  }

  if (authBootstrapError && !currentUser && isProtectedWorkspacePath) {
    return <AppServiceState error={authBootstrapError} onRetry={loadCurrentSession} />;
  }

  return (
    <ServiceCapabilitiesProvider>
      <AppErrorBoundary>
        <Suspense fallback={<AppLoadingState currentUser={currentUser} isWorkspace={Boolean(currentUser)} />}>
          <Routes>
            <Route path="/" element={<LandingPage currentUser={currentUser} />} />

          <Route
            path="/login"
            element={
              currentUser ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage
                  mode="login"
                  onCompleteMfaLogin={handleCompleteMfaLogin}
                  onLogin={handleLogin}
                  onSignUp={handleSignUp}
                />
              )
            }
          />

          <Route
            path="/signup"
            element={
              currentUser ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage
                  mode="signup"
                  onCompleteMfaLogin={handleCompleteMfaLogin}
                  onLogin={handleLogin}
                  onSignUp={handleSignUp}
                />
              )
            }
          />

          <Route path="/pricing" element={<PricingPage currentUser={currentUser} />} />

          <Route
            path="/forgot-password"
            element={currentUser ? <Navigate to="/dashboard" replace /> : <PasswordRecoveryPage />}
          />

          <Route
            path="/reset-password"
            element={currentUser ? <Navigate to="/dashboard" replace /> : <PasswordRecoveryPage />}
          />

          <Route
            path="/verify-email"
            element={<EmailVerificationPage currentUser={currentUser} onRefreshSession={loadCurrentSession} />}
          />

          <Route
            path="/onboarding"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <OnboardingPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <DashboardPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/settings"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <SettingsPage currentUser={currentUser} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} />
              )
            }
          />

          <Route
            path="/accounts"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <AccountsPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/transactions"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <TransactionsPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/budget"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <BudgetPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/goals"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <GoalsPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/recurring"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <RecurringPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/reports"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <ReportsPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/activity"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <ActivityPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/billing"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <BillingPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

          <Route
            path="/help"
            element={
              withProtectedWorkspace(
                currentUser,
                handleLogout,
                <SupportPage currentUser={currentUser} onLogout={handleLogout} />
              )
            }
          />

            <Route path="*" element={<NotFoundPage currentUser={currentUser} />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </ServiceCapabilitiesProvider>
  );
}

export default App;
