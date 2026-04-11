import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import DashboardPage from './components/DashboardPage';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { authStore } from './utils/authStore';

function App() {
  const [currentUser, setCurrentUser] = useState(() => authStore.getSession());
  const [registeredUsers, setRegisteredUsers] = useState(() => authStore.getUsers());

  useEffect(() => {
    document.title = currentUser ? 'Finance Flow | Dashboard' : 'Finance Flow | Access';
  }, [currentUser]);

  const refreshUsers = () => {
    setRegisteredUsers(authStore.getUsers());
  };

  const handleLogin = (credentials) => {
    const user = authStore.login(credentials);
    setCurrentUser(user);
    refreshUsers();
  };

  const handleSignUp = (payload) => {
    const user = authStore.signup(payload);
    setCurrentUser(user);
    refreshUsers();
  };

  const handleLogout = () => {
    authStore.logout();
    setCurrentUser(null);
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
            <>
              <Navbar user={currentUser} onLogout={handleLogout} />
              <DashboardPage currentUser={currentUser} registeredUsers={registeredUsers} />
            </>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
