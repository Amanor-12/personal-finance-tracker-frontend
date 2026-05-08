const express = require('express');

const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { hasLengthBetween, isEmail } = require('../utils/validators');

const router = express.Router();
const hydrateNameField = (req, _res, next) => {
  if (!req.body?.name && req.body?.fullName) {
    req.body.name = req.body.fullName;
  }

  next();
};

router.post(
  '/',
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
  '/register',
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

router.get('/me', authenticate, authController.getCurrentUser);
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
router.get('/', authenticate, authController.listUsers);

module.exports = router;
