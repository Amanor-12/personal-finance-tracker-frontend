import { apiClient } from './apiClient';
import { normalizeTier } from './tierAccess';

export const billingPlans = [
  {
    id: 'free',
    name: 'Free',
    eyebrow: 'Start clean',
    interval: 'none',
    price: '$0',
    description: 'Manual tracking for a calm finance workspace.',
    features: ['Up to 2 active accounts', 'Manual transactions and categories', 'Up to 6 budgets', 'Up to 3 goals'],
  },
  {
    id: 'plus_monthly',
    checkoutPlanId: 'premium_monthly',
    name: 'Plus',
    eyebrow: 'Monthly',
    interval: 'monthly',
    price: '$9',
    suffix: '/ month',
    description: 'Recurring control, export tools, and more planning room for active customers.',
    features: [
      'Renewal tracking for bills and subscriptions',
      'Unlimited accounts, budgets, and goals',
      'CSV export and saved transaction views',
      'Basic AI spending insights',
    ],
  },
  {
    id: 'pro_monthly',
    checkoutPlanId: 'premium_annual',
    name: 'Pro',
    eyebrow: 'Best value',
    interval: 'monthly',
    price: '$19',
    suffix: '/ month',
    description: 'Advanced intelligence, forecasting, and the highest-control Ledgr workspace.',
    features: [
      'Everything in Plus',
      'Advanced backend-powered insights',
      'Smart budget generation and financial forecasting',
      'Priority support and early-access features',
    ],
  },
];

export const getPlanDisplayName = (planId, fallbackName = '') => {
  if (planId === 'free') {
    return 'Free';
  }

  if (planId === 'plus_monthly' || planId === 'premium_monthly') {
    return 'Plus';
  }

  if (planId === 'pro_monthly' || planId === 'premium_annual') {
    return 'Pro';
  }

  if (typeof fallbackName === 'string' && fallbackName.trim()) {
    return fallbackName
      .replace(/^premium annual$/i, 'Pro')
      .replace(/^premium monthly$/i, 'Plus')
      .replace(/^premium$/i, 'Plus');
  }

  return fallbackName || 'Free';
};

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
    smartBudgeting: false,
    forecasting: false,
    earlyAccess: false,
  },
  isPremium: false,
  tier: 'free',
  limits: {
    accounts: 2,
    budgets: 6,
    goals: 3,
  },
  upgradePlanId: 'plus_monthly',
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
  const hasPaidAccess =
    currentPlanId !== 'free' &&
    ['active', 'trialing', 'past_due', 'incomplete', 'unpaid'].includes(status);

  if (hasPaidAccess) {
    const isPro = currentPlanId === 'pro_monthly' || currentPlanId === 'premium_annual';

    return {
      ...defaultBillingAccess,
      currentPlanId,
      featureAccess: {
        billingPortal: true,
        recurringPayments: true,
        reports: true,
        smartBudgeting: isPro,
        forecasting: isPro,
        prioritySupport: isPro,
        earlyAccess: isPro,
      },
      isPremium: true,
      tier: isPro ? 'pro' : 'plus',
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
    const currentPlanId = billing.access.currentPlanId || billing?.currentPlan?.id || defaultBillingAccess.currentPlanId;
    const normalizedTier = normalizeTier(
      billing.access.tier ||
      (currentPlanId === 'premium_annual' || currentPlanId === 'pro_monthly'
        ? 'pro'
        : currentPlanId === 'premium_monthly' || currentPlanId === 'plus_monthly'
          ? 'plus'
          : 'free')
    );

    const inferredFeatures =
      normalizedTier === 'pro'
        ? {
            billingPortal: true,
            recurringPayments: true,
            reports: true,
            smartBudgeting: true,
            forecasting: true,
            prioritySupport: true,
            earlyAccess: true,
          }
        : normalizedTier === 'plus'
          ? {
              billingPortal: true,
              recurringPayments: true,
              reports: true,
              smartBudgeting: false,
              forecasting: false,
              prioritySupport: false,
              earlyAccess: false,
            }
          : defaultBillingAccess.featureAccess;

    return {
      ...defaultBillingAccess,
      ...billing.access,
      currentPlanId,
      tier: normalizedTier,
      featureAccess: {
        ...defaultBillingAccess.featureAccess,
        ...inferredFeatures,
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
    const selectedPlan = billingPlans.find((plan) => plan.id === planId);
    const payload = await apiClient.post('/api/billing/checkout', {
      plan_id: selectedPlan?.checkoutPlanId || planId,
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
