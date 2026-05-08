const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contracts = require(path.join(process.cwd(), '..', 'shared', 'contracts', 'api-contracts.json'));

const readRouteFile = (fileName) =>
  fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', fileName), 'utf8');

const authRoutes = readRouteFile('auth.routes.js');
const accountRoutes = readRouteFile('account.routes.js');
const observabilityRoutes = readRouteFile('observability.routes.js');

const stripPrefix = (fullPath, prefix) => fullPath.replace(prefix, '');

assert.ok(authRoutes.includes(stripPrefix(contracts.auth.loginMfa.path, '/api/auth')));
assert.ok(authRoutes.includes(stripPrefix(contracts.auth.mfaStatus.path, '/api/auth')));
assert.ok(authRoutes.includes(stripPrefix(contracts.auth.mfaSetup.path, '/api/auth')));
assert.ok(authRoutes.includes(stripPrefix(contracts.auth.mfaSetupConfirm.path, '/api/auth')));
assert.ok(authRoutes.includes(stripPrefix(contracts.auth.mfaDisable.path, '/api/auth')));
assert.ok(authRoutes.includes(stripPrefix(contracts.auth.mfaBackupCodesRegenerate.path, '/api/auth')));

assert.ok(accountRoutes.includes(stripPrefix(contracts.accounts.bankProviders.path, '/api/accounts')));
assert.ok(accountRoutes.includes(stripPrefix(contracts.accounts.bankConnections.path, '/api/accounts')));
assert.ok(
  accountRoutes.includes(stripPrefix(contracts.accounts.bankConnectionPlaidLinkToken.path, '/api/accounts'))
);
assert.ok(
  accountRoutes.includes(stripPrefix(contracts.accounts.bankConnectionPlaidExchange.path, '/api/accounts'))
);
assert.ok(accountRoutes.includes(stripPrefix(contracts.accounts.bankConnectionSync.path, '/api/accounts')));
assert.ok(accountRoutes.includes(stripPrefix(contracts.accounts.reconciliationQueue.path, '/api/accounts')));
assert.ok(accountRoutes.includes(stripPrefix(contracts.accounts.reconcileImportedTransaction.path, '/api/accounts')));

assert.ok(
  observabilityRoutes.includes(
    stripPrefix(contracts.observability.frontendErrorReport.path, '/api/observability')
  )
);

console.log(`Contracts validated against route definitions (${contracts.version}).`);
