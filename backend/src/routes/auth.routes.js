const express = require('express');

const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const { createRateLimit } = require('../middleware/rate-limit.middleware');
const validate = require('../middleware/validate.middleware');
const {
  hasLengthBetween,
  isAmountView,
  isBoolean,
  isCurrencyCode,
  isEmail,
  isPositiveInteger,
  isWeekStart,
} = require('../utils/validators');

const router = express.Router();
const authRateLimit = createRateLimit({ keyPrefix: 'auth' });
const hydrateNameField = (req, _res, next) => {
  if (!req.body?.name && req.body?.fullName) {
    req.body.name = req.body.fullName;
  }

  next();
};

router.post(
  '/register',
  authRateLimit,
  hydrateNameField,
  validate({
    body: [
      {
        field: 'name',
        message: 'Name must be between 2 and 120 characters.',
        validate: hasLengthBetween(2, 120),
      },
      {
        field: 'email',
        message: 'Enter a valid email address.',
        validate: isEmail,
        sanitize: (value) => value.toLowerCase(),
      },
      {
        field: 'password',
        message: 'Password must be between 8 and 72 characters.',
        validate: hasLengthBetween(8, 72),
      },
    ],
  }),
  authController.register
);

router.post(
  '/login',
  authRateLimit,
  validate({
    body: [
      {
        field: 'email',
        message: 'Enter a valid email address.',
        validate: isEmail,
        sanitize: (value) => value.toLowerCase(),
      },
      {
        field: 'password',
        message: 'Password is required.',
        validate: hasLengthBetween(1, 72),
      },
    ],
  }),
  authController.login
);

router.post(
  '/login/mfa',
  authRateLimit,
  validate({
    body: [
      {
        field: 'challenge_token',
        message: 'Challenge token is required.',
        validate: hasLengthBetween(20, 200),
      },
      {
        field: 'code',
        message: 'Authenticator or backup code is required.',
        validate: hasLengthBetween(6, 32),
      },
    ],
  }),
  authController.completeLoginMfa
);

router.post(
  '/password-reset/request',
  authRateLimit,
  validate({
    body: [
      {
        field: 'email',
        message: 'Enter a valid email address.',
        validate: isEmail,
        sanitize: (value) => value.toLowerCase(),
      },
    ],
  }),
  authController.requestPasswordReset
);

router.post(
  '/password-reset/confirm',
  authRateLimit,
  validate({
    body: [
      {
        field: 'token',
        message: 'Reset token is required.',
        validate: hasLengthBetween(20, 200),
      },
      {
        field: 'new_password',
        message: 'New password must be between 8 and 72 characters.',
        validate: hasLengthBetween(8, 72),
      },
    ],
  }),
  authController.confirmPasswordReset
);

router.post(
  '/email-verification/confirm',
  authRateLimit,
  validate({
    body: [
      {
        field: 'token',
        message: 'Verification token is required.',
        validate: hasLengthBetween(20, 200),
      },
    ],
  }),
  authController.confirmEmailVerificationToken
);

router.post('/refresh', authRateLimit, authController.refresh);
router.post('/logout', authController.logout);

router.get('/me', authenticate, authController.getCurrentUser);
router.get('/mfa', authenticate, authController.getCurrentUserMfaStatus);
router.get('/preferences', authenticate, authController.getCurrentUserPreferences);
router.get('/security-events', authenticate, authController.getSecurityEvents);
router.get('/sessions', authenticate, authController.getSessions);
router.post(
  '/email-verification/request',
  authenticate,
  authRateLimit,
  authController.requestCurrentUserEmailVerification
);
router.post('/sessions/revoke-others', authenticate, authController.revokeOtherSessions);
router.post('/mfa/setup', authenticate, authController.beginCurrentUserMfaSetup);
router.post(
  '/mfa/setup/confirm',
  authenticate,
  validate({
    body: [
      {
        field: 'code',
        message: 'Authenticator code is required.',
        validate: hasLengthBetween(6, 12),
      },
    ],
  }),
  authController.confirmCurrentUserMfaSetup
);
router.post(
  '/mfa/backup-codes/regenerate',
  authenticate,
  validate({
    body: [
      {
        field: 'current_password',
        message: 'Current password is required.',
        validate: hasLengthBetween(1, 72),
      },
      {
        field: 'code',
        message: 'Authenticator or backup code is required.',
        validate: hasLengthBetween(6, 32),
      },
    ],
  }),
  authController.regenerateCurrentUserMfaBackupCodes
);
router.post(
  '/mfa/disable',
  authenticate,
  validate({
    body: [
      {
        field: 'current_password',
        message: 'Current password is required.',
        validate: hasLengthBetween(1, 72),
      },
      {
        field: 'code',
        message: 'Authenticator or backup code is required.',
        validate: hasLengthBetween(6, 32),
      },
    ],
  }),
  authController.disableCurrentUserMfa
);
router.delete(
  '/sessions/:id',
  authenticate,
  validate({
    params: [
      {
        field: 'id',
        message: 'Session id must be a positive integer.',
        validate: isPositiveInteger,
      },
    ],
  }),
  authController.revokeSessionById
);

router.put(
  '/me',
  authenticate,
  hydrateNameField,
  validate({
    body: [
      {
        field: 'name',
        message: 'Name must be between 2 and 120 characters.',
        validate: hasLengthBetween(2, 120),
      },
      {
        field: 'email',
        message: 'Enter a valid email address.',
        validate: isEmail,
        sanitize: (value) => value.toLowerCase(),
      },
    ],
  }),
  authController.updateCurrentUser
);

router.delete(
  '/me',
  authenticate,
  validate({
    body: [
      {
        field: 'current_password',
        message: 'Current password is required.',
        validate: hasLengthBetween(1, 72),
      },
    ],
  }),
  authController.deleteCurrentUser
);

router.put(
  '/preferences',
  authenticate,
  validate({
    body: [
      {
        field: 'workspaceName',
        message: 'Workspace name must be between 2 and 80 characters.',
        optional: true,
        validate: hasLengthBetween(2, 80),
      },
      {
        field: 'currency',
        message: 'Currency must be a three-letter code.',
        optional: true,
        validate: isCurrencyCode,
      },
      {
        field: 'weekStart',
        message: 'Week start must be Monday or Sunday.',
        optional: true,
        validate: isWeekStart,
      },
      {
        field: 'amountView',
        message: 'Amount view must be Compact or Detailed.',
        optional: true,
        validate: isAmountView,
      },
      {
        field: 'paymentReminders',
        message: 'Payment reminder preference must be true or false.',
        optional: true,
        validate: isBoolean,
      },
      {
        field: 'weeklySummary',
        message: 'Weekly summary preference must be true or false.',
        optional: true,
        validate: isBoolean,
      },
      {
        field: 'loginAlerts',
        message: 'Login alert preference must be true or false.',
        optional: true,
        validate: isBoolean,
      },
      {
        field: 'onboardingCompleted',
        message: 'Onboarding preference must be true or false.',
        optional: true,
        validate: isBoolean,
      },
    ],
  }),
  authController.updateCurrentUserPreferences
);

router.put(
  '/password',
  authenticate,
  validate({
    body: [
      {
        field: 'current_password',
        message: 'Current password is required.',
        validate: hasLengthBetween(1, 72),
      },
      {
        field: 'new_password',
        message: 'New password must be between 8 and 72 characters.',
        validate: hasLengthBetween(8, 72),
      },
    ],
  }),
  authController.updatePassword
);

module.exports = router;
