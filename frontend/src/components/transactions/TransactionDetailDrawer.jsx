import TransactionsIcon from './TransactionsIcon';
import {
  formatCurrency,
  formatDate,
  getTransactionAccountName,
  getTransactionStatus,
  getTransactionTitle,
} from './transactionUtils';

function DetailRow({ label, value }) {
  return (
    <div className="ledger-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TransactionDetailDrawer({ onClose, onDelete, onEdit, transaction }) {
  if (!transaction) {
    return null;
  }

  const amountPrefix = transaction.type === 'income' ? '+' : '-';

  return (
    <div className="ledger-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        aria-label="Transaction details"
        aria-modal="true"
        className="ledger-detail-drawer"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ledger-drawer-head">
          <div>
            <span className="ledger-eyebrow">Transaction detail</span>
            <h2>{getTransactionTitle(transaction)}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close transaction details">
            <TransactionsIcon type="close" />
          </button>
        </div>

        <div className={`ledger-detail-amount-card ledger-detail-${transaction.type}`}>
          <span>{transaction.type === 'income' ? 'Inflow' : 'Outflow'}</span>
          <strong>
            {amountPrefix}
            {formatCurrency(transaction.amount)}
          </strong>
          <p>{getTransactionStatus(transaction)} in your private ledger</p>
        </div>

        <div className="ledger-detail-grid">
          <DetailRow label="Category" value={transaction.categoryName || 'Uncategorized'} />
          <DetailRow label="Account" value={getTransactionAccountName(transaction) || 'No account linked'} />
          <DetailRow label="Date" value={formatDate(transaction.transactionDate)} />
          <DetailRow label="Type" value={transaction.type} />
          <DetailRow label="Status" value={getTransactionStatus(transaction)} />
          <DetailRow label="Record ID" value={`#${transaction.id}`} />
        </div>

        <div className="ledger-detail-note">
          <span>Notes</span>
          <p>{transaction.notes || 'No notes field is connected in the API yet.'}</p>
        </div>

        <div className="ledger-detail-actions">
          <button className="ledger-secondary-action" type="button" onClick={() => onEdit(transaction)}>
            <TransactionsIcon type="edit" />
            Edit transaction
          </button>
          <button className="ledger-danger-action" type="button" onClick={() => onDelete(transaction)}>
            <TransactionsIcon type="delete" />
            Delete
          </button>
        </div>
      </aside>
    </div>
  );
}

export default TransactionDetailDrawer;
