const AppError = require('../utils/AppError');
const { sendOperationalAlert } = require('../services/alert.service');
const { logger, serializeError } = require('../services/logger.service');
const { captureServerException } = require('../services/sentry.service');

const constraintMessages = {
  budgets_category_owner_fkey: 'The selected category is not available for this account.',
  budgets_user_category_period_key: 'A budget already exists for that category and period.',
  categories_user_name_type_key: 'A category with that name and type already exists.',
  transactions_category_owner_fkey: 'The selected category is not available for this account.',
  users_email_key: 'An account with that email already exists.',
};

const formatDatabaseError = (error) => {
  if (error.code === '23505') {
    return {
      message:
        constraintMessages[error.constraint] || 'A record with those details already exists.',
      statusCode: 409,
    };
  }

  if (error.code === '23503') {
    return {
      message:
        constraintMessages[error.constraint] ||
        'This action conflicts with an existing related record.',
      statusCode: 409,
    };
  }

  if (error.code === '23514' || error.code === '22P02') {
    return {
      message: 'One or more values were not in the expected format.',
      statusCode: 400,
    };
  }

  return null;
};

const errorHandler = async (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      error: error.message,
      request_id: req.requestId,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  const formattedDatabaseError = formatDatabaseError(error);

  if (formattedDatabaseError) {
    return res.status(formattedDatabaseError.statusCode).json({
      message: formattedDatabaseError.message,
      error: formattedDatabaseError.message,
      request_id: req.requestId,
    });
  }

  const requestLogger = req.logger || logger;
  const serializedError = serializeError(error);

  requestLogger.error('Unhandled API error.', {
    error: serializedError,
    method: req.method,
    path: req.originalUrl || req.url,
    userId: req.user?.id || null,
  });
  captureServerException(error, {
    extra: {
      request_id: req.requestId,
      response_status: 500,
    },
    tags: {
      handler: 'express',
      path: req.originalUrl || req.url,
    },
    user: req.user || null,
  });

  await sendOperationalAlert({
    context: {
      method: req.method,
      path: req.originalUrl || req.url,
      requestId: req.requestId,
      userId: req.user?.id || null,
    },
    error,
    level: 'error',
    message: `Unhandled API error on ${req.method} ${req.originalUrl || req.url}`,
  });

  return res.status(500).json({
    message: 'Something went wrong. Please try again.',
    error: 'Something went wrong. Please try again.',
    request_id: req.requestId,
  });
};

module.exports = errorHandler;
