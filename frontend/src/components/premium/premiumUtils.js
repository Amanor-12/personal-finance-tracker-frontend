export const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  style: 'currency',
});

export const formatMoney = (value) => currencyFormatter.format(Number(value) || 0);
