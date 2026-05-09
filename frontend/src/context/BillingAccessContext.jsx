import { useCallback, useEffect, useMemo, useState } from 'react';
import { BillingAccessContext } from './billingAccessContext';
import { billingStore, defaultBillingAccess } from '../utils/billingStore';
import { hasTierAccess, isPlusTier, isProTier, normalizeTier } from '../utils/tierAccess';

export function BillingAccessProvider({ children, onLogout }) {
  const [billing, setBilling] = useState(null);
  const [access, setAccess] = useState(defaultBillingAccess);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadBillingAccess = useCallback(async () => {
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
  }, [onLogout]);

  useEffect(() => {
    loadBillingAccess();
  }, [loadBillingAccess]);

  const value = useMemo(
    () => ({
      access,
      billing,
      errorMessage,
      hasFeature: (featureKey) => Boolean(access.featureAccess?.[featureKey]),
      hasTier: (tier) => hasTierAccess(access.tier, tier),
      isPlus: isPlusTier(access.tier),
      isPro: isProTier(access.tier),
      isLoading,
      tier: normalizeTier(access.tier),
      refreshBillingAccess: loadBillingAccess,
    }),
    [access, billing, errorMessage, isLoading, loadBillingAccess]
  );

  return <BillingAccessContext.Provider value={value}>{children}</BillingAccessContext.Provider>;
}
