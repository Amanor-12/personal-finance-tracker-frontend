import { expect, test } from '@playwright/test';

const authenticatedUser = {
  user: {
    created_at: '2026-05-01T12:00:00.000Z',
    email: 'dashboard-customer@flowledger.dev',
    email_verified_at: '2026-05-01T12:05:00.000Z',
    id: 'user-9001',
    name: 'Dashboard Customer',
    updated_at: '2026-05-08T12:00:00.000Z',
  },
};

const preferencesPayload = {
  preferences: {
    amountView: 'Compact',
    currency: 'USD',
    loginAlerts: true,
    onboardingCompleted: true,
    paymentReminders: true,
    weekStart: 'Monday',
    weeklySummary: false,
    workspaceName: 'Dashboard Space',
  },
};

const billingPayload = {
  billing: {
    access: {
      currentPlanId: 'free',
      featureAccess: {
        forecasting: false,
        recurringPayments: false,
        reports: false,
      },
      isPremium: false,
      limits: {
        accounts: 2,
        budgets: 6,
        goals: 3,
      },
      tier: 'free',
      usage: {
        accounts: 1,
        budgets: 1,
        goals: 1,
        recurringPayments: 0,
      },
    },
    currentPlan: {
      id: 'free',
      name: 'Free',
    },
    subscription: {
      status: 'none',
    },
  },
};

const capabilitiesPayload = {
  capabilities: {
    accounts: true,
    ai: false,
    auth: {
      deleteAccount: true,
      emailVerification: false,
      mfa: false,
      password: true,
      passwordReset: false,
      preferences: true,
      profile: true,
      security: false,
    },
    billing: false,
    goals: true,
    recurringPayments: true,
    reports: false,
    transactions: {
      export: false,
      savedViews: false,
    },
  },
  message: 'Financial Tracker API is running',
  status: 'ok',
};

const fulfillJson = (route, payload, status = 200) =>
  route.fulfill({
    body: JSON.stringify(payload),
    contentType: 'application/json',
    status,
  });

test('dashboard renders a real money-flow chart from backend data', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      'ledgr-session-user',
      JSON.stringify({
        createdAt: '2026-05-01T12:00:00.000Z',
        email: 'dashboard-customer@flowledger.dev',
        fullName: 'Dashboard Customer',
        id: 'user-9001',
        isEmailVerified: true,
        updatedAt: '2026-05-08T12:00:00.000Z',
      })
    );
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    const method = route.request().method();

    if (pathname === '/api/auth/me' && method === 'GET') {
      await fulfillJson(route, authenticatedUser);
      return;
    }

    if (pathname === '/api/health' && method === 'GET') {
      await fulfillJson(route, capabilitiesPayload);
      return;
    }

    if (pathname === '/api/auth/preferences' && method === 'GET') {
      await fulfillJson(route, preferencesPayload);
      return;
    }

    if (pathname === '/api/billing/subscription' && method === 'GET') {
      await fulfillJson(route, billingPayload);
      return;
    }

    if (pathname === '/api/cards' && method === 'GET') {
      await fulfillJson(route, {
        cards: [],
      });
      return;
    }

    if (pathname === '/api/categories' && method === 'GET') {
      await fulfillJson(route, {
        categories: [
          { id: 'cat-income', name: 'Salary', type: 'income' },
          { id: 'cat-rent', name: 'Housing', type: 'expense' },
          { id: 'cat-grocery', name: 'Food', type: 'expense' },
        ],
      });
      return;
    }

    if (pathname === '/api/transactions' && method === 'GET') {
      await fulfillJson(route, {
        transactions: [
          {
            amount: 3200,
            category_id: 'cat-income',
            category_name: 'Salary',
            category_type: 'income',
            created_at: '2026-04-02T12:00:00.000Z',
            id: 'txn-1',
            notes: '',
            title: 'April salary',
            transaction_date: '2026-04-02',
          },
          {
            amount: 1450,
            category_id: 'cat-rent',
            category_name: 'Housing',
            category_type: 'expense',
            created_at: '2026-04-03T12:00:00.000Z',
            id: 'txn-2',
            notes: '',
            title: 'April rent',
            transaction_date: '2026-04-03',
          },
          {
            amount: 280,
            category_id: 'cat-grocery',
            category_name: 'Food',
            category_type: 'expense',
            created_at: '2026-05-04T12:00:00.000Z',
            id: 'txn-3',
            notes: '',
            title: 'Grocery run',
            transaction_date: '2026-05-04',
          },
        ],
      });
      return;
    }

    if (pathname === '/api/dashboard/summary' && method === 'GET') {
      await fulfillJson(route, {
        balance: 1470,
        budgetOverview: [],
        categoryBreakdown: {
          expense: [
            { name: 'Housing', total_amount: 1450 },
            { name: 'Food', total_amount: 280 },
          ],
          income: [{ name: 'Salary', total_amount: 3200 }],
        },
        currentMonthLabel: 'May',
        monthlyTrend: [
          { expenses: 0, income: 0, label: 'Jun', month_key: '2025-06' },
          { expenses: 0, income: 0, label: 'Jul', month_key: '2025-07' },
          { expenses: 0, income: 0, label: 'Aug', month_key: '2025-08' },
          { expenses: 0, income: 0, label: 'Sep', month_key: '2025-09' },
          { expenses: 0, income: 0, label: 'Oct', month_key: '2025-10' },
          { expenses: 0, income: 0, label: 'Nov', month_key: '2025-11' },
          { expenses: 0, income: 0, label: 'Dec', month_key: '2025-12' },
          { expenses: 0, income: 0, label: 'Jan', month_key: '2026-01' },
          { expenses: 0, income: 0, label: 'Feb', month_key: '2026-02' },
          { expenses: 0, income: 0, label: 'Mar', month_key: '2026-03' },
          { expenses: 1450, income: 3200, label: 'Apr', month_key: '2026-04' },
          { expenses: 280, income: 0, label: 'May', month_key: '2026-05' },
        ],
        recentTransactions: [
          {
            amount: 280,
            category_id: 'cat-grocery',
            category_name: 'Food',
            category_type: 'expense',
            created_at: '2026-05-04T12:00:00.000Z',
            id: 'txn-3',
            title: 'Grocery run',
            transaction_date: '2026-05-04',
          },
        ],
        totalExpenses: 1730,
        totalIncome: 3200,
      });
      return;
    }

    if (pathname === '/api/accounts' && method === 'GET') {
      await fulfillJson(route, {
        accounts: [
          {
            account_type: 'checking',
            created_at: '2026-05-01T12:00:00.000Z',
            currency: 'USD',
            current_balance: 4321.5,
            id: 'account-1',
            institution_name: 'Northwind Bank',
            is_primary: true,
            masked_identifier: '1234',
            name: 'Operating cash',
            status: 'active',
            updated_at: '2026-05-08T12:00:00.000Z',
          },
        ],
      });
      return;
    }

    if (pathname === '/api/budgets' && method === 'GET') {
      await fulfillJson(route, { budgets: [] });
      return;
    }

    if (pathname === '/api/goals' && method === 'GET') {
      await fulfillJson(route, { goals: [] });
      return;
    }

    if (pathname === '/api/recurring-payments' && method === 'GET') {
      await fulfillJson(route, { recurringPayments: [] });
      return;
    }

    await fulfillJson(route, {});
  });

  await page.goto('/dashboard');

  await expect(page.locator('.ref-chart-line-income')).toBeVisible();
  await expect(page.locator('.ref-chart-line-expense')).toBeVisible();
  await expect(page.locator('.ref-chart-empty')).toHaveCount(0);
  await expect(page.getByText('Income $3,200.00')).toBeVisible();
  await expect(page.getByText('Expenses $1,730.00')).toBeVisible();
  await expect(page.getByText('Grocery run')).toBeVisible();
});
