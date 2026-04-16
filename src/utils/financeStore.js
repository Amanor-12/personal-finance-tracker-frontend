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
  categoryId: transaction.categoryId || transaction.category_id,
  categoryName: transaction.categoryName || transaction.category_name || '',
  categoryType: transaction.categoryType || transaction.category_type || transaction.type,
  type: transaction.type === 'income' ? 'income' : 'expense',
  amount: Number(transaction.amount) || 0,
  description: transaction.description || '',
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
      category_id: Number(payload.categoryId),
      type: payload.type,
      amount: Number(payload.amount),
      description: payload.description?.trim() || '',
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
  async getTransactionsForUser() {
    const response = await apiClient.get('/api/transactions');
    return response.transactions.map((transaction) => normalizeTransaction(transaction));
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
  formatBudgetMonthKey(month, year) {
    return `${year}-${padValue(month)}`;
  },
};
