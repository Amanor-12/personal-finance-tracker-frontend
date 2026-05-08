const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { ensureAccountsTable } = require('./account.service');
const {
  assertProviderAvailable,
  createPlaidLinkToken: createPlaidProviderLinkToken,
  exchangePlaidPublicToken,
  listBankProviders: listConfiguredBankProviders,
  syncPlaidTransactions,
} = require('./bank-provider.service');
const { ensureTransactionSchema } = require('./transaction.service');

let bankConnectionSchemaPromise;

const serializeConnection = (record) => ({
  created_at: record.created_at || null,
  id: Number(record.id),
  imported_count: Number(record.imported_count || 0),
  institution_name: record.institution_name || '',
  label: record.label || '',
  last_error: record.last_error || '',
  last_synced_at: record.last_synced_at || null,
  ledger_account_id: record.ledger_account_id ? Number(record.ledger_account_id) : null,
  provider: record.provider || 'sandbox',
  provider_account_mask: record.provider_account_mask || '',
  status: record.status || 'connected',
  unreconciled_count: Number(record.unreconciled_count || 0),
  updated_at: record.updated_at || null,
});

const serializeQueueItem = (record) => ({
  account_id: Number(record.account_id),
  account_name: record.account_name || '',
  amount: Number(record.amount),
  bank_connection_id: Number(record.bank_connection_id),
  bank_connection_label: record.bank_connection_label || '',
  category_id: Number(record.category_id),
  category_name: record.category_name || '',
  description: record.description || '',
  id: Number(record.id),
  merchant_name: record.merchant_name || '',
  notes: record.notes || '',
  posted_at: record.posted_at || null,
  reconciliation_status: record.reconciliation_status || 'manual',
  transaction_date: record.transaction_date || null,
  type: record.type,
});

const ensureBankConnectionSchema = async () => {
  if (!bankConnectionSchemaPromise) {
    bankConnectionSchemaPromise = (async () => {
      await ensureAccountsTable();
      await ensureTransactionSchema();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS bank_connections (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(30) NOT NULL,
          institution_name VARCHAR(120) NOT NULL,
          label VARCHAR(80) NOT NULL,
          ledger_account_id BIGINT NULL REFERENCES accounts(id) ON DELETE SET NULL,
          provider_item_id VARCHAR(255) NOT NULL DEFAULT '',
          provider_account_id VARCHAR(255) NOT NULL DEFAULT '',
          provider_account_mask VARCHAR(32) NOT NULL DEFAULT '',
          provider_access_token_ciphertext TEXT NULL,
          provider_sync_cursor TEXT NOT NULL DEFAULT '',
          provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          status VARCHAR(20) NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'attention', 'disconnected')),
          last_synced_at TIMESTAMPTZ NULL,
          last_error VARCHAR(255) NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        ALTER TABLE bank_connections
        ADD COLUMN IF NOT EXISTS ledger_account_id BIGINT NULL REFERENCES accounts(id) ON DELETE SET NULL
      `);

      await pool.query(`
        ALTER TABLE bank_connections
        ADD COLUMN IF NOT EXISTS provider_item_id VARCHAR(255) NOT NULL DEFAULT ''
      `);

      await pool.query(`
        ALTER TABLE bank_connections
        ADD COLUMN IF NOT EXISTS provider_account_id VARCHAR(255) NOT NULL DEFAULT ''
      `);

      await pool.query(`
        ALTER TABLE bank_connections
        ADD COLUMN IF NOT EXISTS provider_account_mask VARCHAR(32) NOT NULL DEFAULT ''
      `);

      await pool.query(`
        ALTER TABLE bank_connections
        ADD COLUMN IF NOT EXISTS provider_access_token_ciphertext TEXT NULL
      `);

      await pool.query(`
        ALTER TABLE bank_connections
        ADD COLUMN IF NOT EXISTS provider_sync_cursor TEXT NOT NULL DEFAULT ''
      `);

      await pool.query(`
        ALTER TABLE bank_connections
        ADD COLUMN IF NOT EXISTS provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      `);

      await pool.query(`
        DO $$
        DECLARE existing_constraint RECORD;
        BEGIN
          FOR existing_constraint IN
            SELECT con.conname
            FROM pg_constraint con
            INNER JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE
              rel.relname = 'bank_connections'
              AND con.contype = 'c'
              AND pg_get_constraintdef(con.oid) ILIKE '%provider%'
          LOOP
            EXECUTE format(
              'ALTER TABLE bank_connections DROP CONSTRAINT IF EXISTS %I',
              existing_constraint.conname
            );
          END LOOP;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'bank_connections_provider_check'
          ) THEN
            ALTER TABLE bank_connections
            ADD CONSTRAINT bank_connections_provider_check
            CHECK (provider IN ('sandbox', 'plaid'));
          END IF;
        END
        $$;
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_bank_connections_user_created
        ON bank_connections (user_id, created_at DESC, id DESC)
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_connections_plaid_account_unique
        ON bank_connections (user_id, provider, provider_account_id)
        WHERE provider = 'plaid' AND provider_account_id <> ''
      `);

      await pool.query(`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS bank_connection_id BIGINT NULL
      `);

      await pool.query(`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS external_transaction_id VARCHAR(120) NULL
      `);

      await pool.query(`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(160) NOT NULL DEFAULT ''
      `);

      await pool.query(`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS posted_at DATE NULL
      `);

      await pool.query(`
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'manual'
      `);

      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'transactions_bank_connection_fkey'
          ) THEN
            ALTER TABLE transactions
            ADD CONSTRAINT transactions_bank_connection_fkey
            FOREIGN KEY (bank_connection_id)
            REFERENCES bank_connections (id)
            ON DELETE SET NULL;
          END IF;
        END
        $$;
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_external_transaction
        ON transactions (user_id, external_transaction_id)
        WHERE external_transaction_id IS NOT NULL
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_transactions_user_reconciliation_status
        ON transactions (user_id, reconciliation_status, transaction_date DESC, id DESC)
      `);

      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'bank_connections_set_updated_at'
          ) THEN
            CREATE TRIGGER bank_connections_set_updated_at
            BEFORE UPDATE ON bank_connections
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
          END IF;
        END
        $$;
      `);
    })().catch((error) => {
      bankConnectionSchemaPromise = null;
      throw error;
    });
  }

  await bankConnectionSchemaPromise;
};

const listBankProviders = async () => listConfiguredBankProviders();

const listBankConnections = async (userId, db = pool) => {
  await ensureBankConnectionSchema();

  const result = await db.query(
    `
      SELECT
        bc.*,
        COUNT(t.id)::int AS imported_count,
        COUNT(*) FILTER (
          WHERE t.id IS NOT NULL AND t.reconciliation_status <> 'reconciled'
        )::int AS unreconciled_count
      FROM bank_connections bc
      LEFT JOIN transactions t
        ON t.bank_connection_id = bc.id
        AND t.user_id = bc.user_id
      WHERE bc.user_id = $1
      GROUP BY bc.id
      ORDER BY bc.created_at DESC, bc.id DESC
    `,
    [userId]
  );

  return result.rows.map(serializeConnection);
};

const getBankConnection = async (userId, connectionId, db = pool, { forUpdate = false } = {}) => {
  const result = await db.query(
    `
      SELECT *
      FROM bank_connections
      WHERE id = $1 AND user_id = $2
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [connectionId, userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Bank connection not found.', 404);
  }

  return result.rows[0];
};

const findExistingPlaidConnection = async (db, userId, providerAccountId) => {
  const result = await db.query(
    `
      SELECT *
      FROM bank_connections
      WHERE user_id = $1 AND provider = 'plaid' AND provider_account_id = $2
      LIMIT 1
    `,
    [userId, providerAccountId]
  );

  return result.rows[0] || null;
};

const createBankConnection = async (userId, payload, db = pool) => {
  await ensureBankConnectionSchema();
  assertProviderAvailable(payload.provider);

  if (payload.provider === 'plaid') {
    throw new AppError('Use the Plaid exchange route to create live institution connections.', 400);
  }

  const result = await db.query(
    `
      INSERT INTO bank_connections (
        user_id,
        provider,
        institution_name,
        label
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [userId, payload.provider, payload.institution_name.trim(), payload.label.trim()]
  );

  return serializeConnection(result.rows[0]);
};

const mapPlaidAccountType = (account) => {
  const type = String(account?.type || '').toLowerCase();
  const subtype = String(account?.subtype || '').toLowerCase();

  if (type === 'depository') {
    if (subtype.includes('savings')) {
      return 'savings';
    }

    return 'checking';
  }

  if (type === 'credit') {
    return 'credit_card';
  }

  if (type === 'investment') {
    return 'investment';
  }

  return 'other';
};

const upsertLedgerAccount = async (db, userId, connection, accountHint = {}) => {
  if (connection.ledger_account_id) {
    const existing = await db.query(
      `
        SELECT id
        FROM accounts
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `,
      [connection.ledger_account_id, userId]
    );

    if (existing.rowCount > 0) {
      return Number(existing.rows[0].id);
    }
  }

  const created = await db.query(
    `
      INSERT INTO accounts (
        user_id,
        name,
        account_type,
        institution_name,
        opening_balance,
        current_balance,
        currency,
        notes,
        masked_identifier,
        is_primary
      )
      VALUES ($1, $2, $3, $4, 0, 0, 'USD', $5, $6, FALSE)
      RETURNING id
    `,
    [
      userId,
      accountHint.name || `${connection.institution_name} ${connection.label}`,
      accountHint.account_type || 'checking',
      accountHint.institution_name || connection.institution_name,
      accountHint.notes || `Created automatically for ${connection.provider} bank sync.`,
      accountHint.masked_identifier || connection.provider_account_mask || '',
    ]
  );

  const ledgerAccountId = Number(created.rows[0].id);

  await db.query(
    `
      UPDATE bank_connections
      SET ledger_account_id = $2
      WHERE id = $1
    `,
    [connection.id, ledgerAccountId]
  );

  return ledgerAccountId;
};

const getOwnedCategories = async (db, userId) => {
  const result = await db.query(
    `
      SELECT id, name, type
      FROM categories
      WHERE user_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [userId]
  );

  return result.rows;
};

const findCategoryId = (categories, type, names) => {
  const normalizedNames = names.map((value) => String(value || '').toLowerCase()).filter(Boolean);
  const match = categories.find(
    (category) =>
      category.type === type &&
      normalizedNames.includes(String(category.name || '').toLowerCase())
  );

  if (match) {
    return Number(match.id);
  }

  const fallbackMatch = categories.find((category) => category.type === type);

  if (!fallbackMatch) {
    throw new AppError(`A matching ${type} category is required for bank sync imports.`, 409);
  }

  return Number(fallbackMatch.id);
};

const buildSandboxTransactions = (connectionId) => {
  const today = new Date();
  const toIsoDate = (offsetDays) => {
    const value = new Date(today);
    value.setDate(value.getDate() - offsetDays);
    return value.toISOString().slice(0, 10);
  };

  return [
    {
      amount: 124.62,
      categoryNames: ['Groceries'],
      description: 'North Market grocery run',
      externalId: `sandbox-${connectionId}-grocery-${toIsoDate(1)}`,
      merchantName: 'North Market',
      postedAt: toIsoDate(1),
      reconciliationStatus: 'suggested',
      type: 'expense',
    },
    {
      amount: 18.4,
      categoryNames: ['Transport'],
      description: 'City Rail transit reload',
      externalId: `sandbox-${connectionId}-transit-${toIsoDate(2)}`,
      merchantName: 'City Rail',
      postedAt: toIsoDate(2),
      reconciliationStatus: 'suggested',
      type: 'expense',
    },
    {
      amount: 1450,
      categoryNames: ['Salary', 'Freelance'],
      description: 'Primary payroll deposit',
      externalId: `sandbox-${connectionId}-payroll-${toIsoDate(3)}`,
      merchantName: 'Rivo Payroll',
      postedAt: toIsoDate(3),
      reconciliationStatus: 'suggested',
      type: 'income',
    },
    {
      amount: 890,
      categoryNames: ['Housing'],
      description: 'May rent payment',
      externalId: `sandbox-${connectionId}-rent-${toIsoDate(4)}`,
      merchantName: 'North Square Apartments',
      postedAt: toIsoDate(4),
      reconciliationStatus: 'suggested',
      type: 'expense',
    },
  ];
};

const PLAID_CATEGORY_MAP = {
  BANK_FEES: ['Utilities', 'Housing'],
  ENTERTAINMENT: ['Groceries', 'Transport'],
  FOOD_AND_DRINK: ['Groceries'],
  GENERAL_MERCHANDISE: ['Groceries', 'Utilities'],
  INCOME: ['Salary', 'Freelance'],
  LOAN_PAYMENTS: ['Housing'],
  RENT_AND_UTILITIES: ['Housing', 'Utilities'],
  TRANSPORTATION: ['Transport'],
  TRANSFER_IN: ['Salary', 'Freelance'],
  TRANSFER_OUT: ['Housing', 'Utilities'],
};

const mapPlaidTransactionType = (transaction) => {
  const primaryCategory = String(
    transaction?.personal_finance_category?.primary || ''
  ).toUpperCase();

  if (
    primaryCategory === 'INCOME' ||
    primaryCategory === 'TRANSFER_IN' ||
    Number(transaction?.amount) < 0
  ) {
    return 'income';
  }

  return 'expense';
};

const mapPlaidCategoryNames = (transaction, type) => {
  const primaryCategory = String(
    transaction?.personal_finance_category?.primary || ''
  ).toUpperCase();
  const mappedCategories = PLAID_CATEGORY_MAP[primaryCategory];

  if (mappedCategories?.length) {
    return mappedCategories;
  }

  return type === 'income' ? ['Salary', 'Freelance'] : ['Groceries', 'Utilities'];
};

const normalizePlaidImportedTransaction = (transaction) => {
  const type = mapPlaidTransactionType(transaction);
  const postedAt = transaction?.date || transaction?.authorized_date || null;

  return {
    amount: Math.abs(Number(transaction?.amount) || 0),
    categoryNames: mapPlaidCategoryNames(transaction, type),
    description:
      transaction?.name ||
      transaction?.merchant_name ||
      transaction?.personal_finance_category?.detailed ||
      'Plaid import',
    externalId: transaction?.transaction_id,
    merchantName: transaction?.merchant_name || '',
    postedAt,
    reconciliationStatus: 'suggested',
    type,
  };
};

const upsertImportedTransaction = async (
  db,
  userId,
  accountId,
  bankConnectionId,
  categories,
  imported
) => {
  const categoryId = findCategoryId(categories, imported.type, imported.categoryNames);
  const existing = await db.query(
    `
      SELECT id
      FROM transactions
      WHERE user_id = $1 AND external_transaction_id = $2
      LIMIT 1
    `,
    [userId, imported.externalId]
  );

  if (existing.rowCount > 0) {
    await db.query(
      `
        UPDATE transactions
        SET
          account_id = $3,
          category_id = $4,
          type = $5,
          amount = $6,
          description = $7,
          merchant_name = $8,
          posted_at = $9,
          transaction_date = $9,
          bank_connection_id = $10,
          notes = CASE
            WHEN notes = '' THEN $11
            ELSE notes
          END,
          reconciliation_status = CASE
            WHEN reconciliation_status = 'reconciled' THEN reconciliation_status
            ELSE $12
          END,
          status = 'recorded'
        WHERE id = $1
      `,
      [
        existing.rows[0].id,
        userId,
        accountId,
        categoryId,
        imported.type,
        imported.amount,
        imported.description,
        imported.merchantName,
        imported.postedAt,
        bankConnectionId,
        imported.notes || `Imported from ${imported.sourceLabel || 'connected bank sync'}.`,
        imported.reconciliationStatus || 'suggested',
      ]
    );

    return false;
  }

  await db.query(
    `
      INSERT INTO transactions (
        user_id,
        category_id,
        account_id,
        type,
        amount,
        description,
        notes,
        status,
        is_recurring,
        transaction_date,
        bank_connection_id,
        external_transaction_id,
        merchant_name,
        posted_at,
        reconciliation_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'recorded', FALSE, $8, $9, $10, $11, $8, $12)
    `,
    [
      userId,
      categoryId,
      accountId,
      imported.type,
      imported.amount,
      imported.description,
      imported.notes || `Imported from ${imported.sourceLabel || 'connected bank sync'}.`,
      imported.postedAt,
      bankConnectionId,
      imported.externalId,
      imported.merchantName,
      imported.reconciliationStatus || 'suggested',
    ]
  );

  return true;
};

const syncSandboxConnection = async (client, userId, connection) => {
  const accountId = await upsertLedgerAccount(client, userId, connection, {
    account_type: 'checking',
    institution_name: connection.institution_name,
    masked_identifier: connection.provider_account_mask,
    name: `${connection.institution_name} Checking`,
    notes: 'Created automatically for sandbox bank sync.',
  });
  const categories = await getOwnedCategories(client, userId);
  const importedTransactions = buildSandboxTransactions(connection.id);
  let importedCount = 0;

  for (const importedTransaction of importedTransactions) {
    const inserted = await upsertImportedTransaction(
      client,
      userId,
      accountId,
      connection.id,
      categories,
      {
        ...importedTransaction,
        sourceLabel: 'sandbox bank sync',
      }
    );

    if (inserted) {
      importedCount += 1;
    }
  }

  return {
    imported_count: importedCount,
    next_cursor: '',
  };
};

const syncPlaidConnection = async (client, userId, connection) => {
  if (!connection.provider_access_token_ciphertext || !connection.provider_account_id) {
    throw new AppError('This Plaid connection is incomplete and must be reconnected.', 409);
  }

  const accountId = await upsertLedgerAccount(client, userId, connection, {
    account_type: 'checking',
    institution_name: connection.institution_name,
    masked_identifier: connection.provider_account_mask,
    name: connection.label,
    notes: 'Created automatically for Plaid bank sync.',
  });
  const categories = await getOwnedCategories(client, userId);
  const synced = await syncPlaidTransactions({
    accountId: connection.provider_account_id,
    accessTokenCiphertext: connection.provider_access_token_ciphertext,
    cursor: connection.provider_sync_cursor,
  });

  if (synced.removed_transaction_ids.length) {
    await client.query(
      `
        DELETE FROM transactions
        WHERE
          user_id = $1
          AND external_transaction_id = ANY($2::varchar[])
          AND reconciliation_status <> 'reconciled'
      `,
      [userId, synced.removed_transaction_ids]
    );
  }

  let importedCount = 0;

  for (const transaction of synced.transactions) {
    const inserted = await upsertImportedTransaction(
      client,
      userId,
      accountId,
      connection.id,
      categories,
      {
        ...normalizePlaidImportedTransaction(transaction),
        notes: 'Imported from Plaid sync.',
        sourceLabel: 'Plaid sync',
      }
    );

    if (inserted) {
      importedCount += 1;
    }
  }

  return {
    imported_count: importedCount,
    next_cursor: synced.next_cursor || connection.provider_sync_cursor || '',
  };
};

const syncBankConnection = async (userId, connectionId) => {
  await ensureBankConnectionSchema();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const connection = await getBankConnection(userId, connectionId, client, { forUpdate: true });
    const syncResult =
      connection.provider === 'plaid'
        ? await syncPlaidConnection(client, userId, connection)
        : await syncSandboxConnection(client, userId, connection);

    await client.query(
      `
        UPDATE bank_connections
        SET
          last_error = '',
          last_synced_at = NOW(),
          provider_sync_cursor = $2,
          status = 'connected'
        WHERE id = $1
      `,
      [connection.id, syncResult.next_cursor || '']
    );

    await client.query('COMMIT');

    const refreshedConnection = await getBankConnection(userId, connection.id, pool);

    return {
      connection: serializeConnection({
        ...refreshedConnection,
      }),
      imported_count: syncResult.imported_count,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    await pool
      .query(
        `
          UPDATE bank_connections
          SET
            last_error = $2,
            status = 'attention'
          WHERE id = $1 AND user_id = $3
        `,
        [connectionId, String(error.message || 'Sync failed.').slice(0, 255), userId]
      )
      .catch(() => null);
    throw error;
  } finally {
    client.release();
  }
};

const getReconciliationQueue = async (userId, db = pool) => {
  await ensureBankConnectionSchema();

  const result = await db.query(
    `
      SELECT
        t.id,
        t.account_id,
        a.name AS account_name,
        t.category_id,
        c.name AS category_name,
        t.amount,
        t.bank_connection_id,
        bc.label AS bank_connection_label,
        t.description,
        t.merchant_name,
        t.notes,
        t.posted_at,
        t.reconciliation_status,
        t.transaction_date,
        t.type
      FROM transactions t
      INNER JOIN accounts a
        ON a.id = t.account_id
        AND a.user_id = t.user_id
      INNER JOIN categories c
        ON c.id = t.category_id
        AND c.user_id = t.user_id
      INNER JOIN bank_connections bc
        ON bc.id = t.bank_connection_id
        AND bc.user_id = t.user_id
      WHERE
        t.user_id = $1
        AND t.bank_connection_id IS NOT NULL
        AND t.reconciliation_status <> 'reconciled'
      ORDER BY t.transaction_date DESC, t.id DESC
    `,
    [userId]
  );

  return result.rows.map(serializeQueueItem);
};

const reconcileImportedTransaction = async (userId, transactionId, payload, db = pool) => {
  await ensureBankConnectionSchema();

  const transactionResult = await db.query(
    `
      SELECT id, type
      FROM transactions
      WHERE
        id = $1
        AND user_id = $2
        AND bank_connection_id IS NOT NULL
    `,
    [transactionId, userId]
  );

  if (transactionResult.rowCount === 0) {
    throw new AppError('Imported transaction not found.', 404);
  }

  let categoryId = null;

  if (payload.category_id) {
    const categoryResult = await db.query(
      `
        SELECT id
        FROM categories
        WHERE id = $1 AND user_id = $2 AND type = $3
      `,
      [payload.category_id, userId, transactionResult.rows[0].type]
    );

    if (categoryResult.rowCount === 0) {
      throw new AppError('The selected category does not match the imported transaction type.', 400);
    }

    categoryId = Number(categoryResult.rows[0].id);
  }

  await db.query(
    `
      UPDATE transactions
      SET
        category_id = COALESCE($3, category_id),
        notes = CASE
          WHEN $4 = '' THEN notes
          ELSE $4
        END,
        reconciliation_status = 'reconciled'
      WHERE id = $1 AND user_id = $2
    `,
    [transactionId, userId, categoryId, String(payload.notes || '').trim()]
  );

  const queue = await getReconciliationQueue(userId, db);
  return queue.find((item) => item.id === Number(transactionId)) || null;
};

const createPlaidLinkToken = async (user) => createPlaidProviderLinkToken({ user });

const createPlaidBankConnections = async (userId, payload) => {
  await ensureBankConnectionSchema();
  assertProviderAvailable('plaid');
  const exchanged = await exchangePlaidPublicToken({
    publicToken: payload.public_token,
  });

  const selectedAccounts = Array.isArray(payload.accounts) && payload.accounts.length
    ? payload.accounts
    : exchanged.accounts.slice(0, 1).map((account) => ({ id: account.id }));

  if (!selectedAccounts.length) {
    throw new AppError('Choose at least one Plaid account to connect.', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const connections = [];

    for (const selectedAccount of selectedAccounts) {
      const plaidAccount = exchanged.accounts.find((account) => account.id === selectedAccount.id);

      if (!plaidAccount) {
        throw new AppError('One of the selected Plaid accounts is no longer available.', 400);
      }

      const existingConnection = await findExistingPlaidConnection(client, userId, plaidAccount.id);
      const label = (
        selectedAccount.label ||
        payload.label ||
        `${payload.institution_name} ${plaidAccount.name}`
      )
        .trim()
        .slice(0, 80);
      const providerMetadata = JSON.stringify({
        official_name: plaidAccount.official_name || '',
        subtype: plaidAccount.subtype || '',
        type: plaidAccount.type || '',
      });

      let record;

      if (existingConnection) {
        const updated = await client.query(
          `
            UPDATE bank_connections
            SET
              institution_name = $3,
              label = $4,
              provider_item_id = $5,
              provider_account_mask = $6,
              provider_access_token_ciphertext = $7,
              provider_sync_cursor = '',
              provider_metadata = $8::jsonb,
              status = 'connected',
              last_error = ''
            WHERE id = $1 AND user_id = $2
            RETURNING *
          `,
          [
            existingConnection.id,
            userId,
            payload.institution_name.trim(),
            label,
            exchanged.item_id,
            plaidAccount.mask || '',
            exchanged.access_token_ciphertext,
            providerMetadata,
          ]
        );

        record = updated.rows[0];
      } else {
        const created = await client.query(
          `
            INSERT INTO bank_connections (
              user_id,
              provider,
              institution_name,
              label,
              provider_item_id,
              provider_account_id,
              provider_account_mask,
              provider_access_token_ciphertext,
              provider_metadata
            )
            VALUES ($1, 'plaid', $2, $3, $4, $5, $6, $7, $8::jsonb)
            RETURNING *
          `,
          [
            userId,
            payload.institution_name.trim(),
            label,
            exchanged.item_id,
            plaidAccount.id,
            plaidAccount.mask || '',
            exchanged.access_token_ciphertext,
            providerMetadata,
          ]
        );

        record = created.rows[0];
      }

      const ledgerAccountId = await upsertLedgerAccount(client, userId, record, {
        account_type: mapPlaidAccountType(plaidAccount),
        institution_name: payload.institution_name.trim(),
        masked_identifier: plaidAccount.mask || '',
        name: label,
        notes: 'Created automatically for Plaid bank sync.',
      });

      connections.push(
        serializeConnection({
          ...record,
          ledger_account_id: ledgerAccountId,
        })
      );
    }

    await client.query('COMMIT');

    return connections;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createBankConnection,
  createPlaidBankConnections,
  createPlaidLinkToken,
  ensureBankConnectionSchema,
  getReconciliationQueue,
  listBankConnections,
  listBankProviders,
  reconcileImportedTransaction,
  syncBankConnection,
};
