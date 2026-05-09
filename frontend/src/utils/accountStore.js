import { apiClient } from './apiClient';
import { apiContracts } from './apiContracts';

const normalizeAccount = (account) => ({
  id: account.id,
  accountType: account.accountType || account.account_type,
  createdAt: account.createdAt || account.created_at || null,
  currency: account.currency || 'USD',
  currentBalance: Number(account.currentBalance || account.current_balance) || 0,
  institutionName: account.institutionName || account.institution_name || '',
  isPrimary: Boolean(account.isPrimary || account.is_primary),
  maskedIdentifier: account.maskedIdentifier || account.masked_identifier || '',
  name: account.name || '',
  notes: account.notes || '',
  openingBalance: Number(account.openingBalance || account.opening_balance) || 0,
  status: account.status || 'active',
  updatedAt: account.updatedAt || account.updated_at || null,
});

const normalizeConnection = (connection) => ({
  createdAt: connection.createdAt || connection.created_at || null,
  id: Number(connection.id) || 0,
  importedCount: Number(connection.importedCount || connection.imported_count) || 0,
  institutionName: connection.institutionName || connection.institution_name || '',
  label: connection.label || '',
  lastError: connection.lastError || connection.last_error || '',
  lastSyncedAt: connection.lastSyncedAt || connection.last_synced_at || null,
  ledgerAccountId: Number(connection.ledgerAccountId || connection.ledger_account_id) || null,
  provider: connection.provider || 'sandbox',
  providerAccountMask: connection.providerAccountMask || connection.provider_account_mask || '',
  status: connection.status || 'connected',
  unreconciledCount: Number(connection.unreconciledCount || connection.unreconciled_count) || 0,
  updatedAt: connection.updatedAt || connection.updated_at || null,
});

const normalizeProvider = (provider) => ({
  description: provider.description || '',
  id: provider.id || '',
  mode: provider.mode || '',
  name: provider.name || provider.id || '',
  status: provider.status || 'unconfigured',
  supportsLink: Boolean(provider.supportsLink ?? provider.supports_link),
});

const normalizeReconciliationItem = (item) => ({
  accountId: Number(item.accountId || item.account_id) || 0,
  accountName: item.accountName || item.account_name || '',
  amount: Number(item.amount) || 0,
  bankConnectionId: Number(item.bankConnectionId || item.bank_connection_id) || 0,
  bankConnectionLabel: item.bankConnectionLabel || item.bank_connection_label || '',
  categoryId: Number(item.categoryId || item.category_id) || 0,
  categoryName: item.categoryName || item.category_name || '',
  description: item.description || '',
  id: Number(item.id) || 0,
  merchantName: item.merchantName || item.merchant_name || '',
  notes: item.notes || '',
  postedAt: item.postedAt || item.posted_at || null,
  reconciliationStatus: item.reconciliationStatus || item.reconciliation_status || 'manual',
  transactionDate: item.transactionDate || item.transaction_date || null,
  type: item.type || 'expense',
});

const buildAccountPayload = (payload) => ({
  account_type: payload.accountType,
  currency: payload.currency.trim().toUpperCase(),
  institution_name: payload.institutionName?.trim() || '',
  masked_identifier: payload.maskedIdentifier?.trim() || '',
  name: payload.name.trim(),
  notes: payload.notes?.trim() || '',
  opening_balance: Number(payload.openingBalance || 0),
  is_primary: Boolean(payload.isPrimary),
});

export const accountStore = {
  async archiveAccount(userId, accountId) {
    await apiClient.delete(`/api/accounts/${accountId}`);
    return this.getAccountsForUser(userId);
  },
  async getAccountsForUser() {
    const response = await apiClient.get('/api/accounts');
    return response.accounts.map((account) => normalizeAccount(account));
  },
  async getBankProviders() {
    const response = await apiClient.get(apiContracts.accounts.bankProviders.path);
    return (response.providers || []).map((provider) => normalizeProvider(provider));
  },
  async getBankConnections() {
    const response = await apiClient.get(apiContracts.accounts.bankConnections.path);
    return (response.connections || []).map((connection) => normalizeConnection(connection));
  },
  async createPlaidLinkToken() {
    const response = await apiClient.post(apiContracts.accounts.bankConnectionPlaidLinkToken.path, {});
    return response.linkToken || response.link_token || null;
  },
  async exchangePlaidPublicToken(payload) {
    const response = await apiClient.post(apiContracts.accounts.bankConnectionPlaidExchange.path, {
      accounts: Array.isArray(payload.accounts)
        ? payload.accounts.map((account) => ({
            id: account.id,
            ...(account.label ? { label: account.label } : {}),
          }))
        : undefined,
      institution_id: payload.institutionId || '',
      institution_name: payload.institutionName,
      public_token: payload.publicToken,
    });

    return {
      connections: (response.connections || []).map((connection) => normalizeConnection(connection)),
      message: response.message || 'Plaid connection created successfully.',
    };
  },
  async createBankConnection(payload) {
    const response = await apiClient.post(apiContracts.accounts.bankConnectionCreate.path, {
      institution_name: payload.institutionName.trim(),
      label: payload.label.trim(),
      provider: payload.provider || 'sandbox',
    });

    return normalizeConnection(response.connection);
  },
  async syncBankConnection(connectionId) {
    const response = await apiClient.post(
      apiContracts.accounts.bankConnectionSync.path.replace(':id', String(connectionId)),
      {}
    );
    return {
      connection: normalizeConnection(response.connection),
      importedCount: Number(response.importedCount || response.imported_count) || 0,
      message: response.message || 'Bank sync completed.',
    };
  },
  async getReconciliationQueue() {
    const response = await apiClient.get(apiContracts.accounts.reconciliationQueue.path);
    return (response.queue || []).map((item) => normalizeReconciliationItem(item));
  },
  async reconcileImportedTransaction(transactionId, payload = {}) {
    return apiClient.post(
      apiContracts.accounts.reconcileImportedTransaction.path.replace(':id', String(transactionId)),
      {
        ...(payload.categoryId ? { category_id: payload.categoryId } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      }
    );
  },
  async saveAccount(userId, payload) {
    const requestBody = buildAccountPayload(payload);
    const response = payload.id
      ? await apiClient.put(`/api/accounts/${payload.id}`, requestBody)
      : await apiClient.post('/api/accounts', requestBody);

    return normalizeAccount(response.account);
  },
  async setPrimaryAccount(userId, accountId) {
    const response = await apiClient.patch(`/api/accounts/${accountId}/primary`, {});
    return normalizeAccount(response.account);
  },
};
