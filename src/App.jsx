import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import { BillingAccessProvider } from './context/BillingAccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import { authStore } from './utils/authStore';
import { API_UNAUTHORIZED_EVENT } from './utils/apiClient';

const AccountsPage = lazy(() => import('./components/AccountsPage'));
const ActivityPage = lazy(() => import('./components/ActivityPage'));
const BillingPage = lazy(() => import('./components/BillingPage'));
const BudgetPage = lazy(() => import('./components/BudgetPage'));
const DashboardPage = lazy(() => import('./components/DashboardPage'));
const GoalsPage = lazy(() => import('./components/GoalsPage'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const OnboardingPage = lazy(() => import('./components/OnboardingPage'));
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
  '/pricing': 'Pricing',
  '/onboarding': 'Onboarding',
  '/settings': 'Settings',
  '/help': 'Help',
};

const withProtectedWorkspace = (currentUser, onLogout, element) => (
  <ProtectedRoute currentUser={currentUser}>
    <BillingAccessProvider onLogout={onLogout}>{element}</BillingAccessProvider>
  </ProtectedRoute>
);

function App() {
  const [currentUser, setCurrentUser] = useState(() => authStore.getSession());
  const [isAuthLoading, setIsAuthLoading] = useState(() => authStore.hasToken());
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/pricing') {
      document.title = 'Ledgr | Pricing';
      return;
    }

    if (!currentUser) {
      document.title = 'Ledgr | Access';
      return;
    }

    const pageTitle = pageTitles[location.pathname] || 'Dashboard';
    document.title = `Ledgr | ${pageTitle}`;
  }, [currentUser, location.pathname]);

  useEffect(() => {
    let isCancelled = false;

    const hydrateSession = async () => {
      if (!authStore.hasToken()) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const user = await authStore.fetchCurrentUser();

        if (!isCancelled) {
          setCurrentUser(user);
        }
      } catch {
        if (!isCancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!isCancelled) {
          setIsAuthLoading(false);
        }
      }
    };

    hydrateSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = async () => {
      await authStore.logout();
      setCurrentUser(null);
      setIsAuthLoading(false);
    };

    globalThis.addEventListener?.(API_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      globalThis.removeEventListener?.(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const handleLogin = async (credentials) => {
    const user = await authStore.login(credentials);
    setCurrentUser(user);
    return user;
  };

  const handleSignUp = async (payload) => {
    const user = await authStore.signup(payload);
    setCurrentUser(user);
    return user;
  };

  const handleLogout = async () => {
    await authStore.logout();
    setCurrentUser(null);
  };

  const handleUpdateProfile = async (payload) => {
    const user = await authStore.updateProfile(currentUser.id, payload);
    setCurrentUser(user);
    return user;
  };

  if (isAuthLoading) {
    return <main className="app-loading-state">Loading your workspace...</main>;
  }

  return (
    <Suspense fallback={<main className="app-loading-state">Loading workspace...</main>}>
    <Routes>
      <Route path="/" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />

      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage mode="login" onLogin={handleLogin} onSignUp={handleSignUp} />
          )
        }
      />

      <Route
        path="/signup"
        element={
          currentUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage mode="signup" onLogin={handleLogin} onSignUp={handleSignUp} />
          )
        }
      />

      <Route path="/pricing" element={<PricingPage currentUser={currentUser} />} />

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
  );
}

export default App;
