require('dotenv').config();

const {
  captureServerException,
  flushSentry,
  initializeSentry,
} = require('./services/sentry.service');

initializeSentry();

const app = require('./app');
const { port } = require('./config/env');
const { initializeDataModel } = require('./bootstrap/initializeDataModel');
const { sendOperationalAlert } = require('./services/alert.service');
const { logger, serializeError } = require('./services/logger.service');

const handleFatalError = async (message, error) => {
  logger.error(message, {
    error: serializeError(error),
  });
  captureServerException(error, {
    extra: {
      fatal: true,
      message,
    },
    tags: {
      lifecycle: 'server',
    },
  });
  await sendOperationalAlert({
    error,
    level: 'error',
    message,
  });
  await flushSentry();
};

const startServer = async () => {
  await initializeDataModel();

  app.listen(port, () => {
    logger.info('API server listening.', {
      port,
    });
  });
};

process.on('unhandledRejection', async (error) => {
  await handleFatalError('Unhandled promise rejection.', error);
});

process.on('uncaughtException', async (error) => {
  await handleFatalError('Uncaught exception.', error);
  process.exit(1);
});

startServer().catch((error) => {
  handleFatalError('API server failed to start.', error).finally(() => {
    process.exit(1);
  });
});
