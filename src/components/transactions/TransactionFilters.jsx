import TransactionsIcon from './TransactionsIcon';
import {
  EMPTY_TRANSACTION_FILTERS,
  transactionSortOptions,
  transactionStatusOptions,
  transactionTypeOptions,
} from './transactionUtils';

function TransactionFilters({
  accountOptions,
  categories,
  filters,
  onChange,
  onClear,
  resultCount,
}) {
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_TRANSACTION_FILTERS);
  const visibleCategories = categories.filter((category) =>
    filters.type === 'all' ? true : category.type === filters.type
  );

  const updateFilter = (key, value) => {
    const nextFilters = {
      ...filters,
      [key]: value,
    };

    if (key === 'type' && value !== 'all') {
      const selectedCategory = categories.find(
        (category) => String(category.id) === String(filters.categoryId)
      );

      if (selectedCategory && selectedCategory.type !== value) {
        nextFilters.categoryId = 'all';
      }
    }

    onChange(nextFilters);
  };

  return (
    <section className="ledger-filter-panel" aria-label="Transaction filters">
      <div className="ledger-filter-header">
        <div>
          <span className="ledger-eyebrow">Command center</span>
          <h2>Find the exact movement</h2>
        </div>

        <div className="ledger-filter-count">
          <strong>{resultCount}</strong>
          <span>in view</span>
        </div>
      </div>

      <div className="ledger-filter-search">
        <label className="ledger-search-field">
          <span className="ledger-field-icon">
            <TransactionsIcon type="search" />
          </span>
          <span className="ledger-visually-hidden">Search transactions</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
            placeholder="Search merchant, category, amount, or date"
          />
        </label>

        <button
          className="ledger-clear-button"
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
        >
          Clear filters
        </button>
      </div>

      <div className="ledger-filter-grid">
        <label className="ledger-control">
          <span>Date from</span>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(event) => updateFilter('fromDate', event.target.value)}
          />
        </label>

        <label className="ledger-control">
          <span>Date to</span>
          <input
            type="date"
            value={filters.toDate}
            onChange={(event) => updateFilter('toDate', event.target.value)}
          />
        </label>

        <label className="ledger-control">
          <span>Type</span>
          <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
            {transactionTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ledger-control">
          <span>Category</span>
          <select
            value={filters.categoryId}
            onChange={(event) => updateFilter('categoryId', event.target.value)}
          >
            <option value="all">All categories</option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="ledger-control">
          <span>Account</span>
          <select
            value={filters.accountId}
            onChange={(event) => updateFilter('accountId', event.target.value)}
            disabled={!accountOptions.length}
          >
            <option value="all">
              {accountOptions.length ? 'All accounts' : 'Accounts not connected yet'}
            </option>
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="ledger-control">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            {transactionStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ledger-control">
          <span>Min amount</span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={filters.minAmount}
            onChange={(event) => updateFilter('minAmount', event.target.value)}
            placeholder="0.00"
          />
        </label>

        <label className="ledger-control">
          <span>Max amount</span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={filters.maxAmount}
            onChange={(event) => updateFilter('maxAmount', event.target.value)}
            placeholder="Any"
          />
        </label>

        <label className="ledger-control ledger-control-wide">
          <span>Sort</span>
          <select
            value={filters.sortBy}
            onChange={(event) => updateFilter('sortBy', event.target.value)}
          >
            {transactionSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

export default TransactionFilters;
