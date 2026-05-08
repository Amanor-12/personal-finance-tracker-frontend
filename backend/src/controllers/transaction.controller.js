const transactionService = require('../services/transaction.service');
const transactionWorkspaceService = require('../services/transaction-workspace.service');
const asyncHandler = require('../utils/asyncHandler');

const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await transactionService.getTransactions(req.user.id);

  res.json({
    transactions,
  });
});

const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionService.getTransactionById(req.user.id, req.params.id);

  res.json({
    transaction,
  });
});

const createTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionService.createTransaction(req.user.id, req.body);

  res.status(201).json({
    message: 'Transaction created successfully.',
    transaction,
  });
});

const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionService.updateTransaction(req.user.id, req.params.id, req.body);

  res.json({
    message: 'Transaction updated successfully.',
    transaction,
  });
});

const deleteTransaction = asyncHandler(async (req, res) => {
  await transactionService.deleteTransaction(req.user.id, req.params.id);

  res.json({
    message: 'Transaction deleted successfully.',
  });
});

const getSavedViews = asyncHandler(async (req, res) => {
  const views = await transactionWorkspaceService.getSavedTransactionViews(req.user.id);

  res.json({
    views,
  });
});

const saveView = asyncHandler(async (req, res) => {
  const view = await transactionWorkspaceService.saveTransactionView(req.user.id, req.body);

  res.status(201).json({
    message: 'Saved view created successfully.',
    view,
  });
});

const deleteView = asyncHandler(async (req, res) => {
  await transactionWorkspaceService.deleteTransactionView(req.user.id, req.params.id);

  res.json({
    message: 'Saved view deleted successfully.',
  });
});

const exportTransactions = asyncHandler(async (req, res) => {
  const exportPayload = await transactionWorkspaceService.exportTransactionsCsv(
    req.user.id,
    transactionService.getTransactions,
    req.body
  );

  res.json(exportPayload);
});

module.exports = {
  createTransaction,
  deleteTransaction,
  deleteView,
  exportTransactions,
  getSavedViews,
  getTransaction,
  getTransactions,
  saveView,
  updateTransaction,
};
