const Stripe = require('stripe');

const pool = require('../config/db');
const AppError = require('../utils/AppError');

const stripeApiVersion = '2026-02-25.clover';

const plans = [
  {
    id: 'free',
    name: 'Free',
    interval: 'none',
    price: 0,
    priceLabel: '$0',
    description: 'Manual tracking for a personal workspace.',
    features: ['Up to 2 active accounts', 'Transactions', 'Up to 6 budgets', 'Up to 3 goals'],
  },
  {
    id: 'premium_monthly',
    name: 'Plus',
    interval: 'monthly',
    price: 8,
    priceLabel: '$8 / month',
    description: 'Reporting, recurring control, and faster money workflows.',
    features: ['Recurring payments', 'Reports', 'AI report briefings', 'Connected bank sync', 'Unlimited accounts, budgets, and goals'],
  },
  {
    id: 'premium_annual',
    name: 'Pro',
    interval: 'annual',
    price: 72,
    priceLabel: '$72 / year',
    description: 'The highest-control workflow with forecasting, deeper AI review, and goal guidance.',
    features: ['Everything in Plus', 'Cash forecasting', 'AI transaction review', 'AI goal guidance', 'Reconciliation queue', 'Annual savings'],
  },
];

const paidSubscriptionStatuses = new Set(['active', 'trialing', 'past_due', 'incomplete', 'unpaid']);
const planAccessMatrix = {
  free: {
    tier: 'free',
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
    limits: {
      accounts: 2,
      budgets: 6,
      goals: 3,
    },
  },
  premium_annual: {
    tier: 'pro',
    featureAccess: {
      aiReports: true,
      aiTransactionReview: true,
      bankSync: true,
      billingPortal: true,
      earlyAccess: true,
      forecasting: true,
      goalGuidance: true,
      prioritySupport: false,
      reconciliationWorkbench: true,
      recurringPayments: true,
      reports: true,
      smartBudgeting: true,
    },
    limits: {
      accounts: null,
      budgets: null,
      goals: null,
    },
  },
  premium_monthly: {
    tier: 'plus',
    featureAccess: {
      aiReports: true,
      aiTransactionReview: false,
      bankSync: true,
      billingPortal: true,
      earlyAccess: false,
      forecasting: false,
      goalGuidance: false,
      prioritySupport: false,
      reconciliationWorkbench: false,
      recurringPayments: true,
      reports: true,
      smartBudgeting: false,
    },
    limits: {
      accounts: null,
      budgets: null,
      goals: null,
    },
  },
};
const usageQueries = {
  accounts: `
    SELECT COUNT(*)::INTEGER AS total
    FROM accounts
    WHERE user_id = $1 AND status = 'active'
  `,
  budgets: `
    SELECT COUNT(*)::INTEGER AS total
    FROM budgets
    WHERE user_id = $1
  `,
  goals: `
    SELECT COUNT(*)::INTEGER AS total
    FROM goals
    WHERE user_id = $1
  `,
  recurringPayments: `
    SELECT COUNT(*)::INTEGER AS total
    FROM recurring_payments
    WHERE user_id = $1 AND status = 'active'
  `,
};

let billingSchemaPromise;
let stripeClient;

const getStripeConfig = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const monthlyPriceId = process.env.LEDGR_STRIPE_PRICE_PREMIUM_MONTHLY || '';
  const annualPriceId = process.env.LEDGR_STRIPE_PRICE_PREMIUM_ANNUAL || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  return {
    annualPriceId,
    configured: Boolean(secretKey && monthlyPriceId && annualPriceId),
    mode: process.env.STRIPE_MODE || 'test',
    monthlyPriceId,
    missing: [
      !secretKey ? 'STRIPE_SECRET_KEY' : null,
      !monthlyPriceId ? 'LEDGR_STRIPE_PRICE_PREMIUM_MONTHLY' : null,
      !annualPriceId ? 'LEDGR_STRIPE_PRICE_PREMIUM_ANNUAL' : null,
    ].filter(Boolean),
    secretKey,
    webhookSecret,
  };
};

const ensureBillingSchema = async () => {
  if (!billingSchemaPromise) {
    billingSchemaPromise = (async () => {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(40),
        ADD COLUMN IF NOT EXISTS current_plan_id VARCHAR(80),
        ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS subscription_trial_ends_at TIMESTAMPTZ
      `);

      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users (stripe_customer_id)'
      );
    })().catch((error) => {
      billingSchemaPromise = null;
      throw error;
    });
  }

  await billingSchemaPromise;
};

const getStripeClient = () => {
  const { secretKey } = getStripeConfig();

  if (!secretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: stripeApiVersion,
    });
  }

  return stripeClient;
};

const getPlanPriceId = (planId) => {
  const { annualPriceId, monthlyPriceId } = getStripeConfig();

  if (planId === 'premium_monthly') {
    return monthlyPriceId;
  }

  if (planId === 'premium_annual') {
    return annualPriceId;
  }

  return null;
};

const getPlanByPriceId = (priceId) =>
  plans.find((plan) => plan.id !== 'free' && getPlanPriceId(plan.id) === priceId) || plans[0];

const getEffectivePlanId = (currentPlanId, subscriptionStatus) => {
  if (currentPlanId && currentPlanId !== 'free' && paidSubscriptionStatuses.has(subscriptionStatus)) {
    return currentPlanId;
  }

  return 'free';
};

const formatMoney = (amountInCents, currency = 'USD') => {
  const normalizedCurrency = String(currency || 'USD').toUpperCase();

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency,
  }).format((Number(amountInCents) || 0) / 100);
};

const formatStripeDate = (timestamp) =>
  timestamp ? new Date(timestamp * 1000).toISOString() : null;

const normalizeReturnUrl = (returnUrl) => {
  let parsedUrl;

  try {
    parsedUrl = new URL(returnUrl);
  } catch {
    throw new AppError('A valid return URL is required.', 400);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new AppError('The return URL must use http or https.', 400);
  }

  if (process.env.APP_BASE_URL) {
    const appBaseUrl = new URL(process.env.APP_BASE_URL);

    if (parsedUrl.origin !== appBaseUrl.origin) {
      throw new AppError('The return URL must match the application origin.', 400);
    }
  }

  return parsedUrl.toString();
};

const appendStatusParam = (returnUrl, status, extras = {}) => {
  const parsedUrl = new URL(returnUrl);
  parsedUrl.searchParams.set('checkout', status);

  Object.entries(extras).forEach(([key, value]) => {
    parsedUrl.searchParams.set(key, value);
  });

  return parsedUrl.toString();
};

const getBillingUser = async (userId) => {
  await ensureBillingSchema();

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_status,
        current_plan_id,
        subscription_current_period_end,
        subscription_cancel_at_period_end,
        subscription_trial_ends_at
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('User account could not be found.', 404);
  }

  return result.rows[0];
};

const getBillingUserByCustomerId = async (customerId) => {
  await ensureBillingSchema();

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_status,
        current_plan_id,
        subscription_current_period_end,
        subscription_cancel_at_period_end,
        subscription_trial_ends_at
      FROM users
      WHERE stripe_customer_id = $1
      LIMIT 1
    `,
    [customerId]
  );

  return result.rows[0] || null;
};

const updateCustomerReference = async (userId, customerId) => {
  await pool.query(
    `
      UPDATE users
      SET stripe_customer_id = $1
      WHERE id = $2
    `,
    [customerId, userId]
  );
};

const syncSubscriptionRecord = async (userId, customerId, subscription, currentPlanId) => {
  await pool.query(
    `
      UPDATE users
      SET
        stripe_customer_id = $1,
        stripe_subscription_id = $2,
        subscription_status = $3,
        current_plan_id = $4,
        subscription_current_period_end = $5,
        subscription_cancel_at_period_end = $6,
        subscription_trial_ends_at = $7
      WHERE id = $8
    `,
    [
      customerId,
      subscription?.id || null,
      subscription?.status || null,
      currentPlanId || 'free',
      subscription?.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
      subscription?.cancel_at_period_end || false,
      subscription?.trial_end ? new Date(subscription.trial_end * 1000) : null,
      userId,
    ]
  );
};

const syncSubscriptionStateForCustomer = async (customerId, subscription) => {
  if (!customerId) {
    return null;
  }

  const user = await getBillingUserByCustomerId(customerId);

  if (!user) {
    return null;
  }

  const currentPlanId = getPlanByPriceId(subscription?.items?.data?.[0]?.price?.id)?.id || 'free';
  await syncSubscriptionRecord(user.id, customerId, subscription, currentPlanId);

  return {
    customerId,
    currentPlanId,
    status: subscription?.status || 'none',
    userId: user.id,
  };
};

const getSessionCustomerId = async (stripe, session) => {
  if (typeof session.customer === 'string') {
    return session.customer;
  }

  if (session.customer?.id) {
    return session.customer.id;
  }

  if (session.customer_details?.email) {
    const customers = await stripe.customers.list({
      email: session.customer_details.email,
      limit: 1,
    });

    return customers.data[0]?.id || null;
  }

  return null;
};

const lookupStripeCustomer = async (stripe, user) => {
  if (user.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(user.stripe_customer_id);

      if (!customer.deleted) {
        return customer;
      }
    } catch (error) {
      if (error.code !== 'resource_missing') {
        throw error;
      }
    }
  }

  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  return customers.data[0] || null;
};

const ensureStripeCustomer = async (stripe, user) => {
  const existingCustomer = await lookupStripeCustomer(stripe, user);

  if (existingCustomer) {
    if (existingCustomer.id !== user.stripe_customer_id) {
      await updateCustomerReference(user.id, existingCustomer.id);
    }

    const shouldUpdateIdentity =
      existingCustomer.email !== user.email || existingCustomer.name !== user.name;

    if (shouldUpdateIdentity) {
      return stripe.customers.update(existingCustomer.id, {
        email: user.email,
        metadata: {
          ledgrUserId: String(user.id),
        },
        name: user.name,
      });
    }

    return existingCustomer;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: {
      ledgrUserId: String(user.id),
    },
    name: user.name,
  });

  await updateCustomerReference(user.id, customer.id);

  return customer;
};

const selectSubscription = (subscriptions) => {
  if (!subscriptions.length) {
    return null;
  }

  const sortedSubscriptions = [...subscriptions].sort((left, right) => {
    const leftRank = paidSubscriptionStatuses.has(left.status) ? 0 : 1;
    const rightRank = paidSubscriptionStatuses.has(right.status) ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return right.created - left.created;
  });

  return sortedSubscriptions[0] || null;
};

const getCustomerSubscription = async (stripe, customerId) => {
  const response = await stripe.subscriptions.list({
    customer: customerId,
    limit: 10,
    status: 'all',
    expand: ['data.items.data.price'],
  });

  return selectSubscription(response.data);
};

const listInvoices = async (stripe, customerId) => {
  const response = await stripe.invoices.list({
    customer: customerId,
    limit: 10,
  });

  return response.data.map((invoice) => ({
    amountPaid: formatMoney(invoice.amount_paid, invoice.currency),
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    id: invoice.id,
    issuedAt: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
    number: invoice.number || invoice.id,
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : null,
    status: invoice.status || 'open',
  }));
};

const getUsageSnapshot = async (userId) => {
  const results = await Promise.all(
    Object.entries(usageQueries).map(async ([key, query]) => {
      const result = await pool.query(query, [userId]);
      return [key, Number(result.rows[0]?.total) || 0];
    })
  );

  return Object.fromEntries(results);
};

const buildAccessState = async (user) => {
  const effectivePlanId = getEffectivePlanId(user.current_plan_id, user.subscription_status);
  const matrix = planAccessMatrix[effectivePlanId] || planAccessMatrix.free;
  const usage = await getUsageSnapshot(user.id);

  return {
    currentPlanId: effectivePlanId,
    featureAccess: matrix.featureAccess,
    isPremium: effectivePlanId !== 'free',
    limits: matrix.limits,
    tier: matrix.tier || 'free',
    upgradePlanId: 'premium_monthly',
    usage,
  };
};

const buildOverview = async (stripe, user, customer = null) => {
  const stripeConfig = getStripeConfig();

  if (!stripe || !customer) {
    const fallbackStatus =
      user.subscription_status || (stripeConfig.configured ? 'none' : 'not_configured');
    const effectivePlanId = getEffectivePlanId(user.current_plan_id, fallbackStatus);
    const currentPlan = plans.find((plan) => plan.id === effectivePlanId) || plans[0];
    const access = await buildAccessState({
      ...user,
      current_plan_id: effectivePlanId,
      subscription_status: fallbackStatus,
    });

    return {
      access,
      provider: {
        configured: stripeConfig.configured,
        missing: stripeConfig.missing,
        mode: stripeConfig.mode,
        name: 'stripe',
      },
      currentPlan: {
        id: currentPlan.id,
        interval: currentPlan.interval,
        name: currentPlan.name,
        price: currentPlan.price,
        priceLabel: currentPlan.priceLabel,
        status: fallbackStatus === 'not_configured' ? 'active' : fallbackStatus,
      },
      invoices: [],
      plans,
      subscription: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        id: null,
        status: fallbackStatus,
        trialEndsAt: null,
      },
    };
  }

  const subscription = await getCustomerSubscription(stripe, customer.id);
  const currentPlan = subscription
    ? getPlanByPriceId(subscription.items.data[0]?.price?.id)
    : plans[0];
  const invoices = await listInvoices(stripe, customer.id);
  const access = await buildAccessState({
    ...user,
    current_plan_id: currentPlan.id,
    subscription_status: subscription?.status || 'none',
  });

  await syncSubscriptionRecord(user.id, customer.id, subscription, currentPlan.id);

  return {
    access,
    provider: {
      configured: stripeConfig.configured,
      missing: stripeConfig.missing,
      mode: stripeConfig.mode,
      name: 'stripe',
    },
    currentPlan: {
      id: currentPlan.id,
      interval: currentPlan.interval,
      name: currentPlan.name,
      price: currentPlan.price,
      priceLabel: currentPlan.priceLabel,
      status: subscription?.status || 'active',
    },
    invoices,
    plans,
    subscription: {
      cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
      currentPeriodEnd: formatStripeDate(subscription?.current_period_end),
      id: subscription?.id || null,
      status: subscription?.status || 'none',
      trialEndsAt: formatStripeDate(subscription?.trial_end),
    },
  };
};

const getSubscriptionOverview = async (userId) => {
  const stripeConfig = getStripeConfig();
  const user = await getBillingUser(userId);

  if (!stripeConfig.secretKey) {
    return buildOverview(null, user, null);
  }

  const stripe = getStripeClient();
  const customer = await lookupStripeCustomer(stripe, user);

  if (customer && customer.id !== user.stripe_customer_id) {
    await updateCustomerReference(user.id, customer.id);
  }

  return buildOverview(stripe, user, customer);
};

const getBillingAccess = async (userId) => {
  const user = await getBillingUser(userId);
  return buildAccessState(user);
};

const handleWebhook = async (rawBody, signatureHeader) => {
  const stripeConfig = getStripeConfig();
  const stripe = getStripeClient();

  if (!stripe || !stripeConfig.webhookSecret) {
    throw new AppError('Stripe webhook signing secret is not configured.', 501, {
      missing: !stripeConfig.webhookSecret ? ['STRIPE_WEBHOOK_SECRET'] : stripeConfig.missing,
    });
  }

  const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, stripeConfig.webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;

      if (session.mode !== 'subscription' || !session.subscription) {
        break;
      }

      const customerId = await getSessionCustomerId(stripe, session);
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

      if (customerId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['items.data.price'],
        });

        await syncSubscriptionStateForCustomer(customerId, subscription);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await syncSubscriptionStateForCustomer(subscription.customer, subscription);
      break;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object;

      if (!invoice.customer || !invoice.subscription) {
        break;
      }

      const subscription = await stripe.subscriptions.retrieve(invoice.subscription, {
        expand: ['items.data.price'],
      });

      await syncSubscriptionStateForCustomer(invoice.customer, subscription);
      break;
    }

    default:
      break;
  }

  return {
    received: true,
    type: event.type,
  };
};

const createCheckoutSession = async (payload, currentUser) => {
  const stripeConfig = getStripeConfig();
  const plan = plans.find((item) => item.id === payload.plan_id);

  if (!plan || plan.id === 'free') {
    throw new AppError('Choose a paid plan before starting checkout.', 400);
  }

  if (!stripeConfig.configured) {
    throw new AppError('Stripe Checkout is not configured yet.', 501, {
      missing: stripeConfig.missing,
    });
  }

  const stripe = getStripeClient();
  const returnUrl = normalizeReturnUrl(payload.return_url);
  const user = await getBillingUser(currentUser.id);
  const customer = await ensureStripeCustomer(stripe, user);
  const activeSubscription = await getCustomerSubscription(stripe, customer.id);

  if (activeSubscription && paidSubscriptionStatuses.has(activeSubscription.status)) {
    throw new AppError(
      'A paid subscription already exists. Open the billing portal to manage your current plan.',
      409
    );
  }

  const session = await stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    cancel_url: appendStatusParam(returnUrl, 'cancelled'),
    client_reference_id: String(user.id),
    customer: customer.id,
    line_items: [
      {
        price: getPlanPriceId(plan.id),
        quantity: 1,
      },
    ],
    metadata: {
      ledgrPlanId: plan.id,
      ledgrUserId: String(user.id),
    },
    mode: 'subscription',
    subscription_data: {
      metadata: {
        ledgrPlanId: plan.id,
        ledgrUserId: String(user.id),
      },
    },
    success_url: appendStatusParam(returnUrl, 'success', {
      session_id: '{CHECKOUT_SESSION_ID}',
    }),
  });

  return {
    id: session.id,
    url: session.url,
  };
};

const createPortalSession = async (currentUser, payload = {}) => {
  const stripeConfig = getStripeConfig();

  if (!stripeConfig.secretKey) {
    throw new AppError('Stripe Billing Portal is not configured yet.', 501, {
      missing: stripeConfig.missing,
    });
  }

  const stripe = getStripeClient();
  const user = await getBillingUser(currentUser.id);
  const customer = await ensureStripeCustomer(stripe, user);
  const returnUrl = normalizeReturnUrl(payload.return_url || process.env.APP_BASE_URL || 'http://127.0.0.1:5173/billing');

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  });

  return {
    id: session.id,
    url: session.url,
  };
};

module.exports = {
  ensureBillingSchema,
  createCheckoutSession,
  createPortalSession,
  getBillingAccess,
  getSubscriptionOverview,
  handleWebhook,
};

