import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import { PremiumButton, PremiumEmpty, PremiumHero, PremiumMetric, PremiumMetrics, PremiumPanel, PremiumSkeleton, formatMoney } from './premium/PremiumPage';
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

function TransactionsPage({ currentUser, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
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
      .filter((transaction) => {
        if (!normalizedQuery) {
          return true;
        }

        return [transaction.description, transaction.categoryName, transaction.accountName, transaction.status]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime());
  }, [query, transactions, typeFilter]);

  const summary = useMemo(() => summarize(visibleTransactions), [visibleTransactions]);
  const totalSummary = useMemo(() => summarize(transactions), [transactions]);
  const accountOptions = accounts.map((account) => ({ id: account.id, name: account.name }));

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
        <PremiumHero
          eyebrow="Ledger workspace"
          title="A clear operating record for your money."
          body="Review income and spending, search quickly, and open detail views without losing the shape of the ledger."
          variant="ledger"
          meta={[`${transactions.length} total`, `${visibleTransactions.length} visible`, `${categories.length} categories`]}
          actions={<PremiumButton onClick={openAddDialog}>Add transaction</PremiumButton>}
          visual={<div className="premium-orbit" />}
        />

        <PremiumMetrics>
          <PremiumMetric label="Inflow" value={formatMoney(summary.income)} helper="Visible income" tone="indigo" />
          <PremiumMetric label="Outflow" value={formatMoney(summary.expenses)} helper="Visible expenses" tone="teal" />
          <PremiumMetric label="Net" value={formatMoney(summary.net)} helper="Visible cash flow" tone="violet" />
          <PremiumMetric label="All records" value={String(totalSummary.count)} helper="Full ledger count" />
        </PremiumMetrics>

        <PremiumPanel
          eyebrow="Command bar"
          title="Find the record you need"
          actions={
            <PremiumButton tone="secondary" onClick={() => {
              setQuery('');
              setTypeFilter('all');
            }}>
              Clear
            </PremiumButton>
          }
        >
          <div className="premium-filter-bar">
            <input
              aria-label="Search transactions"
              placeholder="Search merchant, category, account, or status"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select aria-label="Transaction type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
        </PremiumPanel>

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
