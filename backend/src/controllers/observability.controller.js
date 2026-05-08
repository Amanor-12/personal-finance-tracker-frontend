const asyncHandler = require('../utils/asyncHandler');
const { sendOperationalAlert } = require('../services/alert.service');
const { recordFrontendErrorEvent } = require('../services/frontend-observability.service');
const { logger } = require('../services/logger.service');

const reportFrontendError = asyncHandler(async (req, res) => {
  const message = String(req.body?.message || '').trim();

  if (message.length < 2) {
    return res.status(400).json({
      message: 'Frontend error message is required.',
      error: 'Frontend error message is required.',
    });
  }

  const event = await recordFrontendErrorEvent({
    component_name: req.body?.component_name,
    message,
    metadata: req.body?.metadata || {},
    request_id: req.requestId,
    route_path: req.body?.route_path,
    stack_trace: req.body?.stack_trace,
    userAgent: String(req.headers['user-agent'] || ''),
  });

  logger.warn('Frontend runtime error reported.', {
    componentName: String(req.body?.component_name || 'unknown'),
    eventId: event.id,
    routePath: String(req.body?.route_path || ''),
    source: 'frontend',
  });

  if (req.body?.severity === 'fatal') {
    await sendOperationalAlert({
      context: {
        componentName: String(req.body?.component_name || 'unknown'),
        requestId: req.requestId,
        routePath: String(req.body?.route_path || ''),
      },
      level: 'error',
      message: `Frontend fatal error: ${message}`,
    });
  }

  res.status(202).json({
    accepted: true,
    event_id: event.id,
    request_id: req.requestId,
  });
});

module.exports = {
  reportFrontendError,
};
