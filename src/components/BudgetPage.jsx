import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResourceLimitCard } from './billing/FeatureGate';
import FinanceLayout from './FinanceLayout';
import BudgetFormDialog from './budgets/BudgetFormDialog';
import BudgetsIcon from './budgets/BudgetsIcon';
import DeleteBudgetDialog from './budgets/DeleteBudgetDialog';
import { formatBudgetCurrency, formatBudgetPeriod, getCurrentBudgetPeriod } from './budgets/budgetUtils';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
import { useBillingAccess } from '../context/BillingAccessContext';
import { financeStore } from '../utils/financeStore';

const summarizeBudgets = (budgets) =>
  budgets.reduce(
    (summary, budget) => {
      summary.totalBudgeted += budget.amountLimit;
      summary.totalSpent += budget.spentAmount;
      summary.remaining += budget.remainingAmount;
      summary.overspent += budget.remainingAmount < 0 ? 1 : 0;
      return summary;
    },
    { overspent: 0, remaining: 0, totalBudgeted: 0, totalSpent: 0 }
  );

const getBudgetHealth = (budget) => {
  if (budget.remainingAmount < 0) {
    return 'over';
  }

  const utilization = budget.amountLimit ? (budget.spentAmount / budget.amountLimit) * 100 : 0;

  if (!budget.spentAmount) {
    return 'not_started';
  }

  if (utilization >= 80) {
    return 'watch';
  }

  return 'on_track';
};

function BudgetPage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const { access, isLoading: isBillingLoading, refreshBillingAccess } = useBillingAccess();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [period] = useState(getCurrentBudgetPeriod);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const loadBudgets = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [nextBudgets, nextCategories] = await Promise.all([
          financeStore.getBudgetsForUser(currentUser.id),
          financeStore.getCategoriesForUser(currentUser.id),
        ]);

        if (isCancelled) {
          return;
        }

        setBudgets(nextBudgets);
        setCategories(nextCategories.filter((category) => category.type === 'expense'));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setBudgets([]);
        setCategories([]);
        setLoadError(error.message || 'Budgets could not load.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadBudgets();

    return () => {
      isCancelled = true;
    };
  }, [currentUser.id, onLogout, refreshKey]);

  const currentBudgets = useMemo(
    () => budgets.filter((budget) => Number(budget.month) === Number(period.month) && Number(budget.year) === Number(period.year)),
    [budgets, period.month, period.year]
  );
  const visibleBudgets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return currentBudgets
      .filter((budget) => (statusFilter === 'all' ? true : getBudgetHealth(budget) === statusFilter))
      .filter((budget) => !normalizedQuery || budget.categoryName.toLowerCase().includes(normalizedQuery));
  }, [currentBudgets, query, statusFilter]);
  const summary = useMemo(() => summarizeBudgets(visibleBudgets), [visibleBudgets]);
  const spendRatio = summary.totalBudgeted ? Math.min(999, Math.round((summary.totalSpent / summary.totalBudgeted) * 100)) : 0;
  const budgetLimit = access.limits.budgets;
  const budgetUsage = access.usage.budgets || 0;
  const canCreateBudget = budgetLimit === null || budgetUsage < budgetLimit;
  const topPressureBudget = useMemo(
    () =>
      [...visibleBudgets].sort((left, right) => {
        const leftRatio = left.amountLimit ? left.spentAmount / left.amountLimit : 0;
        const rightRatio = right.amountLimit ? right.spentAmount / right.amountLimit : 0;
        return rightRatio - leftRatio;
      })[0] || null,
    [visibleBudgets]
  );

  const openCreate = () => {
    if (!canCreateBudget) {
      navigate('/pricing');
      return;
    }

    setEditingBudget(null);
    setSaveError('');
    setIsFormOpen(true);
  };

  const saveBudget = async (payload) => {
    setIsSaving(true);
    setSaveError('');

    try {
      await financeStore.saveBudget(currentUser.id, payload);
      await refreshBillingAccess();
      setIsFormOpen(false);
      setEditingBudget(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSaveError(error.message || 'Budget could not be saved.');
      await refreshBillingAccess();
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteBudget = async () => {
    if (!deleteCandidate) {
      return;
    }

    setIsDeleting(true);

    try {
      await financeStore.deleteBudget(currentUser.id, deleteCandidate.id);
      await refreshBillingAccess();
      setDeleteCandidate(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setLoadError(error.message || 'Budget could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
  };

  const rail = (
    <aside className="activity-rail">
      <article className="ref-panel activity-rail-card activity-rail-card-dark">
        <span>Planning month</span>
        <h3>{formatBudgetPeriod(period.month, period.year)}</h3>
        <p>Budgets compare category limits against transaction spend for the same month.</p>
      </article>
      <article className="ref-panel activity-rail-card">
        <span>Category setup</span>
        <div className="activity-stat-list">
          <div><strong>{categories.length}</strong><p>Expense categories</p></div>
          <div><strong>{currentBudgets.length}</strong><p>Monthly budgets</p></div>
          <div><strong>{summary.overspent}</strong><p>Over limit</p></div>
        </div>
      </article>
    </aside>
  );

  return (
    <>
      <FinanceLayout
        currentUser={currentUser}
        onLogout={onLogout}
        pageTitle="Budgets"
        pageSubtitle="A monthly planning board for category limits and pressure points."
        primaryActionLabel={!isBillingLoading && !canCreateBudget ? 'Upgrade' : '+ Create budget'}
        onPrimaryAction={!isBillingLoading && !canCreateBudget ? () => navigate('/pricing') : openCreate}
        rail={rail}
      >
        <section className="budget-cockpit" aria-label="Budget cockpit">
          <div className="budget-cockpit-header budget-cockpit-hero">
            <div>
              <span className="ref-section-chip">Monthly plan</span>
              <h2>{formatBudgetPeriod(period.month, period.year)}</h2>
              <p>Budget categories only where limits help you make better decisions.</p>
            </div>
            <button className="ref-secondary-button" type="button" onClick={openCreate}>Create budget</button>
          </div>

          <div className="budget-cockpit-visual" aria-hidden="true">
            <span className="budget-cockpit-bar budget-cockpit-bar-a" />
            <span className="budget-cockpit-bar budget-cockpit-bar-b" />
            <span className="budget-cockpit-bar budget-cockpit-bar-c" />
            <span className="budget-cockpit-bar budget-cockpit-bar-d" />
          </div>
        </section>

        <section className="budget-cockpit-secondary" aria-label="Budget tools">
          {!isBillingLoading && budgetLimit !== null ? (
            <ResourceLimitCard
              body="Free workspaces can keep a focused budget set. Upgrade when you want broader category coverage or more monthly plans."
              limit={budgetLimit}
              resourceLabel="budgets"
              usage={budgetUsage}
            />
          ) : null}

          <div className="budget-cockpit-grid">
            <article className="budget-cockpit-meter">
              <span>Spend ratio</span>
              <strong>{spendRatio}%</strong>
              <div><span style={{ width: `${Math.min(100, spendRatio)}%` }} /></div>
              <p>{summary.overspent ? `${summary.overspent} category over limit` : 'No pressure detected'}</p>
            </article>

            <div className="budget-cockpit-ledger">
              <article><span>Budgeted</span><strong>{formatBudgetCurrency(summary.totalBudgeted)}</strong></article>
              <article><span>Spent</span><strong>{formatBudgetCurrency(summary.totalSpent)}</strong></article>
              <article><span>Remaining</span><strong>{formatBudgetCurrency(summary.remaining)}</strong></article>
              <article><span>Categories</span><strong>{visibleBudgets.length}</strong></article>
            </div>

            <label className="budget-cockpit-search">
              <span>Find category</span>
              <input
                aria-label="Search budgets"
                placeholder="Search category"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <label className="budget-cockpit-filter">
              <span>Health</span>
              <select aria-label="Budget health" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All budgets</option>
                <option value="on_track">On track</option>
                <option value="watch">Needs attention</option>
                <option value="over">Over limit</option>
                <option value="not_started">Not started</option>
              </select>
            </label>

            <article className="budget-cockpit-pressure">
              <span>Pressure point</span>
              <strong>{topPressureBudget?.categoryName || 'No category pressure yet'}</strong>
              <p>
                {topPressureBudget
                  ? `${formatBudgetCurrency(topPressureBudget.spentAmount)} spent against ${formatBudgetCurrency(topPressureBudget.amountLimit)}.`
                  : 'Create a budget to see which category needs the most attention.'}
              </p>
            </article>
          </div>
        </section>

        <PremiumPanel eyebrow="Budget board" title="Category limits">
          {isLoading ? <PremiumSkeleton count={4} /> : null}

          {!isLoading && loadError ? (
            <PremiumEmpty title="Budgets could not load" body={loadError} actionLabel="Retry" onAction={() => setRefreshKey((value) => value + 1)} />
          ) : null}

          {!isLoading && !loadError && visibleBudgets.length ? (
            <div className="budget-board-list">
              {visibleBudgets.map((budget) => (
                <article className="budget-board-row" key={budget.id}>
                  <div className="budget-board-main">
                    <strong>{budget.categoryName}</strong>
                    <span>{formatBudgetPeriod(budget.month, budget.year)}</span>
                    <div className="budget-board-track">
                      <span style={{ width: `${Math.min(100, budget.amountLimit ? (budget.spentAmount / budget.amountLimit) * 100 : 0)}%` }} />
                    </div>
                  </div>
                  <div className="budget-board-values">
                    <span>{formatBudgetCurrency(budget.spentAmount)} spent</span>
                    <strong>{formatBudgetCurrency(budget.remainingAmount)} left</strong>
                    <small className={`budget-board-health budget-board-health-${getBudgetHealth(budget)}`}>
                      {getBudgetHealth(budget) === 'over'
                        ? 'Over limit'
                        : getBudgetHealth(budget) === 'watch'
                          ? 'Needs attention'
                          : getBudgetHealth(budget) === 'not_started'
                            ? 'Not started'
                            : 'On track'}
                    </small>
                  </div>
                  <div className="budget-board-actions">
                    <button type="button" onClick={() => {
                      setEditingBudget(budget);
                      setIsFormOpen(true);
                    }}>Edit</button>
                    <button className="is-danger" type="button" onClick={() => setDeleteCandidate(budget)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoading && !loadError && !currentBudgets.length ? (
            <PremiumEmpty
              icon={<BudgetsIcon type="target" />}
              title="Create your first monthly budget"
              body="Pick one expense category and set a practical monthly limit. Add more only where they help decisions."
              actionLabel="Create budget"
              onAction={openCreate}
            />
          ) : null}

          {!isLoading && !loadError && currentBudgets.length > 0 && !visibleBudgets.length ? (
            <PremiumEmpty
              title="No budgets match this view"
              body="Clear the search or reset health filtering to return to the full planning board."
              actionLabel="Reset view"
              onAction={() => {
                setQuery('');
                setStatusFilter('all');
              }}
            />
          ) : null}
        </PremiumPanel>
      </FinanceLayout>

      {isFormOpen ? (
        <BudgetFormDialog
          budget={editingBudget}
          categories={categories}
          isSaving={isSaving}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingBudget(null);
            }
          }}
          onSubmit={saveBudget}
          period={period}
          presetCategoryId=""
          saveError={saveError}
        />
      ) : null}

      <DeleteBudgetDialog
        budget={deleteCandidate}
        isDeleting={isDeleting}
        onCancel={() => !isDeleting && setDeleteCandidate(null)}
        onConfirm={confirmDeleteBudget}
      />
    </>
  );
}

export default BudgetPage;
