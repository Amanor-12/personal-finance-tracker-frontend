const express = require('express');

const observabilityController = require('../controllers/observability.controller');
const { createRateLimit } = require('../middleware/rate-limit.middleware');

const router = express.Router();
const observabilityRateLimit = createRateLimit({ keyPrefix: 'observability' });

router.post('/frontend-errors', observabilityRateLimit, observabilityController.reportFrontendError);

module.exports = router;
