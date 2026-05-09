import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import AppErrorBoundary from './components/AppErrorBoundary';
import { BillingAccessProvider } from './context/BillingAccessContext.jsx';
import { ServiceCapabilitiesProvider } from './context/ServiceCapabilitiesProvider.jsx';
import LandingPage from './components/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import { authStore } from './utils/authStore';
import { API_UNAUTHORIZED_EVENT } from './utils/apiClient';
import { settingsStore } from './utils/settingsStore';
import { setSentryUser } from './utils/sentry';

const AccountsPage = lazy(() => import('./components/AccountsPage'));
const ActivityPage = lazy(() => import('./components/ActivityPage'));
const BillingPage = lazy(() => import('./components/BillingPage'));
const BudgetPage = lazy(() => import('./components/BudgetPage'));
const DashboardPage = lazy(() => import('./components/DashboardPage'));
const EmailVerificationPage = lazy(() => import('./components/EmailVerificationPage'));
const GoalsPage = lazy(() => import('./components/GoalsPage'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const OnboardingPage = lazy(() => import('./components/OnboardingPage'));
const PasswordRecoveryPage = lazy(() => import('./components/PasswordRecoveryPage'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const RecurringPage = lazy(() => import('./components/RecurringPage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const SupportPage = lazy(() => import('./components/SupportPage'));
const TransactionsPage = lazy(() => import('./components/TransactionsPage'));

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

function AppServiceState({ message, onRetry }) {
  return (
    <main className="app-shell-state">
      <section className="app-shell-card" role="alert" aria-live="polite">
        <span className="app-shell-eyebrow">Service unavailable</span>
        <h1>Rivo cannot load your workspace right now.</h1>
        <p>{message}</p>
        <div className="app-shell-actions">
          <button className="app-shell-primary" type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => authStore.getSession());
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authBootstrapError, setAuthBootstrapError] = useState('');
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
        setAuthBootstrapError(error.message || 'Rivo could not reach the finance service.');
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
      setAuthBootstrapError('');
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
    setAuthBootstrapError('');
    setCurrentUser(user);
    return user;
  };

  const handleSignUp = async (payload) => {
    const user = await authStore.signup(payload);
    await settingsStore.syncRemoteSettings(user.id, user.fullName).catch(() => null);
    setAuthBootstrapError('');
    setCurrentUser(user);
    return user;
  };

  const handleCompleteMfaLogin = async (payload) => {
    const result = await authStore.completeMfaLogin(payload);
    await settingsStore.syncRemoteSettings(result.user.id, result.user.fullName).catch(() => null);
    setAuthBootstrapError('');
    setCurrentUser(result.user);
    return result;
  };

  const handleLogout = async () => {
    await authStore.logout();
    setAuthBootstrapError('');
    setCurrentUser(null);
  };

  const handleUpdateProfile = async (payload) => {
    const result = await authStore.updateProfile(currentUser.id, payload);
    setCurrentUser(result.user);
    return result;
  };

  if (isAuthLoading) {
    return <main className="app-loading-state">Loading your workspace...</main>;
  }

  if (authBootstrapError && !currentUser && isProtectedWorkspacePath) {
    return <AppServiceState message={authBootstrapError} onRetry={loadCurrentSession} />;
  }

  return (
    <ServiceCapabilitiesProvider>
      <AppErrorBoundary>
        <Suspense fallback={<main className="app-loading-state">Loading workspace...</main>}>
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

            <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </ServiceCapabilitiesProvider>
  );
}

export default App;
