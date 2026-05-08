require('dotenv').config();

const app = require('../src/app');
const { initializeDataModel } = require('../src/bootstrap/initializeDataModel');
const pool = require('../src/config/db');

if (typeof app !== 'function') {
  throw new Error('Express app failed to initialize.');
}

(async () => {
  try {
    await initializeDataModel();

    const database = await pool.checkDatabase().catch((error) => ({
      configured: true,
      message: error.message || 'Database health check failed.',
      status: 'error',
    }));

    console.log(
      JSON.stringify(
        {
          app: 'ok',
          database,
        },
        null,
        2
      )
    );
  } finally {
    await pool.end().catch(() => {});
  }
})();
