import TransactionsIcon from './TransactionsIcon';
import {
  formatCurrency,
  formatDate,
  getTransactionAccountName,
  getTransactionStatus,
  getTransactionTitle,
} from './transactionUtils';

function TransactionSkeleton() {
  return (
    <div className="ledger-skeleton-list" aria-label="Loading transactions">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="ledger-skeleton-row" key={index}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function TransactionEmptyState({ hasTransactions, onAddTransaction }) {
  return (
    <div className="ledger-empty-state">
      <div className="ledger-empty-orb" aria-hidden="true">
        <TransactionsIcon type="ledger" />
      </div>
      <span className="ledger-eyebrow">No financial records shown</span>
      <h2>{hasTransactions ? 'No transactions match these filters' : 'Your ledger is clean'}</h2>
      <p>
        {hasTransactions
          ? 'Adjust the filters above to widen the view.'
          : 'Add your first income or expense when you are ready. Rivo will only show records that belong to your signed-in account.'}
      </p>
      {!hasTransactions ? (
        <button className="ledger-primary-action" type="button" onClick={onAddTransaction}>
          <TransactionsIcon type="plus" />
          Add first transaction
        </button>
      ) : null}
    </div>
  );
}

function TransactionErrorState({ message, onRetry }) {
  return (
    <div className="ledger-empty-state ledger-error-state" role="alert">
      <div className="ledger-empty-orb" aria-hidden="true">
        <TransactionsIcon type="shield" />
      </div>
      <span className="ledger-eyebrow">Connection issue</span>
      <h2>Transactions could not load</h2>
      <p>{message || 'The API did not return your ledger. Try again when the backend is running.'}</p>
      <button className="ledger-secondary-action" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function TransactionRow({ transaction, onDelete, onEdit, onSelect }) {
  const typeIcon = transaction.type === 'income' ? 'arrowDown' : 'arrowUp';
  const amountPrefix = transaction.type === 'income' ? '+' : '-';
  const accountName = getTransactionAccountName(transaction);

  return (
    <>
      <td>
        <div className="ledger-merchant-cell">
          <span className={`ledger-direction-mark ledger-direction-${transaction.type}`}>
            <TransactionsIcon type={typeIcon} />
          </span>
          <div>
            <strong>{getTransactionTitle(transaction)}</strong>
            <small>{transaction.description ? 'Manual record' : 'No description added'}</small>
          </div>
        </div>
      </td>
      <td>
        <span className="ledger-soft-badge">{transaction.categoryName || 'Uncategorized'}</span>
      </td>
      <td>
        <span className="ledger-muted-text">{accountName || 'No account linked'}</span>
      </td>
      <td>
        <span className={`ledger-type-badge ledger-type-${transaction.type}`}>{transaction.type}</span>
      </td>
      <td>{formatDate(transaction.transactionDate)}</td>
      <td>
        <strong className={`ledger-amount ledger-amount-${transaction.type}`}>
          {amountPrefix}
          {formatCurrency(transaction.amount)}
        </strong>
      </td>
      <td>
        <span className="ledger-status-badge">{getTransactionStatus(transaction)}</span>
      </td>
      <td>
        <div className="ledger-row-actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => onEdit(transaction)} aria-label={`Edit ${getTransactionTitle(transaction)}`}>
            <TransactionsIcon type="edit" />
          </button>
          <button
            className="ledger-danger-icon"
            type="button"
            onClick={() => onDelete(transaction)}
            aria-label={`Delete ${getTransactionTitle(transaction)}`}
          >
            <TransactionsIcon type="delete" />
          </button>
        </div>
      </td>
    </>
  );
}

function TransactionSelectCheckbox({ checked, label, onChange }) {
  return (
    <label className="ledger-select-check">
      <span className="ledger-visually-hidden">{label}</span>
      <input
        checked={checked}
        type="checkbox"
        onChange={onChange}
        onClick={(event) => event.stopPropagation()}
      />
    </label>
  );
}

function TransactionMobileCard({ selectionControl = null, transaction, onDelete, onEdit, onSelect }) {
  const amountPrefix = transaction.type === 'income' ? '+' : '-';

  return (
    <>
      <div className="ledger-mobile-card-top">
        {selectionControl ? <div className="ledger-mobile-select">{selectionControl}</div> : null}
        <div className="ledger-merchant-cell">
          <span className={`ledger-direction-mark ledger-direction-${transaction.type}`}>
            <TransactionsIcon type={transaction.type === 'income' ? 'arrowDown' : 'arrowUp'} />
          </span>
          <div>
            <strong>{getTransactionTitle(transaction)}</strong>
            <small>{transaction.categoryName || 'Uncategorized'}</small>
          </div>
        </div>
        <strong className={`ledger-amount ledger-amount-${transaction.type}`}>
          {amountPrefix}
          {formatCurrency(transaction.amount)}
        </strong>
      </div>
      <div className="ledger-mobile-card-meta">
        <span>{formatDate(transaction.transactionDate)}</span>
        <span>{getTransactionAccountName(transaction) || 'No account'}</span>
        <span>{getTransactionStatus(transaction)}</span>
      </div>
      <div className="ledger-mobile-card-actions" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => onEdit(transaction)}>
          Edit
        </button>
        <button type="button" onClick={() => onDelete(transaction)}>
          Delete
        </button>
      </div>
    </>
  );
}

function TransactionLedger({
  errorMessage,
  isLoading,
  onAddTransaction,
  onDelete,
  onEdit,
  onRetry,
  onSelect,
  onToggleSelect,
  onToggleSelectAll,
  selectedIds = [],
  transactions,
  totalTransactions,
}) {
  if (isLoading) {
    return (
      <section className="ledger-table-panel">
        <div className="ledger-table-head">
          <div>
            <span className="ledger-eyebrow">Ledger</span>
            <h2>Loading records</h2>
          </div>
        </div>
        <TransactionSkeleton />
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="ledger-table-panel">
        <TransactionErrorState message={errorMessage} onRetry={onRetry} />
      </section>
    );
  }

  if (!transactions.length) {
    return (
      <section className="ledger-table-panel">
        <TransactionEmptyState
          hasTransactions={totalTransactions > 0}
          onAddTransaction={onAddTransaction}
        />
      </section>
    );
  }

  return (
    <section className="ledger-table-panel">
      <div className="ledger-table-head">
        <div>
          <span className="ledger-eyebrow">Ledger</span>
          <h2>Transaction history</h2>
        </div>
        <p>{transactions.length} record{transactions.length === 1 ? '' : 's'} in this view</p>
      </div>

      <div className="ledger-table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th className="ledger-select-column">
                <TransactionSelectCheckbox
                  checked={Boolean(transactions.length) && transactions.every((transaction) => selectedIds.includes(transaction.id))}
                  label="Select all visible transactions"
                  onChange={() => onToggleSelectAll?.(transactions)}
                />
              </th>
              <th>Merchant / title</th>
              <th>Category</th>
              <th>Account</th>
              <th>Type</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr
                className={`ledger-table-row${selectedIds.includes(transaction.id) ? ' is-selected' : ''}`}
                key={transaction.id}
                onClick={() => onSelect(transaction)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(transaction);
                  }
                }}
                tabIndex="0"
              >
                <td className="ledger-select-column">
                  <TransactionSelectCheckbox
                    checked={selectedIds.includes(transaction.id)}
                    label={`Select ${getTransactionTitle(transaction)}`}
                    onChange={() => onToggleSelect?.(transaction.id)}
                  />
                </td>
                <TransactionRow
                  transaction={transaction}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onSelect={onSelect}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ledger-mobile-list">
        {transactions.map((transaction) => (
          <article
            className={`ledger-mobile-card${selectedIds.includes(transaction.id) ? ' is-selected' : ''}`}
            key={transaction.id}
            onClick={() => onSelect(transaction)}
          >
            <TransactionMobileCard
              selectionControl={
                <TransactionSelectCheckbox
                  checked={selectedIds.includes(transaction.id)}
                  label={`Select ${getTransactionTitle(transaction)}`}
                  onChange={() => onToggleSelect?.(transaction.id)}
                />
              }
              transaction={transaction}
              onDelete={onDelete}
              onEdit={onEdit}
              onSelect={onSelect}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

export default TransactionLedger;
