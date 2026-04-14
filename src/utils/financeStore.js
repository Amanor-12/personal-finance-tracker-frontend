const STORAGE_KEYS = {
  transactions: 'ledgr-transactions',
  budgets: 'ledgr-budgets',
};

export const financeCategories = {
  income: ['Salary', 'Freelance', 'Investments', 'Transfers'],
  expense: ['Housing', 'Food', 'Transport', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Savings'],
};

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readStoredValue = (key, fallback) => {
  if (!canUseStorage()) {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
};

const writeStoredValue = (key, value) => {
  if (canUseStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  return value;
};

const formatMonthKey = (dateString) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentMonthKey = () => formatMonthKey(new Date().toISOString());

const sanitizeTransaction = (transaction) => ({
  id: transaction.id,
  userId: transaction.userId,
  type: transaction.type === 'income' ? 'income' : 'expense',
  title: transaction.title,
  category: transaction.category,
  amount: Number(transaction.amount) || 0,
  date: transaction.date,
  note: transaction.note || '',
  paymentSource: transaction.paymentSource || '',
  createdAt: transaction.createdAt || new Date().toISOString(),
});

const sanitizeBudget = (budget) => ({
  id: budget.id,
  userId: budget.userId,
  category: budget.category,
  limit: Number(budget.limit) || 0,
  month: budget.month || getCurrentMonthKey(),
  createdAt: budget.createdAt || new Date().toISOString(),
});

const sortByNewestDate = (items) =>
  [...items].sort((left, right) => {
    const rightDate = new Date(right.date || right.createdAt).getTime();
    const leftDate = new Date(left.date || left.createdAt).getTime();
    return rightDate - leftDate;
  });

const getTransactionsForUser = (userId) =>
  sortByNewestDate(
    readStoredValue(STORAGE_KEYS.transactions, [])
      .filter((transaction) => transaction.userId === userId)
      .map((transaction) => sanitizeTransaction(transaction))
  );

const getBudgetsForUser = (userId) =>
  readStoredValue(STORAGE_KEYS.budgets, [])
    .filter((budget) => budget.userId === userId)
    .map((budget) => sanitizeBudget(budget))
    .sort((left, right) => left.category.localeCompare(right.category));

const getMonthlyTransactions = (transactions, monthKey = getCurrentMonthKey()) =>
  transactions.filter((transaction) => formatMonthKey(transaction.date) === monthKey);

const getExpenseTotalsByCategory = (transactions) =>
  transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((totals, transaction) => {
      totals[transaction.category] = (totals[transaction.category] || 0) + transaction.amount;
      return totals;
    }, {});

const buildBudgetProgress = (budgets, monthlyTransactions) => {
  const expenseTotals = getExpenseTotalsByCategory(monthlyTransactions);

  return budgets.map((budget) => {
    const spent = expenseTotals[budget.category] || 0;
    const remaining = Math.max(budget.limit - spent, 0);
    const progress = budget.limit > 0 ? Math.min(Math.round((spent / budget.limit) * 100), 999) : 0;

    return {
      ...budget,
      spent,
      remaining,
      progress,
      isOverBudget: spent > budget.limit,
    };
  });
};

export const financeStore = {
  getTransactionsForUser,
  addTransaction(userId, payload) {
    const transactions = readStoredValue(STORAGE_KEYS.transactions, []);
    const nextTransaction = sanitizeTransaction({
      id: `transaction-${Date.now()}`,
      userId,
      type: payload.type,
      title: payload.title.trim(),
      category: payload.category,
      amount: payload.amount,
      date: payload.date,
      note: payload.note?.trim() || '',
      paymentSource: payload.paymentSource || '',
      createdAt: new Date().toISOString(),
    });

    writeStoredValue(STORAGE_KEYS.transactions, [nextTransaction, ...transactions]);
    return nextTransaction;
  },
  deleteTransaction(userId, transactionId) {
    const nextTransactions = readStoredValue(STORAGE_KEYS.transactions, []).filter(
      (transaction) => !(transaction.userId === userId && transaction.id === transactionId)
    );

    writeStoredValue(STORAGE_KEYS.transactions, nextTransactions);
    return getTransactionsForUser(userId);
  },
  getBudgetsForUser,
  saveBudget(userId, payload) {
    const budgets = readStoredValue(STORAGE_KEYS.budgets, []);
    const normalizedBudget = sanitizeBudget({
      id: payload.id || `budget-${Date.now()}`,
      userId,
      category: payload.category,
      limit: payload.limit,
      month: payload.month || getCurrentMonthKey(),
      createdAt: payload.createdAt || new Date().toISOString(),
    });

    const nextBudgets = budgets.some((budget) => budget.id === normalizedBudget.id)
      ? budgets.map((budget) => (budget.id === normalizedBudget.id ? normalizedBudget : budget))
      : [normalizedBudget, ...budgets.filter((budget) => !(budget.userId === userId && budget.category === normalizedBudget.category && budget.month === normalizedBudget.month))];

    writeStoredValue(STORAGE_KEYS.budgets, nextBudgets);
    return normalizedBudget;
  },
  deleteBudget(userId, budgetId) {
    const nextBudgets = readStoredValue(STORAGE_KEYS.budgets, []).filter(
      (budget) => !(budget.userId === userId && budget.id === budgetId)
    );

    writeStoredValue(STORAGE_KEYS.budgets, nextBudgets);
    return getBudgetsForUser(userId);
  },
  getDashboardSnapshot(userId) {
    const transactions = getTransactionsForUser(userId);
    const budgets = getBudgetsForUser(userId);
    const currentMonthKey = getCurrentMonthKey();
    const monthlyTransactions = getMonthlyTransactions(transactions, currentMonthKey);
    const totalIncome = monthlyTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalExpenses = monthlyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const categorySpend = Object.entries(getExpenseTotalsByCategory(monthlyTransactions))
      .map(([category, total]) => ({ category, total }))
      .sort((left, right) => right.total - left.total);
    const budgetProgress = buildBudgetProgress(
      budgets.filter((budget) => budget.month === currentMonthKey),
      monthlyTransactions
    );

    return {
      currentMonthKey,
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      transactions,
      monthlyTransactions,
      recentTransactions: transactions.slice(0, 6),
      categorySpend,
      budgetProgress,
    };
  },
};
