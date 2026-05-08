const pool = require('../config/db');
const AppError = require('../utils/AppError');

let userPreferencesTableReady = false;

const createDefaultPreferences = (fullName = '') => {
  const firstName = String(fullName || '')
    .split(' ')
    .filter(Boolean)[0] || 'Rivo';

  return {
    amountView: 'Compact',
    currency: 'USD',
    loginAlerts: true,
    onboardingCompleted: false,
    paymentReminders: true,
    weekStart: 'Monday',
    weeklySummary: false,
    workspaceName: `${firstName} Space`,
  };
};

const ensureUserPreferencesTable = async () => {
  if (userPreferencesTableReady) {
    return;
  }

  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      workspace_name VARCHAR(80) NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'USD',
      week_start VARCHAR(20) NOT NULL DEFAULT 'Monday',
      amount_view VARCHAR(20) NOT NULL DEFAULT 'Compact',
      payment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
      weekly_summary BOOLEAN NOT NULL DEFAULT FALSE,
      login_alerts BOOLEAN NOT NULL DEFAULT TRUE,
      onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'user_preferences_set_updated_at'
      ) THEN
        CREATE TRIGGER user_preferences_set_updated_at
        BEFORE UPDATE ON user_preferences
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END
    $$;
  `);

  userPreferencesTableReady = true;
};

const getUserRecord = async (db, userId) => {
  const result = await db.query(
    `
      SELECT id, name
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('User account could not be found.', 404);
  }

  return result.rows[0];
};

const normalizePreferences = (record, fullName = '') => {
  const defaults = createDefaultPreferences(fullName);

  if (!record) {
    return defaults;
  }

  return {
    amountView: record.amount_view || defaults.amountView,
    currency: record.currency || defaults.currency,
    loginAlerts:
      typeof record.login_alerts === 'boolean' ? record.login_alerts : defaults.loginAlerts,
    onboardingCompleted:
      typeof record.onboarding_completed === 'boolean'
        ? record.onboarding_completed
        : defaults.onboardingCompleted,
    paymentReminders:
      typeof record.payment_reminders === 'boolean'
        ? record.payment_reminders
        : defaults.paymentReminders,
    weekStart: record.week_start || defaults.weekStart,
    weeklySummary:
      typeof record.weekly_summary === 'boolean'
        ? record.weekly_summary
        : defaults.weeklySummary,
    workspaceName: record.workspace_name || defaults.workspaceName,
  };
};

const getPreferences = async (userId, db = pool) => {
  await ensureUserPreferencesTable();

  const user = await getUserRecord(db, userId);
  const result = await db.query(
    `
      SELECT
        workspace_name,
        currency,
        week_start,
        amount_view,
        payment_reminders,
        weekly_summary,
        login_alerts,
        onboarding_completed
      FROM user_preferences
      WHERE user_id = $1
    `,
    [userId]
  );

  return normalizePreferences(result.rows[0], user.name);
};

const updatePreferences = async (userId, payload) => {
  await ensureUserPreferencesTable();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const user = await getUserRecord(client, userId);
    const currentPreferences = await getPreferences(userId, client);
    const nextPreferences = {
      ...currentPreferences,
      ...(typeof payload.workspaceName === 'string' ? { workspaceName: payload.workspaceName.trim() } : {}),
      ...(typeof payload.currency === 'string' ? { currency: payload.currency.trim().toUpperCase() } : {}),
      ...(typeof payload.weekStart === 'string' ? { weekStart: payload.weekStart.trim() } : {}),
      ...(typeof payload.amountView === 'string' ? { amountView: payload.amountView.trim() } : {}),
      ...(typeof payload.paymentReminders === 'boolean'
        ? { paymentReminders: payload.paymentReminders }
        : {}),
      ...(typeof payload.weeklySummary === 'boolean' ? { weeklySummary: payload.weeklySummary } : {}),
      ...(typeof payload.loginAlerts === 'boolean' ? { loginAlerts: payload.loginAlerts } : {}),
      ...(typeof payload.onboardingCompleted === 'boolean'
        ? { onboardingCompleted: payload.onboardingCompleted }
        : {}),
    };

    const result = await client.query(
      `
        INSERT INTO user_preferences (
          user_id,
          workspace_name,
          currency,
          week_start,
          amount_view,
          payment_reminders,
          weekly_summary,
          login_alerts,
          onboarding_completed
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id)
        DO UPDATE SET
          workspace_name = EXCLUDED.workspace_name,
          currency = EXCLUDED.currency,
          week_start = EXCLUDED.week_start,
          amount_view = EXCLUDED.amount_view,
          payment_reminders = EXCLUDED.payment_reminders,
          weekly_summary = EXCLUDED.weekly_summary,
          login_alerts = EXCLUDED.login_alerts,
          onboarding_completed = EXCLUDED.onboarding_completed
        RETURNING
          workspace_name,
          currency,
          week_start,
          amount_view,
          payment_reminders,
          weekly_summary,
          login_alerts,
          onboarding_completed
      `,
      [
        userId,
        nextPreferences.workspaceName,
        nextPreferences.currency,
        nextPreferences.weekStart,
        nextPreferences.amountView,
        nextPreferences.paymentReminders,
        nextPreferences.weeklySummary,
        nextPreferences.loginAlerts,
        nextPreferences.onboardingCompleted,
      ]
    );

    await client.query('COMMIT');
    return normalizePreferences(result.rows[0], user.name);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createDefaultPreferences,
  ensureUserPreferencesTable,
  getPreferences,
  updatePreferences,
};
