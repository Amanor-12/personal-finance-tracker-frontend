const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  minimumFractionDigits: 2,
  style: 'currency',
});

const periodFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

export const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const budgetStatusOptions = [
  { label: 'All budgets', value: 'all' },
  { label: 'On track', value: 'healthy' },
  { label: 'Watch', value: 'watch' },
  { label: 'Over budget', value: 'over' },
];

export const budgetSortOptions = [
  { label: 'Highest pressure', value: 'pressure' },
  { label: 'Largest limit', value: 'largest' },
  { label: 'Most remaining', value: 'remaining' },
  { label: 'Category A-Z', value: 'category' },
];

export const EMPTY_BUDGET_FILTERS = {
  query: '',
  status: 'all',
  sortBy: 'pressure',
};

export const getCurrentBudgetPeriod = () => {
  const now = new Date();

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};

export const shiftBudgetPeriod = (period, direction) => {
  const date = new Date(period.year, period.month - 1 + direction, 1);

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
};

export const formatBudgetCurrency = (value) => currencyFormatter.format(Number(value) || 0);

export const formatBudgetPeriod = (month, year) => periodFormatter.format(new Date(year, month - 1, 1));

export const getBudgetUtilizationPercent = (budget) => {
  const rawUtilization = Number(budget?.utilization) || 0;
  const percent = rawUtilization <= 1 ? rawUtilization * 100 : rawUtilization;

  return Number.isFinite(percent) ? percent : 0;
};

export const getBudgetProgressWidth = (budget, minimum = 4) => {
  const percent = getBudgetUtilizationPercent(budget);

  if (percent <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(minimum, percent));
};

export const getBudgetTone = (budget) => {
  const percent = getBudgetUtilizationPercent(budget);
  const status = String(budget?.status || '').toLowerCase();

  if (Number(budget?.remainingAmount) < 0 || percent > 100 || status.includes('over')) {
    return { label: 'Over budget', tone: 'over' };
  }

  if (percent >= 80 || status.includes('limit')) {
    return { label: status.includes('limit') ? 'At limit' : 'Watch', tone: 'watch' };
  }

  if (percent === 0 || status.includes('not started')) {
    return { label: 'Not started', tone: 'idle' };
  }

  return { label: 'On track', tone: 'healthy' };
};

export const filterBudgets = (budgets, filters) => {
  const query = filters.query.trim().toLowerCase();

  return budgets.filter((budget) => {
    const tone = getBudgetTone(budget).tone;
    const matchesStatus = filters.status === 'all' || tone === filters.status;
    const searchable = [budget.categoryName, budget.status, monthNames[budget.month - 1], budget.year]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return matchesStatus && (!query || searchable.includes(query));
  });
};

export const sortBudgets = (budgets, sortBy) =>
  [...budgets].sort((left, right) => {
    if (sortBy === 'largest') {
      return right.amountLimit - left.amountLimit;
    }

    if (sortBy === 'remaining') {
      return right.remainingAmount - left.remainingAmount;
    }

    if (sortBy === 'category') {
      return left.categoryName.localeCompare(right.categoryName);
    }

    return getBudgetUtilizationPercent(right) - getBudgetUtilizationPercent(left);
  });

export const summarizeBudgets = (budgets) => {
  const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.amountLimit, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spentAmount, 0);
  const remaining = totalBudgeted - totalSpent;
  const overspentCount = budgets.filter((budget) => getBudgetTone(budget).tone === 'over').length;
  const watchCount = budgets.filter((budget) => getBudgetTone(budget).tone === 'watch').length;

  return {
    count: budgets.length,
    overspentCount,
    remaining,
    totalBudgeted,
    totalSpent,
    utilization: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
    watchCount,
  };
};

export const createBudgetForm = (budget, period, categories, presetCategoryId = '') => ({
  amountLimit: budget?.amountLimit ? String(budget.amountLimit) : '',
  categoryId: budget?.categoryId
    ? String(budget.categoryId)
    : presetCategoryId || (categories[0]?.id ? String(categories[0].id) : ''),
  id: budget?.id ? String(budget.id) : '',
  month: String(budget?.month || period.month),
  year: String(budget?.year || period.year),
});

export const buildBudgetPayload = (values, budgetId) => ({
  amountLimit: values.amountLimit,
  categoryId: values.categoryId,
  id: budgetId || values.id || undefined,
  month: values.month,
  year: values.year,
});
