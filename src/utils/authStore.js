import { apiClient } from './apiClient';
import { sessionStore } from './sessionStore';

const normalizeEmail = (email) => email.trim().toLowerCase();

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

    return sessionStore.setSession(payload);
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

    return sessionStore.setSession(payload);
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
