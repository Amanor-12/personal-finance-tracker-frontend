import TransactionsIcon from './TransactionsIcon';
import { formatCurrency, getTransactionTitle } from './transactionUtils';

function DeleteTransactionDialog({ isDeleting, onCancel, onConfirm, transaction }) {
  if (!transaction) {
    return null;
  }

  return (
    <div className="ledger-dialog-backdrop" role="presentation" onClick={onCancel}>
      <section
        aria-labelledby="delete-transaction-title"
        aria-modal="true"
        className="ledger-dialog ledger-delete-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ledger-delete-icon" aria-hidden="true">
          <TransactionsIcon type="delete" />
        </div>
        <span className="ledger-eyebrow">Destructive action</span>
        <h2 id="delete-transaction-title">Delete this transaction?</h2>
        <p>
          This will remove <strong>{getTransactionTitle(transaction)}</strong> for{' '}
          <strong>{formatCurrency(transaction.amount)}</strong> from your ledger.
        </p>
        <div className="ledger-dialog-actions">
          <button className="ledger-secondary-action" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="ledger-danger-action" type="button" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete transaction'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteTransactionDialog;
