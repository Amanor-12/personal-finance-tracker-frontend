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
    price: '$8',
    suffix: '/ month',
    description: 'Recurring control, reporting, and workflow tools for active customers.',
    features: [
      'Renewal tracking for bills and subscriptions',
      'Unlimited accounts, budgets, and goals',
      'CSV export and saved transaction views',
      'AI report briefings from the backend',
      'Connected bank sync',
    ],
  },
  {
    id: 'pro_annual',
    checkoutPlanId: 'premium_annual',
    name: 'Pro',
    eyebrow: 'Annual',
    interval: 'annual',
    price: '$72',
    suffix: '/ year',
    description: 'The highest-control workspace for heavier finance workflows and AI-assisted review.',
    features: [
      'Everything in Plus',
      'Cash forecasting',
      'Bulk transaction categorization',
      'AI transaction category review',
      'AI goal guidance',
      'Reconciliation queue',
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

  if (planId === 'pro_annual' || planId === 'premium_annual') {
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
    aiReports: false,
    aiTransactionReview: false,
    bankSync: false,
    billingPortal: false,
    earlyAccess: false,
    forecasting: false,
    goalGuidance: false,
    prioritySupport: false,
    reconciliationWorkbench: false,
    recurringPayments: false,
    reports: false,
    smartBudgeting: false,
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
    const isPro = currentPlanId === 'pro_annual' || currentPlanId === 'premium_annual';

    return {
      ...defaultBillingAccess,
      currentPlanId,
      featureAccess: {
        aiReports: true,
        aiTransactionReview: isPro,
        bankSync: true,
        billingPortal: true,
        earlyAccess: isPro,
        goalGuidance: isPro,
        forecasting: isPro,
        recurringPayments: true,
        reports: true,
        reconciliationWorkbench: isPro,
        smartBudgeting: isPro,
        prioritySupport: isPro,
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
      (currentPlanId === 'premium_annual' || currentPlanId === 'pro_annual'
        ? 'pro'
        : currentPlanId === 'premium_monthly' || currentPlanId === 'plus_monthly'
          ? 'plus'
          : 'free')
    );

    const inferredFeatures =
      normalizedTier === 'pro'
          ? {
              aiReports: true,
              aiTransactionReview: true,
              bankSync: true,
              billingPortal: true,
              earlyAccess: true,
              goalGuidance: true,
              forecasting: true,
              recurringPayments: true,
              reports: true,
              reconciliationWorkbench: true,
              smartBudgeting: true,
              prioritySupport: true,
            }
          : normalizedTier === 'plus'
            ? {
                aiReports: true,
                aiTransactionReview: false,
                bankSync: true,
                billingPortal: true,
                earlyAccess: false,
                goalGuidance: false,
                forecasting: false,
                recurringPayments: true,
                reports: true,
                reconciliationWorkbench: false,
                smartBudgeting: false,
                prioritySupport: false,
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
