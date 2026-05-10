import { expect, test } from '@playwright/test';

const proBilling = {
  billing: {
    access: {
      currentPlanId: 'premium_annual',
      featureAccess: {
        aiReports: true,
        aiTransactionReview: true,
        bankSync: true,
        billingPortal: true,
        earlyAccess: true,
        forecasting: true,
        goalGuidance: true,
        prioritySupport: true,
        reconciliationWorkbench: true,
        recurringPayments: true,
        reports: true,
        smartBudgeting: true,
      },
      isPremium: true,
      limits: {
        accounts: null,
        budgets: null,
        goals: null,
      },
      tier: 'pro',
      usage: {
        accounts: 1,
        budgets: 1,
        goals: 1,
        recurringPayments: 1,
      },
    },
    currentPlan: {
      id: 'premium_annual',
      name: 'Pro',
    },
    subscription: {
      status: 'active',
    },
  },
};

const fullCapabilitiesPayload = {
  capabilities: {
    accounts: true,
    ai: true,
    auth: {
      deleteAccount: true,
      emailVerification: true,
      mfa: true,
      password: true,
      passwordReset: false,
      preferences: true,
      profile: true,
      security: true,
    },
    billing: true,
    goals: true,
    recurringPayments: true,
    reports: true,
    transactions: {
      export: true,
      savedViews: true,
    },
  },
  message: 'Financial Tracker API is running',
  status: 'ok',
};

const productionCoreCapabilitiesPayload = {
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

const authenticatedUser = {
  user: {
    created_at: '2026-05-01T12:00:00.000Z',
    email: 'pro-customer@flowledger.dev',
    email_verified_at: '2026-05-01T12:05:00.000Z',
    id: 9001,
    name: 'Pro Customer',
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
    workspaceName: 'Pro Space',
  },
};

const initialSessions = () => [
  {
    created_at: '2026-05-08T10:00:00.000Z',
    expires_at: '2026-06-08T10:00:00.000Z',
    id: 1,
    ip_address: '127.0.0.1',
    is_current: true,
    last_used_at: '2026-05-08T12:00:00.000Z',
    user_agent: 'Desktop Chrome',
  },
  {
    created_at: '2026-05-07T10:00:00.000Z',
    expires_at: '2026-06-07T10:00:00.000Z',
    id: 2,
    ip_address: '10.0.0.2',
    is_current: false,
    last_used_at: '2026-05-07T14:00:00.000Z',
    user_agent: 'Mobile Safari',
  },
];

const initialMfaStatus = () => ({
  enabled: true,
  enabled_at: '2026-05-07T10:00:00.000Z',
  recovery_codes_remaining: 8,
  setup_expires_at: null,
  setup_in_progress: false,
});

const initialBankConnections = () => [
  {
    id: 300,
    imported_count: 12,
    institution_name: 'Northwind Bank',
    label: 'Northwind operating',
    last_error: '',
    last_synced_at: '2026-05-08T12:00:00.000Z',
    provider: 'plaid',
    provider_account_mask: '4321',
    status: 'connected',
    unreconciled_count: 2,
  },
];

const initialReconciliationQueue = () => [
  {
    account_id: 77,
    account_name: 'Operating cash',
    amount: 84.72,
    bank_connection_id: 300,
    bank_connection_label: 'Northwind operating',
    category_id: 2,
    category_name: 'Groceries',
    description: 'North Market grocery run',
    id: 901,
    merchant_name: 'North Market',
    notes: 'Imported from Plaid sync.',
    posted_at: '2026-05-08',
    reconciliation_status: 'suggested',
    transaction_date: '2026-05-08',
    type: 'expense',
  },
];

const createWorkspaceState = () => ({
  bankConnections: initialBankConnections(),
  mfaBackupCodes: [],
  mfaStatus: initialMfaStatus(),
  reconciliationQueue: initialReconciliationQueue(),
  sessions: initialSessions(),
});

const fulfillJson = (route, payload, status = 200) =>
  route.fulfill({
    body: JSON.stringify(payload),
    contentType: 'application/json',
    status,
  });

const mockAuthenticatedWorkspace = async (
  page,
  {
    budgets = [],
    categories = [],
    capabilities = fullCapabilitiesPayload,
    recurringPayments = [],
    seedSession = true,
    transactions = [],
  } = {}
) => {
  if (seedSession) {
    await page.addInitScript(() => {
      window.sessionStorage.setItem(
        'ledgr-session-user',
        JSON.stringify({
          createdAt: '2026-05-01T12:00:00.000Z',
          email: 'pro-customer@flowledger.dev',
          emailVerifiedAt: '2026-05-01T12:05:00.000Z',
          fullName: 'Pro Customer',
          id: 9001,
          isEmailVerified: true,
          updatedAt: '2026-05-08T12:00:00.000Z',
        })
      );
    });
  }

  const state = createWorkspaceState();

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    const method = route.request().method();

    if (pathname === '/api/auth/me' && method === 'GET') {
      await fulfillJson(route, authenticatedUser);
      return;
    }

    if (pathname === '/api/health' && method === 'GET') {
      await fulfillJson(route, capabilities);
      return;
    }

    if (pathname === '/api/auth/preferences' && method === 'GET') {
      await fulfillJson(route, preferencesPayload);
      return;
    }

    if (pathname === '/api/billing/subscription' && method === 'GET') {
      await fulfillJson(route, proBilling);
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
            id: 77,
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

    if (pathname === '/api/transactions' && method === 'GET') {
      await fulfillJson(route, { transactions });
      return;
    }

    if (pathname === '/api/categories' && method === 'GET') {
      await fulfillJson(route, { categories });
      return;
    }

    if (pathname === '/api/budgets' && method === 'GET') {
      await fulfillJson(route, { budgets });
      return;
    }

    if (pathname === '/api/goals' && method === 'GET') {
      await fulfillJson(route, { goals: [] });
      return;
    }

    if (pathname === '/api/recurring-payments' && method === 'GET') {
      await fulfillJson(route, { recurringPayments });
      return;
    }

    if (pathname === '/api/auth/sessions' && method === 'GET') {
      await fulfillJson(route, { sessions: state.sessions });
      return;
    }

    if (pathname === '/api/auth/sessions/2' && method === 'DELETE') {
      state.sessions = state.sessions.filter((session) => session.id !== 2);
      await fulfillJson(route, { message: 'Session revoked.' });
      return;
    }

    if (pathname === '/api/auth/sessions/revoke-others' && method === 'POST') {
      state.sessions = state.sessions.filter((session) => session.is_current);
      await fulfillJson(route, { message: 'Other sessions revoked.' });
      return;
    }

    if (pathname === '/api/auth/security-events' && method === 'GET') {
      await fulfillJson(route, {
        events: [
          {
            created_at: '2026-05-08T12:00:00.000Z',
            description: 'Two-factor verification completed.',
            event_type: 'auth.mfa_challenge_completed',
            id: 11,
            ip_address: '127.0.0.1',
            title: 'Multi-factor challenge approved',
            user_agent: 'Desktop Chrome',
          },
        ],
      });
      return;
    }

    if (pathname === '/api/auth/mfa' && method === 'GET') {
      await fulfillJson(route, { status: state.mfaStatus });
      return;
    }

    if (pathname === '/api/auth/mfa/backup-codes/regenerate' && method === 'POST') {
      state.mfaBackupCodes = ['fresh-1001', 'fresh-1002', 'fresh-1003', 'fresh-1004'];
      state.mfaStatus = {
        ...state.mfaStatus,
        recovery_codes_remaining: state.mfaBackupCodes.length,
      };
      await fulfillJson(route, {
        backup_codes: state.mfaBackupCodes,
        status: state.mfaStatus,
      });
      return;
    }

    if (pathname === '/api/accounts/bank-providers' && method === 'GET') {
      await fulfillJson(route, {
        providers: [
          {
            description: 'Live institution linking and transaction sync through Plaid Link.',
            id: 'plaid',
            mode: 'sandbox',
            name: 'Plaid',
            status: 'available',
            supportsLink: true,
          },
          {
            description: 'Deterministic imported transactions for QA, demos, and regression coverage.',
            id: 'sandbox',
            mode: 'sandbox',
            name: 'Sandbox feed',
            status: 'available',
            supportsLink: false,
          },
        ],
      });
      return;
    }

    if (pathname === '/api/accounts/bank-connections' && method === 'GET') {
      await fulfillJson(route, { connections: state.bankConnections });
      return;
    }

    if (pathname === '/api/accounts/bank-connections' && method === 'POST') {
      const body = route.request().postDataJSON();
      const nextId = Math.max(...state.bankConnections.map((connection) => connection.id), 300) + 1;
      const nextConnection = {
        id: nextId,
        imported_count: 0,
        institution_name: body.institution_name || 'Sandbox institution',
        label: body.label || 'Sandbox feed',
        last_error: '',
        last_synced_at: null,
        provider: body.provider || 'sandbox',
        provider_account_mask: '9988',
        status: 'connected',
        unreconciled_count: 0,
      };
      state.bankConnections = [nextConnection, ...state.bankConnections];
      await fulfillJson(route, { connection: nextConnection });
      return;
    }

    if (pathname === '/api/accounts/reconciliation-queue' && method === 'GET') {
      await fulfillJson(route, { queue: state.reconciliationQueue });
      return;
    }

    await fulfillJson(route, {});
  });
};

test('dashboard renders a projected money flow graph from real plan data', async ({ page }) => {
  await mockAuthenticatedWorkspace(page, {
    budgets: [
      {
        amount_limit: 1200,
        category_id: 20,
        category_name: 'Housing',
        category_type: 'expense',
        id: 501,
        month: 5,
        year: 2026,
      },
    ],
    categories: [
      {
        id: 20,
        name: 'Housing',
        type: 'expense',
      },
    ],
    recurringPayments: [
      {
        amount: 300,
        billing_frequency: 'monthly',
        category_id: 20,
        category_name: 'Housing',
        id: 701,
        name: 'Insurance',
        next_payment_date: '2026-05-15',
        status: 'active',
      },
    ],
  });
  await page.goto('/dashboard');

  await expect(page.getByText('Projected from your budgets and active recurring payments until transactions arrive.')).toBeVisible();
  await expect(page.locator('.ref-flow-legend').getByText(/Planned expenses/)).toBeVisible();
  await expect(page.locator('.ref-chart-stage.is-empty')).toHaveCount(0);
  await expect(page.locator('.ref-chart-line-expense')).toBeVisible();
});

test('security workspace shows MFA, sessions, and recent activity', async ({ page }) => {
  await mockAuthenticatedWorkspace(page);
  await page.goto('/settings');

  await page.getByRole('button', { name: /Security/ }).click();

  await expect(page.getByText('Multi-factor authentication')).toBeVisible();
  await expect(page.getByText('Authenticator protected')).toBeVisible();
  await expect(page.getByText('Current device')).toBeVisible();
  await expect(page.getByText('Security activity')).toBeVisible();
  await expect(page.getByText('Multi-factor challenge approved')).toBeVisible();
});

test('security workspace hides advanced controls when deployment capability is off', async ({ page }) => {
  await mockAuthenticatedWorkspace(page, {
    capabilities: productionCoreCapabilitiesPayload,
  });
  await page.goto('/settings');

  await page.getByRole('button', { name: /Security/ }).click();

  await expect(page.getByRole('button', { name: 'Update password' })).toBeVisible();
  await expect(page.getByText('Advanced security controls')).toBeVisible();
  await expect(page.getByText('Multi-factor authentication, session revocation, and security activity remain hidden until the full security layer is enabled.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable MFA' })).toHaveCount(0);
  await expect(page.getByText('Current device')).toHaveCount(0);
  await expect(page.locator('.settings-session-header').filter({ hasText: 'Security activity' })).toHaveCount(0);
  await expect(page.locator('.settings-session-header').filter({ hasText: 'Active sessions' })).toHaveCount(0);
});

test('billing page shows a not-enabled state when billing capability is off', async ({ page }) => {
  await mockAuthenticatedWorkspace(page, {
    capabilities: productionCoreCapabilitiesPayload,
  });
  await page.goto('/billing');

  await expect(page.getByText('Billing not enabled')).toBeVisible();
  await expect(page.getByText('Use pricing to review plans. In-app billing management appears once checkout, invoices, and the billing portal are active.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open pricing' })).toBeVisible();
});

test('accounts workspace shows live and sandbox bank sync controls', async ({ page }) => {
  await mockAuthenticatedWorkspace(page);
  await page.goto('/accounts');

  await expect(page.getByText('Connected imports and reconciliation')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect live institution' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect test institution' })).toBeVisible();
  await expect(page.getByText('plaid', { exact: true })).toBeVisible();
  await expect(page.getByText('North Market')).toBeVisible();
});

test('cookie-backed session restores the workspace without preloaded session storage', async ({ page }) => {
  await mockAuthenticatedWorkspace(page, { seedSession: false });
  await page.goto('/accounts');

  await expect(page.getByText('Connected imports and reconciliation')).toBeVisible();
  const restoredUser = await page.evaluate(() => window.sessionStorage.getItem('ledgr-session-user'));
  expect(restoredUser).toContain('"id":9001');
  expect(restoredUser).toContain('"isEmailVerified":true');
});

test('security workspace revokes a non-current session in place', async ({ page }) => {
  await mockAuthenticatedWorkspace(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: /Security/ }).click();

  const revokedSession = page.locator('.settings-session-card').filter({ hasText: 'Mobile Safari' });
  await expect(revokedSession).toBeVisible();
  await revokedSession.getByRole('button', { name: 'Revoke' }).click();

  await expect(page.getByText('Session revoked.')).toBeVisible();
  await expect(revokedSession).toHaveCount(0);
  await expect(page.getByText('1 visible')).toBeVisible();
});

test('security workspace regenerates MFA backup codes', async ({ page }) => {
  await mockAuthenticatedWorkspace(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: /Security/ }).click();

  await page.getByLabel('Current password').nth(1).fill('customer-password');
  await page.getByLabel('Authenticator or backup code').first().fill('123456');
  await page.getByRole('button', { name: 'Regenerate backup codes' }).click();

  await expect(page.getByText('Backup codes regenerated. Replace every previously saved recovery code with the new set below.')).toBeVisible();
  await expect(page.getByText('fresh-1001')).toBeVisible();
  await expect(page.getByText('fresh-1004')).toBeVisible();
});

test('accounts workspace can add a sandbox bank connection', async ({ page }) => {
  await mockAuthenticatedWorkspace(page);
  await page.goto('/accounts');

  await page.getByRole('button', { name: 'Connect test institution' }).click();

  await expect(page.getByText('Test institution connected.')).toBeVisible();
  await expect(page.getByText('Primary test feed')).toBeVisible();
});
