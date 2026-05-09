import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        capabilities: {
          accounts: false,
          ai: false,
          auth: {
            deleteAccount: false,
            emailVerification: false,
            mfa: false,
            password: false,
            passwordReset: false,
            preferences: false,
            profile: false,
            security: false,
          },
          billing: false,
          goals: false,
          recurringPayments: false,
          reports: false,
          transactions: {
            export: false,
            savedViews: false,
          },
        },
        message: 'Financial Tracker API is running',
        status: 'ok',
      }),
    });
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Authentication is required to access this resource.',
        message: 'Authentication is required to access this resource.',
      }),
    });
  });
});

test('login screen stays accessible for signed-out customers', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
  await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Access workspace' })).toBeVisible();
});

test('signup can hydrate the session from a token-only register response', async ({ page }) => {
  let meAuthHeader = '';

  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'render-signup-token',
        message: 'Account created successfully.',
      }),
    });
  });

  await page.route('**/api/auth/me', async (route) => {
    const authHeader = route.request().headers().authorization || '';

    if (authHeader === 'Bearer render-signup-token') {
      meAuthHeader = authHeader;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            created_at: '2026-05-08T12:00:00.000Z',
            email: 'john.smith@example.com',
            id: 44,
            name: 'John Smith',
            updated_at: '2026-05-08T12:00:00.000Z',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Authentication is required to access this resource.',
        message: 'Authentication is required to access this resource.',
      }),
    });
  });

  await page.route('**/api/auth/preferences', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        preferences: {
          amountView: 'Compact',
          currency: 'USD',
          loginAlerts: true,
          onboardingCompleted: false,
          paymentReminders: true,
          weekStart: 'Monday',
          weeklySummary: false,
          workspaceName: 'John Smith Workspace',
        },
      }),
    });
  });

  await page.goto('/signup');

  await page.locator('#fullName').fill('John Smith');
  await page.locator('#email').fill('john.smith@example.com');
  await page.locator('#password').fill('supersecure123');
  await page.locator('#confirmPassword').fill('supersecure123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const rawValue = window.sessionStorage.getItem('ledgr-session-user');

        if (!rawValue) {
          return '';
        }

        const session = JSON.parse(rawValue);
        return `${session?.user?.email || ''}|${session?.token || ''}`;
      })
    )
    .toBe('john.smith@example.com|render-signup-token');
  expect(meAuthHeader).toBe('Bearer render-signup-token');
});

test('pricing page stays reachable from the public shell', async ({ page }) => {
  await page.goto('/pricing');

  await expect(page.getByRole('heading', { name: /start free/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Plus', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible();
});
