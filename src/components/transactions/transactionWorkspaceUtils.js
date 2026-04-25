import {
  formatCurrency,
  formatDate,
  getTransactionAccountName,
  getTransactionStatus,
  getTransactionTitle,
} from './transactionUtils';

const getStorageKey = (userId) => `ledgr-transaction-views:${userId}`;

const sanitizeSavedView = (view) => ({
  createdAt: view?.createdAt || new Date().toISOString(),
  filters: view?.filters || {},
  id: view?.id || `${Date.now()}`,
  name: String(view?.name || '').trim(),
});

export const loadSavedTransactionViews = (userId) => {
  if (!userId || typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((view) => sanitizeSavedView(view)).filter((view) => view.name);
  } catch {
    return [];
  }
};

const persistSavedTransactionViews = (userId, views) => {
  if (!userId || typeof window === 'undefined') {
    return views;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(views));
  return views;
};

export const saveTransactionView = (userId, view) => {
  const nextView = sanitizeSavedView(view);
  const existingViews = loadSavedTransactionViews(userId).filter((item) => item.id !== nextView.id);
  const nextViews = [nextView, ...existingViews].slice(0, 6);

  return persistSavedTransactionViews(userId, nextViews);
};

export const deleteTransactionView = (userId, viewId) => {
  const nextViews = loadSavedTransactionViews(userId).filter((view) => view.id !== viewId);
  return persistSavedTransactionViews(userId, nextViews);
};

const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const buildTransactionsCsv = (transactions) => {
  const header = [
    'Title',
    'Category',
    'Account',
    'Type',
    'Date',
    'Amount',
    'Status',
    'Recurring',
    'Notes',
  ];

  const rows = transactions.map((transaction) => [
    getTransactionTitle(transaction),
    transaction.categoryName || 'Uncategorized',
    getTransactionAccountName(transaction) || 'No account linked',
    transaction.type,
    formatDate(transaction.transactionDate),
    formatCurrency(transaction.amount),
    getTransactionStatus(transaction),
    transaction.isRecurring ? 'Yes' : 'No',
    transaction.notes || '',
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');
};
