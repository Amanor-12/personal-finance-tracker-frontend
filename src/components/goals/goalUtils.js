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

export const goalTypeOptions = [
  { label: 'All goals', value: 'all' },
  { label: 'Save up', value: 'save' },
  { label: 'Pay down', value: 'payoff' },
];

export const goalStatusOptions = [
  { label: 'All states', value: 'all' },
  { label: 'Starting', value: 'Starting' },
  { label: 'Building', value: 'Building' },
  { label: 'On track', value: 'On track' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Behind', value: 'Behind' },
];

export const goalSortOptions = [
  { label: 'Closest deadline', value: 'deadline' },
  { label: 'Highest progress', value: 'progress' },
  { label: 'Largest remaining', value: 'remaining' },
  { label: 'Newest first', value: 'newest' },
];

export const EMPTY_GOAL_FILTERS = {
  query: '',
  sortBy: 'deadline',
  status: 'all',
  type: 'all',
};

export const formatGoalCurrency = (value) => currencyFormatter.format(Number(value) || 0);

export const formatGoalDate = (value) => (value ? dateFormatter.format(new Date(value)) : 'No target date');

export const getGoalTypeLabel = (value) => (value === 'payoff' ? 'Pay down' : 'Save up');

export const getGoalProgressPercent = (goal) => {
  const rawProgress = Number(goal?.progress) || 0;
  const percent = rawProgress <= 1 ? rawProgress * 100 : rawProgress;

  return Number.isFinite(percent) ? percent : 0;
};

export const getGoalProgressWidth = (goal, minimum = 5) => {
  const percent = getGoalProgressPercent(goal);

  if (percent <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(minimum, percent));
};

export const getGoalTone = (goal) => {
  const status = goal?.status || 'Starting';

  if (status === 'Completed') {
    return { label: 'Completed', tone: 'complete' };
  }

  if (status === 'Behind') {
    return { label: 'Behind', tone: 'behind' };
  }

  if (status === 'On track') {
    return { label: 'On track', tone: 'healthy' };
  }

  if (status === 'Building') {
    return { label: 'Building', tone: 'building' };
  }

  return { label: 'Starting', tone: 'early' };
};

export const filterGoals = (goals, filters) => {
  const query = filters.query.trim().toLowerCase();

  return goals.filter((goal) => {
    const matchesType = filters.type === 'all' || goal.goalType === filters.type;
    const matchesStatus = filters.status === 'all' || goal.status === filters.status;
    const searchable = [goal.title, goal.status, getGoalTypeLabel(goal.goalType), formatGoalDate(goal.targetDate)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return matchesType && matchesStatus && (!query || searchable.includes(query));
  });
};

export const sortGoals = (goals, sortBy) =>
  [...goals].sort((left, right) => {
    if (sortBy === 'progress') {
      return getGoalProgressPercent(right) - getGoalProgressPercent(left);
    }

    if (sortBy === 'remaining') {
      return right.remainingAmount - left.remainingAmount;
    }

    if (sortBy === 'newest') {
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    }

    if (!left.targetDate && !right.targetDate) {
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    }

    if (!left.targetDate) {
      return 1;
    }

    if (!right.targetDate) {
      return -1;
    }

    return new Date(left.targetDate).getTime() - new Date(right.targetDate).getTime();
  });

export const summarizeGoals = (goals) => {
  const targetTotal = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const currentTotal = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const remainingTotal = goals.reduce((sum, goal) => sum + Math.max(goal.remainingAmount, 0), 0);
  const completedCount = goals.filter((goal) => goal.status === 'Completed').length;
  const dueSoonCount = goals.filter(
    (goal) => goal.daysRemaining !== null && goal.daysRemaining >= 0 && goal.daysRemaining <= 30 && goal.status !== 'Completed'
  ).length;

  return {
    completedCount,
    count: goals.length,
    currentTotal,
    dueSoonCount,
    progress: targetTotal > 0 ? (currentTotal / targetTotal) * 100 : 0,
    remainingTotal,
    targetTotal,
  };
};

export const createGoalForm = (goal) => ({
  currentAmount: goal?.currentAmount ? String(goal.currentAmount) : '',
  goalType: goal?.goalType || 'save',
  id: goal?.id ? String(goal.id) : '',
  targetAmount: goal?.targetAmount ? String(goal.targetAmount) : '',
  targetDate: goal?.targetDate ? String(goal.targetDate).slice(0, 10) : '',
  title: goal?.title || '',
});

export const buildGoalPayload = (values, goalId) => ({
  currentAmount: values.currentAmount || 0,
  goalType: values.goalType,
  id: goalId || values.id || undefined,
  targetAmount: values.targetAmount,
  targetDate: values.targetDate || null,
  title: values.title.trim(),
});
