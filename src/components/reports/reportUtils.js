const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  minimumFractionDigits: 2,
  style: 'currency',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});

export const reportPresetOptions = [
  { label: 'This month', value: 'month' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'This year', value: 'year' },
  { label: 'Custom', value: 'custom' },
];

export const getDateInputValue = (date) => date.toISOString().slice(0, 10);

const parseReportDate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getReportPresetRange = (preset) => {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(endDate);

  if (preset === 'month') {
    startDate.setDate(1);
  } else if (preset === '90') {
    startDate.setDate(startDate.getDate() - 89);
  } else if (preset === 'year') {
    startDate.setMonth(0, 1);
  } else {
    startDate.setDate(startDate.getDate() - 29);
  }

  return {
    endDate: getDateInputValue(endDate),
    preset,
    startDate: getDateInputValue(startDate),
  };
};

export const formatReportCurrency = (value) => currencyFormatter.format(Number(value) || 0);

export const formatReportDate = (value) => {
  const date = parseReportDate(value);
  return date ? dateFormatter.format(date) : 'No date';
};

const getDateKey = (value) => {
  const date = parseReportDate(value);
  return date ? getDateInputValue(date) : '';
};

export const filterTransactionsByRange = (transactions, range) => {
  const start = range.startDate || '';
  const end = range.endDate || '';

  return transactions.filter((transaction) => {
    const dateKey = getDateKey(transaction.transactionDate);

    if (!dateKey) {
      return false;
    }

    return (!start || dateKey >= start) && (!end || dateKey <= end);
  });
};

export const summarizeReportTransactions = (transactions) => {
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  return {
    expenses,
    income,
    net,
    savingsRate,
    transactionCount: transactions.length,
  };
};

export const buildCategoryBreakdown = (transactions) => {
  const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense');
  const total = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const categoryMap = new Map();

  expenseTransactions.forEach((transaction) => {
    const category = transaction.categoryName || 'Uncategorized';
    categoryMap.set(category, (categoryMap.get(category) || 0) + transaction.amount);
  });

  return [...categoryMap.entries()]
    .map(([category, amount]) => ({
      amount,
      category,
      share: total ? (amount / total) * 100 : 0,
    }))
    .sort((left, right) => right.amount - left.amount);
};

export const buildMerchantBreakdown = (transactions) => {
  const merchantMap = new Map();

  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const merchant = transaction.description || transaction.categoryName || 'Untitled transaction';
      const current = merchantMap.get(merchant) || { amount: 0, count: 0, merchant };
      merchantMap.set(merchant, {
        ...current,
        amount: current.amount + transaction.amount,
        count: current.count + 1,
      });
    });

  return [...merchantMap.values()].sort((left, right) => right.amount - left.amount);
};

export const buildMonthlyTrend = (transactions) => {
  const monthMap = new Map();

  transactions.forEach((transaction) => {
    const date = parseReportDate(transaction.transactionDate);

    if (!date) {
      return;
    }

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = monthMap.get(monthKey) || {
      expenses: 0,
      income: 0,
      label: monthFormatter.format(new Date(date.getFullYear(), date.getMonth(), 1)),
      monthKey,
    };

    monthMap.set(monthKey, {
      ...current,
      [transaction.type === 'income' ? 'income' : 'expenses']:
        current[transaction.type === 'income' ? 'income' : 'expenses'] + transaction.amount,
    });
  });

  return [...monthMap.values()].sort((left, right) => left.monthKey.localeCompare(right.monthKey));
};

export const buildReportInsights = ({ budgets, goals, recurringPayments, summary, topCategories, topMerchants }) => {
  const insights = [];

  if (summary.transactionCount === 0) {
    return insights;
  }

  if (summary.net >= 0 && summary.income > 0) {
    insights.push({
      body: `${Math.max(summary.savingsRate, 0).toFixed(0)}% of income remained after expenses in this view.`,
      label: 'Cash flow',
      tone: 'positive',
      title: 'Net position is positive',
    });
  } else if (summary.net < 0) {
    insights.push({
      body: 'Expenses are higher than income in the selected range.',
      label: 'Cash flow',
      tone: 'warning',
      title: 'Cash flow needs attention',
    });
  }

  if (topCategories[0]) {
    insights.push({
      body: `${topCategories[0].category} represents ${topCategories[0].share.toFixed(0)}% of expense spend in this view.`,
      label: 'Spending concentration',
      tone: topCategories[0].share >= 45 ? 'warning' : 'neutral',
      title: 'Largest category',
    });
  }

  if (topMerchants[0]) {
    insights.push({
      body: `${topMerchants[0].merchant} has ${topMerchants[0].count} transaction${topMerchants[0].count === 1 ? '' : 's'} in this view.`,
      label: 'Merchant activity',
      tone: 'neutral',
      title: 'Top merchant source',
    });
  }

  const overspentBudgets = budgets.filter((budget) => budget.remainingAmount < 0);
  if (overspentBudgets.length) {
    insights.push({
      body: `${overspentBudgets.length} budget${overspentBudgets.length === 1 ? '' : 's'} are currently over limit.`,
      label: 'Budget pressure',
      tone: 'warning',
      title: 'Budget pressure detected',
    });
  }

  const activeRecurring = recurringPayments.filter((payment) => payment.status === 'active');
  if (activeRecurring.length) {
    const monthlyRecurring = activeRecurring.reduce((sum, payment) => sum + payment.monthlyAmount, 0);
    insights.push({
      body: `${formatReportCurrency(monthlyRecurring)} is committed to active recurring payments each month.`,
      label: 'Recurring load',
      tone: 'neutral',
      title: 'Fixed monthly commitments',
    });
  }

  const completedGoals = goals.filter((goal) => goal.status === 'Completed').length;
  if (completedGoals) {
    insights.push({
      body: `${completedGoals} goal${completedGoals === 1 ? '' : 's'} already completed.`,
      label: 'Goals',
      tone: 'positive',
      title: 'Goal momentum',
    });
  }

  return insights.slice(0, 4);
};

export const getLargestTrendValue = (trend) =>
  Math.max(
    1,
    ...trend.flatMap((item) => [Number(item.income) || 0, Number(item.expenses) || 0])
  );
