import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DialogLoadFrame from './DialogLoadFrame';
import FinanceLayout from './FinanceLayout';
import { FeatureGate } from './billing/FeatureGate';
import { PremiumPanel } from './premium/PremiumPage';
import DeleteTransactionDialog from './transactions/DeleteTransactionDialog';
import TransactionDetailDrawer from './transactions/TransactionDetailDrawer';
import TransactionFilters from './transactions/TransactionFilters';
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
import { useBillingAccess } from '../context/useBillingAccess';
import { aiStore } from '../utils/aiStore';
import { accountStore } from '../utils/accountStore';
import { loadTransactionFormDialog } from '../utils/dialogPrefetch';
import { financeStore } from '../utils/financeStore';
import { isPlusTier, isProTier } from '../utils/tierAccess';

const TransactionFormDialog = lazy(loadTransactionFormDialog);

function TransactionsPage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const { access } = useBillingAccess();
  const isPlus = isPlusTier(access.tier);
  const isPro = isProTier(access.tier);
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
  const [isExporting, setIsExporting] = useState(false);
  const [isManagingViews, setIsManagingViews] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [isApplyingAiSuggestions, setIsApplyingAiSuggestions] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [activeTool, setActiveTool] = useState('views');
  const warmTransactionDialog = () => {
    void loadTransactionFormDialog();
  };

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [nextTransactions, nextCategories, nextAccounts, nextSavedViews] = await Promise.all([
          financeStore.getTransactionsForUser(currentUser.id),
          financeStore.getCategoriesForUser(currentUser.id),
          accountStore.getAccountsForUser(currentUser.id),
          isPlus ? financeStore.getSavedTransactionViews(currentUser.id) : Promise.resolve([]),
        ]);

        if (isCancelled) {
          return;
        }

        setTransactions(nextTransactions);
        setCategories(nextCategories);
        setAccounts(nextAccounts.filter((account) => account.status === 'active'));
        setSavedViews(nextSavedViews);
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
        setSavedViews([]);
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
  }, [currentUser.id, isPlus, onLogout, refreshKey]);

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

  useEffect(() => {
    setAiSuggestions((currentSuggestions) =>
      currentSuggestions.filter((suggestion) =>
        visibleTransactions.some((transaction) => transaction.id === suggestion.transactionId)
      )
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
  const transactionTools = [
    {
      id: 'views',
      label: 'Saved views',
      metric: `${savedViews.length}/6`,
      note: 'Return to the same filtered ledger slice.',
    },
    {
      id: 'bulk',
      label: 'Bulk cleanup',
      metric: isPro ? `${selectedTransactions.length} selected` : 'Pro',
      note: 'Apply one category across selected records.',
    },
    {
      id: 'ai',
      label: 'AI review',
      metric: aiSuggestions.length ? `${aiSuggestions.length} ready` : 'Review',
      note: 'Generate category suggestions for selected rows.',
    },
    {
      id: 'export',
      label: 'Export',
      metric: selectedTransactions.length ? 'Selection' : 'View',
      note: 'Download the current view or selected rows.',
    },
  ];

  const clearFilters = () => {
    setFilters(EMPTY_TRANSACTION_FILTERS);
    setToolMessage('');
  };

  const openAddDialog = () => {
    warmTransactionDialog();
    setEditingTransaction(null);
    setSaveError('');
    setFormMode('add');
  };

  const openEditDialog = (transaction) => {
    warmTransactionDialog();
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

  const handleSaveView = async () => {
    if (!isPlus) {
      return;
    }

    if (!savedViewName.trim()) {
      setToolMessage('Name the view before saving it.');
      return;
    }

    setIsManagingViews(true);
    setToolMessage('');

    try {
      await financeStore.saveTransactionView({
        filters,
        name: savedViewName.trim(),
      });
      const nextViews = await financeStore.getSavedTransactionViews(currentUser.id);
      setSavedViews(nextViews);
      setSavedViewName('');
      setToolMessage('Saved view added to your account tools.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setToolMessage(error.message || 'Saved view could not be stored.');
    } finally {
      setIsManagingViews(false);
    }
  };

  const handleApplyView = (view) => {
    setFilters({
      ...EMPTY_TRANSACTION_FILTERS,
      ...(view.filters || {}),
    });
    setSelectedIds([]);
    setToolMessage(`Applied ${view.name}.`);
  };

  const handleDeleteView = async (viewId) => {
    setIsManagingViews(true);
    setToolMessage('');

    try {
      await financeStore.deleteSavedTransactionView(viewId);
      const nextViews = await financeStore.getSavedTransactionViews(currentUser.id);
      setSavedViews(nextViews);
      setToolMessage('Saved view removed.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setToolMessage(error.message || 'Saved view could not be removed.');
    } finally {
      setIsManagingViews(false);
    }
  };

  const handleExport = async () => {
    if (!isPlus) {
      return;
    }

    const exportRows = selectedTransactions.length ? selectedTransactions : visibleTransactions;

    if (!exportRows.length) {
      setToolMessage('There is nothing to export in the current view.');
      return;
    }

    setIsExporting(true);
    setToolMessage('');

    try {
      const exportPayload = selectedTransactions.length
        ? {
            transaction_ids: selectedTransactions.map((transaction) => transaction.id),
          }
        : {
            filters,
          };
      const response = await financeStore.exportTransactions(exportPayload);

      if (!response.csv || !response.exported_count) {
        setToolMessage('There is nothing to export in the current view.');
        return;
      }

      const blob = new Blob([response.csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = response.file_name || `rivo-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setToolMessage(
        `Exported ${response.exported_count} transaction${response.exported_count === 1 ? '' : 's'} to CSV.`
      );
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setToolMessage(error.message || 'CSV export could not complete.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkCategorize = async () => {
    if (!isPro) {
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

  const handleGenerateAiSuggestions = async () => {
    if (!isPro) {
      return;
    }

    if (!selectedTransactions.length) {
      setToolMessage('Select transactions before requesting AI suggestions.');
      return;
    }

    setIsAiSuggesting(true);
    setToolMessage('');

    try {
      const nextSuggestions = await aiStore.getTransactionSuggestions(selectedTransactions);
      setAiSuggestions(nextSuggestions);

      if (!nextSuggestions.length) {
        setToolMessage('AI returned no category suggestions for the current selection.');
        return;
      }

      setToolMessage(
        `Generated ${nextSuggestions.length} AI suggestion${nextSuggestions.length === 1 ? '' : 's'} for the selected records.`
      );
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setAiSuggestions([]);
      setToolMessage(error.message || 'AI suggestions could not load.');
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleApplyAiSuggestions = async () => {
    if (!isPro || !aiSuggestions.length) {
      return;
    }

    const categoryMap = new Map(
      categories.map((category) => [`${category.type}:${category.name.trim().toLowerCase()}`, category])
    );
    const matchedUpdates = aiSuggestions
      .map((suggestion) => {
        const transaction = transactions.find((item) => item.id === suggestion.transactionId);

        if (!transaction) {
          return null;
        }

        const fallbackType = transaction.type;
        const resolvedType = suggestion.categoryType || fallbackType;
        const key = `${resolvedType}:${String(suggestion.categoryName || '').trim().toLowerCase()}`;
        const category = categoryMap.get(key);

        if (!category) {
          return null;
        }

        return {
          category,
          transaction,
        };
      })
      .filter(Boolean);

    if (!matchedUpdates.length) {
      setToolMessage('AI suggestions did not match any existing categories in this workspace.');
      return;
    }

    setIsApplyingAiSuggestions(true);
    setToolMessage('');

    try {
      await Promise.all(
        matchedUpdates.map(({ category, transaction }) =>
          financeStore.updateTransaction(currentUser.id, transaction.id, {
            accountId: transaction.accountId || '',
            amount: transaction.amount,
            categoryId: category.id,
            description: transaction.description || '',
            isRecurring: transaction.isRecurring,
            notes: transaction.notes || '',
            transactionDate: transaction.transactionDate,
            type: transaction.type,
          })
        )
      );

      setAiSuggestions([]);
      setSelectedIds([]);
      setToolMessage(
        `Applied ${matchedUpdates.length} AI suggestion${matchedUpdates.length === 1 ? '' : 's'} to the ledger.`
      );
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setToolMessage(error.message || 'AI suggestions could not be applied.');
    } finally {
      setIsApplyingAiSuggestions(false);
    }
  };

  const rail = (
    <aside className="activity-rail">
      <article className="ref-panel activity-rail-card activity-rail-card-dark">
        <span>Ledger state</span>
        <h3>{transactions.length ? `${transactions.length} records` : 'Ready for records'}</h3>
        <p>Core ledger tools stay free. Plus adds saved views and export. Pro adds the faster cleanup layer for heavier workflows.</p>
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

        {isPlus ? (
          <PremiumPanel eyebrow={isPro ? 'Pro tools' : 'Plus tools'} title="Faster ledger operations">
            <section className="transactions-tool-console">
              <div className="transactions-tool-switcher" aria-label="Transaction tool modes">
                {transactionTools.map((tool) => (
                  <button
                    key={tool.id}
                    className={activeTool === tool.id ? 'is-active' : ''}
                    type="button"
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <span>{tool.label}</span>
                    <strong>{tool.metric}</strong>
                    <small>{tool.note}</small>
                  </button>
                ))}
              </div>

              <div className="transactions-tool-stage">
                {activeTool === 'views' ? (
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
                        disabled={isManagingViews}
                      />
                      <button type="button" onClick={handleSaveView} disabled={isManagingViews}>
                        {isManagingViews ? 'Saving...' : 'Save current view'}
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
                              disabled={isManagingViews}
                              aria-label={`Delete ${view.name}`}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="transactions-power-empty">Save a filtered ledger view for month-end review, tax prep, or category cleanup.</p>
                      )}
                    </div>
                  </article>
                ) : null}

                {activeTool === 'bulk' ? (
                  <article className="transactions-power-card">
                    <div className="transactions-power-head">
                      <div>
                        <span>Bulk categorize</span>
                        <strong>{isPro ? 'Clean up multiple records without opening each row.' : 'Bulk cleanup sits in Pro for higher-volume transaction work.'}</strong>
                      </div>
                      <small>{selectedTransactions.length} selected</small>
                    </div>

                    <div className="transactions-bulk-status">
                      <strong>
                        {selectedTransactions.length
                          ? isPro
                            ? selectedType
                              ? `${selectedTransactions.length} ${selectedType} record${selectedTransactions.length === 1 ? '' : 's'} ready`
                              : 'Selection mixes income and expense records'
                            : 'Move to Pro for bulk categorization'
                          : 'Select rows in the ledger to start'}
                      </strong>
                      <p>
                        {isPro
                          ? selectedTransactions.length
                            ? selectedType
                              ? 'Choose one matching category and apply it to the selected records.'
                              : 'Use a single transaction type in one selection before applying a bulk category.'
                            : 'Selection stays scoped to the current visible view.'
                          : 'Plus keeps export and saved views available. Pro adds bulk categorization for faster cleanup across larger ledgers.'}
                      </p>
                    </div>

                    <div className="transactions-power-save">
                      <select
                        value={bulkCategoryId}
                        onChange={(event) => setBulkCategoryId(event.target.value)}
                        disabled={!isPro || !selectedTransactions.length || !selectedType || isBulkSaving}
                      >
                        <option value="">
                          {!isPro
                            ? 'Move to Pro to unlock bulk categorize'
                            : !selectedTransactions.length
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
                      <button type="button" onClick={isPro ? handleBulkCategorize : () => {}} disabled={!isPro || !selectedTransactions.length || !selectedType || !bulkCategoryId || isBulkSaving}>
                        {isPro ? (isBulkSaving ? 'Applying...' : 'Apply category') : 'Pro feature'}
                      </button>
                    </div>

                    {isPro ? (
                      <button className="transactions-selection-clear" type="button" onClick={() => setSelectedIds([])} disabled={!selectedTransactions.length}>
                        Clear selection
                      </button>
                    ) : (
                      <button className="transactions-selection-clear" type="button" onClick={() => navigate('/pricing')}>
                        See Pro
                      </button>
                    )}
                  </article>
                ) : null}

                {activeTool === 'ai' ? (
                  <article className="transactions-power-card">
                    <div className="transactions-power-head">
                      <div>
                        <span>AI category review</span>
                        <strong>{isPro ? 'Generate category suggestions for the selected records.' : 'AI suggestions sit inside Pro so heavier cleanup stays deliberate.'}</strong>
                      </div>
                      <small>{aiSuggestions.length ? `${aiSuggestions.length} ready` : 'No suggestions yet'}</small>
                    </div>

                    <div className="transactions-export-card">
                      <strong>
                        {selectedTransactions.length
                          ? `${selectedTransactions.length} selected record${selectedTransactions.length === 1 ? '' : 's'}`
                          : 'Select ledger rows first'}
                      </strong>
                      <p>
                        {isPro
                          ? 'Rivo reviews the selected ledger slice on a secure server route, then lets you apply only categories that already exist in this workspace.'
                          : 'Upgrade to Pro to generate AI category suggestions for the selected transactions.'}
                      </p>
                    </div>

                    <div className="transactions-power-save">
                      <button type="button" onClick={isPro ? handleGenerateAiSuggestions : () => {}} disabled={!isPro || !selectedTransactions.length || isAiSuggesting || isApplyingAiSuggestions}>
                        {isAiSuggesting ? 'Generating...' : 'Generate suggestions'}
                      </button>
                      <button type="button" onClick={isPro ? handleApplyAiSuggestions : () => {}} disabled={!isPro || !aiSuggestions.length || isApplyingAiSuggestions || isAiSuggesting}>
                        {isApplyingAiSuggestions ? 'Applying...' : 'Apply matched suggestions'}
                      </button>
                    </div>

                    {aiSuggestions.length ? (
                      <div className="transactions-view-list">
                        {aiSuggestions.slice(0, 4).map((suggestion) => {
                          const targetTransaction = transactions.find((transaction) => transaction.id === suggestion.transactionId);

                          return (
                            <div className="transactions-view-chip" key={`${suggestion.transactionId}-${suggestion.categoryName}`}>
                              <button type="button" onClick={() => targetTransaction && setDetailTransaction(targetTransaction)}>
                                {targetTransaction ? getTransactionTitle(targetTransaction) : `Transaction #${suggestion.transactionId}`}
                              </button>
                              <span>
                                {suggestion.categoryName}
                                {suggestion.reason ? ` - ${suggestion.reason}` : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                ) : null}

                {activeTool === 'export' ? (
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

                    <button
                      className="transactions-export-button"
                      type="button"
                      onClick={handleExport}
                      disabled={isExporting}
                    >
                      {isExporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                  </article>
                ) : null}
              </div>
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
            eyebrow="Plus transaction tools"
            title="Unlock faster ledger operations"
            helper="Plus adds saved views and CSV export for repeated finance workflows. Pro adds bulk categorization for heavier cleanup."
            primaryLabel="Upgrade to Plus"
            features={['Saved ledger views', 'CSV export of current view or selection', 'Cleaner repeated review workflows', 'Optional Pro bulk categorization']}
          />
        )}

        <TransactionLedger
          errorMessage={loadError}
          isLoading={isLoading}
          onAddTransaction={openAddDialog}
          onClearFilters={clearFilters}
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
        <Suspense
          fallback={
            <DialogLoadFrame
              body="Loading the transaction editor so you can capture amount, category, account, and note details without delaying the ledger."
              title={formMode === 'edit' ? 'Opening transaction details' : 'Opening transaction form'}
            />
          }
        >
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
        </Suspense>
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
