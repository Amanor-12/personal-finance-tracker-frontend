const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { ensureAccountsTable } = require('./account.service');

let transactionSchemaReady = false;

const transactionSelectSql = `
  SELECT
    t.id,
    t.account_id,
    a.name AS account_name,
    t.category_id,
    c.name AS category_name,
    c.type AS category_type,
    t.type,
    t.amount,
    t.description,
    t.notes,
    t.status,
    t.is_recurring,
    t.transaction_date,
    t.created_at,
    t.updated_at
  FROM transactions t
  INNER JOIN categories c
    ON c.id = t.category_id
    AND c.user_id = t.user_id
  LEFT JOIN accounts a
    ON a.id = t.account_id
    AND a.user_id = t.user_id
  WHERE t.user_id = $1
`;

const serializeTransaction = (record) => ({
  ...record,
  amount: Number(record.amount),
});

const ensureTransactionSchema = async () => {
  if (transactionSchemaReady) {
    return;
  }

  await ensureAccountsTable();

  await pool.query(`
    ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS account_id BIGINT NULL
  `);

  await pool.query(`
    ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS notes VARCHAR(500) NOT NULL DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'recorded'
  `);

  await pool.query(`
    ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transactions_account_owner_fkey'
      ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT transactions_account_owner_fkey
        FOREIGN KEY (account_id, user_id)
        REFERENCES accounts (id, user_id)
        ON DELETE RESTRICT;
      END IF;
    END
    $$;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_account
    ON transactions (user_id, account_id)
  `);

  transactionSchemaReady = true;
};

const getOwnedCategory = async (db, userId, categoryId) => {
  const result = await db.query(
    `
      SELECT id, name, type
      FROM categories
      WHERE id = $1 AND user_id = $2
    `,
    [categoryId, userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Selected category was not found.', 404);
  }

  return result.rows[0];
};

const getOwnedAccount = async (db, userId, accountId) => {
  if (!accountId) {
    return null;
  }

  const result = await db.query(
    `
      SELECT id, status
      FROM accounts
      WHERE id = $1 AND user_id = $2
    `,
    [accountId, userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Selected account was not found.', 404);
  }

  if (result.rows[0].status !== 'active') {
    throw new AppError('Archived accounts cannot be used for new transactions.', 400);
  }

  return result.rows[0];
};

const getTransactions = async (userId) => {
  const result = await pool.query(
    `
      ${transactionSelectSql}
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `,
    [userId]
  );

  return result.rows.map(serializeTransaction);
};

const getTransactionById = async (userId, transactionId, db = pool) => {
  const result = await db.query(
    `
      ${transactionSelectSql}
      AND t.id = $2
    `,
    [userId, transactionId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Transaction not found.', 404);
  }

  return serializeTransaction(result.rows[0]);
};

const createTransaction = async (userId, payload) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const category = await getOwnedCategory(client, userId, payload.category_id);
    await getOwnedAccount(client, userId, payload.account_id);

    if (category.type !== payload.type) {
      throw new AppError('Transaction type must match the selected category type.', 400);
    }

    const result = await client.query(
      `
        INSERT INTO transactions (
          user_id,
          category_id,
          account_id,
          type,
          amount,
          description,
          notes,
          is_recurring,
          transaction_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        userId,
        payload.category_id,
        payload.account_id || null,
        payload.type,
        payload.amount,
        payload.description || '',
        payload.notes || '',
        Boolean(payload.is_recurring),
        payload.transaction_date,
      ]
    );

    await client.query('COMMIT');
    return getTransactionById(userId, result.rows[0].id, client);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateTransaction = async (userId, transactionId, payload) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await getTransactionById(userId, transactionId, client);
    const category = await getOwnedCategory(client, userId, payload.category_id);
    await getOwnedAccount(client, userId, payload.account_id);

    if (category.type !== payload.type) {
      throw new AppError('Transaction type must match the selected category type.', 400);
    }

    await client.query(
      `
        UPDATE transactions
        SET
          category_id = $1,
          account_id = $2,
          type = $3,
          amount = $4,
          description = $5,
          notes = $6,
          is_recurring = $7,
          transaction_date = $8
        WHERE id = $9 AND user_id = $10
      `,
      [
        payload.category_id,
        payload.account_id || null,
        payload.type,
        payload.amount,
        payload.description || '',
        payload.notes || '',
        Boolean(payload.is_recurring),
        payload.transaction_date,
        transactionId,
        userId,
      ]
    );

    await client.query('COMMIT');
    return getTransactionById(userId, transactionId, client);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteTransaction = async (userId, transactionId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        DELETE FROM transactions
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `,
      [transactionId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Transaction not found.', 404);
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
  createTransaction,
  deleteTransaction,
  ensureTransactionSchema,
  getTransactionById,
  getTransactions,
  updateTransaction,
};
