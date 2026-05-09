import { createContext } from 'react';
import { defaultBillingAccess } from '../utils/billingStore';

export const BillingAccessContext = createContext({
  access: defaultBillingAccess,
  billing: null,
  errorMessage: '',
  hasFeature: () => false,
  hasTier: () => false,
  isLoading: false,
  isPlus: false,
  isPro: false,
  refreshBillingAccess: async () => {},
  tier: 'free',
});
