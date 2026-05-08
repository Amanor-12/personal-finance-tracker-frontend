const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = require('../config/db');
const { mfaChallengeTtlMinutes, mfaEncryptionSecret, mfaIssuer } = require('../config/env');
const AppError = require('../utils/AppError');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_SIZE = 8;
const SETUP_TTL_MINUTES = 15;
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_WINDOW_STEPS = 1;

let mfaSchemaPromise;

const hashValue = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const buildCipherKey = () =>
  crypto.createHash('sha256').update(String(mfaEncryptionSecret || '')).digest();

const encryptSecret = (plainValue) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', buildCipherKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainValue || ''), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64url'), authTag.toString('base64url'), ciphertext.toString('base64url')].join('.');
};

const decryptSecret = (ciphertext) => {
  const [ivValue, authTagValue, payloadValue] = String(ciphertext || '').split('.');

  if (!ivValue || !authTagValue || !payloadValue) {
    throw new AppError('The MFA secret could not be read.', 500);
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    buildCipherKey(),
    Buffer.from(ivValue, 'base64url')
  );

  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));

  const clearText = Buffer.concat([
    decipher.update(Buffer.from(payloadValue, 'base64url')),
    decipher.final(),
  ]);

  return clearText.toString('utf8');
};

const base32Encode = (input) => {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  let output = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (value) => {
  const normalizedValue = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');

  if (!normalizedValue) {
    return Buffer.alloc(0);
  }

  let bits = 0;
  let currentValue = 0;
  const output = [];

  for (const character of normalizedValue) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index < 0) {
      throw new AppError('The MFA secret is invalid.', 400);
    }

    currentValue = (currentValue << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((currentValue >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
};

const formatManualKey = (value) =>
  String(value || '')
    .replace(/\s+/g, '')
    .replace(/(.{4})/g, '$1 ')
    .trim();

const normalizeTotpCode = (value) => String(value || '').replace(/\s+/g, '');

const normalizeBackupCode = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const generateHotp = (secretBuffer, counter) => {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binaryCode % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
};

const isValidTotp = (secretBuffer, candidateCode) => {
  const normalizedCode = normalizeTotpCode(candidateCode);

  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);

  for (let offset = -TOTP_WINDOW_STEPS; offset <= TOTP_WINDOW_STEPS; offset += 1) {
    const expectedCode = generateHotp(secretBuffer, currentCounter + offset);

    if (crypto.timingSafeEqual(Buffer.from(expectedCode), Buffer.from(normalizedCode))) {
      return true;
    }
  }

  return false;
};

const generateBackupCode = () => {
  let candidate = '';

  while (candidate.length < BACKUP_CODE_SIZE) {
    candidate += crypto.randomBytes(8).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  const normalizedCode = candidate.slice(0, BACKUP_CODE_SIZE);
  return `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`;
};

const generateBackupCodes = () =>
  Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());

const getTotpSetupExpiry = () => new Date(Date.now() + SETUP_TTL_MINUTES * 60 * 1000);

const getChallengeExpiry = () => new Date(Date.now() + mfaChallengeTtlMinutes * 60 * 1000);

const buildOtpAuthUrl = ({ email, secret }) => {
  const label = `${mfaIssuer}:${email}`;
  const params = new URLSearchParams({
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    issuer: mfaIssuer,
    period: String(TOTP_PERIOD_SECONDS),
    secret,
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};

const publicUserFields = `
  id,
  name,
  email,
  email_verified_at,
  created_at,
  updated_at
`;

const ensureMfaSchema = async () => {
  if (!mfaSchemaPromise) {
    mfaSchemaPromise = (async () => {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS mfa_enabled_at TIMESTAMPTZ NULL
      `);

      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS mfa_secret_ciphertext TEXT NULL
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mfa_pending_setups (
          user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          secret_ciphertext TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          code_hash VARCHAR(64) NOT NULL,
          used_at TIMESTAMPTZ NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user_active
        ON mfa_recovery_codes (user_id, used_at, id DESC)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mfa_challenges (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          challenge_hash VARCHAR(64) NOT NULL UNIQUE,
          requested_ip VARCHAR(255) NOT NULL DEFAULT '',
          user_agent VARCHAR(500) NOT NULL DEFAULT '',
          expires_at TIMESTAMPTZ NOT NULL,
          consumed_at TIMESTAMPTZ NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user_active
        ON mfa_challenges (user_id, expires_at DESC, created_at DESC)
      `);
    })().catch((error) => {
      mfaSchemaPromise = null;
      throw error;
    });
  }

  await mfaSchemaPromise;
};

const getMfaUserRecord = async (db, userId, { forUpdate = false } = {}) => {
  const result = await db.query(
    `
      SELECT
        id,
        name,
        email,
        email_verified_at,
        password_hash,
        mfa_enabled_at,
        mfa_secret_ciphertext,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('User account could not be found.', 404);
  }

  return result.rows[0];
};

const countRemainingRecoveryCodes = async (db, userId) => {
  const result = await db.query(
    `
      SELECT COUNT(*)::int AS count
      FROM mfa_recovery_codes
      WHERE user_id = $1 AND used_at IS NULL
    `,
    [userId]
  );

  return Number(result.rows[0]?.count || 0);
};

const getMfaStatus = async (userId, db = pool) => {
  await ensureMfaSchema();

  const [user, pendingSetup] = await Promise.all([
    getMfaUserRecord(db, userId),
    db.query(
      `
        SELECT expires_at
        FROM mfa_pending_setups
        WHERE user_id = $1 AND expires_at > NOW()
        LIMIT 1
      `,
      [userId]
    ),
  ]);

  const recoveryCodesRemaining = user.mfa_enabled_at
    ? await countRemainingRecoveryCodes(db, userId)
    : 0;

  return {
    enabled: Boolean(user.mfa_enabled_at && user.mfa_secret_ciphertext),
    enabled_at: user.mfa_enabled_at || null,
    recovery_codes_remaining: recoveryCodesRemaining,
    setup_in_progress: pendingSetup.rowCount > 0,
    setup_expires_at: pendingSetup.rows[0]?.expires_at || null,
  };
};

const beginMfaSetup = async (userId, db = pool) => {
  await ensureMfaSchema();

  const user = await getMfaUserRecord(db, userId);

  if (!user.email_verified_at) {
    throw new AppError('Verify your email before enabling multi-factor authentication.', 400);
  }

  if (user.mfa_enabled_at && user.mfa_secret_ciphertext) {
    throw new AppError('Multi-factor authentication is already enabled for this account.', 400);
  }

  const secret = base32Encode(crypto.randomBytes(20));
  const expiresAt = getTotpSetupExpiry();

  await db.query(
    `
      INSERT INTO mfa_pending_setups (
        user_id,
        secret_ciphertext,
        expires_at,
        created_at
      )
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id)
      DO UPDATE
      SET
        secret_ciphertext = EXCLUDED.secret_ciphertext,
        expires_at = EXCLUDED.expires_at,
        created_at = NOW()
    `,
    [userId, encryptSecret(secret), expiresAt]
  );

  return {
    expires_at: expiresAt.toISOString(),
    manual_key: formatManualKey(secret),
    otpauth_url: buildOtpAuthUrl({
      email: user.email,
      secret,
    }),
  };
};

const storeRecoveryCodes = async (db, userId, backupCodes) => {
  await db.query('DELETE FROM mfa_recovery_codes WHERE user_id = $1', [userId]);

  for (const backupCode of backupCodes) {
    await db.query(
      `
        INSERT INTO mfa_recovery_codes (
          user_id,
          code_hash
        )
        VALUES ($1, $2)
      `,
      [userId, hashValue(normalizeBackupCode(backupCode))]
    );
  }
};

const verifyUserMfaCode = async ({
  allowBackupCodes = true,
  code,
  db,
  secretCiphertext,
  userId,
}) => {
  if (!secretCiphertext) {
    throw new AppError('Multi-factor authentication is not enabled for this account.', 400);
  }

  const secretBuffer = base32Decode(decryptSecret(secretCiphertext));

  if (isValidTotp(secretBuffer, code)) {
    return {
      method: 'totp',
      recovery_codes_remaining: await countRemainingRecoveryCodes(db, userId),
    };
  }

  if (!allowBackupCodes) {
    throw new AppError('Enter a valid authenticator code to continue.', 400);
  }

  const normalizedBackupCode = normalizeBackupCode(code);

  if (!normalizedBackupCode) {
    throw new AppError('Enter a valid authenticator or backup code to continue.', 400);
  }

  const result = await db.query(
    `
      UPDATE mfa_recovery_codes
      SET used_at = NOW()
      WHERE
        user_id = $1
        AND code_hash = $2
        AND used_at IS NULL
      RETURNING id
    `,
    [userId, hashValue(normalizedBackupCode)]
  );

  if (result.rowCount === 0) {
    throw new AppError('Enter a valid authenticator or backup code to continue.', 400);
  }

  return {
    method: 'backup_code',
    recovery_codes_remaining: await countRemainingRecoveryCodes(db, userId),
  };
};

const confirmMfaSetup = async (userId, { code }) => {
  await ensureMfaSchema();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const user = await getMfaUserRecord(client, userId, { forUpdate: true });
    const pendingSetup = await client.query(
      `
        SELECT secret_ciphertext, expires_at
        FROM mfa_pending_setups
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId]
    );

    if (pendingSetup.rowCount === 0 || new Date(pendingSetup.rows[0].expires_at).getTime() <= Date.now()) {
      throw new AppError('Start a fresh MFA setup before confirming the code.', 400);
    }

    await verifyUserMfaCode({
      allowBackupCodes: false,
      code,
      db: client,
      secretCiphertext: pendingSetup.rows[0].secret_ciphertext,
      userId,
    });

    const backupCodes = generateBackupCodes();

    await client.query(
      `
        UPDATE users
        SET
          mfa_secret_ciphertext = $2,
          mfa_enabled_at = NOW()
        WHERE id = $1
      `,
      [userId, pendingSetup.rows[0].secret_ciphertext]
    );

    await client.query('DELETE FROM mfa_pending_setups WHERE user_id = $1', [userId]);
    await storeRecoveryCodes(client, userId, backupCodes);
    await client.query(
      `
        UPDATE mfa_challenges
        SET consumed_at = COALESCE(consumed_at, NOW())
        WHERE user_id = $1 AND consumed_at IS NULL
      `,
      [userId]
    );

    await client.query('COMMIT');

    return {
      backup_codes: backupCodes,
      enabled_at: user.mfa_enabled_at || new Date().toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const createMfaChallenge = async ({ metadata = {}, userId }, db = pool) => {
  await ensureMfaSchema();

  const challengeToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = getChallengeExpiry();

  await db.query(
    `
      UPDATE mfa_challenges
      SET consumed_at = COALESCE(consumed_at, NOW())
      WHERE user_id = $1 AND consumed_at IS NULL
    `,
    [userId]
  );

  await db.query(
    `
      INSERT INTO mfa_challenges (
        user_id,
        challenge_hash,
        requested_ip,
        user_agent,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      userId,
      hashValue(challengeToken),
      String(metadata.ipAddress || '').slice(0, 255),
      String(metadata.userAgent || '').slice(0, 500),
      expiresAt,
    ]
  );

  return {
    challenge_expires_at: expiresAt.toISOString(),
    challenge_token: challengeToken,
  };
};

const getPublicUser = async (db, userId) => {
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

const completeMfaChallenge = async ({ challengeToken, challenge_token: challengeTokenSnakeCase, code }) => {
  await ensureMfaSchema();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const normalizedChallengeToken = String(challengeToken || challengeTokenSnakeCase || '').trim();

    const challengeResult = await client.query(
      `
        SELECT id, user_id
        FROM mfa_challenges
        WHERE
          challenge_hash = $1
          AND consumed_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE
      `,
      [hashValue(normalizedChallengeToken)]
    );

    if (challengeResult.rowCount === 0) {
      throw new AppError('This MFA challenge is invalid or has expired.', 401);
    }

    const challenge = challengeResult.rows[0];
    const user = await getMfaUserRecord(client, challenge.user_id, { forUpdate: true });

    if (!user.mfa_enabled_at || !user.mfa_secret_ciphertext) {
      throw new AppError('Multi-factor authentication is no longer enabled for this account.', 400);
    }

    const verification = await verifyUserMfaCode({
      allowBackupCodes: true,
      code,
      db: client,
      secretCiphertext: user.mfa_secret_ciphertext,
      userId: user.id,
    });

    await client.query(
      `
        UPDATE mfa_challenges
        SET consumed_at = NOW()
        WHERE id = $1
      `,
      [challenge.id]
    );

    const publicUser = await getPublicUser(client, user.id);

    await client.query('COMMIT');

    return {
      recovery_codes_remaining: verification.recovery_codes_remaining,
      user: publicUser,
      verification_method: verification.method,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const assertCurrentPassword = async (db, userId, currentPassword) => {
  const user = await getMfaUserRecord(db, userId, { forUpdate: true });
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isMatch) {
    throw new AppError('Current password is incorrect.', 401);
  }

  return user;
};

const disableMfa = async (userId, { code, current_password: currentPassword }) => {
  await ensureMfaSchema();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const user = await assertCurrentPassword(client, userId, currentPassword);

    if (!user.mfa_enabled_at || !user.mfa_secret_ciphertext) {
      throw new AppError('Multi-factor authentication is already disabled.', 400);
    }

    const verification = await verifyUserMfaCode({
      allowBackupCodes: true,
      code,
      db: client,
      secretCiphertext: user.mfa_secret_ciphertext,
      userId,
    });

    await client.query(
      `
        UPDATE users
        SET
          mfa_enabled_at = NULL,
          mfa_secret_ciphertext = NULL
        WHERE id = $1
      `,
      [userId]
    );

    await client.query('DELETE FROM mfa_pending_setups WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM mfa_recovery_codes WHERE user_id = $1', [userId]);
    await client.query(
      `
        UPDATE mfa_challenges
        SET consumed_at = COALESCE(consumed_at, NOW())
        WHERE user_id = $1 AND consumed_at IS NULL
      `,
      [userId]
    );

    await client.query('COMMIT');

    return {
      recovery_codes_remaining: verification.recovery_codes_remaining,
      verification_method: verification.method,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const regenerateBackupCodes = async (userId, { code, current_password: currentPassword }) => {
  await ensureMfaSchema();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const user = await assertCurrentPassword(client, userId, currentPassword);

    if (!user.mfa_enabled_at || !user.mfa_secret_ciphertext) {
      throw new AppError('Enable multi-factor authentication before rotating backup codes.', 400);
    }

    const verification = await verifyUserMfaCode({
      allowBackupCodes: true,
      code,
      db: client,
      secretCiphertext: user.mfa_secret_ciphertext,
      userId,
    });

    const backupCodes = generateBackupCodes();
    await storeRecoveryCodes(client, userId, backupCodes);
    await client.query('COMMIT');

    return {
      backup_codes: backupCodes,
      verification_method: verification.method,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  beginMfaSetup,
  completeMfaChallenge,
  confirmMfaSetup,
  createMfaChallenge,
  disableMfa,
  ensureMfaSchema,
  getMfaStatus,
  regenerateBackupCodes,
};
