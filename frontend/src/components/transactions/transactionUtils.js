export const EMPTY_TRANSACTION_FILTERS = {
  query: '',
  type: 'all',
  categoryId: 'all',
  accountId: 'all',
  status: 'all',
  fromDate: '',
  toDate: '',
  minAmount: '',
  maxAmount: '',
  sortBy: 'newest',
};

export const transactionTypeOptions = [
  { label: 'All movement', value: 'all' },
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
];

export const transactionSortOptions = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Highest amount', value: 'highest' },
  { label: 'Lowest amount', value: 'lowest' },
  { label: 'Merchant A-Z', value: 'title' },
];

export const transactionStatusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Recorded', value: 'recorded' },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
});

export const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

export const formatDate = (value) => {
  if (!value) {
    return 'No date';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid date';
  }

  return dateFormatter.format(parsedDate);
};

export const formatShortDate = (value) => {
  if (!value) {
    return 'No date';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid date';
  }

  return shortDateFormatter.format(parsedDate);
};

export const toDateInputValue = (value) => {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

export const getTransactionTitle = (transaction) =>
  transaction?.description?.trim() || transaction?.title?.trim() || 'Untitled transaction';

export const getTransactionStatus = (transaction) =>
  String(transaction?.status || 'recorded').toLowerCase();

export const getTransactionAccountName = (transaction) =>
  transaction?.accountName || transaction?.account_name || '';

export const createTransactionForm = (transaction = null, categories = []) => {
  if (transaction) {
    return {
      accountId: transaction.accountId || '',
      amount: transaction.amount ? String(transaction.amount) : '',
      categoryId: transaction.categoryId ? String(transaction.categoryId) : '',
      description: getTransactionTitle(transaction),
      isRecurring: Boolean(transaction.isRecurring),
      notes: transaction.notes || '',
      transactionDate: toDateInputValue(transaction.transactionDate),
      type: transaction.type || 'expense',
    };
  }

  const defaultCategory =
    categories.find((category) => category.type === 'expense') || categories[0] || null;

  return {
    accountId: '',
    amount: '',
    categoryId: defaultCategory?.id ? String(defaultCategory.id) : '',
    description: '',
    isRecurring: false,
    notes: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    type: defaultCategory?.type || 'expense',
  };
};

export const validateTransactionForm = (form, categories) => {
  const errors = {};
  const category = categories.find((item) => String(item.id) === String(form.categoryId));
  const amount = Number(form.amount);

  if (!form.description.trim()) {
    errors.description = 'Enter a merchant, payee, or short title.';
  }

  if (form.description.trim().length > 255) {
    errors.description = 'Keep the title under 255 characters.';
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Enter an amount greater than zero.';
  }

  if (!form.transactionDate) {
    errors.transactionDate = 'Choose a transaction date.';
  }

  if (!form.categoryId) {
    errors.categoryId = 'Choose a category.';
  }

  if (category && category.type !== form.type) {
    errors.categoryId = 'The selected category must match the transaction type.';
  }

  return errors;
};

export const buildTransactionPayload = (form) => ({
  accountId: form.accountId || '',
  amount: Number(form.amount),
  categoryId: form.categoryId,
  description: form.description.trim(),
  isRecurring: Boolean(form.isRecurring),
  notes: form.notes?.trim() || '',
  transactionDate: form.transactionDate,
  type: form.type,
});

export const getAccountOptionsFromTransactions = (transactions) => {
  const accountMap = new Map();

  transactions.forEach((transaction) => {
    const accountId = transaction.accountId || transaction.account_id;
    const accountName = getTransactionAccountName(transaction);

    if (accountId && accountName) {
      accountMap.set(String(accountId), accountName);
    }
  });

  return [...accountMap.entries()].map(([id, name]) => ({ id, name }));
};

export const summarizeTransactions = (transactions) => {
  const totals = transactions.reduce(
    (summary, transaction) => {
      const amount = Number(transaction.amount) || 0;

      if (transaction.type === 'income') {
        summary.inflow += amount;
      } else {
        summary.outflow += amount;
      }

      summary.count += 1;
      return summary;
    },
    { count: 0, inflow: 0, outflow: 0 }
  );

  return {
    ...totals,
    net: totals.inflow - totals.outflow,
  };
};

export const filterTransactions = (transactions, filters) => {
  const query = filters.query.trim().toLowerCase();
  const minAmount = filters.minAmount === '' ? null : Number(filters.minAmount);
  const maxAmount = filters.maxAmount === '' ? null : Number(filters.maxAmount);
  const fromTime = filters.fromDate ? new Date(filters.fromDate).setHours(0, 0, 0, 0) : null;
  const toTime = filters.toDate ? new Date(filters.toDate).setHours(23, 59, 59, 999) : null;

  return transactions.filter((transaction) => {
    const amount = Number(transaction.amount) || 0;
    const transactionTime = transaction.transactionDate
      ? new Date(transaction.transactionDate).getTime()
      : null;
    const haystack = [
      getTransactionTitle(transaction),
      transaction.categoryName,
      getTransactionAccountName(transaction),
      transaction.type,
      formatShortDate(transaction.transactionDate),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (query && !haystack.includes(query)) {
      return false;
    }

    if (filters.type !== 'all' && transaction.type !== filters.type) {
      return false;
    }

    if (filters.categoryId !== 'all' && String(transaction.categoryId) !== String(filters.categoryId)) {
      return false;
    }

    if (filters.accountId !== 'all') {
      const accountId = transaction.accountId || transaction.account_id;

      if (String(accountId) !== String(filters.accountId)) {
        return false;
      }
    }

    if (filters.status !== 'all' && getTransactionStatus(transaction) !== filters.status) {
      return false;
    }

    if (Number.isFinite(minAmount) && amount < minAmount) {
      return false;
    }

    if (Number.isFinite(maxAmount) && amount > maxAmount) {
      return false;
    }

    if (fromTime && (!transactionTime || transactionTime < fromTime)) {
      return false;
    }

    if (toTime && (!transactionTime || transactionTime > toTime)) {
      return false;
    }

    return true;
  });
};

export const sortTransactions = (transactions, sortBy) =>
  [...transactions].sort((left, right) => {
    if (sortBy === 'highest') {
      return Number(right.amount) - Number(left.amount);
    }

    if (sortBy === 'lowest') {
      return Number(left.amount) - Number(right.amount);
    }

    if (sortBy === 'title') {
      return getTransactionTitle(left).localeCompare(getTransactionTitle(right));
    }

    const leftTime = new Date(left.transactionDate || left.createdAt || 0).getTime();
    const rightTime = new Date(right.transactionDate || right.createdAt || 0).getTime();

    return sortBy === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
  });
