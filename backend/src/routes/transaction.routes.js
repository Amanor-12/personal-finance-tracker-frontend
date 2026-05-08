const express = require('express');

const transactionController = require('../controllers/transaction.controller');
const authenticate = require('../middleware/auth.middleware');
const { requireBillingFeature } = require('../middleware/billing-access.middleware');
const validate = require('../middleware/validate.middleware');
const {
  hasMaxLength,
  hasLengthBetween,
  isBoolean,
  isPositiveInteger,
  isPositiveNumber,
  isTransactionType,
  isValidDate,
} = require('../utils/validators');

const router = express.Router();

router.use(authenticate);

router.get(
  '/views',
  requireBillingFeature('reports', 'saved ledger views'),
  transactionController.getSavedViews
);

router.post(
  '/views',
  requireBillingFeature('reports', 'saved ledger views'),
  validate({
    body: [
      {
        field: 'name',
        message: 'Saved view name must be between 1 and 80 characters.',
        validate: hasLengthBetween(1, 80),
      },
      {
        field: 'filters',
        message: 'Filters must be an object.',
        optional: true,
        validate: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
      },
    ],
  }),
  transactionController.saveView
);

router.delete(
  '/views/:id',
  requireBillingFeature('reports', 'saved ledger views'),
  validate({
    params: [
      {
        field: 'id',
        message: 'Saved view id must be a positive integer.',
        validate: isPositiveInteger,
      },
    ],
  }),
  transactionController.deleteView
);

router.post(
  '/export',
  requireBillingFeature('reports', 'transaction export'),
  validate({
    body: [
      {
        field: 'transaction_ids',
        message: 'Transaction ids must be an array of positive integers.',
        optional: true,
        validate: (value) =>
          Array.isArray(value) &&
          value.every((item) => Number.isInteger(Number(item)) && Number(item) > 0),
      },
      {
        field: 'filters',
        message: 'Filters must be an object.',
        optional: true,
        validate: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
      },
    ],
  }),
  transactionController.exportTransactions
);

router.get('/', transactionController.getTransactions);

router.get(
  '/:id',
  validate({
    params: [
      {
        field: 'id',
        message: 'Transaction id must be a positive integer.',
        validate: isPositiveInteger,
      },
    ],
  }),
  transactionController.getTransaction
);

router.post(
  '/',
  validate({
    body: [
      {
        field: 'category_id',
        message: 'A category is required.',
        validate: isPositiveInteger,
      },
      {
        field: 'type',
        message: 'Transaction type must be income or expense.',
        validate: isTransactionType,
      },
      {
        field: 'amount',
        message: 'Amount must be greater than zero.',
        validate: isPositiveNumber,
      },
      {
        field: 'account_id',
        message: 'Account id must be a positive integer.',
        validate: isPositiveInteger,
        optional: true,
      },
      {
        field: 'description',
        message: 'Description must be 255 characters or fewer.',
        validate: hasLengthBetween(1, 255),
        optional: true,
      },
      {
        field: 'notes',
        message: 'Notes must be 500 characters or fewer.',
        validate: hasMaxLength(500),
        optional: true,
      },
      {
        field: 'is_recurring',
        message: 'Recurring flag must be true or false.',
        validate: isBoolean,
        optional: true,
      },
      {
        field: 'transaction_date',
        message: 'Provide a valid transaction date.',
        validate: isValidDate,
      },
    ],
  }),
  transactionController.createTransaction
);

router.put(
  '/:id',
  validate({
    params: [
      {
        field: 'id',
        message: 'Transaction id must be a positive integer.',
        validate: isPositiveInteger,
      },
    ],
    body: [
      {
        field: 'category_id',
        message: 'A category is required.',
        validate: isPositiveInteger,
      },
      {
        field: 'type',
        message: 'Transaction type must be income or expense.',
        validate: isTransactionType,
      },
      {
        field: 'amount',
        message: 'Amount must be greater than zero.',
        validate: isPositiveNumber,
      },
      {
        field: 'account_id',
        message: 'Account id must be a positive integer.',
        validate: isPositiveInteger,
        optional: true,
      },
      {
        field: 'description',
        message: 'Description must be 255 characters or fewer.',
        validate: hasLengthBetween(1, 255),
        optional: true,
      },
      {
        field: 'notes',
        message: 'Notes must be 500 characters or fewer.',
        validate: hasMaxLength(500),
        optional: true,
      },
      {
        field: 'is_recurring',
        message: 'Recurring flag must be true or false.',
        validate: isBoolean,
        optional: true,
      },
      {
        field: 'transaction_date',
        message: 'Provide a valid transaction date.',
        validate: isValidDate,
      },
    ],
  }),
  transactionController.updateTransaction
);

router.delete(
  '/:id',
  validate({
    params: [
      {
        field: 'id',
        message: 'Transaction id must be a positive integer.',
        validate: isPositiveInteger,
      },
    ],
  }),
  transactionController.deleteTransaction
);

module.exports = router;
