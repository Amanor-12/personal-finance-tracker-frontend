import { sessionStore } from './sessionStore';

const API_OFFLINE_MESSAGE = 'Ledgr cannot reach the finance service. Start the backend server, then try again.';
const API_BASE_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

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

const buildError = (status, payload) => {
  const error = new Error(getErrorMessage(payload));
  error.status = status;
  error.payload = payload;
  return error;
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

const request = async (path, { method = 'GET', body, headers = {}, auth = true } = {}) => {
  const token = sessionStore.getToken();
  const nextHeaders = {
    ...headers,
  };

  if (body !== undefined && body !== null) {
    nextHeaders['Content-Type'] = 'application/json';
  }

  if (auth && token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    const requestUrl = resolveRequestUrl(path);

    response = await fetch(requestUrl, {
      method,
      headers: nextHeaders,
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw buildError(0, {
      message: API_OFFLINE_MESSAGE,
      cause: error.message,
    });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 404 && path.startsWith('/api')) {
      throw buildError(response.status, {
        message: API_OFFLINE_MESSAGE,
      });
    }

    throw buildError(response.status, payload);
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
