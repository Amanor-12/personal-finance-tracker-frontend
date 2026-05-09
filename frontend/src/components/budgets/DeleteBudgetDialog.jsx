import BudgetsIcon from './BudgetsIcon';
import { formatBudgetCurrency, formatBudgetPeriod } from './budgetUtils';

function DeleteBudgetDialog({ budget, isDeleting, onCancel, onConfirm }) {
  if (!budget) {
    return null;
  }

  return (
    <div className="ledger-dialog-backdrop" role="presentation" onClick={onCancel}>
      <section
        aria-labelledby="delete-budget-title"
        aria-modal="true"
        className="ledger-dialog ledger-delete-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ledger-delete-icon" aria-hidden="true">
          <BudgetsIcon type="trash" />
        </div>
        <span className="ledger-eyebrow">Destructive action</span>
        <h2 id="delete-budget-title">Delete this budget?</h2>
        <p>
          This removes the <strong>{budget.categoryName}</strong> plan for{' '}
          <strong>{formatBudgetPeriod(budget.month, budget.year)}</strong>. It will not delete any transactions.
        </p>
        <div className="ledger-dialog-actions">
          <button className="ledger-secondary-action" type="button" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="ledger-danger-action" type="button" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : `Delete ${formatBudgetCurrency(budget.amountLimit)} budget`}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteBudgetDialog;
