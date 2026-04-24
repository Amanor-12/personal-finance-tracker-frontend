import { apiClient } from './apiClient';

export const billingPlans = [
  {
    id: 'free',
    name: 'Free',
    eyebrow: 'Start clean',
    interval: 'none',
    price: '$0',
    description: 'Manual tracking for a private finance workspace.',
    features: ['Up to 2 active accounts', 'Transactions', 'Up to 6 budgets', 'Up to 3 goals'],
  },
  {
    id: 'premium_monthly',
    name: 'Premium',
    eyebrow: 'Monthly',
    interval: 'monthly',
    price: '$8',
    suffix: '/ month',
    description: 'Advanced tracking, recurring payments, and reporting.',
    features: ['Recurring payments', 'Reports', 'Unlimited planning spaces', 'Priority support'],
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

export const defaultBillingAccess = {
  currentPlanId: 'free',
  featureAccess: {
    billingPortal: false,
    prioritySupport: false,
    recurringPayments: false,
    reports: false,
  },
  isPremium: false,
  limits: {
    accounts: 2,
    budgets: 6,
    goals: 3,
  },
  upgradePlanId: 'premium_monthly',
  usage: {
    accounts: 0,
    budgets: 0,
    goals: 0,
    recurringPayments: 0,
  },
};

const getFallbackAccess = (billing) => {
  const currentPlanId = billing?.currentPlan?.id || 'free';
  const status = billing?.subscription?.status || 'none';
  const hasPremiumAccess =
    currentPlanId !== 'free' &&
    ['active', 'trialing', 'past_due', 'incomplete', 'unpaid'].includes(status);

  if (hasPremiumAccess) {
    return {
      ...defaultBillingAccess,
      currentPlanId,
      featureAccess: {
        billingPortal: true,
        prioritySupport: true,
        recurringPayments: true,
        reports: true,
      },
      isPremium: true,
      limits: {
        accounts: null,
        budgets: null,
        goals: null,
      },
    };
  }

  return defaultBillingAccess;
};

export const resolveBillingAccess = (billing) => {
  if (billing?.access) {
    return {
      ...defaultBillingAccess,
      ...billing.access,
      featureAccess: {
        ...defaultBillingAccess.featureAccess,
        ...(billing.access.featureAccess || {}),
      },
      limits: {
        ...defaultBillingAccess.limits,
        ...(billing.access.limits || {}),
      },
      usage: {
        ...defaultBillingAccess.usage,
        ...(billing.access.usage || {}),
      },
    };
  }

  return getFallbackAccess(billing);
};

export const billingStore = {
  async getOverview() {
    const payload = await apiClient.get('/api/billing/subscription');
    return {
      ...payload.billing,
      access: resolveBillingAccess(payload.billing),
    };
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
