import { sessionStore } from './sessionStore';

const getErrorMessage = (payload) =>
  payload?.message ||
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

  const response = await fetch(path, {
    method,
    headers: nextHeaders,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
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
  put(path, body, options) {
    return request(path, {
      ...options,
      method: 'PUT',
      body,
    });
  },
  request,
};
