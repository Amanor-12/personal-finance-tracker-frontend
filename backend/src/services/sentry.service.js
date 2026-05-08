const Sentry = require('@sentry/node');

const {
  sentryDsn,
  sentryEnvironment,
  sentryRelease,
  sentryTracesSampleRate,
} = require('../config/env');

let sentryInitialized = false;

const isSentryEnabled = () => Boolean(String(sentryDsn || '').trim());

const initializeSentry = () => {
  if (!isSentryEnabled() || sentryInitialized) {
    return false;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
    release: sentryRelease,
    sendDefaultPii: false,
    tracesSampleRate: sentryTracesSampleRate,
  });

  sentryInitialized = true;
  return true;
};

const setupExpressErrorHandler = (app) => {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.setupExpressErrorHandler(app);
};

const setRequestContext = ({ method = '', path = '', requestId = '' } = {}) => {
  if (!isSentryEnabled()) {
    return;
  }

  if (requestId) {
    Sentry.setTag('request_id', requestId);
  }

  if (method) {
    Sentry.setTag('http_method', method);
  }

  if (path) {
    Sentry.setContext('request', {
      path,
    });
  }
};

const setAuthenticatedUser = (user) => {
  if (!isSentryEnabled()) {
    return;
  }

  if (!user?.id) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    email: user.email || undefined,
    id: String(user.id),
    username: user.name || undefined,
  });
};

const captureServerException = (error, context = {}) => {
  if (!isSentryEnabled()) {
    return null;
  }

  return Sentry.withScope((scope) => {
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          scope.setTag(key, String(value));
        }
      });
    }

    if (context.extra) {
      scope.setExtras(context.extra);
    }

    if (context.user) {
      scope.setUser({
        email: context.user.email || undefined,
        id: context.user.id ? String(context.user.id) : undefined,
        username: context.user.name || undefined,
      });
    }

    return Sentry.captureException(error);
  });
};

const flushSentry = async (timeoutMs = 2_000) => {
  if (!isSentryEnabled()) {
    return false;
  }

  return Sentry.flush(timeoutMs);
};

module.exports = {
  captureServerException,
  flushSentry,
  initializeSentry,
  isSentryEnabled,
  setAuthenticatedUser,
  setRequestContext,
  setupExpressErrorHandler,
};
