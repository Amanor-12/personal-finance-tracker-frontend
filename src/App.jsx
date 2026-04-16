import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import DashboardPage from './components/DashboardPage';
import LoginPage from './components/LoginPage';
import PlaceholderPage from './components/PlaceholderPage';
import ProtectedRoute from './components/ProtectedRoute';
import SettingsPage from './components/SettingsPage';
import { authStore } from './utils/authStore';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/budget': 'Budget',
  '/goals': 'Goals',
  '/settings': 'Settings',
  '/help': 'Help',
};

function App() {
  const [currentUser, setCurrentUser] = useState(() => authStore.getSession());
  const [isAuthLoading, setIsAuthLoading] = useState(() => authStore.hasToken());
  const location = useLocation();

  useEffect(() => {
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
    const updatedUser = await authStore.updateProfile(currentUser.id, payload);
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  if (isAuthLoading) {
    return <main className="app-loading-state">Loading your workspace...</main>;
  }

  return (
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
            <SettingsPage
              currentUser={currentUser}
              onLogout={handleLogout}
              onUpdateProfile={handleUpdateProfile}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/transactions"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <PlaceholderPage currentUser={currentUser} onLogout={handleLogout} title="Transactions" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/budget"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <PlaceholderPage currentUser={currentUser} onLogout={handleLogout} title="Budget" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/goals"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <PlaceholderPage currentUser={currentUser} onLogout={handleLogout} title="Goals" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/help"
        element={
          <ProtectedRoute currentUser={currentUser}>
            <PlaceholderPage currentUser={currentUser} onLogout={handleLogout} title="Help & Support" />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
