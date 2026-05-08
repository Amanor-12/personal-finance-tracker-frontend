const pool = require('../config/db');

let securityEventSchemaPromise;

const eventCopy = {
  'auth.account_deleted': {
    description: () => 'The account was permanently deleted after a confirmed password check.',
    title: 'Account deleted',
  },
  'auth.email_changed': {
    description: (detail) =>
      detail?.email
        ? `The primary account email changed to ${detail.email} and now requires verification.`
        : 'The primary account email changed and now requires verification.',
    title: 'Primary email changed',
  },
  'auth.email_verification_requested': {
    description: () => 'A verification link was sent to the current account email.',
    title: 'Verification email sent',
  },
  'auth.email_verified': {
    description: () => 'The account email was confirmed through the verification link.',
    title: 'Email verified',
  },
  'auth.login': {
    description: () => 'A new authenticated session was created successfully.',
    title: 'Signed in',
  },
  'auth.mfa_backup_code_used': {
    description: () => 'A recovery code was used to complete a multi-factor challenge.',
    title: 'Backup code used',
  },
  'auth.mfa_backup_codes_regenerated': {
    description: () => 'The recovery code set was rotated after a successful verification check.',
    title: 'Backup codes regenerated',
  },
  'auth.mfa_challenge_completed': {
    description: (detail) =>
      detail?.method === 'backup_code'
        ? 'A multi-factor sign-in challenge was completed with a recovery code.'
        : 'A multi-factor sign-in challenge was completed with an authenticator code.',
    title: 'Multi-factor challenge approved',
  },
  'auth.mfa_disabled': {
    description: () => 'Multi-factor authentication was disabled after password and code confirmation.',
    title: 'Multi-factor disabled',
  },
  'auth.mfa_enabled': {
    description: () => 'Multi-factor authentication was enabled and new recovery codes were issued.',
    title: 'Multi-factor enabled',
  },
  'auth.password_reset_completed': {
    description: () => 'A password reset completed and prior sessions were invalidated.',
    title: 'Password reset completed',
  },
  'auth.password_reset_requested': {
    description: () => 'A password reset link was requested for this account.',
    title: 'Password reset requested',
  },
  'auth.password_updated': {
    description: () => 'The account password changed and other sessions were revoked.',
    title: 'Password updated',
  },
  'auth.profile_updated': {
    description: () => 'Account profile details were updated.',
    title: 'Profile updated',
  },
  'auth.registered': {
    description: () => 'A new account was created and the workspace was provisioned.',
    title: 'Account created',
  },
  'auth.session_revoked': {
    description: () => 'An active session was revoked from the security settings panel.',
    title: 'Session revoked',
  },
  'auth.sessions_revoked_other': {
    description: (detail) =>
      detail?.count
        ? `${detail.count} other active session${detail.count === 1 ? '' : 's'} were revoked.`
        : 'Other active sessions were revoked.',
    title: 'Other sessions revoked',
  },
};

const ensureSecurityEventSchema = async () => {
  if (!securityEventSchemaPromise) {
    securityEventSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS security_events (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          event_type VARCHAR(80) NOT NULL,
          event_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
          ip_address VARCHAR(255) NOT NULL DEFAULT '',
          user_agent VARCHAR(500) NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_security_events_user_created
        ON security_events (user_id, created_at DESC, id DESC)
      `);
    })().catch((error) => {
      securityEventSchemaPromise = null;
      throw error;
    });
  }

  await securityEventSchemaPromise;
};

const serializeSecurityEvent = (record) => {
  const copy = eventCopy[record.event_type] || {
    description: () => 'A security-sensitive account action was recorded.',
    title: 'Security activity',
  };
  const detail = record.event_detail || {};

  return {
    created_at: record.created_at,
    description: copy.description(detail),
    event_detail: detail,
    event_type: record.event_type,
    id: Number(record.id),
    ip_address: record.ip_address || '',
    title: copy.title,
    user_agent: record.user_agent || '',
  };
};

const logSecurityEvent = async ({ detail = {}, eventType, metadata = {}, userId }, db = pool) => {
  if (!userId || !eventType) {
    return null;
  }

  await ensureSecurityEventSchema();

  const result = await db.query(
    `
      INSERT INTO security_events (
        user_id,
        event_type,
        event_detail,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3::jsonb, $4, $5)
      RETURNING id, event_type, event_detail, ip_address, user_agent, created_at
    `,
    [
      userId,
      eventType,
      JSON.stringify(detail || {}),
      String(metadata.ipAddress || '').slice(0, 255),
      String(metadata.userAgent || '').slice(0, 500),
    ]
  );

  return serializeSecurityEvent(result.rows[0]);
};

const listSecurityEvents = async (userId, limit = 12, db = pool) => {
  await ensureSecurityEventSchema();

  const normalizedLimit = Math.max(1, Math.min(25, Number(limit) || 12));
  const result = await db.query(
    `
      SELECT
        id,
        event_type,
        event_detail,
        ip_address,
        user_agent,
        created_at
      FROM security_events
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `,
    [userId, normalizedLimit]
  );

  return result.rows.map(serializeSecurityEvent);
};

module.exports = {
  ensureSecurityEventSchema,
  listSecurityEvents,
  logSecurityEvent,
};
