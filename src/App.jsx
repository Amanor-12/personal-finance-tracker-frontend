import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import { authStore } from './utils/authStore';

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
          <ProtectedRoute currentUser={currentUser}>
            <OnboardingPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <DashboardPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <SettingsPage currentUser={currentUser} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/accounts"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <AccountsPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/transactions"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <TransactionsPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/budget"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <BudgetPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/goals"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <GoalsPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/recurring"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <RecurringPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <ReportsPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/activity"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <ActivityPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <BillingPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/help"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <SupportPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
    </Suspense>
  );
}

export default App;
