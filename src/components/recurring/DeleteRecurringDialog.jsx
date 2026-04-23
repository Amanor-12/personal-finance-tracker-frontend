import RecurringIcon from './RecurringIcon';
import { formatRecurringCurrency } from './recurringUtils';

function DeleteRecurringDialog({ isDeleting, onCancel, onConfirm, payment }) {
  if (!payment) {
    return null;
  }

  return (
    <div className="ledger-dialog-backdrop" role="presentation" onClick={onCancel}>
      <section
        aria-labelledby="delete-recurring-title"
        aria-modal="true"
        className="ledger-dialog ledger-delete-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ledger-delete-icon" aria-hidden="true">
          <RecurringIcon type="trash" />
        </div>
        <span className="ledger-eyebrow">Destructive action</span>
        <h2 id="delete-recurring-title">Delete this recurring payment?</h2>
        <p>
          This removes <strong>{payment.name}</strong> for{' '}
          <strong>{formatRecurringCurrency(payment.amount)}</strong>. Existing transactions will not be deleted.
        </p>
        <div className="ledger-dialog-actions">
          <button className="ledger-secondary-action" type="button" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="ledger-danger-action" type="button" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete recurring payment'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteRecurringDialog;
