const API_BASE_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || 'dev');
const SENTRY_DSN = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
const SENTRY_ENVIRONMENT = String(
  import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development'
).trim();
const SENTRY_RELEASE = String(import.meta.env.VITE_SENTRY_RELEASE || APP_VERSION).trim();
const SENTRY_TRACES_SAMPLE_RATE = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0);

let sentryInitialized = false;
let sentryModulePromise = null;
let sentryBootstrapScheduled = false;
let pendingSentryUser = null;

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

const buildSentryUser = (user) => {
  if (!user?.id) {
    return null;
  }

  return {
    email: user.email || undefined,
    id: String(user.id),
    username: user.fullName || user.name || undefined,
  };
};

const applySentryUser = (Sentry, user) => {
  if (!Sentry) {
    return;
  }

  if (!user?.id) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser(user);
};

export const isSentryEnabled = () => Boolean(SENTRY_DSN);

const loadSentryModule = async () => {
  if (!isSentryEnabled()) {
    return null;
  }

  if (!sentryModulePromise) {
    sentryModulePromise = import('@sentry/react').catch((error) => {
      sentryModulePromise = null;
      throw error;
    });
  }

  return sentryModulePromise;
};

export const initializeSentry = async () => {
  if (!isSentryEnabled() || sentryInitialized) {
    return false;
  }

  const Sentry = await loadSentryModule();

  if (!Sentry) {
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
  applySentryUser(Sentry, pendingSentryUser);
  return true;
};

export const scheduleSentryInitialization = ({ timeoutMs = 2400 } = {}) => {
  if (!isSentryEnabled() || sentryInitialized || sentryBootstrapScheduled || typeof window === 'undefined') {
    return;
  }

  sentryBootstrapScheduled = true;

  const runInitialization = () => {
    void initializeSentry().catch(() => {
      sentryBootstrapScheduled = false;
    });
  };

  const queueIdleInitialization = () => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(runInitialization, {
        timeout: timeoutMs,
      });
      return;
    }

    window.setTimeout(runInitialization, Math.min(timeoutMs, 1200));
  };

  if (document.readyState === 'complete') {
    queueIdleInitialization();
    return;
  }

  window.addEventListener(
    'load',
    () => {
      queueIdleInitialization();
    },
    { once: true }
  );
};

export const captureSentryException = async (errorLike, context = {}) => {
  if (!isSentryEnabled()) {
    return null;
  }

  await initializeSentry().catch(() => false);
  const Sentry = await loadSentryModule().catch(() => null);

  if (!Sentry) {
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

export const setSentryUser = async (user) => {
  if (!isSentryEnabled()) {
    return;
  }

  pendingSentryUser = buildSentryUser(user);

  if (!sentryInitialized) {
    return;
  }

  const Sentry = await loadSentryModule().catch(() => null);

  if (!Sentry) {
    return;
  }

  applySentryUser(Sentry, pendingSentryUser);
};
