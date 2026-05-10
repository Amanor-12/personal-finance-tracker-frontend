const createCachedLoader = (factory) => {
  let request = null;

  return () => {
    if (!request) {
      request = factory();
    }

    return request;
  };
};

export const loadAccountFormDialog = createCachedLoader(() => import('../components/accounts/AccountFormDialog'));
export const loadBudgetFormDialog = createCachedLoader(() => import('../components/budgets/BudgetFormDialog'));
export const loadGoalFormDialog = createCachedLoader(() => import('../components/goals/GoalFormDialog'));
export const loadRecurringFormDialog = createCachedLoader(() => import('../components/recurring/RecurringFormDialog'));
export const loadTransactionFormDialog = createCachedLoader(() => import('../components/transactions/TransactionFormDialog'));
