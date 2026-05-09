import { BillingAccessProvider } from '../context/BillingAccessContext.jsx';
import { ServiceCapabilitiesProvider } from '../context/ServiceCapabilitiesProvider.jsx';
import ProtectedRoute from './ProtectedRoute';

function WorkspaceRouteFrame({ children, currentUser, onLogout }) {
  return (
    <ProtectedRoute currentUser={currentUser}>
      <ServiceCapabilitiesProvider>
        <BillingAccessProvider onLogout={onLogout}>{children}</BillingAccessProvider>
      </ServiceCapabilitiesProvider>
    </ProtectedRoute>
  );
}

export default WorkspaceRouteFrame;
