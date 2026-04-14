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
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) {
      document.title = 'Ledgr | Access';
      return;
    }

    const pageTitle = pageTitles[location.pathname] || 'Dashboard';
    document.title = `Ledgr | ${pageTitle}`;
  }, [currentUser, location.pathname]);

  const handleLogin = (credentials) => {
    const user = authStore.login(credentials);
    setCurrentUser(user);
  };

  const handleSignUp = (payload) => {
    const user = authStore.signup(payload);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authStore.logout();
    setCurrentUser(null);
  };

  const handleUpdateProfile = (payload) => {
    const updatedUser = authStore.updateProfile(currentUser.id, payload);
    setCurrentUser(updatedUser);
    return updatedUser;
  };

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
          <ProtectedRoute>
            <DashboardPage currentUser={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
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
          <ProtectedRoute>
            <PlaceholderPage currentUser={currentUser} onLogout={handleLogout} title="Transactions" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/budget"
        element={
          <ProtectedRoute>
            <PlaceholderPage currentUser={currentUser} onLogout={handleLogout} title="Budget" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <PlaceholderPage currentUser={currentUser} onLogout={handleLogout} title="Goals" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <PlaceholderPage currentUser={currentUser} onLogout={handleLogout} title="Help & Support" />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
