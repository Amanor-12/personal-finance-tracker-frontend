import { apiClient } from './apiClient';

export const defaultServiceCapabilities = {
  accounts: false,
  ai: false,
  auth: {
    deleteAccount: false,
    emailVerification: false,
    mfa: false,
    password: false,
    passwordReset: false,
    preferences: false,
    profile: false,
    security: false,
  },
  billing: false,
  goals: false,
  recurringPayments: false,
  reports: false,
  transactions: {
    export: false,
    savedViews: false,
  },
};

let cachedCapabilities = defaultServiceCapabilities;

const mergeCapabilities = (source = {}) => ({
  ...defaultServiceCapabilities,
  ...source,
  auth: {
    ...defaultServiceCapabilities.auth,
    ...(source.auth || {}),
  },
  transactions: {
    ...defaultServiceCapabilities.transactions,
    ...(source.transactions || {}),
  },
});

const getCapabilityValue = (capabilities, path) =>
  String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((currentValue, key) => currentValue?.[key], capabilities);

export const serviceCapabilitiesStore = {
  getCachedCapabilities() {
    return cachedCapabilities;
  },
  getCapability(path) {
    return Boolean(getCapabilityValue(cachedCapabilities, path));
  },
  async loadCapabilities() {
    const payload = await apiClient.get('/api/health', {
      auth: false,
      retryOnAuthFailure: false,
    });

    cachedCapabilities = mergeCapabilities(payload?.capabilities || {});
    return cachedCapabilities;
  },
};
