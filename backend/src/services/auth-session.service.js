const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { refreshTokenTtlDays } = require('../config/env');
const { generateRefreshToken, hashRefreshToken } = require('../utils/jwt');

let authSessionsTableReady = false;

const publicUserFields = `
  id,
  name,
  email,
  email_verified_at,
  created_at,
  updated_at
`;

const ensureAuthSessionsTable = async () => {
  if (authSessionsTableReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      user_agent VARCHAR(500) NOT NULL DEFAULT '',
      ip_address VARCHAR(120) NOT NULL DEFAULT '',
      expires_at TIMESTAMPTZ NOT NULL,
      last_used_at TIMESTAMPTZ NULL,
      revoked_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
    ON auth_sessions (user_id, expires_at DESC)
  `);

  authSessionsTableReady = true;
};

const getSessionExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + refreshTokenTtlDays);
  return expiresAt;
};

const serializeSession = (record, currentTokenHash = '') => ({
  created_at: record.created_at,
  expires_at: record.expires_at,
  id: Number(record.id),
  ip_address: record.ip_address || '',
  is_current: Boolean(currentTokenHash) && record.token_hash === currentTokenHash,
  last_used_at: record.last_used_at,
  user_agent: record.user_agent || '',
});

const issueSession = async (user, metadata = {}, db = pool) => {
  await ensureAuthSessionsTable();

  const refreshToken = generateRefreshToken();

  await db.query(
    `
      INSERT INTO auth_sessions (
        user_id,
        token_hash,
        user_agent,
        ip_address,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      user.id,
      hashRefreshToken(refreshToken),
      metadata.userAgent || '',
      metadata.ipAddress || '',
      getSessionExpiry(),
    ]
  );

  return {
    refreshToken,
  };
};

const getSessionUserByRefreshToken = async (refreshToken, db = pool) => {
  await ensureAuthSessionsTable();

  if (!refreshToken) {
    throw new AppError('A refresh session is required.', 401);
  }

  const result = await db.query(
    `
      SELECT
        s.id AS session_id,
        ${publicUserFields}
      FROM auth_sessions s
      INNER JOIN users u
        ON u.id = s.user_id
      WHERE
        s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [hashRefreshToken(refreshToken)]
  );

  if (result.rowCount === 0) {
    throw new AppError('Your session is invalid or has expired. Please sign in again.', 401);
  }

  await db.query(
    `
      UPDATE auth_sessions
      SET last_used_at = NOW()
      WHERE id = $1
    `,
    [result.rows[0].session_id]
  );

  return {
    sessionId: result.rows[0].session_id,
    user: {
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email,
      email_verified_at: result.rows[0].email_verified_at,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
    },
  };
};

const revokeSession = async (refreshToken, db = pool) => {
  await ensureAuthSessionsTable();

  if (!refreshToken) {
    return;
  }

  await db.query(
    `
      UPDATE auth_sessions
      SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE token_hash = $1
    `,
    [hashRefreshToken(refreshToken)]
  );
};

const revokeAllUserSessions = async (userId, db = pool) => {
  await ensureAuthSessionsTable();

  await db.query(
    `
      UPDATE auth_sessions
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [userId]
  );
};

const listUserSessions = async (userId, currentRefreshToken = '', db = pool) => {
  await ensureAuthSessionsTable();

  const currentTokenHash = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : '';
  const result = await db.query(
    `
      SELECT
        id,
        token_hash,
        user_agent,
        ip_address,
        expires_at,
        last_used_at,
        created_at
      FROM auth_sessions
      WHERE
        user_id = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY
        CASE
          WHEN token_hash = $2 THEN 0
          ELSE 1
        END ASC,
        COALESCE(last_used_at, created_at) DESC,
        id DESC
    `,
    [userId, currentTokenHash]
  );

  return result.rows.map((record) => serializeSession(record, currentTokenHash));
};

const revokeUserSessionById = async (userId, sessionId, currentRefreshToken = '', db = pool) => {
  await ensureAuthSessionsTable();

  const currentTokenHash = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : '';
  const result = await db.query(
    `
      UPDATE auth_sessions
      SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE
        id = $1
        AND user_id = $2
        AND revoked_at IS NULL
      RETURNING id, token_hash
    `,
    [sessionId, userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Session not found.', 404);
  }

  return {
    id: Number(result.rows[0].id),
    isCurrent: Boolean(currentTokenHash) && result.rows[0].token_hash === currentTokenHash,
  };
};

const revokeOtherUserSessions = async (userId, currentRefreshToken = '', db = pool) => {
  await ensureAuthSessionsTable();

  const currentTokenHash = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : '';
  const result = await db.query(
    `
      UPDATE auth_sessions
      SET revoked_at = NOW()
      WHERE
        user_id = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
        AND ($2 = '' OR token_hash <> $2)
      RETURNING id
    `,
    [userId, currentTokenHash]
  );

  return {
    count: result.rowCount,
  };
};

module.exports = {
  ensureAuthSessionsTable,
  getSessionUserByRefreshToken,
  issueSession,
  listUserSessions,
  revokeAllUserSessions,
  revokeOtherUserSessions,
  revokeSession,
  revokeUserSessionById,
};
