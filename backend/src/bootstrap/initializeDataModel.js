const { ensureAccountsTable } = require('../services/account.service');
const { ensureAiSchema } = require('../services/ai.service');
const { ensureAuthSessionsTable } = require('../services/auth-session.service');
const { ensurePasswordResetTable } = require('../services/auth.service');
const { ensureBankConnectionSchema } = require('../services/bank-connection.service');
const { ensureBillingSchema } = require('../services/billing.service');
const { ensureEmailVerificationSchema } = require('../services/email-verification.service');
const { ensureFrontendObservabilitySchema } = require('../services/frontend-observability.service');
const { ensureMfaSchema } = require('../services/mfa.service');
const { ensureRecurringPaymentsTable } = require('../services/recurring.service');
const { ensureSecurityEventSchema } = require('../services/security-event.service');
const { ensureTransactionSchema } = require('../services/transaction.service');
const { ensureTransactionWorkspaceSchema } = require('../services/transaction-workspace.service');
const { ensureUserPreferencesTable } = require('../services/user-preferences.service');

let initializationPromise;

const initializeDataModel = async () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await ensureAccountsTable();
      await ensureTransactionSchema();
      await ensureRecurringPaymentsTable();
      await ensureBankConnectionSchema();
      await ensureBillingSchema();
      await ensureAiSchema();
      await ensureUserPreferencesTable();
      await ensureAuthSessionsTable();
      await ensurePasswordResetTable();
      await ensureEmailVerificationSchema();
      await ensureFrontendObservabilitySchema();
      await ensureMfaSchema();
      await ensureSecurityEventSchema();
      await ensureTransactionWorkspaceSchema();
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
};

module.exports = {
  initializeDataModel,
};
