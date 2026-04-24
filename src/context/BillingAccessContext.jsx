import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { billingStore, defaultBillingAccess } from '../utils/billingStore';

const BillingAccessContext = createContext({
  access: defaultBillingAccess,
  billing: null,
  errorMessage: '',
  hasFeature: () => false,
  isLoading: false,
  refreshBillingAccess: async () => {},
});

export function BillingAccessProvider({ children, onLogout }) {
  const [billing, setBilling] = useState(null);
  const [access, setAccess] = useState(defaultBillingAccess);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadBillingAccess = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const overview = await billingStore.getOverview();
      setBilling(overview);
      setAccess(overview.access || defaultBillingAccess);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setBilling(null);
      setAccess(defaultBillingAccess);
      setErrorMessage(error.message || 'Billing access could not load.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingAccess();
  }, []);

  const value = useMemo(
    () => ({
      access,
      billing,
      errorMessage,
      hasFeature: (featureKey) => Boolean(access.featureAccess?.[featureKey]),
      isLoading,
      refreshBillingAccess: loadBillingAccess,
    }),
    [access, billing, errorMessage, isLoading]
  );

  return <BillingAccessContext.Provider value={value}>{children}</BillingAccessContext.Provider>;
}

export function useBillingAccess() {
  return useContext(BillingAccessContext);
}
