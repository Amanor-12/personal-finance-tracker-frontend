const getRequiredEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getPositiveNumberEnv = (key, fallback) => {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`Environment variable ${key} must be a positive number.`);
  }

  return parsedValue;
};

const normalizeUrl = (value) => {
  if (!value) {
    return '';
  }

  const parsedUrl = new URL(value);
  return parsedUrl.toString().replace(/\/+$/, '');
};

const normalizeOrigin = (value) => {
  if (!value) {
    return '';
  }

  return new URL(value).origin;
};

const parseAllowedOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

const isProduction = process.env.NODE_ENV === 'production';
const enableSandboxBankProvider =
  process.env.ENABLE_SANDBOX_BANK_PROVIDER === 'true' || !isProduction;
const appBaseUrl = normalizeUrl(process.env.APP_BASE_URL || '');
const parseListEnv = (value, fallback = []) => {
  const normalizedItems = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toUpperCase());

  return normalizedItems.length ? normalizedItems : fallback;
};

const getSampleRateEnv = (key, fallback) => {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 1) {
    throw new Error(`Environment variable ${key} must be a number between 0 and 1.`);
  }

  return parsedValue;
};

const defaultLocalOrigins = isProduction
  ? []
  : ['http://127.0.0.1:4173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://localhost:5173'];

module.exports = {
  accessTokenTtlMinutes: getPositiveNumberEnv('ACCESS_TOKEN_TTL_MINUTES', 15),
  allowedOrigins: [...new Set([...defaultLocalOrigins, ...parseAllowedOrigins(process.env.ALLOWED_ORIGINS), appBaseUrl ? normalizeOrigin(appBaseUrl) : ''].filter(Boolean))],
  appBaseUrl,
  bankTokenEncryptionSecret: process.env.BANK_TOKEN_ENCRYPTION_SECRET || getRequiredEnv('JWT_SECRET'),
  cookieDomain: process.env.COOKIE_DOMAIN || '',
  databaseUrl: getRequiredEnv('DATABASE_URL'),
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS || '',
  emailProvider: (process.env.EMAIL_PROVIDER || '').trim().toLowerCase(),
  emailVerificationTokenTtlHours: getPositiveNumberEnv('EMAIL_VERIFICATION_TOKEN_TTL_HOURS', 48),
  enableSandboxBankProvider,
  isProduction,
  jwtSecret: getRequiredEnv('JWT_SECRET'),
  logLevel: (process.env.LOG_LEVEL || 'info').trim().toLowerCase(),
  mfaChallengeTtlMinutes: getPositiveNumberEnv('MFA_CHALLENGE_TTL_MINUTES', 10),
  mfaEncryptionSecret: process.env.MFA_ENCRYPTION_SECRET || getRequiredEnv('JWT_SECRET'),
  mfaIssuer: process.env.MFA_ISSUER || 'Rivo',
  observabilityAlertWebhookUrl: process.env.OBSERVABILITY_ALERT_WEBHOOK_URL || '',
  passwordResetTokenTtlMinutes: getPositiveNumberEnv('PASSWORD_RESET_TOKEN_TTL_MINUTES', 30),
  plaidClientId: process.env.PLAID_CLIENT_ID || '',
  plaidCountryCodes: parseListEnv(process.env.PLAID_COUNTRY_CODES, ['US']),
  plaidEnv: (process.env.PLAID_ENV || 'sandbox').trim().toLowerCase(),
  plaidRedirectUri: process.env.PLAID_REDIRECT_URI || '',
  plaidSecret: process.env.PLAID_SECRET || '',
  plaidWebhookUrl: process.env.PLAID_WEBHOOK_URL || '',
  port: Number(process.env.PORT) || 5000,
  rateLimitMaxAttempts: getPositiveNumberEnv('RATE_LIMIT_MAX_ATTEMPTS', 10),
  rateLimitWindowMs: getPositiveNumberEnv('RATE_LIMIT_WINDOW_MS', 600000),
  refreshTokenTtlDays: getPositiveNumberEnv('REFRESH_TOKEN_TTL_DAYS', 30),
  resendApiKey: process.env.RESEND_API_KEY || '',
  sentryDsn: process.env.SENTRY_DSN || '',
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT || (isProduction ? 'production' : 'development'),
  sentryRelease: process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || '',
  sentryTracesSampleRate: getSampleRateEnv('SENTRY_TRACES_SAMPLE_RATE', isProduction ? 0.1 : 1),
};
