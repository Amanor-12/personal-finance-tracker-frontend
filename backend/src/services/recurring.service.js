const pool = require('../config/db');
const AppError = require('../utils/AppError');

const frequencyMonthlyFactor = {
  annual: 1 / 12,
  biweekly: 26 / 12,
  custom: 1,
  monthly: 1,
  quarterly: 1 / 3,
  weekly: 52 / 12,
};

const recurringSelectSql = `
  SELECT
    r.id,
    r.user_id,
    r.category_id,
    c.name AS category_name,
    r.account_id,
    a.name AS account_name,
    r.name,
    r.amount,
    r.billing_frequency,
    r.next_payment_date,
    r.notes,
    r.status,
    r.created_at,
    r.updated_at
  FROM recurring_payments r
  INNER JOIN categories c
    ON c.id = r.category_id
    AND c.user_id = r.user_id
  LEFT JOIN accounts a
    ON a.id = r.account_id
    AND a.user_id = r.user_id
  WHERE r.user_id = $1
`;

let recurringSchemaReady = false;

const ensureRecurringPaymentsTable = async (db = pool) => {
  if (recurringSchemaReady) {
    return;
  }

  await db.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS recurring_payments (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id BIGINT NOT NULL,
      account_id BIGINT NULL,
      name VARCHAR(120) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      billing_frequency VARCHAR(20) NOT NULL CHECK (billing_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'custom')),
      next_payment_date DATE NOT NULL,
      notes VARCHAR(500) NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT recurring_payments_category_owner_fkey
        FOREIGN KEY (category_id, user_id)
        REFERENCES categories (id, user_id)
        ON DELETE RESTRICT,
      CONSTRAINT recurring_payments_account_owner_fkey
        FOREIGN KEY (account_id, user_id)
        REFERENCES accounts (id, user_id)
        ON DELETE RESTRICT
    );
  `);

  await db.query(
    'CREATE INDEX IF NOT EXISTS idx_recurring_user_status_date ON recurring_payments (user_id, status, next_payment_date ASC)'
  );
  await db.query('DROP TRIGGER IF EXISTS recurring_payments_set_updated_at ON recurring_payments');
  await db.query(`
    CREATE TRIGGER recurring_payments_set_updated_at
    BEFORE UPDATE ON recurring_payments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  recurringSchemaReady = true;
};

const serializeRecurringPayment = (record) => {
  const amount = Number(record.amount);
  const monthlyAmount = amount * frequencyMonthlyFactor[record.billing_frequency];
  const nextPaymentDate = new Date(record.next_payment_date);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  nextPaymentDate.setHours(0, 0, 0, 0);

  return {
    ...record,
    amount,
    annual_amount: Number((monthlyAmount * 12).toFixed(2)),
    days_until_next_payment: Math.ceil((nextPaymentDate.getTime() - today.getTime()) / 86400000),
    monthly_amount: Number(monthlyAmount.toFixed(2)),
  };
};

const getExpenseCategory = async (db, userId, categoryId) => {
  const result = await db.query(
    `
      SELECT id, type
      FROM categories
      WHERE id = $1 AND user_id = $2
    `,
    [categoryId, userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Selected category was not found.', 404);
  }

  if (result.rows[0].type !== 'expense') {
    throw new AppError('Recurring payments must use an expense category.', 400);
  }
};

const ensureAccountBelongsToUser = async (db, userId, accountId) => {
  if (!accountId) {
    return;
  }

  const result = await db.query(
    `
      SELECT id
      FROM accounts
      WHERE id = $1 AND user_id = $2 AND status = 'active'
    `,
    [accountId, userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Selected account was not found.', 404);
  }
};

const getRecurringPayments = async (userId) => {
  const result = await pool.query(
    `
      ${recurringSelectSql}
      ORDER BY
        CASE WHEN r.status = 'active' THEN 0 ELSE 1 END,
        r.next_payment_date ASC,
        r.created_at DESC
    `,
    [userId]
  );

  return result.rows.map(serializeRecurringPayment);
};

const getRecurringPaymentById = async (userId, recurringPaymentId, db = pool) => {
  const result = await db.query(
    `
      ${recurringSelectSql}
      AND r.id = $2
    `,
    [userId, recurringPaymentId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Recurring payment not found.', 404);
  }

  return serializeRecurringPayment(result.rows[0]);
};

const createRecurringPayment = async (userId, payload) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await getExpenseCategory(client, userId, payload.category_id);
    await ensureAccountBelongsToUser(client, userId, payload.account_id);

    const result = await client.query(
      `
        INSERT INTO recurring_payments (
          user_id,
          category_id,
          account_id,
          name,
          amount,
          billing_frequency,
          next_payment_date,
          notes,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        userId,
        payload.category_id,
        payload.account_id || null,
        payload.name.trim(),
        payload.amount,
        payload.billing_frequency,
        payload.next_payment_date,
        payload.notes?.trim() || '',
        payload.status || 'active',
      ]
    );

    await client.query('COMMIT');
    return getRecurringPaymentById(userId, result.rows[0].id, client);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateRecurringPayment = async (userId, recurringPaymentId, payload) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await getRecurringPaymentById(userId, recurringPaymentId, client);
    await getExpenseCategory(client, userId, payload.category_id);
    await ensureAccountBelongsToUser(client, userId, payload.account_id);

    await client.query(
      `
        UPDATE recurring_payments
        SET
          category_id = $1,
          account_id = $2,
          name = $3,
          amount = $4,
          billing_frequency = $5,
          next_payment_date = $6,
          notes = $7,
          status = $8
        WHERE id = $9 AND user_id = $10
      `,
      [
        payload.category_id,
        payload.account_id || null,
        payload.name.trim(),
        payload.amount,
        payload.billing_frequency,
        payload.next_payment_date,
        payload.notes?.trim() || '',
        payload.status,
        recurringPaymentId,
        userId,
      ]
    );

    await client.query('COMMIT');
    return getRecurringPaymentById(userId, recurringPaymentId, client);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteRecurringPayment = async (userId, recurringPaymentId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        DELETE FROM recurring_payments
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `,
      [recurringPaymentId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Recurring payment not found.', 404);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createRecurringPayment,
  deleteRecurringPayment,
  ensureRecurringPaymentsTable,
  getRecurringPaymentById,
  getRecurringPayments,
  updateRecurringPayment,
};
