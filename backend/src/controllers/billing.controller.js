const billingService = require('../services/billing.service');
const asyncHandler = require('../utils/asyncHandler');

const getSubscriptionOverview = asyncHandler(async (req, res) => {
  const billing = await billingService.getSubscriptionOverview(req.user.id);

  res.json({
    billing,
  });
});

const createCheckoutSession = asyncHandler(async (req, res) => {
  const session = await billingService.createCheckoutSession(req.body, req.user);

  res.status(201).json({
    session,
  });
});

const createPortalSession = asyncHandler(async (req, res) => {
  const session = await billingService.createPortalSession(req.user, req.body);

  res.status(201).json({
    session,
  });
});

const startProTrial = asyncHandler(async (req, res) => {
  const billing = await billingService.startProTrial(req.user.id);

  res.status(201).json({
    billing,
  });
});

const handleWebhook = asyncHandler(async (req, res) => {
  const result = await billingService.handleWebhook(req.body, req.headers['stripe-signature']);

  res.json(result);
});

module.exports = {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionOverview,
  handleWebhook,
  startProTrial,
};
