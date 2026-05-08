const authService = require('../services/auth.service');
const {
  confirmEmailVerification,
  requestEmailVerification,
} = require('../services/email-verification.service');
const {
  beginMfaSetup,
  completeMfaChallenge,
  confirmMfaSetup,
  createMfaChallenge,
  disableMfa,
  getMfaStatus,
  regenerateBackupCodes,
} = require('../services/mfa.service');
const { listSecurityEvents, logSecurityEvent } = require('../services/security-event.service');
const asyncHandler = require('../utils/asyncHandler');
const {
  clearAuthCookies,
  createAccessCookie,
  createAuthCookies,
  parseCookies,
  REFRESH_COOKIE_NAME,
} = require('../utils/cookies');
const {
  getSessionUserByRefreshToken,
  issueSession,
  listUserSessions,
  revokeAllUserSessions,
  revokeOtherUserSessions,
  revokeSession,
  revokeUserSessionById,
} = require('../services/auth-session.service');
const { getPreferences, updatePreferences } = require('../services/user-preferences.service');
const { signAccessToken } = require('../utils/jwt');

const getRequestMetadata = (req) => ({
  ipAddress: String(req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || ''),
  userAgent: String(req.headers['user-agent'] || ''),
});

const readRefreshToken = (req) => parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME] || '';

const setAuthCookies = async (res, user, metadata) => {
  const session = await issueSession(user, metadata);
  const accessToken = signAccessToken(user);

  res.setHeader(
    'Set-Cookie',
    createAuthCookies({
      accessToken,
      refreshToken: session.refreshToken,
    })
  );

  return {
    accessToken,
    session,
  };
};

const register = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  const payload = await authService.registerUser(req.body);
  const authSession = await setAuthCookies(res, payload.user, metadata);
  const emailVerification = await requestEmailVerification({
    metadata,
    userId: payload.user.id,
  }).catch(() => null);
  await logSecurityEvent({
    eventType: 'auth.registered',
    metadata,
    userId: payload.user.id,
  });

  res.status(201).json({
    accessToken: authSession.accessToken,
    emailVerification,
    message: 'Account created successfully.',
    token: authSession.accessToken,
    user: payload.user,
  });
});

const login = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  const payload = await authService.loginUser(req.body);

  if (payload.requires_mfa) {
    const challenge = await createMfaChallenge({
      metadata,
      userId: payload.user.id,
    });

    return res.status(202).json({
      challenge_expires_at: challenge.challenge_expires_at,
      challenge_token: challenge.challenge_token,
      message: 'Multi-factor authentication required.',
      requires_mfa: true,
    });
  }

  const authSession = await setAuthCookies(res, payload.user, metadata);
  await logSecurityEvent({
    eventType: 'auth.login',
    metadata,
    userId: payload.user.id,
  });

  res.json({
    accessToken: authSession.accessToken,
    message: 'Welcome back.',
    token: authSession.accessToken,
    user: payload.user,
  });
});

const completeLoginMfa = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  const result = await completeMfaChallenge(req.body);
  const authSession = await setAuthCookies(res, result.user, metadata);
  await logSecurityEvent({
    detail: {
      method: result.verification_method,
    },
    eventType: 'auth.mfa_challenge_completed',
    metadata,
    userId: result.user.id,
  });
  if (result.verification_method === 'backup_code') {
    await logSecurityEvent({
      eventType: 'auth.mfa_backup_code_used',
      metadata,
      userId: result.user.id,
    });
  }
  await logSecurityEvent({
    eventType: 'auth.login',
    metadata,
    userId: result.user.id,
  });

  res.json({
    accessToken: authSession.accessToken,
    message: 'Two-factor verification completed.',
    recovery_codes_remaining: result.recovery_codes_remaining,
    token: authSession.accessToken,
    user: result.user,
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = readRefreshToken(req);

  await revokeSession(refreshToken).catch(() => null);
  res.setHeader('Set-Cookie', clearAuthCookies());

  res.json({
    message: 'Session cleared successfully.',
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = readRefreshToken(req);
  const payload = await getSessionUserByRefreshToken(refreshToken);

  await revokeSession(refreshToken);
  const authSession = await setAuthCookies(res, payload.user, getRequestMetadata(req));

  res.json({
    accessToken: authSession.accessToken,
    message: 'Session refreshed successfully.',
    token: authSession.accessToken,
    user: payload.user,
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  res.json({
    user,
  });
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  const emailChanged =
    String(req.user.email || '').toLowerCase() !== String(req.body.email || '').toLowerCase();
  const user = await authService.updateCurrentUser(req.user.id, req.body);
  res.setHeader('Set-Cookie', createAccessCookie(signAccessToken(user)));
  await logSecurityEvent({
    detail: emailChanged ? { email: user.email } : {},
    eventType: emailChanged ? 'auth.email_changed' : 'auth.profile_updated',
    metadata,
    userId: req.user.id,
  });
  const emailVerification = emailChanged
    ? await requestEmailVerification({
        metadata,
        userId: req.user.id,
      }).catch(() => null)
    : null;

  res.json({
    emailVerification,
    message: 'Profile updated successfully.',
    user,
  });
});

const updatePassword = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  await authService.updateCurrentUserPassword(req.user.id, req.body);
  await revokeAllUserSessions(req.user.id);
  await setAuthCookies(
    res,
    {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
    },
    metadata
  );
  await logSecurityEvent({
    eventType: 'auth.password_updated',
    metadata,
    userId: req.user.id,
  });

  res.json({
    message: 'Password updated successfully.',
  });
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset({
    email: req.body.email,
    metadata: getRequestMetadata(req),
  });

  res.json(result);
});

const confirmPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.resetPasswordWithToken(req.body);
  await revokeAllUserSessions(result.user.id);
  res.setHeader('Set-Cookie', clearAuthCookies());

  res.json({
    message: 'Password reset successfully.',
  });
});

const getCurrentUserPreferences = asyncHandler(async (req, res) => {
  const preferences = await getPreferences(req.user.id);

  res.json({
    preferences,
  });
});

const getSecurityEvents = asyncHandler(async (req, res) => {
  const events = await listSecurityEvents(req.user.id);

  res.json({
    events,
  });
});

const requestCurrentUserEmailVerification = asyncHandler(async (req, res) => {
  const result = await requestEmailVerification({
    metadata: getRequestMetadata(req),
    userId: req.user.id,
  });

  res.json(result);
});

const confirmEmailVerificationToken = asyncHandler(async (req, res) => {
  const result = await confirmEmailVerification(req.body);

  res.json({
    message: 'Email verified successfully.',
    user: result.user,
  });
});

const getCurrentUserMfaStatus = asyncHandler(async (req, res) => {
  const status = await getMfaStatus(req.user.id);

  res.json({
    status,
  });
});

const beginCurrentUserMfaSetup = asyncHandler(async (req, res) => {
  const setup = await beginMfaSetup(req.user.id);

  res.json({
    message: 'Authenticator setup is ready.',
    setup,
  });
});

const confirmCurrentUserMfaSetup = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  const result = await confirmMfaSetup(req.user.id, req.body);
  const status = await getMfaStatus(req.user.id);
  await logSecurityEvent({
    eventType: 'auth.mfa_enabled',
    metadata,
    userId: req.user.id,
  });

  res.json({
    backup_codes: result.backup_codes,
    message: 'Multi-factor authentication enabled.',
    status,
  });
});

const disableCurrentUserMfa = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  const result = await disableMfa(req.user.id, req.body);
  const status = await getMfaStatus(req.user.id);
  await logSecurityEvent({
    eventType: 'auth.mfa_disabled',
    metadata,
    userId: req.user.id,
  });
  if (result.verification_method === 'backup_code') {
    await logSecurityEvent({
      eventType: 'auth.mfa_backup_code_used',
      metadata,
      userId: req.user.id,
    });
  }

  res.json({
    message: 'Multi-factor authentication disabled.',
    status,
  });
});

const regenerateCurrentUserMfaBackupCodes = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  const result = await regenerateBackupCodes(req.user.id, req.body);
  const status = await getMfaStatus(req.user.id);
  await logSecurityEvent({
    eventType: 'auth.mfa_backup_codes_regenerated',
    metadata,
    userId: req.user.id,
  });
  if (result.verification_method === 'backup_code') {
    await logSecurityEvent({
      eventType: 'auth.mfa_backup_code_used',
      metadata,
      userId: req.user.id,
    });
  }

  res.json({
    backup_codes: result.backup_codes,
    message: 'Backup codes regenerated successfully.',
    status,
  });
});

const getSessions = asyncHandler(async (req, res) => {
  const sessions = await listUserSessions(req.user.id, readRefreshToken(req));

  res.json({
    sessions,
  });
});

const revokeSessionById = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  const revokedSession = await revokeUserSessionById(
    req.user.id,
    Number(req.params.id),
    readRefreshToken(req)
  );
  await logSecurityEvent({
    detail: {
      revokedSessionId: revokedSession.id,
    },
    eventType: 'auth.session_revoked',
    metadata,
    userId: req.user.id,
  });

  if (revokedSession.isCurrent) {
    res.setHeader('Set-Cookie', clearAuthCookies());
  }

  res.json({
    message: revokedSession.isCurrent
      ? 'Current session revoked. Sign in again to continue.'
      : 'Session revoked successfully.',
  });
});

const revokeOtherSessions = asyncHandler(async (req, res) => {
  const metadata = getRequestMetadata(req);
  const result = await revokeOtherUserSessions(req.user.id, readRefreshToken(req));
  await logSecurityEvent({
    detail: {
      count: result.count,
    },
    eventType: 'auth.sessions_revoked_other',
    metadata,
    userId: req.user.id,
  });

  res.json({
    message: result.count
      ? 'Other sessions revoked successfully.'
      : 'No other active sessions were found.',
    revokedCount: result.count,
  });
});

const deleteCurrentUser = asyncHandler(async (req, res) => {
  await authService.deleteCurrentUser(req.user.id, req.body);
  res.setHeader('Set-Cookie', clearAuthCookies());

  res.json({
    message: 'Account deleted successfully.',
  });
});

const updateCurrentUserPreferences = asyncHandler(async (req, res) => {
  const preferences = await updatePreferences(req.user.id, req.body);

  res.json({
    message: 'Preferences updated successfully.',
    preferences,
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await authService.listUsers(req.user.id);

  res.json(users);
});

module.exports = {
  beginCurrentUserMfaSetup,
  completeLoginMfa,
  confirmEmailVerificationToken,
  confirmCurrentUserMfaSetup,
  confirmPasswordReset,
  deleteCurrentUser,
  disableCurrentUserMfa,
  getCurrentUser,
  getCurrentUserMfaStatus,
  getCurrentUserPreferences,
  getSecurityEvents,
  getSessions,
  listUsers,
  login,
  logout,
  refresh,
  regenerateCurrentUserMfaBackupCodes,
  register,
  requestCurrentUserEmailVerification,
  revokeOtherSessions,
  revokeSessionById,
  requestPasswordReset,
  updateCurrentUser,
  updateCurrentUserPreferences,
  updatePassword,
};
