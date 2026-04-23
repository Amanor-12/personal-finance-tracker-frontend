import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import BudgetFormDialog from './budgets/BudgetFormDialog';
import BudgetsIcon from './budgets/BudgetsIcon';
import DeleteBudgetDialog from './budgets/DeleteBudgetDialog';
import { formatBudgetCurrency, formatBudgetPeriod, getCurrentBudgetPeriod } from './budgets/budgetUtils';
import { PremiumButton, PremiumEmpty, PremiumMetric, PremiumMetrics, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
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

function BudgetPage({ currentUser, onLogout }) {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [period] = useState(getCurrentBudgetPeriod);
  const [query, setQuery] = useState('');
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
    return currentBudgets.filter((budget) => !normalizedQuery || budget.categoryName.toLowerCase().includes(normalizedQuery));
  }, [currentBudgets, query]);
  const summary = useMemo(() => summarizeBudgets(visibleBudgets), [visibleBudgets]);

  const openCreate = () => {
    setEditingBudget(null);
    setSaveError('');
    setIsFormOpen(true);
  };

  const saveBudget = async (payload) => {
    setIsSaving(true);
    setSaveError('');

    try {
      await financeStore.saveBudget(currentUser.id, payload);
      setIsFormOpen(false);
      setEditingBudget(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSaveError(error.message || 'Budget could not be saved.');
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
        pageTitle="Budget"
        pageSubtitle="A monthly planning board for category limits and pressure points."
        primaryActionLabel="+ Create budget"
        onPrimaryAction={openCreate}
        rail={rail}
      >
        <section className="budget-control-hero">
          <div className="budget-control-copy">
            <span className="premium-eyebrow">Budget control</span>
            <h2>Turn monthly limits into clear decisions.</h2>
            <p>Budget only the categories that matter, then track pressure as real transactions arrive.</p>
            <div className="budget-control-meta">
              <span>{formatBudgetPeriod(period.month, period.year)}</span>
              <span>{visibleBudgets.length} visible</span>
              <span>{summary.overspent} over limit</span>
            </div>
            <PremiumButton onClick={openCreate}>Create budget</PremiumButton>
          </div>

          <div className="budget-calendar-preview" aria-hidden="true">
            <div className="budget-calendar-head">
              <strong>Month plan</strong>
              <span>Pressure map</span>
            </div>
            <div className="budget-calendar-grid">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} className={index % 5 === 0 ? 'is-active' : ''} />
              ))}
            </div>
          </div>
        </section>

        <PremiumMetrics>
          <PremiumMetric label="Budgeted" value={formatBudgetCurrency(summary.totalBudgeted)} helper="Visible limits" tone="amber" />
          <PremiumMetric label="Spent" value={formatBudgetCurrency(summary.totalSpent)} helper="Matched transactions" />
          <PremiumMetric label="Remaining" value={formatBudgetCurrency(summary.remaining)} helper="Budget minus spend" tone="teal" />
          <PremiumMetric label="Overspent" value={String(summary.overspent)} helper="Categories over limit" tone="violet" />
        </PremiumMetrics>

        <section className="budget-pressure-board" aria-label="Budget pressure board">
          <article className="budget-pressure-main">
            <span>Monthly pressure</span>
            <h3>{summary.overspent ? `${summary.overspent} over limit` : 'No pressure detected'}</h3>
            <p>
              {currentBudgets.length
                ? 'Pressure is calculated from your category budgets and matched spending for the active month.'
                : 'Create one category budget to start measuring pressure honestly.'}
            </p>
          </article>
          <article className="budget-pressure-meter">
            <span>Spend ratio</span>
            <strong>
              {summary.totalBudgeted ? `${Math.min(999, Math.round((summary.totalSpent / summary.totalBudgeted) * 100))}%` : '0%'}
            </strong>
            <div>
              <span style={{ width: summary.totalBudgeted ? `${Math.min(100, (summary.totalSpent / summary.totalBudgeted) * 100)}%` : '0%' }} />
            </div>
          </article>
        </section>

        <PremiumPanel eyebrow="Planner controls" title="Focus this month">
          <div className="premium-filter-bar">
            <input
              aria-label="Search budgets"
              placeholder="Search category"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </PremiumPanel>

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
            <PremiumEmpty title="No budgets match this search" body="Clear the search to return to the full planning board." actionLabel="Clear search" onAction={() => setQuery('')} />
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
