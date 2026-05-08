const express = require('express');

const aiController = require('../controllers/ai.controller');
const authenticate = require('../middleware/auth.middleware');
const { requireBillingFeature } = require('../middleware/billing-access.middleware');
const { createRateLimit } = require('../middleware/rate-limit.middleware');
const validate = require('../middleware/validate.middleware');
const { isPositiveInteger, isValidDate } = require('../utils/validators');

const router = express.Router();
const reportAiRateLimit = createRateLimit({
  keyPrefix: 'ai-reports',
  maxAttempts: 24,
  message: 'AI report briefing is being used too quickly. Please wait a moment and try again.',
  windowMs: 600000,
});
const transactionAiRateLimit = createRateLimit({
  keyPrefix: 'ai-transactions',
  maxAttempts: 18,
  message: 'AI transaction review is being used too quickly. Please wait a moment and try again.',
  windowMs: 600000,
});
const goalAiRateLimit = createRateLimit({
  keyPrefix: 'ai-goals',
  maxAttempts: 18,
  message: 'AI goal guidance is being used too quickly. Please wait a moment and try again.',
  windowMs: 600000,
});

router.use(authenticate);

router.post(
  '/reports/summary',
  reportAiRateLimit,
  requireBillingFeature('aiReports', 'AI report briefings'),
  validate({
    body: [
      {
        field: 'start_date',
        message: 'Start date must be a valid date.',
        optional: true,
        validate: isValidDate,
      },
      {
        field: 'end_date',
        message: 'End date must be a valid date.',
        optional: true,
        validate: isValidDate,
      },
    ],
  }),
  aiController.getReportBriefing
);

router.post(
  '/transactions/suggestions',
  transactionAiRateLimit,
  requireBillingFeature('aiTransactionReview', 'AI transaction review'),
  aiController.getTransactionSuggestions
);

router.post(
  '/goals/guidance',
  goalAiRateLimit,
  requireBillingFeature('goalGuidance', 'AI goal guidance'),
  validate({
    body: [
      {
        field: 'goal_id',
        message: 'Goal id must be a positive integer.',
        optional: true,
        validate: isPositiveInteger,
      },
    ],
  }),
  aiController.getGoalGuidance
);

module.exports = router;
