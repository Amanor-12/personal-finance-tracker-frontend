import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, currentUser }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
