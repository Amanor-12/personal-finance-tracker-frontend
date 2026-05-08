const { logLevel } = require('../config/env');

const LEVEL_ORDER = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const normalizeLevel = (level) =>
  LEVEL_ORDER[level] ? level : 'info';

const shouldLog = (level) =>
  LEVEL_ORDER[normalizeLevel(level)] >= LEVEL_ORDER[normalizeLevel(logLevel)];

const serializeError = (error) => {
  if (!error) {
    return null;
  }

  return {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
    stack: error.stack || '',
    ...(error.code ? { code: error.code } : {}),
    ...(error.constraint ? { constraint: error.constraint } : {}),
    ...(error.details ? { details: error.details } : {}),
  };
};

const createLogger = (context = {}) => {
  const write = (level, message, detail = {}) => {
    if (!shouldLog(level)) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level: normalizeLevel(level),
      message,
      service: 'rivo-api',
      ...context,
      ...detail,
    };

    const line = JSON.stringify(payload);

    if (payload.level === 'error' || payload.level === 'warn') {
      console.error(line);
      return;
    }

    console.log(line);
  };

  return {
    child(extraContext = {}) {
      return createLogger({
        ...context,
        ...extraContext,
      });
    },
    debug(message, detail = {}) {
      write('debug', message, detail);
    },
    error(message, detail = {}) {
      write('error', message, detail);
    },
    info(message, detail = {}) {
      write('info', message, detail);
    },
    warn(message, detail = {}) {
      write('warn', message, detail);
    },
  };
};

module.exports = {
  createLogger,
  logger: createLogger(),
  serializeError,
};
