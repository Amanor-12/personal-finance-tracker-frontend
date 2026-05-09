import { useContext } from 'react';
import { BillingAccessContext } from './billingAccessContext';

export function useBillingAccess() {
  return useContext(BillingAccessContext);
}
