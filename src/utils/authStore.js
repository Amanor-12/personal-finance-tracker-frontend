import { apiClient } from './apiClient';
import { sessionStore } from './sessionStore';

const normalizeEmail = (email) => email.trim().toLowerCase();

const resolveSessionPayload = (payload) => {
  const candidates = [payload, payload?.session, payload?.data, payload?.auth, payload?.result];

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
    const user = candidate.user || candidate.profile || candidate.account || null;

    if (token && user) {
      return {
        token,
        user,
      };
    }
  }

  return null;
};

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
      return sessionStore.updateUser(payload.user);
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
      throw new Error('Ledgr could not start a session from the sign-in response.');
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

    return sessionStore.updateUser(payload.user);
  },
  async updatePassword({ currentPassword, newPassword }) {
    return apiClient.put('/api/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
