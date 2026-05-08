const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  const payload = {
    capabilities: {
      accounts: true,
      ai: true,
      auth: {
        deleteAccount: true,
        emailVerification: true,
        mfa: true,
        password: true,
        passwordReset: true,
        preferences: true,
        profile: true,
        security: true,
      },
      billing: true,
      goals: true,
      recurringPayments: true,
      reports: true,
      transactions: {
        export: true,
        savedViews: true,
      },
    },
    message: 'Personal Finance Tracker API is running.',
    service: 'financial-tracker-backend-core',
    timestamp: new Date().toISOString(),
  };

  try {
    const database = await pool.checkDatabase();

    res.json({
      status: 'ok',
      database: database.status,
      ...payload,
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      database: 'error',
      message: error.message || 'Database health check failed.',
      ...payload,
    });
  }
});

module.exports = router;
