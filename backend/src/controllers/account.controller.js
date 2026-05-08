const accountService = require('../services/account.service');
const bankConnectionService = require('../services/bank-connection.service');
const asyncHandler = require('../utils/asyncHandler');

const getAccounts = asyncHandler(async (req, res) => {
  const accounts = await accountService.getAccounts(req.user.id);

  res.json({
    accounts,
  });
});

const getAccount = asyncHandler(async (req, res) => {
  const account = await accountService.getAccountById(req.user.id, req.params.id);

  res.json({
    account,
  });
});

const createAccount = asyncHandler(async (req, res) => {
  const account = await accountService.createAccount(req.user.id, req.body);

  res.status(201).json({
    account,
    message: 'Account created successfully.',
  });
});

const updateAccount = asyncHandler(async (req, res) => {
  const account = await accountService.updateAccount(req.user.id, req.params.id, req.body);

  res.json({
    account,
    message: 'Account updated successfully.',
  });
});

const setPrimaryAccount = asyncHandler(async (req, res) => {
  const account = await accountService.setPrimaryAccount(req.user.id, req.params.id);

  res.json({
    account,
    message: 'Primary account updated successfully.',
  });
});

const archiveAccount = asyncHandler(async (req, res) => {
  await accountService.archiveAccount(req.user.id, req.params.id);

  res.json({
    message: 'Account archived successfully.',
  });
});

const listBankConnections = asyncHandler(async (req, res) => {
  const connections = await bankConnectionService.listBankConnections(req.user.id);

  res.json({
    connections,
  });
});

const listBankProviders = asyncHandler(async (req, res) => {
  const providers = await bankConnectionService.listBankProviders();

  res.json({
    providers,
  });
});

const createBankConnection = asyncHandler(async (req, res) => {
  const connection = await bankConnectionService.createBankConnection(req.user.id, req.body);

  res.status(201).json({
    connection,
    message: 'Bank connection created successfully.',
  });
});

const createPlaidLinkToken = asyncHandler(async (req, res) => {
  const linkToken = await bankConnectionService.createPlaidLinkToken(req.user);

  res.json({
    linkToken,
    message: 'Plaid Link is ready.',
  });
});

const exchangePlaidPublicToken = asyncHandler(async (req, res) => {
  const connections = await bankConnectionService.createPlaidBankConnections(req.user.id, req.body);

  res.status(201).json({
    connections,
    message: 'Plaid connection created successfully.',
  });
});

const syncBankConnection = asyncHandler(async (req, res) => {
  const result = await bankConnectionService.syncBankConnection(req.user.id, Number(req.params.id));

  res.json({
    connection: result.connection,
    importedCount: result.imported_count,
    message: result.imported_count
      ? 'Bank sync imported new transactions.'
      : 'Bank sync completed with no new transactions.',
  });
});

const getReconciliationQueue = asyncHandler(async (req, res) => {
  const queue = await bankConnectionService.getReconciliationQueue(req.user.id);

  res.json({
    queue,
  });
});

const reconcileImportedTransaction = asyncHandler(async (req, res) => {
  await bankConnectionService.reconcileImportedTransaction(req.user.id, Number(req.params.id), req.body);

  res.json({
    message: 'Imported transaction reconciled successfully.',
  });
});

module.exports = {
  archiveAccount,
  createBankConnection,
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  createAccount,
  getAccount,
  getAccounts,
  getReconciliationQueue,
  listBankConnections,
  listBankProviders,
  reconcileImportedTransaction,
  setPrimaryAccount,
  syncBankConnection,
  updateAccount,
};
