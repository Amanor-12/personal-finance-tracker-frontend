export const financeCategories = {
  income: ['Salary', 'Freelance', 'Investments', 'Transfers'],
  expense: ['Housing', 'Food', 'Transport', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Savings'],
};
import { apiClient } from './apiClient';

const padValue = (value) => String(value).padStart(2, '0');

const normalizeCategory = (category) => ({
  id: category.id,
  name: category.name,
  type: category.type,
  transactionCount: category.transactionCount || category.transaction_count || 0,
  budgetCount: category.budgetCount || category.budget_count || 0,
  createdAt: category.createdAt || category.created_at || null,
  updatedAt: category.updatedAt || category.updated_at || null,
});

const normalizeTransaction = (transaction) => ({
  id: transaction.id,
  accountId: transaction.accountId || transaction.account_id || null,
  accountName: transaction.accountName || transaction.account_name || '',
  categoryId: transaction.categoryId || transaction.category_id,
  categoryName: transaction.categoryName || transaction.category_name || '',
  categoryType: transaction.categoryType || transaction.category_type || transaction.type,
  type: transaction.type === 'income' ? 'income' : 'expense',
  amount: Number(transaction.amount) || 0,
  description: transaction.description || '',
  notes: transaction.notes || '',
  status: transaction.status || 'recorded',
  isRecurring: Boolean(transaction.isRecurring || transaction.is_recurring),
  transactionDate: transaction.transactionDate || transaction.transaction_date,
  createdAt: transaction.createdAt || transaction.created_at || null,
  updatedAt: transaction.updatedAt || transaction.updated_at || null,
});

const normalizeBudget = (budget) => ({
  id: budget.id,
  categoryId: budget.categoryId || budget.category_id,
  categoryName: budget.categoryName || budget.category_name || '',
  categoryType: budget.categoryType || budget.category_type || 'expense',
  amountLimit: Number(budget.amountLimit || budget.amount_limit) || 0,
  month: budget.month,
  year: budget.year,
  spentAmount: Number(budget.spentAmount || budget.spent_amount) || 0,
  remainingAmount: Number(budget.remainingAmount || budget.remaining_amount) || 0,
  utilization: Number(budget.utilization) || 0,
  status: budget.status || '',
  createdAt: budget.createdAt || budget.created_at || null,
  updatedAt: budget.updatedAt || budget.updated_at || null,
});

const normalizeGoal = (goal) => ({
  id: goal.id,
  title: goal.title || '',
  goalType: goal.goalType || goal.goal_type || 'save',
  targetAmount: Number(goal.targetAmount || goal.target_amount) || 0,
  currentAmount: Number(goal.currentAmount || goal.current_amount) || 0,
  remainingAmount: Number(goal.remainingAmount || goal.remaining_amount) || 0,
  progress: Number(goal.progress) || 0,
  status: goal.status || '',
  targetDate: goal.targetDate || goal.target_date || null,
  daysRemaining:
    goal.daysRemaining === null || goal.daysRemaining === undefined
      ? goal.days_remaining ?? null
      : goal.daysRemaining,
  createdAt: goal.createdAt || goal.created_at || null,
  updatedAt: goal.updatedAt || goal.updated_at || null,
});

const normalizeRecurringPayment = (payment) => ({
  id: payment.id,
  accountId: payment.accountId || payment.account_id || null,
  accountName: payment.accountName || payment.account_name || '',
  amount: Number(payment.amount) || 0,
  annualAmount: Number(payment.annualAmount || payment.annual_amount) || 0,
  billingFrequency: payment.billingFrequency || payment.billing_frequency || 'monthly',
  categoryId: payment.categoryId || payment.category_id,
  categoryName: payment.categoryName || payment.category_name || '',
  createdAt: payment.createdAt || payment.created_at || null,
  daysUntilNextPayment:
    payment.daysUntilNextPayment === null || payment.daysUntilNextPayment === undefined
      ? payment.days_until_next_payment ?? null
      : payment.daysUntilNextPayment,
  monthlyAmount: Number(payment.monthlyAmount || payment.monthly_amount) || 0,
  name: payment.name || '',
  nextPaymentDate: payment.nextPaymentDate || payment.next_payment_date,
  notes: payment.notes || '',
  status: payment.status || 'active',
  updatedAt: payment.updatedAt || payment.updated_at || null,
});

const normalizeDashboardSnapshot = (snapshot) => ({
  totalIncome: Number(snapshot.totalIncome) || 0,
  totalExpenses: Number(snapshot.totalExpenses) || 0,
  netCashFlow: Number(snapshot.balance) || 0,
  currentMonthKey: snapshot.currentMonthLabel || '',
  currentMonthLabel: snapshot.currentMonthLabel || '',
  categorySpend: (snapshot.categoryBreakdown?.expense || []).map((item) => ({
    category: item.name,
    total: Number(item.total_amount) || 0,
  })),
  recentTransactions: (snapshot.recentTransactions || []).map((transaction) => {
    const normalized = normalizeTransaction(transaction);

    return {
      ...normalized,
      title: normalized.description || normalized.categoryName,
      date: normalized.transactionDate,
      paymentSource: normalized.categoryName,
    };
  }),
  budgetProgress: (snapshot.budgetOverview || []).map((budget) => normalizeBudget(budget)),
  monthlyTrend: (snapshot.monthlyTrend || []).map((item) => ({
    label: item.label,
    monthKey: item.month_key,
    income: Number(item.income) || 0,
    expenses: Number(item.expenses) || 0,
  })),
});

export const financeStore = {
  async addTransaction(userId, payload) {
    const response = await apiClient.post('/api/transactions', {
      account_id: payload.accountId ? Number(payload.accountId) : null,
      category_id: Number(payload.categoryId),
      type: payload.type,
      amount: Number(payload.amount),
      description: payload.description?.trim() || '',
      notes: payload.notes?.trim() || '',
      is_recurring: Boolean(payload.isRecurring),
      transaction_date: payload.transactionDate,
    });

    return normalizeTransaction(response.transaction);
  },
  async updateTransaction(userId, transactionId, payload) {
    const response = await apiClient.put(`/api/transactions/${transactionId}`, {
      account_id: payload.accountId ? Number(payload.accountId) : null,
      category_id: Number(payload.categoryId),
      type: payload.type,
      amount: Number(payload.amount),
      description: payload.description?.trim() || '',
      notes: payload.notes?.trim() || '',
      is_recurring: Boolean(payload.isRecurring),
      transaction_date: payload.transactionDate,
    });

    return normalizeTransaction(response.transaction);
  },
  async deleteBudget(userId, budgetId) {
    await apiClient.delete(`/api/budgets/${budgetId}`);
    return this.getBudgetsForUser(userId);
  },
  async deleteTransaction(userId, transactionId) {
    await apiClient.delete(`/api/transactions/${transactionId}`);
    return this.getTransactionsForUser(userId);
  },
  async getBudgetsForUser() {
    const response = await apiClient.get('/api/budgets');
    return response.budgets.map((budget) => normalizeBudget(budget));
  },
  async getCategoriesForUser() {
    const response = await apiClient.get('/api/categories');
    return response.categories.map((category) => normalizeCategory(category));
  },
  async getDashboardSnapshot() {
    const response = await apiClient.get('/api/dashboard/summary');
    return normalizeDashboardSnapshot(response);
  },
  async getGoalsForUser() {
    const response = await apiClient.get('/api/goals');
    return response.goals.map((goal) => normalizeGoal(goal));
  },
  async getRecurringPaymentsForUser() {
    const response = await apiClient.get('/api/recurring-payments');
    return response.recurringPayments.map((payment) => normalizeRecurringPayment(payment));
  },
  async getTransactionsForUser() {
    const response = await apiClient.get('/api/transactions');
    return response.transactions.map((transaction) => normalizeTransaction(transaction));
  },
  async deleteGoal(userId, goalId) {
    await apiClient.delete(`/api/goals/${goalId}`);
    return this.getGoalsForUser(userId);
  },
  async saveBudget(userId, payload) {
    const requestBody = {
      category_id: Number(payload.categoryId),
      amount_limit: Number(payload.amountLimit),
      month: Number(payload.month),
      year: Number(payload.year),
    };
    const response = payload.id
      ? await apiClient.put(`/api/budgets/${payload.id}`, requestBody)
      : await apiClient.post('/api/budgets', requestBody);

    return normalizeBudget(response.budget);
  },
  async saveGoal(userId, payload) {
    const requestBody = {
      title: payload.title?.trim() || '',
      goal_type: payload.goalType,
      target_amount: Number(payload.targetAmount),
      current_amount: Number(payload.currentAmount || 0),
      target_date: payload.targetDate || null,
    };
    const response = payload.id
      ? await apiClient.put(`/api/goals/${payload.id}`, requestBody)
      : await apiClient.post('/api/goals', requestBody);

    return normalizeGoal(response.goal);
  },
  async deleteRecurringPayment(userId, recurringPaymentId) {
    await apiClient.delete(`/api/recurring-payments/${recurringPaymentId}`);
    return this.getRecurringPaymentsForUser(userId);
  },
  async saveRecurringPayment(userId, payload) {
    const requestBody = {
      account_id: payload.accountId ? Number(payload.accountId) : null,
      amount: Number(payload.amount),
      billing_frequency: payload.billingFrequency,
      category_id: Number(payload.categoryId),
      name: payload.name?.trim() || '',
      next_payment_date: payload.nextPaymentDate,
      notes: payload.notes?.trim() || '',
      status: payload.status,
    };
    const response = payload.id
      ? await apiClient.put(`/api/recurring-payments/${payload.id}`, requestBody)
      : await apiClient.post('/api/recurring-payments', requestBody);

    return normalizeRecurringPayment(response.recurringPayment);
  },
  formatBudgetMonthKey(month, year) {
    return `${year}-${padValue(month)}`;
  },
};
