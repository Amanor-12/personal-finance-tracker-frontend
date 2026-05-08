const {
  accessTokenTtlMinutes,
  cookieDomain,
  isProduction,
  refreshTokenTtlDays,
} = require('../config/env');

const ACCESS_COOKIE_NAME = 'ledgr_access';
const REFRESH_COOKIE_NAME = 'ledgr_refresh';

const parseCookies = (cookieHeader = '') => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, item) => {
      const [name, ...valueParts] = item.split('=');

      if (!name) {
        return cookies;
      }

      cookies[name] = decodeURIComponent(valueParts.join('='));
      return cookies;
    }, {});
};

const serializeCookie = (name, value, { httpOnly = true, maxAgeSeconds = 0, path = '/' } = {}) => {
  const sameSitePolicy = isProduction ? 'None' : 'Lax';
  const directives = [
    `${name}=${encodeURIComponent(value || '')}`,
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    `Path=${path}`,
    `SameSite=${sameSitePolicy}`,
  ];

  if (httpOnly) {
    directives.push('HttpOnly');
  }

  if (cookieDomain) {
    directives.push(`Domain=${cookieDomain}`);
  }

  if (isProduction) {
    directives.push('Secure');
  }

  return directives.join('; ');
};

const createAccessCookie = (accessToken) =>
  serializeCookie(ACCESS_COOKIE_NAME, accessToken, {
    maxAgeSeconds: accessTokenTtlMinutes * 60,
    path: '/',
  });

const createRefreshCookie = (refreshToken) =>
  serializeCookie(REFRESH_COOKIE_NAME, refreshToken, {
    maxAgeSeconds: refreshTokenTtlDays * 24 * 60 * 60,
    path: '/api/auth',
  });

const createAuthCookies = ({ accessToken, refreshToken }) => [
  createAccessCookie(accessToken),
  createRefreshCookie(refreshToken),
];

const clearAuthCookies = () => [
  serializeCookie(ACCESS_COOKIE_NAME, '', {
    maxAgeSeconds: 0,
    path: '/',
  }),
  serializeCookie(REFRESH_COOKIE_NAME, '', {
    maxAgeSeconds: 0,
    path: '/api/auth',
  }),
];

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  createAccessCookie,
  createAuthCookies,
  parseCookies,
};
