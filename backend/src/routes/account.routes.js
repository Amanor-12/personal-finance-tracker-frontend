const express = require('express');

const accountController = require('../controllers/account.controller');
const authenticate = require('../middleware/auth.middleware');
const { enforcePlanLimit, requireBillingFeature } = require('../middleware/billing-access.middleware');
const validate = require('../middleware/validate.middleware');
const {
  hasLengthBetween,
  hasMaxLength,
  isAccountType,
  isCurrencyCode,
  isNonNegativeNumber,
  isPositiveInteger,
} = require('../utils/validators');

const router = express.Router();

const accountBodyRules = [
  {
    field: 'name',
    message: 'Account name must be between 2 and 80 characters.',
    validate: hasLengthBetween(2, 80),
  },
  {
    field: 'account_type',
    message: 'Account type is not supported.',
    validate: isAccountType,
  },
  {
    field: 'institution_name',
    message: 'Institution name must be 120 characters or fewer.',
    optional: true,
    validate: hasMaxLength(120),
  },
  {
    field: 'masked_identifier',
    message: 'Masked identifier must be 20 characters or fewer.',
    optional: true,
    validate: hasMaxLength(20),
  },
  {
    field: 'opening_balance',
    message: 'Opening balance must be zero or greater.',
    validate: isNonNegativeNumber,
  },
  {
    field: 'currency',
    message: 'Currency must be a three-letter code.',
    validate: isCurrencyCode,
  },
  {
    field: 'notes',
    message: 'Notes must be 255 characters or fewer.',
    optional: true,
    validate: hasMaxLength(255),
  },
];

const accountIdParam = [
  {
    field: 'id',
    message: 'Account id must be a positive integer.',
    validate: isPositiveInteger,
  },
];

const bankConnectionBodyRules = [
  {
    field: 'provider',
    message: 'Bank connection provider is not supported.',
    validate: (value) => value === 'sandbox',
  },
  {
    field: 'institution_name',
    message: 'Institution name must be between 2 and 120 characters.',
    validate: hasLengthBetween(2, 120),
  },
  {
    field: 'label',
    message: 'Connection label must be between 2 and 80 characters.',
    validate: hasLengthBetween(2, 80),
  },
];

const plaidExchangeBodyRules = [
  {
    field: 'public_token',
    message: 'Plaid public token is required.',
    validate: hasLengthBetween(20, 200),
  },
  {
    field: 'institution_name',
    message: 'Institution name must be between 2 and 120 characters.',
    validate: hasLengthBetween(2, 120),
  },
  {
    field: 'institution_id',
    message: 'Institution id must be 120 characters or fewer.',
    optional: true,
    validate: hasMaxLength(120),
  },
  {
    field: 'accounts',
    message: 'Accounts must be an array of selected Plaid accounts.',
    optional: true,
    validate: (value) =>
      Array.isArray(value) &&
      value.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          hasLengthBetween(1, 255)(String(item.id || '')) &&
          (!item.label || hasLengthBetween(2, 80)(String(item.label || '')))
      ),
  },
];

router.use(authenticate);

router.get('/', accountController.getAccounts);
router.get(
  '/bank-providers',
  requireBillingFeature('bankSync', 'bank sync'),
  accountController.listBankProviders
);
router.get(
  '/bank-connections',
  requireBillingFeature('bankSync', 'bank sync'),
  accountController.listBankConnections
);
router.get(
  '/reconciliation-queue',
  requireBillingFeature('reconciliationWorkbench', 'reconciliation'),
  accountController.getReconciliationQueue
);

router.get(
  '/:id',
  validate({
    params: accountIdParam,
  }),
  accountController.getAccount
);

router.post(
  '/',
  enforcePlanLimit('accounts'),
  validate({
    body: accountBodyRules,
  }),
  accountController.createAccount
);

router.post(
  '/bank-connections',
  requireBillingFeature('bankSync', 'bank sync'),
  validate({
    body: bankConnectionBodyRules,
  }),
  accountController.createBankConnection
);

router.post(
  '/bank-connections/plaid/link-token',
  requireBillingFeature('bankSync', 'bank sync'),
  accountController.createPlaidLinkToken
);

router.post(
  '/bank-connections/plaid/exchange',
  requireBillingFeature('bankSync', 'bank sync'),
  validate({
    body: plaidExchangeBodyRules,
  }),
  accountController.exchangePlaidPublicToken
);

router.put(
  '/:id',
  validate({
    body: accountBodyRules,
    params: accountIdParam,
  }),
  accountController.updateAccount
);

router.post(
  '/bank-connections/:id/sync',
  requireBillingFeature('bankSync', 'bank sync'),
  validate({
    params: accountIdParam,
  }),
  accountController.syncBankConnection
);

router.post(
  '/reconciliation-queue/:id/reconcile',
  requireBillingFeature('reconciliationWorkbench', 'reconciliation'),
  validate({
    body: [
      {
        field: 'category_id',
        optional: true,
        message: 'Category id must be a positive integer.',
        validate: isPositiveInteger,
      },
      {
        field: 'notes',
        optional: true,
        message: 'Notes must be 500 characters or fewer.',
        validate: hasMaxLength(500),
      },
    ],
    params: accountIdParam,
  }),
  accountController.reconcileImportedTransaction
);

router.patch(
  '/:id/primary',
  validate({
    params: accountIdParam,
  }),
  accountController.setPrimaryAccount
);

router.delete(
  '/:id',
  validate({
    params: accountIdParam,
  }),
  accountController.archiveAccount
);

module.exports = router;
