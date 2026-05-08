const express = require('express');

const reportsController = require('../controllers/reports.controller');
const authenticate = require('../middleware/auth.middleware');
const { requireBillingFeature } = require('../middleware/billing-access.middleware');
const validate = require('../middleware/validate.middleware');
const { isPositiveInteger, isValidDate } = require('../utils/validators');

const router = express.Router();

router.use(authenticate);

router.get(
  '/overview',
  requireBillingFeature('reports', 'advanced reporting'),
  validate({
    query: [
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
  reportsController.getOverview
);

router.get(
  '/forecast',
  requireBillingFeature('forecasting', 'cash forecasting'),
  validate({
    query: [
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
      {
        field: 'months',
        message: 'Forecast length must be between 1 and 12 months.',
        optional: true,
        validate: (value) => isPositiveInteger(value) && Number(value) <= 12,
      },
    ],
  }),
  reportsController.getForecast
);

module.exports = router;
