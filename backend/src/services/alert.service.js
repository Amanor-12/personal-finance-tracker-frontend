const { observabilityAlertWebhookUrl } = require('../config/env');
const { logger, serializeError } = require('./logger.service');

const sendOperationalAlert = async ({
  context = {},
  error = null,
  level = 'error',
  message,
}) => {
  if (!observabilityAlertWebhookUrl) {
    return false;
  }

  try {
    const response = await fetch(observabilityAlertWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context,
        error: serializeError(error),
        level,
        message,
        service: 'rivo-api',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Alert webhook returned ${response.status}.`);
    }

    return true;
  } catch (alertError) {
    logger.warn('Operational alert delivery failed.', {
      alertError: serializeError(alertError),
      message,
    });
    return false;
  }
};

module.exports = {
  sendOperationalAlert,
};
