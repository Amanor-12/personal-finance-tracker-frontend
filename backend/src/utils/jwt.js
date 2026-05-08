const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { accessTokenTtlMinutes, jwtSecret } = require('../config/env');

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    jwtSecret,
    {
      expiresIn: `${accessTokenTtlMinutes}m`,
    }
  );

const verifyAccessToken = (token) => jwt.verify(token, jwtSecret);

const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url');

const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex');

module.exports = {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
};
