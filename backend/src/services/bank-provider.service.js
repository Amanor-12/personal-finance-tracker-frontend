const crypto = require('crypto');

const {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} = require('plaid');

const {
  enableSandboxBankProvider,
  bankTokenEncryptionSecret,
  plaidClientId,
  plaidCountryCodes,
  plaidEnv,
  plaidRedirectUri,
  plaidSecret,
  plaidWebhookUrl,
} = require('../config/env');
const AppError = require('../utils/AppError');

const PLAID_PRODUCTS = [Products.Transactions];
const PLAID_ENVIRONMENTS = {
  production: PlaidEnvironments.production,
  sandbox: PlaidEnvironments.sandbox,
};

let plaidClient;

const buildCipherKey = () =>
  crypto.createHash('sha256').update(String(bankTokenEncryptionSecret || '')).digest();

const encryptSecret = (plainValue) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', buildCipherKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainValue || ''), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
};

const decryptSecret = (ciphertext) => {
  const [ivValue, authTagValue, payloadValue] = String(ciphertext || '').split('.');

  if (!ivValue || !authTagValue || !payloadValue) {
    throw new AppError('The bank connection secret could not be read.', 500);
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    buildCipherKey(),
    Buffer.from(ivValue, 'base64url')
  );

  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));

  const clearText = Buffer.concat([
    decipher.update(Buffer.from(payloadValue, 'base64url')),
    decipher.final(),
  ]);

  return clearText.toString('utf8');
};

const isPlaidConfigured = () => Boolean(plaidClientId && plaidSecret);

const getPlaidClient = () => {
  if (!isPlaidConfigured()) {
    return null;
  }

  if (!plaidClient) {
    const configuration = new Configuration({
      basePath: PLAID_ENVIRONMENTS[plaidEnv] || PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': plaidClientId,
          'PLAID-SECRET': plaidSecret,
          'Plaid-Version': '2020-09-14',
        },
      },
    });

    plaidClient = new PlaidApi(configuration);
  }

  return plaidClient;
};

const assertPlaidConfigured = () => {
  if (!isPlaidConfigured()) {
    throw new AppError('Plaid is not configured for this environment yet.', 501, {
      missing: [
        !plaidClientId ? 'PLAID_CLIENT_ID' : null,
        !plaidSecret ? 'PLAID_SECRET' : null,
      ].filter(Boolean),
      provider: 'plaid',
    });
  }
};

const normalizePlaidError = (error) => {
  const payload = error?.response?.data || error?.data || {};
  const message =
    payload?.display_message ||
    payload?.error_message ||
    error?.message ||
    'Plaid could not complete the requested bank action.';

  return {
    code: payload?.error_code || '',
    message,
    requestId: payload?.request_id || '',
    type: payload?.error_type || '',
  };
};

const toCountryCode = (value) => {
  const normalizedValue = String(value || 'US').toUpperCase();
  return CountryCode[normalizedValue] || normalizedValue;
};

const listBankProviders = () => {
  const providers = [
    {
      description: isPlaidConfigured()
        ? 'Live institution linking and transaction sync through Plaid Link.'
        : 'Configure Plaid credentials to unlock live institution linking.',
      id: 'plaid',
      mode: plaidEnv,
      name: 'Plaid',
      status: isPlaidConfigured() ? 'available' : 'unconfigured',
      supportsLink: true,
    },
  ];

  if (enableSandboxBankProvider) {
    providers.unshift({
      description:
        'A controlled import feed for validating account setup and reconciliation before live banking is connected.',
      id: 'sandbox',
      mode: 'sandbox',
      name: 'Test institution',
      status: 'available',
      supportsLink: false,
    });
  }

  return providers;
};

const assertProviderAvailable = (provider) => {
  if (provider === 'sandbox') {
    if (!enableSandboxBankProvider) {
      throw new AppError('The selected bank connection provider is not enabled in this environment.', 501, {
        provider: 'sandbox',
      });
    }

    return;
  }

  if (provider === 'plaid') {
    assertPlaidConfigured();
    return;
  }

  throw new AppError('The selected bank connection provider is not supported.', 400);
};

const createPlaidLinkToken = async ({ user }) => {
  assertPlaidConfigured();
  const plaidClientInstance = getPlaidClient();

  try {
    const response = await plaidClientInstance.linkTokenCreate({
      client_name: 'Rivo',
      country_codes: plaidCountryCodes.map((value) => toCountryCode(value)),
      language: 'en',
      products: PLAID_PRODUCTS,
      redirect_uri: plaidRedirectUri || undefined,
      user: {
        client_user_id: String(user.id),
      },
      webhook: plaidWebhookUrl || undefined,
    });

    return {
      expiration: response.data.expiration,
      link_token: response.data.link_token,
      provider: 'plaid',
    };
  } catch (error) {
    const normalizedError = normalizePlaidError(error);
    throw new AppError(normalizedError.message, 502, {
      provider: 'plaid',
      requestId: normalizedError.requestId,
      type: normalizedError.type,
    });
  }
};

const exchangePlaidPublicToken = async ({ publicToken }) => {
  assertPlaidConfigured();
  const plaidClientInstance = getPlaidClient();

  try {
    const exchange = await plaidClientInstance.itemPublicTokenExchange({
      public_token: String(publicToken || '').trim(),
    });

    const accessToken = exchange.data.access_token;
    const accountsResponse = await plaidClientInstance.accountsGet({
      access_token: accessToken,
    });

    return {
      access_token_ciphertext: encryptSecret(accessToken),
      accounts: (accountsResponse.data.accounts || []).map((account) => ({
        id: account.account_id,
        mask: account.mask || '',
        name: account.name || account.official_name || 'Linked account',
        official_name: account.official_name || '',
        subtype: account.subtype || '',
        type: account.type || '',
      })),
      item_id: exchange.data.item_id,
    };
  } catch (error) {
    const normalizedError = normalizePlaidError(error);
    throw new AppError(normalizedError.message, 502, {
      provider: 'plaid',
      requestId: normalizedError.requestId,
      type: normalizedError.type,
    });
  }
};

const syncPlaidTransactions = async ({
  accountId,
  accessTokenCiphertext,
  cursor = '',
}) => {
  assertPlaidConfigured();
  const plaidClientInstance = getPlaidClient();
  const accessToken = decryptSecret(accessTokenCiphertext);
  const addedTransactions = [];
  const removedTransactions = [];
  let hasMore = true;
  let nextCursor = cursor || null;
  let attempts = 0;

  try {
    while (hasMore) {
      attempts += 1;
      if (attempts > 10) {
        throw new AppError('Plaid transaction sync exceeded the safe pagination limit.', 502);
      }

      const response = await plaidClientInstance.transactionsSync({
        access_token: accessToken,
        cursor: nextCursor || undefined,
      });

      const payload = response.data || {};
      const matchingTransactions = [...(payload.added || []), ...(payload.modified || [])].filter(
        (transaction) => transaction.account_id === accountId
      );

      addedTransactions.push(...matchingTransactions);
      removedTransactions.push(
        ...(payload.removed || [])
          .filter((transaction) => transaction.account_id === accountId)
          .map((transaction) => transaction.transaction_id)
      );

      hasMore = Boolean(payload.has_more);
      nextCursor = payload.next_cursor || nextCursor;
    }

    return {
      next_cursor: nextCursor || '',
      removed_transaction_ids: removedTransactions,
      transactions: addedTransactions,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const normalizedError = normalizePlaidError(error);
    throw new AppError(normalizedError.message, 502, {
      provider: 'plaid',
      requestId: normalizedError.requestId,
      type: normalizedError.type,
    });
  }
};

module.exports = {
  assertProviderAvailable,
  createPlaidLinkToken,
  decryptSecret,
  exchangePlaidPublicToken,
  getPlaidClient,
  isPlaidConfigured,
  listBankProviders,
  syncPlaidTransactions,
};
