import { sessionStore } from './sessionStore';

const API_OFFLINE_MESSAGE = 'Rivo cannot reach the finance service. Start the backend server, then try again.';
const API_BASE_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_TIMEOUT_MS = 15000;
export const API_UNAUTHORIZED_EVENT = 'ledgr:api-unauthorized';
const REFRESH_PATH = '/api/auth/refresh';

let refreshRequestPromise = null;

const looksLikeHtml = (value) =>
  typeof value === 'string' &&
  (value.includes('<!doctype html') || value.includes('<html') || value.includes('<body'));

const resolveRequestUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
};

const getErrorMessage = (payload) =>
  typeof payload === 'string'
    ? payload.toLowerCase().includes('proxy') ||
      payload.toLowerCase().includes('econnrefused') ||
      looksLikeHtml(payload)
      ? API_OFFLINE_MESSAGE
      : payload || 'Request failed.'
    : payload?.message ||
      payload?.error ||
      payload?.errors?.[0]?.message ||
      'Request failed.';

const resolveRequestId = (payload, responseRequestId = '') =>
  String(
    responseRequestId ||
      payload?.request_id ||
      payload?.requestId ||
      payload?.error?.request_id ||
      payload?.error?.requestId ||
      ''
  ).trim();

const buildError = (status, payload, responseRequestId = '') => {
  const error = new Error(getErrorMessage(payload));
  error.status = status;
  error.payload = payload;
  error.requestId = resolveRequestId(payload, responseRequestId);
  return error;
};

export const getSupportReferenceLabel = (value) => {
  const requestId = resolveRequestId(value?.payload || value, value?.requestId || '');
  return requestId ? `Reference code: ${requestId}` : '';
};

export const appendSupportReference = (message, value) => {
  const normalizedMessage = String(message || '').trim();
  const supportReference = getSupportReferenceLabel(value);

  if (!normalizedMessage) {
    return supportReference;
  }

  if (!supportReference) {
    return normalizedMessage;
  }

  return `${normalizedMessage} ${supportReference}`;
};

const parseResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isAuthRetryablePath = (path) =>
  !path.startsWith('/api/auth/login') &&
  !path.startsWith('/api/auth/logout') &&
  !path.startsWith('/api/auth/register') &&
  !path.startsWith('/api/auth/refresh') &&
  !path.startsWith('/api/health');

const runFetch = async (requestUrl, { body, headers, method }) => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(requestUrl, {
      method,
      headers,
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (error) {
    throw buildError(0, {
      message: API_OFFLINE_MESSAGE,
      cause: error.message,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

const refreshSession = async () => {
  if (!refreshRequestPromise) {
    refreshRequestPromise = (async () => {
      const response = await runFetch(resolveRequestUrl(REFRESH_PATH), {
        body: null,
        headers: {
          Accept: 'application/json',
        },
        method: 'POST',
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw buildError(response.status, payload);
      }

      return payload;
    })().finally(() => {
      refreshRequestPromise = null;
    });
  }

  return refreshRequestPromise;
};

const request = async (
  path,
  {
    method = 'GET',
    body,
    headers = {},
    auth = true,
    retryOnAuthFailure = true,
    notFoundMessage = '',
  } = {}
) => {
  const token = sessionStore.getToken();
  const nextHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined && body !== null) {
    nextHeaders['Content-Type'] = 'application/json';
  }

  if (auth && token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }

  const requestUrl = resolveRequestUrl(path);
  const response = await runFetch(requestUrl, {
    body,
    headers: nextHeaders,
    method,
  });

  const payload = await parseResponse(response);
  const requestId = response.headers.get('x-request-id') || '';

  if (path.startsWith('/api') && looksLikeHtml(payload)) {
    throw buildError(
      response.status || 0,
      {
        message: API_OFFLINE_MESSAGE,
      },
      requestId
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      if (auth && retryOnAuthFailure && isAuthRetryablePath(path)) {
        try {
          await refreshSession();
          return request(path, {
            auth,
            body,
            headers,
            method,
            retryOnAuthFailure: false,
          });
        } catch {
          // Fall through to the global unauthorized handler.
        }
      }

      globalThis.dispatchEvent?.(
        new CustomEvent(API_UNAUTHORIZED_EVENT, {
          detail: {
            path,
          },
        })
      );
    }

    if (response.status === 404 && path.startsWith('/api')) {
      throw buildError(
        response.status,
        {
          ...(payload && typeof payload === 'object' ? payload : {}),
          message: notFoundMessage || API_OFFLINE_MESSAGE,
        },
        requestId
      );
    }

    throw buildError(response.status, payload, requestId);
  }

  return payload;
};

export const apiClient = {
  delete(path, options) {
    return request(path, {
      ...options,
      method: 'DELETE',
    });
  },
  get(path, options) {
    return request(path, {
      ...options,
      method: 'GET',
    });
  },
  post(path, body, options) {
    return request(path, {
      ...options,
      method: 'POST',
      body,
    });
  },
  patch(path, body, options) {
    return request(path, {
      ...options,
      method: 'PATCH',
      body,
    });
  },
  put(path, body, options) {
    return request(path, {
      ...options,
      method: 'PUT',
      body,
    });
  },
  request,
};
