import { apiClient } from './apiClient';
import { sessionStore } from './sessionStore';

const normalizeEmail = (email) => email.trim().toLowerCase();

const resolveTokenPayload = (payload) => {
  const candidates = [
    payload,
    payload?.session,
    payload?.data,
    payload?.data?.session,
    payload?.auth,
    payload?.auth?.session,
    payload?.result,
    payload?.result?.session,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const token =
      candidate.token ||
      candidate.accessToken ||
      candidate.access_token ||
      candidate.jwt ||
      '';

    if (token) {
      return token;
    }
  }

  return '';
};

const resolveSessionPayload = (payload) => {
  const token = resolveTokenPayload(payload);
  const user = resolveUserPayload(payload);

  return token && user
    ? {
        token,
        user,
      }
    : null;
};

const resolveUserPayload = (payload) =>
  payload?.user ||
  payload?.profile ||
  payload?.account ||
  payload?.session?.user ||
  payload?.session?.profile ||
  payload?.session?.account ||
  payload?.data?.user ||
  payload?.data?.profile ||
  payload?.data?.account ||
  payload?.data?.session?.user ||
  payload?.data?.session?.profile ||
  payload?.data?.session?.account ||
  payload?.auth?.user ||
  payload?.auth?.profile ||
  payload?.auth?.account ||
  payload?.auth?.session?.user ||
  payload?.auth?.session?.profile ||
  payload?.auth?.session?.account ||
  payload?.result?.user ||
  payload?.result?.profile ||
  payload?.result?.account ||
  payload?.result?.session?.user ||
  payload?.result?.session?.profile ||
  payload?.result?.session?.account ||
  null;

export const authStore = {
  getSession() {
    return sessionStore.getSession()?.user || null;
  },
  hasToken() {
    return sessionStore.hasToken();
  },
  async fetchCurrentUser() {
    if (!sessionStore.hasToken()) {
      return null;
    }

    try {
      const payload = await apiClient.get('/api/auth/me');
      const user = resolveUserPayload(payload);

      if (!user) {
        sessionStore.clearSession();
        throw new Error('Rivo could not read the current account session.');
      }

      return sessionStore.updateUser(user);
    } catch (error) {
      if (error.status === 401) {
        sessionStore.clearSession();
        return null;
      }

      throw error;
    }
  },
  async login({ email, password }) {
    const payload = await apiClient.post(
      '/api/auth/login',
      {
        email: normalizeEmail(email),
        password,
      },
      {
        auth: false,
      }
    );

    const session = resolveSessionPayload(payload);

    if (!session) {
      throw new Error('Rivo could not start a session from the sign-in response.');
    }

    return sessionStore.setSession(session);
  },
  async logout() {
    try {
      if (sessionStore.hasToken()) {
        await apiClient.post('/api/auth/logout', {});
      }
    } catch {
      // Logout is client-side for JWT flows; backend failure should not keep the session alive.
    } finally {
      sessionStore.clearSession();
    }
  },
  async signup({ fullName, email, password }) {
    const payload = await apiClient.post(
      '/api/auth/register',
      {
        name: fullName.trim(),
        email: normalizeEmail(email),
        password,
      },
      {
        auth: false,
      }
    );

    const session = resolveSessionPayload(payload);

    if (session) {
      return sessionStore.setSession(session);
    }

    return this.login({
      email,
      password,
    });
  },
  async updateProfile(userId, { fullName, email }) {
    const payload = await apiClient.put(`/api/auth/me`, {
      name: fullName.trim(),
      email: normalizeEmail(email),
    });

    const user = resolveUserPayload(payload);

    if (!user) {
      throw new Error('Rivo could not refresh the profile after saving.');
    }

    return sessionStore.updateUser(user);
  },
  async updatePassword({ currentPassword, newPassword }) {
    return apiClient.put('/api/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
