import { apiClient } from './apiClient';

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
