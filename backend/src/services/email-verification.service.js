const crypto = require('crypto');

const pool = require('../config/db');
const { appBaseUrl, emailVerificationTokenTtlHours } = require('../config/env');
const AppError = require('../utils/AppError');
const { sendEmailVerificationEmail } = require('./email.service');
const { logSecurityEvent } = require('./security-event.service');

let emailVerificationSchemaPromise;

const publicUserFields = `
  id,
  name,
  email,
  email_verified_at,
  created_at,
  updated_at
`;

const hashVerificationToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex');

const buildEmailVerificationUrl = (token) => {
  const baseUrl = appBaseUrl || 'http://127.0.0.1:5173';
  return `${baseUrl.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
};

const ensureEmailVerificationSchema = async () => {
  if (!emailVerificationSchemaPromise) {
    emailVerificationSchemaPromise = (async () => {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ NULL
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) NOT NULL,
          email_snapshot VARCHAR(255) NOT NULL,
          requested_ip VARCHAR(255) NOT NULL DEFAULT '',
          user_agent VARCHAR(500) NOT NULL DEFAULT '',
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_created
        ON email_verification_tokens (user_id, created_at DESC)
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verification_tokens_hash
        ON email_verification_tokens (token_hash)
      `);
    })().catch((error) => {
      emailVerificationSchemaPromise = null;
      throw error;
    });
  }

  await emailVerificationSchemaPromise;
};

const getVerificationUser = async (db, userId) => {
  const result = await db.query(
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

const requestEmailVerification = async ({ metadata = {}, userId }, db = pool) => {
  await ensureEmailVerificationSchema();
  const user = await getVerificationUser(db, userId);

  if (user.email_verified_at) {
    return {
      alreadyVerified: true,
      delivery: null,
      expiresAt: null,
      message: 'This email address is already verified.',
    };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + emailVerificationTokenTtlHours * 60 * 60 * 1000);

  await db.query(
    `
      UPDATE email_verification_tokens
      SET used_at = NOW()
      WHERE user_id = $1 AND used_at IS NULL
    `,
    [user.id]
  );

  await db.query(
    `
      INSERT INTO email_verification_tokens (
        user_id,
        token_hash,
        email_snapshot,
        requested_ip,
        user_agent,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      user.id,
      tokenHash,
      user.email,
      String(metadata.ipAddress || '').slice(0, 255),
      String(metadata.userAgent || '').slice(0, 500),
      expiresAt,
    ]
  );

  const verificationUrl = buildEmailVerificationUrl(rawToken);
  const delivery = await sendEmailVerificationEmail({
    email: user.email,
    expiresAt,
    name: user.name,
    verificationUrl,
  });

  await logSecurityEvent(
    {
      eventType: 'auth.email_verification_requested',
      metadata,
      userId: user.id,
    },
    db
  );

  return {
    alreadyVerified: false,
    delivery,
    expiresAt: expiresAt.toISOString(),
    message: 'A verification link has been prepared for your account email.',
  };
};

const confirmEmailVerification = async ({ token }) => {
  await ensureEmailVerificationSchema();

  const tokenHash = hashVerificationToken(token);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        SELECT
          evt.id,
          evt.user_id,
          evt.email_snapshot,
          u.email,
          u.name
        FROM email_verification_tokens evt
        INNER JOIN users u
          ON u.id = evt.user_id
        WHERE
          evt.token_hash = $1
          AND evt.used_at IS NULL
          AND evt.expires_at > NOW()
        ORDER BY evt.created_at DESC
        LIMIT 1
      `,
      [tokenHash]
    );

    if (result.rowCount === 0) {
      throw new AppError('This verification link is invalid or has expired.', 400);
    }

    const record = result.rows[0];

    if (record.email !== record.email_snapshot) {
      throw new AppError('This verification link no longer matches the current account email.', 400);
    }

    const userResult = await client.query(
      `
        UPDATE users
        SET email_verified_at = NOW()
        WHERE id = $1
        RETURNING ${publicUserFields}
      `,
      [record.user_id]
    );

    await client.query(
      `
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE id = $1
      `,
      [record.id]
    );

    await logSecurityEvent(
      {
        eventType: 'auth.email_verified',
        metadata: {},
        userId: record.user_id,
      },
      client
    );

    await client.query('COMMIT');

    return {
      user: userResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  confirmEmailVerification,
  ensureEmailVerificationSchema,
  requestEmailVerification,
};
