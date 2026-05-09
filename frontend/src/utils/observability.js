import { apiContracts } from './apiContracts';
import { captureSentryException } from './sentry';

const API_BASE_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const FRONTEND_ERROR_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}${apiContracts.observability.frontendErrorReport.path}`
  : apiContracts.observability.frontendErrorReport.path;
const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || 'dev');

let handlersInstalled = false;

const resolveMessage = (errorLike) => {
  if (!errorLike) {
    return 'Unknown frontend error';
  }

  if (typeof errorLike === 'string') {
    return errorLike;
  }

  return errorLike.message || 'Unknown frontend error';
};

const resolveStack = (errorLike) => {
  if (!errorLike || typeof errorLike === 'string') {
    return '';
  }

  return errorLike.stack || '';
};

export const captureFrontendError = async (
  errorLike,
  { componentName = 'unknown', metadata = {}, routePath = '', severity = 'error' } = {}
) => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    component_name: componentName,
    message: resolveMessage(errorLike),
    metadata: {
      appVersion: APP_VERSION,
      ...metadata,
    },
    route_path: routePath || window.location.pathname || '',
    severity,
    stack_trace: resolveStack(errorLike),
  };

  captureSentryException(errorLike, {
    componentName,
    metadata: payload.metadata,
    routePath: payload.route_path,
    severity,
  });

  try {
    await fetch(FRONTEND_ERROR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    // Logging must not create another user-facing failure path.
  }
};

export const installGlobalErrorHandlers = () => {
  if (handlersInstalled || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', (event) => {
    captureFrontendError(event.error || event.message, {
      componentName: 'window.error',
      metadata: {
        columnNumber: event.colno || 0,
        fileName: event.filename || '',
        lineNumber: event.lineno || 0,
      },
      routePath: window.location.pathname,
      severity: 'fatal',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureFrontendError(event.reason, {
      componentName: 'window.unhandledrejection',
      routePath: window.location.pathname,
      severity: 'fatal',
    });
  });

  handlersInstalled = true;
};
