const { rateLimitMaxAttempts, rateLimitWindowMs } = require('../config/env');

const requestBuckets = new Map();

const getRateLimitKey = (keyPrefix, req) => {
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  return `${keyPrefix}:${ipAddress}:${email}`;
};

const pruneExpiredBuckets = (now) => {
  for (const [key, bucket] of requestBuckets.entries()) {
    if (bucket.resetAt <= now) {
      requestBuckets.delete(key);
    }
  }
};

const createRateLimit = ({
  keyPrefix = 'default',
  message = 'Too many requests. Please wait and try again.',
  maxAttempts = rateLimitMaxAttempts,
  windowMs = rateLimitWindowMs,
} = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    pruneExpiredBuckets(now);

    const bucketKey = getRateLimitKey(keyPrefix, req);
    const existingBucket = requestBuckets.get(bucketKey);

    if (!existingBucket || existingBucket.resetAt <= now) {
      requestBuckets.set(bucketKey, {
        count: 1,
        resetAt: now + windowMs,
      });

      return next();
    }

    if (existingBucket.count >= maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existingBucket.resetAt - now) / 1000));

      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message,
        error: message,
      });
    }

    existingBucket.count += 1;
    requestBuckets.set(bucketKey, existingBucket);

    return next();
  };
};

module.exports = {
  createRateLimit,
};
