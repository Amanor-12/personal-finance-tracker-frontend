import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton, formatMoney } from './premium/PremiumPage';
import DeleteTransactionDialog from './transactions/DeleteTransactionDialog';
import TransactionDetailDrawer from './transactions/TransactionDetailDrawer';
import TransactionFormDialog from './transactions/TransactionFormDialog';
import TransactionsIcon from './transactions/TransactionsIcon';
import { accountStore } from '../utils/accountStore';
import { financeStore } from '../utils/financeStore';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const formatDate = (value) => {
  if (!value) {
    return 'No date';
  }

  return dateFormatter.format(new Date(value));
};

const summarize = (transactions) =>
  transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === 'income') {
        summary.income += transaction.amount;
      } else {
        summary.expenses += transaction.amount;
      }

      summary.count += 1;
      summary.net = summary.income - summary.expenses;
      return summary;
    },
    { count: 0, expenses: 0, income: 0, net: 0 }
  );

const getAmountBand = (amount) => {
  if (amount >= 1000) {
    return 'high';
  }

  if (amount >= 100) {
    return 'medium';
  }

  return 'low';
};

function TransactionsPage({ currentUser, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formMode, setFormMode] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [nextTransactions, nextCategories, nextAccounts] = await Promise.all([
          financeStore.getTransactionsForUser(currentUser.id),
          financeStore.getCategoriesForUser(currentUser.id),
          accountStore.getAccountsForUser(currentUser.id),
        ]);

        if (isCancelled) {
          return;
        }

        setTransactions(nextTransactions);
        setCategories(nextCategories);
        setAccounts(nextAccounts.filter((account) => account.status === 'active'));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setTransactions([]);
        setCategories([]);
        setAccounts([]);
        setLoadError(error.message || 'Transactions could not load.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [currentUser.id, onLogout, refreshKey]);

  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions
      .filter((transaction) => (typeFilter === 'all' ? true : transaction.type === typeFilter))
      .filter((transaction) => (accountFilter === 'all' ? true : String(transaction.accountId || '') === accountFilter))
      .filter((transaction) => (categoryFilter === 'all' ? true : String(transaction.categoryId || '') === categoryFilter))
      .filter((transaction) => (statusFilter === 'all' ? true : transaction.status === statusFilter))
      .filter((transaction) => (amountFilter === 'all' ? true : getAmountBand(transaction.amount) === amountFilter))
      .filter((transaction) => {
        if (!normalizedQuery) {
          return true;
        }

        return [transaction.description, transaction.categoryName, transaction.accountName, transaction.status]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime());
  }, [accountFilter, amountFilter, categoryFilter, query, statusFilter, transactions, typeFilter]);

  const summary = useMemo(() => summarize(visibleTransactions), [visibleTransactions]);
  const totalSummary = useMemo(() => summarize(transactions), [transactions]);
  const accountOptions = accounts.map((account) => ({ id: account.id, name: account.name }));
  const statusOptions = useMemo(
    () => Array.from(new Set(transactions.map((transaction) => transaction.status).filter(Boolean))),
    [transactions]
  );
  const categoryOptions = useMemo(
    () => categories.filter((category) => ['income', 'expense'].includes(category.type)),
    [categories]
  );
  const activeFilterCount = [query, typeFilter !== 'all', accountFilter !== 'all', categoryFilter !== 'all', statusFilter !== 'all', amountFilter !== 'all'].filter(Boolean).length;
  const latestVisibleTransaction = visibleTransactions[0] || null;
  const clearFilters = () => {
    setQuery('');
    setTypeFilter('all');
    setAccountFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setAmountFilter('all');
  };

  const openAddDialog = () => {
    setEditingTransaction(null);
    setSaveError('');
    setFormMode('add');
  };

  const openEditDialog = (transaction) => {
    setEditingTransaction(transaction);
    setSaveError('');
    setFormMode('edit');
  };

  const handleSaveTransaction = async (payload) => {
    setIsSaving(true);
    setSaveError('');

    try {
      if (formMode === 'edit' && editingTransaction) {
        await financeStore.updateTransaction(currentUser.id, editingTransaction.id, payload);
      } else {
        await financeStore.addTransaction(currentUser.id, payload);
      }

      setFormMode('');
      setEditingTransaction(null);
      setDetailTransaction(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSaveError(error.message || 'Transaction could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!deleteCandidate) {
      return;
    }

    setIsDeleting(true);

    try {
      await financeStore.deleteTransaction(currentUser.id, deleteCandidate.id);
      setDeleteCandidate(null);
      setDetailTransaction(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setLoadError(error.message || 'Transaction could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
  };

  const rail = (
    <aside className="activity-rail">
      <article className="ref-panel activity-rail-card activity-rail-card-dark">
        <span>Ledger state</span>
        <h3>{transactions.length ? `${transactions.length} records` : 'Ready for records'}</h3>
        <p>Search and filters affect the metrics without changing the underlying transaction history.</p>
      </article>
      <article className="ref-panel activity-rail-card">
        <span>Linked setup</span>
        <div className="activity-stat-list">
          <div>
            <strong>{accounts.length}</strong>
            <p>Accounts</p>
          </div>
          <div>
            <strong>{categories.length}</strong>
            <p>Categories</p>
          </div>
          <div>
            <strong>{visibleTransactions.length}</strong>
            <p>Visible</p>
          </div>
        </div>
      </article>
    </aside>
  );

  return (
    <>
      <FinanceLayout
        currentUser={currentUser}
        onLogout={onLogout}
        pageTitle="Transactions"
        pageSubtitle="A focused ledger for reviewing and managing money movement."
        primaryActionLabel="+ Add transaction"
        onPrimaryAction={openAddDialog}
        rail={rail}
      >
        <section className="transactions-ops-console">
          <div className="transactions-ops-lead">
            <span>Ledger operations</span>
            <h2>Transactions</h2>
            <p>Review, search, edit, and verify every movement in the workspace without leaving the ledger.</p>
          </div>

          <div className="transactions-ops-visual" aria-hidden="true">
            <span className="transactions-ops-orbit" />
            <span className="transactions-ops-lane lane-a" />
            <span className="transactions-ops-lane lane-b" />
            <span className="transactions-ops-lane lane-c" />

            <div className="transactions-ops-chip chip-inflow">
              <span className="transactions-ops-chip-icon">
                <TransactionsIcon type="arrowDown" />
              </span>
              <div className="transactions-ops-chip-copy">
                <strong>Inflow</strong>
                <small>Captured</small>
              </div>
            </div>

            <div className="transactions-ops-chip chip-review">
              <span className="transactions-ops-chip-icon">
                <TransactionsIcon type="ledger" />
              </span>
              <div className="transactions-ops-chip-copy">
                <strong>Ledger</strong>
                <small>Verified</small>
              </div>
            </div>

            <div className="transactions-ops-chip chip-outflow">
              <span className="transactions-ops-chip-icon">
                <TransactionsIcon type="arrowUp" />
              </span>
              <div className="transactions-ops-chip-copy">
                <strong>Outflow</strong>
                <small>Tracked</small>
              </div>
            </div>
          </div>
        </section>

        <section className="transactions-ops-secondary" aria-label="Transaction tools">
          <div className="transactions-ops-metrics" aria-label="Transaction summary">
            <div><span>Inflow</span><strong>{formatMoney(summary.income)}</strong></div>
            <div><span>Outflow</span><strong>{formatMoney(summary.expenses)}</strong></div>
            <div><span>Net</span><strong>{formatMoney(summary.net)}</strong></div>
            <div><span>Records</span><strong>{summary.count}</strong></div>
          </div>

          <div className="transactions-ops-controls">
            <label>
              <span>Search ledger</span>
              <input
                aria-label="Search transactions"
                placeholder="Merchant, category, account, status"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span>Type</span>
              <select aria-label="Transaction type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
            <label>
              <span>Account</span>
              <select aria-label="Transaction account" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
                <option value="all">All accounts</option>
                {accountOptions.map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Category</span>
              <select aria-label="Transaction category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select aria-label="Transaction status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Amount</span>
              <select aria-label="Transaction amount band" value={amountFilter} onChange={(event) => setAmountFilter(event.target.value)}>
                <option value="all">Any amount</option>
                <option value="low">Under $100</option>
                <option value="medium">$100 - $999</option>
                <option value="high">$1,000+</option>
              </select>
            </label>
            <div className="transactions-ops-actions">
              <button type="button" onClick={openAddDialog}>Add transaction</button>
              <button type="button" onClick={clearFilters}>Clear</button>
            </div>
          </div>

          <div className="transactions-ops-context" aria-label="Transaction view context">
            <div className="transactions-ops-context-copy">
              <strong>
                Showing {summary.count} of {totalSummary.count} records
              </strong>
              <p>
                {activeFilterCount
                  ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} applied across the ledger view.`
                  : 'Full ledger view with no filters applied.'}
              </p>
            </div>

            <div className="transactions-ops-context-meta">
              <span>Latest visible</span>
              <strong>{latestVisibleTransaction ? latestVisibleTransaction.description || latestVisibleTransaction.categoryName : 'No match'}</strong>
              <small>{latestVisibleTransaction ? formatDate(latestVisibleTransaction.transactionDate) : 'Adjust filters or add a transaction.'}</small>
            </div>
          </div>
        </section>

        <PremiumPanel eyebrow="Ledger" title="Transaction history">
          {isLoading ? <PremiumSkeleton count={5} /> : null}

          {!isLoading && loadError ? (
            <PremiumEmpty
              title="Transactions could not load"
              body={loadError}
              actionLabel="Retry"
              onAction={() => setRefreshKey((value) => value + 1)}
            />
          ) : null}

          {!isLoading && !loadError && visibleTransactions.length ? (
            <div className="premium-list">
              {visibleTransactions.map((transaction) => (
                <article className="premium-row" key={transaction.id}>
                  <button className="premium-row-main" type="button" onClick={() => setDetailTransaction(transaction)}>
                    <strong>{transaction.description || transaction.categoryName}</strong>
                    <small>{transaction.categoryName} - {transaction.accountName || 'No account linked'}</small>
                  </button>
                  <span>{formatDate(transaction.transactionDate)}</span>
                  <strong>{transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount)}</strong>
                  <div className="premium-row-actions">
                    <button type="button" onClick={() => openEditDialog(transaction)}>Edit</button>
                    <button className="is-danger" type="button" onClick={() => setDeleteCandidate(transaction)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoading && !loadError && !transactions.length ? (
            <PremiumEmpty
              icon={<TransactionsIcon type="plus" />}
              title="Start with your first transaction"
              body="Record income or spending once you have the real details. Ledgr will keep the ledger scoped to this workspace."
              actionLabel="Add transaction"
              onAction={openAddDialog}
            />
          ) : null}

          {!isLoading && !loadError && transactions.length > 0 && !visibleTransactions.length ? (
            <PremiumEmpty
              title="No transactions match this view"
              body="Clear the search or switch the type filter to return to the full ledger."
              actionLabel="Clear filters"
              onAction={() => {
                setQuery('');
                setTypeFilter('all');
              }}
            />
          ) : null}
        </PremiumPanel>
      </FinanceLayout>

      {detailTransaction ? (
        <TransactionDetailDrawer
          onClose={() => setDetailTransaction(null)}
          onDelete={setDeleteCandidate}
          onEdit={openEditDialog}
          transaction={detailTransaction}
        />
      ) : null}

      {formMode ? (
        <TransactionFormDialog
          accountOptions={accountOptions}
          categories={categories}
          isSaving={isSaving}
          mode={formMode}
          onClose={() => {
            if (!isSaving) {
              setFormMode('');
              setEditingTransaction(null);
              setSaveError('');
            }
          }}
          onSubmit={handleSaveTransaction}
          saveError={saveError}
          transaction={editingTransaction}
        />
      ) : null}

      <DeleteTransactionDialog
        isDeleting={isDeleting}
        onCancel={() => !isDeleting && setDeleteCandidate(null)}
        onConfirm={confirmDeleteTransaction}
        transaction={deleteCandidate}
      />
    </>
  );
}

export default TransactionsPage;
