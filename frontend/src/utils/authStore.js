import { apiClient } from './apiClient';
import { apiContracts } from './apiContracts';
import { sessionStore } from './sessionStore';

const normalizeEmail = (email) => email.trim().toLowerCase();

const resolveAuthToken = (payload) =>
  payload?.token ||
  payload?.accessToken ||
  payload?.access_token ||
  payload?.session?.token ||
  payload?.session?.accessToken ||
  payload?.session?.access_token ||
  payload?.data?.token ||
  payload?.data?.accessToken ||
  payload?.data?.access_token ||
  payload?.data?.session?.token ||
  payload?.data?.session?.accessToken ||
  payload?.data?.session?.access_token ||
  payload?.auth?.token ||
  payload?.auth?.accessToken ||
  payload?.auth?.access_token ||
  payload?.result?.token ||
  payload?.result?.accessToken ||
  payload?.result?.access_token ||
  '';

const looksLikeUserRecord = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value.id || value.email) &&
      (value.fullName || value.name || value.email)
  );

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
  (looksLikeUserRecord(payload) ? payload : null) ||
  null;

const normalizeSession = (session) => ({
  createdAt: session.createdAt || session.created_at || null,
  expiresAt: session.expiresAt || session.expires_at || null,
  id: Number(session.id) || 0,
  ipAddress: session.ipAddress || session.ip_address || '',
  isCurrent: Boolean(session.isCurrent ?? session.is_current),
  lastUsedAt: session.lastUsedAt || session.last_used_at || null,
  userAgent: session.userAgent || session.user_agent || '',
});

const normalizeSecurityEvent = (event) => ({
  createdAt: event.createdAt || event.created_at || null,
  description: event.description || '',
  eventType: event.eventType || event.event_type || '',
  id: Number(event.id) || 0,
  ipAddress: event.ipAddress || event.ip_address || '',
  title: event.title || 'Security activity',
  userAgent: event.userAgent || event.user_agent || '',
});

const normalizeMfaStatus = (status) => ({
  enabled: Boolean(status?.enabled),
  enabledAt: status?.enabledAt || status?.enabled_at || null,
  recoveryCodesRemaining:
    Number(status?.recoveryCodesRemaining ?? status?.recovery_codes_remaining) || 0,
  setupExpiresAt: status?.setupExpiresAt || status?.setup_expires_at || null,
  setupInProgress: Boolean(status?.setupInProgress ?? status?.setup_in_progress),
});

const persistSessionFromPayload = (payload, fallbackToken = '') => {
  const user = resolveUserPayload(payload);

  if (!user) {
    return null;
  }

  return sessionStore.setSession(user, resolveAuthToken(payload) || fallbackToken);
};

const hydrateSessionFromServer = async (fallbackToken = '') => {
  const token = typeof fallbackToken === 'string' ? fallbackToken.trim() : '';
  const payload = await apiClient.get('/api/auth/me', {
    auth: false,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    retryOnAuthFailure: false,
  });

  return persistSessionFromPayload(payload, token);
};

export const authStore = {
  getSession() {
    return sessionStore.getSession() || null;
  },
  hasToken() {
    return sessionStore.hasToken();
  },
  async fetchCurrentUser() {
    try {
      const payload = await apiClient.get('/api/auth/me');
      const user = persistSessionFromPayload(payload, sessionStore.getToken());

      if (!user) {
        sessionStore.clearSession();
        throw new Error('Rivo could not read the current account session.');
      }

      return user;
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
      apiContracts.auth.login.path,
      {
        email: normalizeEmail(email),
        password,
      },
      {
        auth: false,
      }
    );

    if (payload?.requires_mfa) {
      return {
        challengeExpiresAt: payload.challengeExpiresAt || payload.challenge_expires_at || null,
        challengeToken: payload.challengeToken || payload.challenge_token || '',
        message: payload.message || 'Multi-factor authentication required.',
        requiresMfa: true,
      };
    }

    const fallbackToken = resolveAuthToken(payload);
    const user =
      persistSessionFromPayload(payload, fallbackToken) ||
      (await hydrateSessionFromServer(fallbackToken).catch(() => null));

    if (!user) {
      throw new Error('Rivo could not start a session from the sign-in response.');
    }

    return user;
  },
  async completeMfaLogin({ challengeToken, code }) {
    const payload = await apiClient.post(
      apiContracts.auth.loginMfa.path,
      {
        challenge_token: String(challengeToken || '').trim(),
        code: String(code || '').trim(),
      },
      {
        auth: false,
      }
    );

    const fallbackToken = resolveAuthToken(payload);
    const user =
      persistSessionFromPayload(payload, fallbackToken) ||
      (await hydrateSessionFromServer(fallbackToken).catch(() => null));

    if (!user) {
      throw new Error('Rivo could not finish sign-in after the MFA challenge.');
    }

    return {
      recoveryCodesRemaining: Number(
        payload?.recoveryCodesRemaining ?? payload?.recovery_codes_remaining
      ) || 0,
      user,
    };
  },
  async logout() {
    try {
      await apiClient.post('/api/auth/logout', {}, { auth: false, retryOnAuthFailure: false });
    } catch {
      // Session cookies should be cleared server-side, but client cleanup still wins if the request fails.
    } finally {
      sessionStore.clearSession();
    }
  },
  async signup({ fullName, email, password }) {
    const payload = await apiClient.post(
      '/api/auth/register',
      {
        fullName: fullName.trim(),
        name: fullName.trim(),
        email: normalizeEmail(email),
        password,
      },
      {
        auth: false,
      }
    );

    const fallbackToken = resolveAuthToken(payload);
    const user =
      persistSessionFromPayload(payload, fallbackToken) ||
      (await hydrateSessionFromServer(fallbackToken).catch(() => null));

    if (user) {
      return user;
    }

    return this.login({
      email,
      password,
    });
  },
  async updateProfile(userId, { fullName, email }) {
    const payload = await apiClient.put(`/api/auth/me`, {
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: normalizeEmail(email),
    });

    const user = persistSessionFromPayload(payload, sessionStore.getToken());

    if (!user) {
      throw new Error('Rivo could not refresh the profile after saving.');
    }

    return {
      emailVerification: payload?.emailVerification || null,
      user,
    };
  },
  async updatePassword({ currentPassword, newPassword }) {
    return apiClient.put('/api/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
  async getSessions() {
    const payload = await apiClient.get('/api/auth/sessions');
    return (payload.sessions || []).map((session) => normalizeSession(session));
  },
  async revokeSession(sessionId) {
    const payload = await apiClient.delete(`/api/auth/sessions/${sessionId}`);

    if (String(payload?.message || '').toLowerCase().includes('current session revoked')) {
      sessionStore.clearSession();
    }

    return payload;
  },
  async revokeOtherSessions() {
    return apiClient.post('/api/auth/sessions/revoke-others', {});
  },
  async getSecurityEvents() {
    const payload = await apiClient.get('/api/auth/security-events');
    return (payload.events || []).map((event) => normalizeSecurityEvent(event));
  },
  async getMfaStatus() {
    const payload = await apiClient.get(apiContracts.auth.mfaStatus.path);
    return normalizeMfaStatus(payload?.status || {});
  },
  async beginMfaSetup() {
    const payload = await apiClient.post(apiContracts.auth.mfaSetup.path, {});
    return {
      expiresAt: payload?.setup?.expiresAt || payload?.setup?.expires_at || null,
      manualKey: payload?.setup?.manualKey || payload?.setup?.manual_key || '',
      otpauthUrl: payload?.setup?.otpauthUrl || payload?.setup?.otpauth_url || '',
    };
  },
  async confirmMfaSetup({ code }) {
    const payload = await apiClient.post(apiContracts.auth.mfaSetupConfirm.path, {
      code: String(code || '').trim(),
    });

    return {
      backupCodes: payload?.backupCodes || payload?.backup_codes || [],
      status: normalizeMfaStatus(payload?.status || {}),
    };
  },
  async disableMfa({ code, currentPassword }) {
    const payload = await apiClient.post(apiContracts.auth.mfaDisable.path, {
      code: String(code || '').trim(),
      current_password: currentPassword,
    });

    return {
      message: payload?.message || 'Multi-factor authentication disabled.',
      status: normalizeMfaStatus(payload?.status || {}),
    };
  },
  async regenerateMfaBackupCodes({ code, currentPassword }) {
    const payload = await apiClient.post(apiContracts.auth.mfaBackupCodesRegenerate.path, {
      code: String(code || '').trim(),
      current_password: currentPassword,
    });

    return {
      backupCodes: payload?.backupCodes || payload?.backup_codes || [],
      status: normalizeMfaStatus(payload?.status || {}),
    };
  },
  async requestEmailVerification() {
    return apiClient.post('/api/auth/email-verification/request', {});
  },
  async confirmEmailVerification({ token }) {
    return apiClient.post(
      '/api/auth/email-verification/confirm',
      {
        token: String(token || '').trim(),
      },
      {
        auth: false,
        notFoundMessage: 'Email verification is not available right now.',
      }
    );
  },
  async deleteAccount({ currentPassword }) {
    const payload = await apiClient.delete('/api/auth/me', {
      body: {
        current_password: currentPassword,
      },
    });
    sessionStore.clearSession();
    return payload;
  },
  async requestPasswordReset({ email }) {
    return apiClient.post(
      '/api/auth/password-reset/request',
      {
        email: normalizeEmail(email),
      },
      {
        auth: false,
        notFoundMessage: 'Password reset is not available right now.',
      }
    );
  },
  async resetPassword({ token, newPassword }) {
    return apiClient.post(
      '/api/auth/password-reset/confirm',
      {
        token: String(token || '').trim(),
        new_password: newPassword,
      },
      {
        auth: false,
        notFoundMessage: 'Password reset is not available right now.',
      }
    );
  },
};
