import GoalsIcon from './GoalsIcon';
import { formatGoalCurrency } from './goalUtils';

function DeleteGoalDialog({ goal, isDeleting, onCancel, onConfirm }) {
  if (!goal) {
    return null;
  }

  return (
    <div className="ledger-dialog-backdrop" role="presentation" onClick={onCancel}>
      <section
        aria-labelledby="delete-goal-title"
        aria-modal="true"
        className="ledger-dialog ledger-delete-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ledger-delete-icon" aria-hidden="true">
          <GoalsIcon type="trash" />
        </div>
        <span className="ledger-eyebrow">Destructive action</span>
        <h2 id="delete-goal-title">Delete this goal?</h2>
        <p>
          This removes <strong>{goal.title}</strong> with a target of{' '}
          <strong>{formatGoalCurrency(goal.targetAmount)}</strong>. It will not delete transactions or accounts.
        </p>
        <div className="ledger-dialog-actions">
          <button className="ledger-secondary-action" type="button" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="ledger-danger-action" type="button" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete goal'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteGoalDialog;
