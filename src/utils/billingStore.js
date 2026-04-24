import { apiClient } from './apiClient';

export const billingPlans = [
  {
    id: 'free',
    name: 'Free',
    eyebrow: 'Start clean',
    interval: 'none',
    price: '$0',
    description: 'Manual tracking for a private finance workspace.',
    features: ['Manual accounts', 'Transactions', 'Budgets', 'Goals'],
  },
  {
    id: 'premium_monthly',
    name: 'Premium',
    eyebrow: 'Monthly',
    interval: 'monthly',
    price: '$8',
    suffix: '/ month',
    description: 'Advanced tracking, recurring payments, and reporting.',
    features: ['Recurring payments', 'Reports', 'Priority support', 'Billing portal'],
  },
  {
    id: 'premium_annual',
    name: 'Premium Annual',
    eyebrow: 'Best value',
    interval: 'annual',
    price: '$72',
    suffix: '/ year',
    description: 'Premium access with annual billing.',
    features: ['Everything in Premium', 'Annual savings', 'Invoice history', 'Plan management'],
  },
];

export const subscriptionStatusCopy = {
  active: 'Active',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
  incomplete_expired: 'Incomplete expired',
  none: 'No paid subscription',
  not_configured: 'Stripe not configured',
  past_due: 'Past due',
  trialing: 'Trialing',
  unpaid: 'Unpaid',
};

export const billingStore = {
  async getOverview() {
    const payload = await apiClient.get('/api/billing/subscription');
    return payload.billing;
  },
  async createCheckoutSession(planId) {
    const payload = await apiClient.post('/api/billing/checkout', {
      plan_id: planId,
      return_url: `${window.location.origin}/billing`,
    });

    return payload.session;
  },
  async createPortalSession() {
    const payload = await apiClient.post('/api/billing/portal', {
      return_url: `${window.location.origin}/billing`,
    });

    return payload.session;
  },
};
