import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import { FeatureGate } from './billing/FeatureGate';
import { PremiumPanel } from './premium/PremiumPage';
import DeleteTransactionDialog from './transactions/DeleteTransactionDialog';
import TransactionDetailDrawer from './transactions/TransactionDetailDrawer';
import TransactionFilters from './transactions/TransactionFilters';
import TransactionFormDialog from './transactions/TransactionFormDialog';
import TransactionLedger from './transactions/TransactionLedger';
import TransactionSummary from './transactions/TransactionSummary';
import TransactionsIcon from './transactions/TransactionsIcon';
import {
  EMPTY_TRANSACTION_FILTERS,
  filterTransactions,
  formatDate,
  getTransactionTitle,
  sortTransactions,
  summarizeTransactions,
} from './transactions/transactionUtils';
import {
  buildTransactionsCsv,
  deleteTransactionView,
  loadSavedTransactionViews,
  saveTransactionView,
} from './transactions/transactionWorkspaceUtils';
import { useBillingAccess } from '../context/BillingAccessContext';
import { accountStore } from '../utils/accountStore';
import { financeStore } from '../utils/financeStore';

function TransactionsPage({ currentUser, onLogout }) {
  const { access } = useBillingAccess();
  const isPremium = access.isPremium;
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(EMPTY_TRANSACTION_FILTERS);
  const [savedViews, setSavedViews] = useState([]);
  const [savedViewName, setSavedViewName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [toolMessage, setToolMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formMode, setFormMode] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [detailTransaction, setDetailTransaction] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
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

  useEffect(() => {
    setSavedViews(loadSavedTransactionViews(currentUser.id));
  }, [currentUser.id]);

  const visibleTransactions = useMemo(
    () => sortTransactions(filterTransactions(transactions, filters), filters.sortBy),
    [filters, transactions]
  );
  const summary = useMemo(() => summarizeTransactions(visibleTransactions), [visibleTransactions]);
  const totalSummary = useMemo(() => summarizeTransactions(transactions), [transactions]);
  const latestVisibleTransaction = visibleTransactions[0] || null;
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy') {
      return value !== EMPTY_TRANSACTION_FILTERS.sortBy;
    }

    return value !== EMPTY_TRANSACTION_FILTERS[key] && value !== '';
  }).length;

  useEffect(() => {
    setSelectedIds((currentSelection) =>
      currentSelection.filter((id) => visibleTransactions.some((transaction) => transaction.id === id))
    );
  }, [visibleTransactions]);

  const selectedTransactions = useMemo(
    () => visibleTransactions.filter((transaction) => selectedIds.includes(transaction.id)),
    [selectedIds, visibleTransactions]
  );
  const selectedTypes = Array.from(new Set(selectedTransactions.map((transaction) => transaction.type)));
  const selectedType = selectedTypes.length === 1 ? selectedTypes[0] : '';
  const bulkCategoryOptions = useMemo(
    () =>
      categories.filter((category) =>
        ['income', 'expense'].includes(category.type) && (!selectedType || category.type === selectedType)
      ),
    [categories, selectedType]
  );
  const allVisibleSelected =
    Boolean(visibleTransactions.length) &&
    visibleTransactions.every((transaction) => selectedIds.includes(transaction.id));
  const accountOptions = accounts.map((account) => ({ id: String(account.id), name: account.name }));

  const clearFilters = () => {
    setFilters(EMPTY_TRANSACTION_FILTERS);
    setToolMessage('');
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
      setSelectedIds((currentSelection) => currentSelection.filter((id) => id !== deleteCandidate.id));
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

  const toggleSelection = (transactionId) => {
    setSelectedIds((currentSelection) =>
      currentSelection.includes(transactionId)
        ? currentSelection.filter((id) => id !== transactionId)
        : [...currentSelection, transactionId]
    );
  };

  const toggleSelectAllVisible = (visibleRows) => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(visibleRows.map((transaction) => transaction.id));
  };

  const handleSaveView = () => {
    if (!isPremium) {
      return;
    }

    if (!savedViewName.trim()) {
      setToolMessage('Name the view before saving it.');
      return;
    }

    const nextViews = saveTransactionView(currentUser.id, {
      createdAt: new Date().toISOString(),
      filters,
      id: `${Date.now()}`,
      name: savedViewName.trim(),
    });

    setSavedViews(nextViews);
    setSavedViewName('');
    setToolMessage('Saved view added to your Pro tools.');
  };

  const handleApplyView = (view) => {
    setFilters({
      ...EMPTY_TRANSACTION_FILTERS,
      ...(view.filters || {}),
    });
    setSelectedIds([]);
    setToolMessage(`Applied ${view.name}.`);
  };

  const handleDeleteView = (viewId) => {
    const nextViews = deleteTransactionView(currentUser.id, viewId);
    setSavedViews(nextViews);
    setToolMessage('Saved view removed.');
  };

  const handleExport = () => {
    if (!isPremium) {
      return;
    }

    const exportRows = selectedTransactions.length ? selectedTransactions : visibleTransactions;

    if (!exportRows.length) {
      setToolMessage('There is nothing to export in the current view.');
      return;
    }

    const csv = buildTransactionsCsv(exportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `ledgr-transactions-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setToolMessage(
      `Exported ${exportRows.length} transaction${exportRows.length === 1 ? '' : 's'} to CSV.`
    );
  };

  const handleBulkCategorize = async () => {
    if (!isPremium) {
      return;
    }

    if (!selectedTransactions.length) {
      setToolMessage('Select transactions first.');
      return;
    }

    if (!selectedType) {
      setToolMessage('Bulk categorization works when the selected transactions share the same type.');
      return;
    }

    if (!bulkCategoryId) {
      setToolMessage('Choose a category for the selected transactions.');
      return;
    }

    const selectedCategory = categories.find((category) => String(category.id) === String(bulkCategoryId));

    if (!selectedCategory || selectedCategory.type !== selectedType) {
      setToolMessage('Choose a category that matches the selected transaction type.');
      return;
    }

    setIsBulkSaving(true);
    setToolMessage('');

    try {
      await Promise.all(
        selectedTransactions.map((transaction) =>
          financeStore.updateTransaction(currentUser.id, transaction.id, {
            accountId: transaction.accountId || '',
            amount: transaction.amount,
            categoryId: selectedCategory.id,
            description: transaction.description || '',
            isRecurring: transaction.isRecurring,
            notes: transaction.notes || '',
            transactionDate: transaction.transactionDate,
            type: transaction.type,
          })
        )
      );

      setBulkCategoryId('');
      setSelectedIds([]);
      setToolMessage(
        `${selectedTransactions.length} transaction${selectedTransactions.length === 1 ? '' : 's'} moved to ${selectedCategory.name}.`
      );
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setToolMessage(error.message || 'Bulk categorization could not complete.');
    } finally {
      setIsBulkSaving(false);
    }
  };

  const rail = (
    <aside className="activity-rail">
      <article className="ref-panel activity-rail-card activity-rail-card-dark">
        <span>Ledger state</span>
        <h3>{transactions.length ? `${transactions.length} records` : 'Ready for records'}</h3>
        <p>Core ledger tools stay free. Pro adds saved views, bulk actions, and CSV export for heavier workflows.</p>
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

        <TransactionSummary summary={summary} totalCount={totalSummary.count} />

        <TransactionFilters
          accountOptions={accountOptions}
          categories={categories}
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
          resultCount={visibleTransactions.length}
        />

        {isPremium ? (
          <PremiumPanel eyebrow="Pro tools" title="Faster ledger operations">
            <section className="transactions-power-grid">
              <article className="transactions-power-card">
                <div className="transactions-power-head">
                  <div>
                    <span>Saved views</span>
                    <strong>Return to the same ledger slice instantly.</strong>
                  </div>
                  <small>{savedViews.length}/6 saved</small>
                </div>

                <div className="transactions-power-save">
                  <input
                    type="text"
                    placeholder="Quarterly review"
                    value={savedViewName}
                    onChange={(event) => setSavedViewName(event.target.value)}
                  />
                  <button type="button" onClick={handleSaveView}>
                    Save current view
                  </button>
                </div>

                <div className="transactions-view-list">
                  {savedViews.length ? (
                    savedViews.map((view) => (
                      <div className="transactions-view-chip" key={view.id}>
                        <button type="button" onClick={() => handleApplyView(view)}>
                          {view.name}
                        </button>
                        <button
                          className="is-danger"
                          type="button"
                          onClick={() => handleDeleteView(view.id)}
                          aria-label={`Delete ${view.name}`}
                        >
                          x
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="transactions-power-empty">Save a filtered ledger view for month-end review, tax prep, or category cleanup.</p>
                  )}
                </div>
              </article>

              <article className="transactions-power-card">
                <div className="transactions-power-head">
                  <div>
                    <span>Bulk categorize</span>
                    <strong>Clean up multiple records without opening each row.</strong>
                  </div>
                  <small>{selectedTransactions.length} selected</small>
                </div>

                <div className="transactions-bulk-status">
                  <strong>
                    {selectedTransactions.length
                      ? selectedType
                        ? `${selectedTransactions.length} ${selectedType} record${selectedTransactions.length === 1 ? '' : 's'} ready`
                        : 'Selection mixes income and expense records'
                      : 'Select rows in the ledger to start'}
                  </strong>
                  <p>
                    {selectedTransactions.length
                      ? selectedType
                        ? 'Choose one matching category and apply it to the selected records.'
                        : 'Use a single transaction type in one selection before applying a bulk category.'
                      : 'Selection stays scoped to the current visible view.'}
                  </p>
                </div>

                <div className="transactions-power-save">
                  <select
                    value={bulkCategoryId}
                    onChange={(event) => setBulkCategoryId(event.target.value)}
                    disabled={!selectedTransactions.length || !selectedType || isBulkSaving}
                  >
                    <option value="">
                      {!selectedTransactions.length
                        ? 'Select transactions first'
                        : !selectedType
                          ? 'Single transaction type required'
                          : 'Choose category'}
                    </option>
                    {bulkCategoryOptions.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={handleBulkCategorize} disabled={!selectedTransactions.length || !selectedType || !bulkCategoryId || isBulkSaving}>
                    {isBulkSaving ? 'Applying...' : 'Apply category'}
                  </button>
                </div>

                <button className="transactions-selection-clear" type="button" onClick={() => setSelectedIds([])} disabled={!selectedTransactions.length}>
                  Clear selection
                </button>
              </article>

              <article className="transactions-power-card">
                <div className="transactions-power-head">
                  <div>
                    <span>Export</span>
                    <strong>Take the current view or selection into CSV.</strong>
                  </div>
                  <small>{selectedTransactions.length ? 'Selected rows' : 'Current view'}</small>
                </div>

                <div className="transactions-export-card">
                  <strong>
                    {selectedTransactions.length
                      ? `${selectedTransactions.length} selected row${selectedTransactions.length === 1 ? '' : 's'} ready`
                      : `${visibleTransactions.length} visible row${visibleTransactions.length === 1 ? '' : 's'} ready`}
                  </strong>
                  <p>Exports include merchant, category, account, amount, date, status, recurrence, and notes.</p>
                </div>

                <button className="transactions-export-button" type="button" onClick={handleExport}>
                  Export CSV
                </button>
              </article>
            </section>

            <div className="transactions-power-footer">
              <div>
                <strong>
                  Showing {summary.count} of {totalSummary.count} records
                </strong>
                <p>
                  {activeFilterCount
                    ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'} are shaping this view.`
                    : 'Full ledger view with no filters applied.'}
                </p>
              </div>
              <div className="transactions-power-latest">
                <span>Latest visible</span>
                <strong>{latestVisibleTransaction ? getTransactionTitle(latestVisibleTransaction) : 'No match'}</strong>
                <small>{latestVisibleTransaction ? formatDate(latestVisibleTransaction.transactionDate) : 'Adjust filters or add a transaction.'}</small>
              </div>
            </div>

            {toolMessage ? <p className="transactions-power-message">{toolMessage}</p> : null}
          </PremiumPanel>
        ) : (
          <FeatureGate
            eyebrow="Pro transaction tools"
            title="Unlock faster ledger operations"
            helper="Pro adds saved views for repeated analysis, CSV export for finance workflows, and bulk categorization for high-volume cleanup."
            features={['Saved ledger views', 'CSV export of current view or selection', 'Bulk transaction categorization', 'Faster review workflows for heavy usage']}
          />
        )}

        <TransactionLedger
          errorMessage={loadError}
          isLoading={isLoading}
          onAddTransaction={openAddDialog}
          onDelete={setDeleteCandidate}
          onEdit={openEditDialog}
          onRetry={() => setRefreshKey((value) => value + 1)}
          onSelect={setDetailTransaction}
          onToggleSelect={toggleSelection}
          onToggleSelectAll={toggleSelectAllVisible}
          selectedIds={selectedIds}
          totalTransactions={transactions.length}
          transactions={visibleTransactions}
        />
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
