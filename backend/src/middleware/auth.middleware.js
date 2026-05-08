const { setAuthenticatedUser } = require('../services/sentry.service');
const { ACCESS_COOKIE_NAME, parseCookies } = require('../utils/cookies');
const { verifyAccessToken } = require('../utils/jwt');

const getRequestToken = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[ACCESS_COOKIE_NAME] || '';
};

const authenticate = (req, res, next) => {
  const token = getRequestToken(req);

  if (!token) {
    return res.status(401).json({
      message: 'Authentication is required to access this resource.',
      error: 'Authentication is required to access this resource.',
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
    setAuthenticatedUser(req.user);

    return next();
  } catch {
    return res.status(401).json({
      message: 'Your session is invalid or has expired. Please sign in again.',
      error: 'Your session is invalid or has expired. Please sign in again.',
    });
  }
};

module.exports = authenticate;
