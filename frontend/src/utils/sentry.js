import * as Sentry from '@sentry/react';

const API_BASE_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || 'dev');
const SENTRY_DSN = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
const SENTRY_ENVIRONMENT = String(
  import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development'
).trim();
const SENTRY_RELEASE = String(import.meta.env.VITE_SENTRY_RELEASE || APP_VERSION).trim();
const SENTRY_TRACES_SAMPLE_RATE = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0);

let sentryInitialized = false;

const traceTargets = [
  /^\//,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?\/api/i,
  /^https?:\/\/localhost(?::\d+)?\/api/i,
];

if (API_BASE_URL) {
  traceTargets.push(API_BASE_URL);
}

const normalizeError = (errorLike) => {
  if (errorLike instanceof Error) {
    return errorLike;
  }

  if (typeof errorLike === 'string') {
    return new Error(errorLike);
  }

  return new Error('Unknown frontend error');
};

export const isSentryEnabled = () => Boolean(SENTRY_DSN);

export const initializeSentry = () => {
  if (!isSentryEnabled() || sentryInitialized) {
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    integrations: [
      Sentry.browserTracingIntegration({
        tracePropagationTargets: traceTargets,
      }),
    ],
    release: SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: Number.isFinite(SENTRY_TRACES_SAMPLE_RATE) ? SENTRY_TRACES_SAMPLE_RATE : 0,
  });

  sentryInitialized = true;
  return true;
};

export const captureSentryException = (errorLike, context = {}) => {
  if (!isSentryEnabled()) {
    return null;
  }

  return Sentry.withScope((scope) => {
    if (context.componentName) {
      scope.setTag('component', context.componentName);
    }

    if (context.routePath) {
      scope.setTag('route', context.routePath);
    }

    if (context.severity) {
      scope.setLevel(context.severity);
    }

    if (context.metadata) {
      scope.setExtras(context.metadata);
    }

    return Sentry.captureException(normalizeError(errorLike));
  });
};

export const setSentryUser = (user) => {
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
    username: user.fullName || user.name || undefined,
  });
};

export const getReactRootOptions = () => {
  if (!isSentryEnabled()) {
    return undefined;
  }

  const handler = Sentry.reactErrorHandler();

  return {
    onCaughtError: handler,
    onRecoverableError: handler,
    onUncaughtError: handler,
  };
};
