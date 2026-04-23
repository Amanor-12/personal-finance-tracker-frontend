export const EMPTY_ACCOUNT_FILTERS = {
  query: '',
  status: 'active',
  type: 'all',
};

export const accountTypeOptions = [
  { label: 'Checking', value: 'checking' },
  { label: 'Savings', value: 'savings' },
  { label: 'Credit card', value: 'credit_card' },
  { label: 'Cash', value: 'cash' },
  { label: 'Investment', value: 'investment' },
  { label: 'Other', value: 'other' },
];

export const accountStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
  { label: 'All', value: 'all' },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const formatAccountCurrency = (value, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      currency,
      style: 'currency',
    }).format(Number(value) || 0);
  } catch {
    return currencyFormatter.format(Number(value) || 0);
  }
};

export const formatAccountDate = (value) => {
  if (!value) {
    return 'Not updated yet';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not updated yet';
  }

  return dateFormatter.format(parsedDate);
};

export const getAccountTypeLabel = (value) =>
  accountTypeOptions.find((option) => option.value === value)?.label || 'Other';

export const createAccountForm = (account = null) => ({
  accountType: account?.accountType || 'checking',
  currency: account?.currency || 'USD',
  id: account?.id || '',
  institutionName: account?.institutionName || '',
  isPrimary: Boolean(account?.isPrimary),
  maskedIdentifier: account?.maskedIdentifier || '',
  name: account?.name || '',
  notes: account?.notes || '',
  openingBalance:
    account?.openingBalance === undefined || account?.openingBalance === null
      ? ''
      : String(account.openingBalance),
});

export const summarizeAccounts = (accounts) => {
  const activeAccounts = accounts.filter((account) => account.status === 'active');
  const totalBalance = activeAccounts.reduce(
    (total, account) => total + (Number(account.currentBalance) || 0),
    0
  );
  const distribution = activeAccounts.reduce((map, account) => {
    const label = getAccountTypeLabel(account.accountType);
    map.set(label, (map.get(label) || 0) + 1);
    return map;
  }, new Map());

  return {
    activeCount: activeAccounts.length,
    archivedCount: accounts.length - activeAccounts.length,
    distribution: [...distribution.entries()].map(([label, count]) => ({ count, label })),
    primaryAccount: activeAccounts.find((account) => account.isPrimary) || null,
    totalBalance,
  };
};

export const filterAccounts = (accounts, filters) => {
  const query = filters.query.trim().toLowerCase();

  return accounts.filter((account) => {
    const haystack = [
      account.name,
      account.institutionName,
      account.maskedIdentifier,
      account.currency,
      getAccountTypeLabel(account.accountType),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (filters.status !== 'all' && account.status !== filters.status) {
      return false;
    }

    if (filters.type !== 'all' && account.accountType !== filters.type) {
      return false;
    }

    return query ? haystack.includes(query) : true;
  });
};
