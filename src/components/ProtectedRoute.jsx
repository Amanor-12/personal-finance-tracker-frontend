import { Navigate } from 'react-router-dom';
import { authStore } from '../utils/authStore';

function ProtectedRoute({ children }) {
  const currentUser = authStore.getSession();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
