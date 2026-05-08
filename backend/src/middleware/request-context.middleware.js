const crypto = require('crypto');

const { logger } = require('../services/logger.service');
const { setRequestContext } = require('../services/sentry.service');

const normalizeRequestId = (value) => {
  const requestId = String(value || '').trim();

  if (!requestId || requestId.length > 120) {
    return crypto.randomUUID();
  }

  return requestId;
};

const attachRequestContext = (req, res, next) => {
  const requestId = normalizeRequestId(req.headers['x-request-id']);
  const startedAt = Date.now();

  req.requestId = requestId;
  req.logger = logger.child({
    requestId,
  });
  res.setHeader('X-Request-Id', requestId);
  setRequestContext({
    method: req.method,
    path: req.originalUrl || req.url,
    requestId,
  });

  res.on('finish', () => {
    req.logger.info('HTTP request completed.', {
      durationMs: Date.now() - startedAt,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      userId: req.user?.id || null,
    });
  });

  next();
};

module.exports = {
  attachRequestContext,
};
