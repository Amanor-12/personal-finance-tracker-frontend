const pool = require('../config/db');
const AppError = require('../utils/AppError');

const maxSavedViews = 6;
const maxViewNameLength = 80;
const defaultFilters = {
  accountId: 'all',
  categoryId: 'all',
  fromDate: '',
  maxAmount: '',
  minAmount: '',
  query: '',
  sortBy: 'newest',
  status: 'all',
  toDate: '',
  type: 'all',
};
const allowedSortValues = new Set(['highest', 'lowest', 'newest', 'oldest', 'title']);
const allowedStatusValues = new Set(['all', 'recorded']);
const allowedTypeValues = new Set(['all', 'income', 'expense']);

let transactionWorkspaceSchemaPromise;

const ensureTransactionWorkspaceSchema = async () => {
  if (!transactionWorkspaceSchemaPromise) {
    transactionWorkspaceSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS transaction_saved_views (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(80) NOT NULL,
          filters JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_transaction_saved_views_user_created
        ON transaction_saved_views (user_id, created_at DESC)
      `);

      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'transaction_saved_views_set_updated_at'
          ) THEN
            CREATE TRIGGER transaction_saved_views_set_updated_at
            BEFORE UPDATE ON transaction_saved_views
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
          END IF;
        END
        $$;
      `);
    })().catch((error) => {
      transactionWorkspaceSchemaPromise = null;
      throw error;
    });
  }

  await transactionWorkspaceSchemaPromise;
};

const toPositiveString = (value) => {
  const normalized = String(value || '').trim();
  return /^\d+$/.test(normalized) && Number(normalized) > 0 ? normalized : 'all';
};

const normalizeFilters = (filters = {}) => ({
  accountId: toPositiveString(filters.accountId),
  categoryId: toPositiveString(filters.categoryId),
  fromDate: typeof filters.fromDate === 'string' ? filters.fromDate.trim().slice(0, 10) : '',
  maxAmount:
    filters.maxAmount === '' || filters.maxAmount === null || filters.maxAmount === undefined
      ? ''
      : String(filters.maxAmount).trim(),
  minAmount:
    filters.minAmount === '' || filters.minAmount === null || filters.minAmount === undefined
      ? ''
      : String(filters.minAmount).trim(),
  query: typeof filters.query === 'string' ? filters.query.trim().slice(0, 120) : '',
  sortBy: allowedSortValues.has(filters.sortBy) ? filters.sortBy : defaultFilters.sortBy,
  status: allowedStatusValues.has(filters.status) ? filters.status : defaultFilters.status,
  toDate: typeof filters.toDate === 'string' ? filters.toDate.trim().slice(0, 10) : '',
  type: allowedTypeValues.has(filters.type) ? filters.type : defaultFilters.type,
});

const serializeSavedView = (record) => ({
  created_at: record.created_at,
  filters: normalizeFilters(record.filters || {}),
  id: record.id,
  name: record.name,
  updated_at: record.updated_at,
});

const normalizeDateKey = (value) => {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
};

const getTransactionTitle = (transaction) =>
  String(transaction.description || '').trim() || 'Untitled transaction';

const getTransactionAccountName = (transaction) =>
  transaction.account_name || transaction.accountName || '';

const getTransactionStatus = (transaction) =>
  String(transaction.status || 'recorded').toLowerCase();

const formatDate = (value) => {
  if (!value) {
    return 'No date';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    currency: 'USD',
    style: 'currency',
  }).format(Number(value) || 0);

const filterTransactionsForExport = (transactions, filters = {}) => {
  const normalizedFilters = normalizeFilters(filters);
  const query = normalizedFilters.query.toLowerCase();
  const minAmount = normalizedFilters.minAmount === '' ? null : Number(normalizedFilters.minAmount);
  const maxAmount = normalizedFilters.maxAmount === '' ? null : Number(normalizedFilters.maxAmount);
  const fromDate = normalizeDateKey(normalizedFilters.fromDate);
  const toDate = normalizeDateKey(normalizedFilters.toDate);

  return transactions.filter((transaction) => {
    const amount = Number(transaction.amount) || 0;
    const transactionDate = normalizeDateKey(transaction.transaction_date || transaction.transactionDate);
    const accountId = String(transaction.account_id || transaction.accountId || '');
    const categoryId = String(transaction.category_id || transaction.categoryId || '');
    const haystack = [
      getTransactionTitle(transaction),
      transaction.category_name || transaction.categoryName,
      getTransactionAccountName(transaction),
      transaction.type,
      formatDate(transaction.transaction_date || transaction.transactionDate),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (query && !haystack.includes(query)) {
      return false;
    }

    if (normalizedFilters.type !== 'all' && transaction.type !== normalizedFilters.type) {
      return false;
    }

    if (normalizedFilters.categoryId !== 'all' && categoryId !== normalizedFilters.categoryId) {
      return false;
    }

    if (normalizedFilters.accountId !== 'all' && accountId !== normalizedFilters.accountId) {
      return false;
    }

    if (normalizedFilters.status !== 'all' && getTransactionStatus(transaction) !== normalizedFilters.status) {
      return false;
    }

    if (Number.isFinite(minAmount) && amount < minAmount) {
      return false;
    }

    if (Number.isFinite(maxAmount) && amount > maxAmount) {
      return false;
    }

    if (fromDate && (!transactionDate || transactionDate < fromDate)) {
      return false;
    }

    if (toDate && (!transactionDate || transactionDate > toDate)) {
      return false;
    }

    return true;
  });
};

const sortTransactionsForExport = (transactions, sortBy = defaultFilters.sortBy) =>
  [...transactions].sort((left, right) => {
    if (sortBy === 'highest') {
      return Number(right.amount) - Number(left.amount);
    }

    if (sortBy === 'lowest') {
      return Number(left.amount) - Number(right.amount);
    }

    if (sortBy === 'title') {
      return getTransactionTitle(left).localeCompare(getTransactionTitle(right));
    }

    const leftTime = new Date(left.transaction_date || left.created_at || 0).getTime();
    const rightTime = new Date(right.transaction_date || right.created_at || 0).getTime();

    return sortBy === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
  });

const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const buildTransactionsCsv = (transactions) => {
  const header = [
    'Title',
    'Category',
    'Account',
    'Type',
    'Date',
    'Amount',
    'Status',
    'Recurring',
    'Notes',
  ];

  const rows = transactions.map((transaction) => [
    getTransactionTitle(transaction),
    transaction.category_name || transaction.categoryName || 'Uncategorized',
    getTransactionAccountName(transaction) || 'No account linked',
    transaction.type,
    formatDate(transaction.transaction_date || transaction.transactionDate),
    formatCurrency(transaction.amount),
    getTransactionStatus(transaction),
    transaction.is_recurring || transaction.isRecurring ? 'Yes' : 'No',
    transaction.notes || '',
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');
};

const getSavedTransactionViews = async (userId) => {
  await ensureTransactionWorkspaceSchema();

  const result = await pool.query(
    `
      SELECT id, name, filters, created_at, updated_at
      FROM transaction_saved_views
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `,
    [userId, maxSavedViews]
  );

  return result.rows.map(serializeSavedView);
};

const saveTransactionView = async (userId, payload = {}) => {
  await ensureTransactionWorkspaceSchema();

  const name = String(payload.name || '').trim();

  if (!name) {
    throw new AppError('Saved view name is required.', 400);
  }

  if (name.length > maxViewNameLength) {
    throw new AppError('Saved view name must be 80 characters or fewer.', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const countResult = await client.query(
      `
        SELECT COUNT(*)::INTEGER AS total
        FROM transaction_saved_views
        WHERE user_id = $1
      `,
      [userId]
    );

    const total = Number(countResult.rows[0]?.total) || 0;

    if (total >= maxSavedViews) {
      await client.query(
        `
          DELETE FROM transaction_saved_views
          WHERE id = (
            SELECT id
            FROM transaction_saved_views
            WHERE user_id = $1
            ORDER BY created_at ASC, id ASC
            LIMIT 1
          )
        `,
        [userId]
      );
    }

    const result = await client.query(
      `
        INSERT INTO transaction_saved_views (user_id, name, filters)
        VALUES ($1, $2, $3::jsonb)
        RETURNING id, name, filters, created_at, updated_at
      `,
      [userId, name, JSON.stringify(normalizeFilters(payload.filters || {}))]
    );

    await client.query('COMMIT');
    return serializeSavedView(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteTransactionView = async (userId, viewId) => {
  await ensureTransactionWorkspaceSchema();

  const result = await pool.query(
    `
      DELETE FROM transaction_saved_views
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [viewId, userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Saved view not found.', 404);
  }
};

const exportTransactionsCsv = async (userId, getTransactionsForUser, payload = {}) => {
  const transactions = await getTransactionsForUser(userId);
  const transactionIds = Array.isArray(payload.transaction_ids)
    ? payload.transaction_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
    : [];
  const selectedIds = transactionIds.length ? new Set(transactionIds) : null;

  const exportRows = selectedIds
    ? transactions.filter((transaction) => selectedIds.has(Number(transaction.id)))
    : sortTransactionsForExport(
        filterTransactionsForExport(transactions, payload.filters || {}),
        normalizeFilters(payload.filters || {}).sortBy
      );

  return {
    csv: buildTransactionsCsv(exportRows),
    exported_count: exportRows.length,
    file_name: `rivo-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
  };
};

module.exports = {
  deleteTransactionView,
  ensureTransactionWorkspaceSchema,
  exportTransactionsCsv,
  getSavedTransactionViews,
  normalizeFilters,
  saveTransactionView,
};
