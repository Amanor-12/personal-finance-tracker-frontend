const pool = require('../config/db');

let frontendObservabilitySchemaPromise;

const ensureFrontendObservabilitySchema = async () => {
  if (!frontendObservabilitySchemaPromise) {
    frontendObservabilitySchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS frontend_error_events (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
          request_id VARCHAR(120) NOT NULL DEFAULT '',
          route_path VARCHAR(255) NOT NULL DEFAULT '',
          component_name VARCHAR(255) NOT NULL DEFAULT '',
          message TEXT NOT NULL,
          stack_trace TEXT NOT NULL DEFAULT '',
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          user_agent VARCHAR(500) NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_frontend_error_events_created
        ON frontend_error_events (created_at DESC, id DESC)
      `);
    })().catch((error) => {
      frontendObservabilitySchemaPromise = null;
      throw error;
    });
  }

  await frontendObservabilitySchemaPromise;
};

const recordFrontendErrorEvent = async ({
  component_name: componentName,
  message,
  metadata = {},
  request_id: requestId,
  route_path: routePath,
  stack_trace: stackTrace,
  userAgent = '',
  userId = null,
}) => {
  await ensureFrontendObservabilitySchema();

  const result = await pool.query(
    `
      INSERT INTO frontend_error_events (
        user_id,
        request_id,
        route_path,
        component_name,
        message,
        stack_trace,
        metadata,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
      RETURNING id, created_at
    `,
    [
      userId,
      String(requestId || '').slice(0, 120),
      String(routePath || '').slice(0, 255),
      String(componentName || 'unknown').slice(0, 255),
      String(message || 'Unknown frontend error'),
      String(stackTrace || ''),
      JSON.stringify(metadata || {}),
      String(userAgent || '').slice(0, 500),
    ]
  );

  return {
    created_at: result.rows[0].created_at,
    id: Number(result.rows[0].id),
  };
};

module.exports = {
  ensureFrontendObservabilitySchema,
  recordFrontendErrorEvent,
};
