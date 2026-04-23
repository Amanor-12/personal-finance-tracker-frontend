const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  minimumFractionDigits: 2,
  style: 'currency',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const recurringFrequencyOptions = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Every 2 weeks', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annual', value: 'annual' },
  { label: 'Custom', value: 'custom' },
];

export const recurringStatusOptions = [
  { label: 'All states', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export const recurringSortOptions = [
  { label: 'Next payment', value: 'next' },
  { label: 'Highest monthly cost', value: 'monthly' },
  { label: 'Largest charge', value: 'amount' },
  { label: 'Name A-Z', value: 'name' },
];

export const EMPTY_RECURRING_FILTERS = {
  frequency: 'all',
  query: '',
  sortBy: 'next',
  status: 'all',
};

export const formatRecurringCurrency = (value) => currencyFormatter.format(Number(value) || 0);

export const formatRecurringDate = (value) => (value ? dateFormatter.format(new Date(value)) : 'No date');

export const getFrequencyLabel = (value) =>
  recurringFrequencyOptions.find((option) => option.value === value)?.label || 'Custom';

export const getRecurringTone = (payment) => {
  if (payment.status === 'inactive') {
    return { label: 'Inactive', tone: 'inactive' };
  }

  if (payment.daysUntilNextPayment !== null && payment.daysUntilNextPayment < 0) {
    return { label: 'Past due', tone: 'overdue' };
  }

  if (payment.daysUntilNextPayment !== null && payment.daysUntilNextPayment <= 7) {
    return { label: 'Due soon', tone: 'soon' };
  }

  return { label: 'Active', tone: 'active' };
};

export const formatDaysUntil = (days) => {
  if (days === null || days === undefined) {
    return 'No date';
  }

  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  }

  if (days === 0) {
    return 'Due today';
  }

  return `In ${days} day${days === 1 ? '' : 's'}`;
};

export const filterRecurringPayments = (payments, filters) => {
  const query = filters.query.trim().toLowerCase();

  return payments.filter((payment) => {
    const matchesStatus = filters.status === 'all' || payment.status === filters.status;
    const matchesFrequency = filters.frequency === 'all' || payment.billingFrequency === filters.frequency;
    const searchable = [
      payment.name,
      payment.categoryName,
      payment.accountName,
      getFrequencyLabel(payment.billingFrequency),
      payment.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return matchesStatus && matchesFrequency && (!query || searchable.includes(query));
  });
};

export const sortRecurringPayments = (payments, sortBy) =>
  [...payments].sort((left, right) => {
    if (sortBy === 'monthly') {
      return right.monthlyAmount - left.monthlyAmount;
    }

    if (sortBy === 'amount') {
      return right.amount - left.amount;
    }

    if (sortBy === 'name') {
      return left.name.localeCompare(right.name);
    }

    return new Date(left.nextPaymentDate || 0).getTime() - new Date(right.nextPaymentDate || 0).getTime();
  });

export const summarizeRecurringPayments = (payments) => {
  const activePayments = payments.filter((payment) => payment.status === 'active');
  const monthlyTotal = activePayments.reduce((sum, payment) => sum + payment.monthlyAmount, 0);
  const annualTotal = activePayments.reduce((sum, payment) => sum + payment.annualAmount, 0);
  const upcoming = [...activePayments]
    .filter((payment) => payment.nextPaymentDate)
    .sort((left, right) => new Date(left.nextPaymentDate).getTime() - new Date(right.nextPaymentDate).getTime())[0];

  return {
    activeCount: activePayments.length,
    annualTotal,
    count: payments.length,
    monthlyTotal,
    upcoming: upcoming || null,
  };
};

export const createRecurringForm = (payment, categories) => ({
  accountId: payment?.accountId ? String(payment.accountId) : '',
  amount: payment?.amount ? String(payment.amount) : '',
  billingFrequency: payment?.billingFrequency || 'monthly',
  categoryId: payment?.categoryId ? String(payment.categoryId) : categories[0]?.id ? String(categories[0].id) : '',
  id: payment?.id ? String(payment.id) : '',
  name: payment?.name || '',
  nextPaymentDate: payment?.nextPaymentDate ? String(payment.nextPaymentDate).slice(0, 10) : '',
  notes: payment?.notes || '',
  status: payment?.status || 'active',
});

export const buildRecurringPayload = (values, paymentId) => ({
  accountId: values.accountId,
  amount: values.amount,
  billingFrequency: values.billingFrequency,
  categoryId: values.categoryId,
  id: paymentId || values.id || undefined,
  name: values.name.trim(),
  nextPaymentDate: values.nextPaymentDate,
  notes: values.notes || '',
  status: values.status,
});
