import { formatCurrency } from './transactionUtils';

function SummaryCard({ label, value, helper, tone = 'neutral' }) {
  return (
    <article className={`ledger-summary-card ledger-summary-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

function TransactionSummary({ summary, totalCount }) {
  return (
    <section className="ledger-summary-grid" aria-label="Transaction summary">
      <SummaryCard
        label="Total inflow"
        value={formatCurrency(summary.inflow)}
        helper="Income in the current view"
        tone="income"
      />
      <SummaryCard
        label="Total outflow"
        value={formatCurrency(summary.outflow)}
        helper="Expenses in the current view"
        tone="expense"
      />
      <SummaryCard
        label="Net cash flow"
        value={formatCurrency(summary.net)}
        helper={summary.net >= 0 ? 'Positive movement' : 'Negative movement'}
        tone={summary.net >= 0 ? 'income' : 'expense'}
      />
      <SummaryCard
        label="Transactions"
        value={String(summary.count)}
        helper={`${totalCount} total record${totalCount === 1 ? '' : 's'} loaded`}
      />
    </section>
  );
}

export default TransactionSummary;
