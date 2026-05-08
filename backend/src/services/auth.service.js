const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = require('../config/db');
const { appBaseUrl, passwordResetTokenTtlMinutes } = require('../config/env');
const AppError = require('../utils/AppError');
const { sendPasswordResetEmail } = require('./email.service');
const { logSecurityEvent } = require('./security-event.service');
const { createDefaultPreferences, ensureUserPreferencesTable } = require('./user-preferences.service');

const starterCategories = [
  { name: 'Salary', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Housing', type: 'expense' },
  { name: 'Groceries', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Savings', type: 'expense' },
];

const publicUserFields = `
  id,
  name,
  email,
  email_verified_at,
  created_at,
  updated_at
`;

let passwordResetSchemaPromise;

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex');

const ensurePasswordResetTable = async () => {
  if (!passwordResetSchemaPromise) {
    passwordResetSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) NOT NULL,
          requested_ip VARCHAR(255) NOT NULL DEFAULT '',
          user_agent VARCHAR(500) NOT NULL DEFAULT '',
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
        ON password_reset_tokens (user_id, created_at DESC)
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
        ON password_reset_tokens (token_hash)
      `);
    })().catch((error) => {
      passwordResetSchemaPromise = null;
      throw error;
    });
  }

  await passwordResetSchemaPromise;
};

const buildPasswordResetPreviewUrl = (token) => {
  const baseUrl = appBaseUrl || 'http://127.0.0.1:5173';
  return `${baseUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
};

const registerUser = async ({ fullName, name, email, password }) => {
  await ensureUserPreferencesTable();
  const client = await pool.connect();
  const resolvedName = String(name || fullName || '').trim();

  try {
    await client.query('BEGIN');

    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rowCount > 0) {
      throw new AppError('An account with that email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING ${publicUserFields}
      `,
      [resolvedName, email, passwordHash]
    );

    const user = userResult.rows[0];

    for (const category of starterCategories) {
      await client.query(
        `
          INSERT INTO categories (user_id, name, type)
          VALUES ($1, $2, $3)
        `,
        [user.id, category.name, category.type]
      );
    }

    const defaultPreferences = createDefaultPreferences(user.name);

    await client.query(
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
      `,
      [
        user.id,
        defaultPreferences.workspaceName,
        defaultPreferences.currency,
        defaultPreferences.weekStart,
        defaultPreferences.amountView,
        defaultPreferences.paymentReminders,
        defaultPreferences.weeklySummary,
        defaultPreferences.loginAlerts,
        defaultPreferences.onboardingCompleted,
      ]
    );

    await client.query('COMMIT');

    return {
      user,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const loginUser = async ({ email, password }) => {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        email_verified_at,
        mfa_enabled_at,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  if (result.rowCount === 0) {
    throw new AppError('Invalid email or password.', 401);
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  return {
    requires_mfa: Boolean(user.mfa_enabled_at),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      email_verified_at: user.email_verified_at,
      created_at: user.created_at,
      mfa_enabled_at: user.mfa_enabled_at,
      updated_at: user.updated_at,
    },
  };
};

const getCurrentUser = async (userId) => {
  const result = await pool.query(
    `
      SELECT ${publicUserFields}
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

const updateCurrentUser = async (userId, { fullName, name, email }) => {
  const existingUser = await getCurrentUser(userId);
  const emailChanged = existingUser.email.toLowerCase() !== String(email || '').toLowerCase();
  const resolvedName = String(name || fullName || '').trim();

  const duplicateUser = await pool.query(
    `
      SELECT id
      FROM users
      WHERE email = $1 AND id <> $2
    `,
    [email, userId]
  );

  if (duplicateUser.rowCount > 0) {
    throw new AppError('An account with that email already exists.', 409);
  }

  const result = await pool.query(
    `
      UPDATE users
      SET
        name = $1,
        email = $2,
        email_verified_at = CASE
          WHEN $4 THEN NULL
          ELSE email_verified_at
        END
      WHERE id = $3
      RETURNING ${publicUserFields}
    `,
    [resolvedName, email, userId, emailChanged]
  );

  if (result.rowCount === 0) {
    throw new AppError('User account could not be found.', 404);
  }

  return {
    ...existingUser,
    ...result.rows[0],
  };
};

const updateCurrentUserPassword = async (userId, { current_password, new_password }) => {
  const result = await pool.query(
    `
      SELECT id, password_hash
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('User account could not be found.', 404);
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(current_password, user.password_hash);

  if (!isMatch) {
    throw new AppError('Current password is incorrect.', 401);
  }

  const passwordHash = await bcrypt.hash(new_password, 12);

  await pool.query(
    `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
    `,
    [passwordHash, userId]
  );
};

const deleteCurrentUser = async (userId, { current_password }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        SELECT id, password_hash
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('User account could not be found.', 404);
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(current_password, user.password_hash);

    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 401);
    }

    await client.query(
      `
        DELETE FROM users
        WHERE id = $1
      `,
      [userId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const requestPasswordReset = async ({ email, metadata = {} }) => {
  await ensurePasswordResetTable();

  const result = await pool.query(
    `
      SELECT id, email, name
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  if (result.rowCount === 0) {
    return {
      delivery: null,
      expiresAt: null,
      message: 'If an account exists for that email, a password reset link has been prepared.',
    };
  }

  const user = result.rows[0];
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + passwordResetTokenTtlMinutes * 60000);

  await pool.query(
    `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE user_id = $1 AND used_at IS NULL
    `,
    [user.id]
  );

  await pool.query(
    `
      INSERT INTO password_reset_tokens (
        user_id,
        token_hash,
        requested_ip,
        user_agent,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      user.id,
      tokenHash,
      String(metadata.ipAddress || ''),
      String(metadata.userAgent || '').slice(0, 500),
      expiresAt,
    ]
  );

  const resetUrl = buildPasswordResetPreviewUrl(rawToken);
  const delivery = await sendPasswordResetEmail({
    email: user.email,
    expiresAt,
    name: user.name,
    resetUrl,
  });

  await logSecurityEvent({
    eventType: 'auth.password_reset_requested',
    metadata,
    userId: user.id,
  });

  return {
    delivery,
    expiresAt: expiresAt.toISOString(),
    message: 'If an account exists for that email, a password reset link has been prepared.',
  };
};

const resetPasswordWithToken = async ({ new_password, token }) => {
  await ensurePasswordResetTable();

  const tokenHash = hashResetToken(token);
  const result = await pool.query(
    `
      SELECT prt.id, prt.user_id, u.email, u.name
      FROM password_reset_tokens prt
      INNER JOIN users u
        ON u.id = prt.user_id
      WHERE
        prt.token_hash = $1
        AND prt.used_at IS NULL
        AND prt.expires_at > NOW()
      ORDER BY prt.created_at DESC
      LIMIT 1
    `,
    [tokenHash]
  );

  if (result.rowCount === 0) {
    throw new AppError('This password reset link is invalid or has expired.', 400);
  }

  const record = result.rows[0];
  const passwordHash = await bcrypt.hash(new_password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
      `,
      [passwordHash, record.user_id]
    );

    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = $1
      `,
      [record.id]
    );

    await logSecurityEvent(
      {
        eventType: 'auth.password_reset_completed',
        metadata: {},
        userId: record.user_id,
      },
      client
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    user: {
      email: record.email,
      id: record.user_id,
      name: record.name,
    },
  };
};

const listUsers = async (userId) => {
  const result = await pool.query(
    `
      SELECT ${publicUserFields}
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  return result.rows;
};

module.exports = {
  deleteCurrentUser,
  ensurePasswordResetTable,
  getCurrentUser,
  listUsers,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
  updateCurrentUser,
  updateCurrentUserPassword,
};
