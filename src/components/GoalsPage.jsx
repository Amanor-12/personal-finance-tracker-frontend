import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import DeleteGoalDialog from './goals/DeleteGoalDialog';
import GoalFormDialog from './goals/GoalFormDialog';
import GoalsIcon from './goals/GoalsIcon';
import { formatGoalCurrency, formatGoalDate, getGoalProgressPercent, getGoalTypeLabel } from './goals/goalUtils';
import { PremiumButton, PremiumEmpty, PremiumHero, PremiumMetric, PremiumMetrics, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
import { financeStore } from '../utils/financeStore';

const summarizeGoals = (goals) =>
  goals.reduce(
    (summary, goal) => {
      summary.target += goal.targetAmount;
      summary.current += goal.currentAmount;
      summary.remaining += goal.remainingAmount;
      summary.completed += goal.status === 'Completed' ? 1 : 0;
      return summary;
    },
    { completed: 0, current: 0, remaining: 0, target: 0 }
  );

function GoalsPage({ currentUser, onLogout }) {
  const [goals, setGoals] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const loadGoals = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const nextGoals = await financeStore.getGoalsForUser(currentUser.id);
        if (!isCancelled) {
          setGoals(nextGoals);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setGoals([]);
        setLoadError(error.message || 'Goals could not load.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadGoals();

    return () => {
      isCancelled = true;
    };
  }, [currentUser.id, onLogout, refreshKey]);

  const visibleGoals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return goals.filter((goal) => !normalizedQuery || [goal.title, goal.status, goal.goalType].some((value) => String(value).toLowerCase().includes(normalizedQuery)));
  }, [goals, query]);
  const summary = useMemo(() => summarizeGoals(visibleGoals), [visibleGoals]);
  const progress = summary.target ? Math.round((summary.current / summary.target) * 100) : 0;

  const openCreate = () => {
    setEditingGoal(null);
    setSaveError('');
    setIsFormOpen(true);
  };

  const saveGoal = async (payload) => {
    setIsSaving(true);
    setSaveError('');

    try {
      await financeStore.saveGoal(currentUser.id, payload);
      setIsFormOpen(false);
      setEditingGoal(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSaveError(error.message || 'Goal could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteGoal = async () => {
    if (!deleteCandidate) {
      return;
    }

    setIsDeleting(true);

    try {
      await financeStore.deleteGoal(currentUser.id, deleteCandidate.id);
      setDeleteCandidate(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setLoadError(error.message || 'Goal could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
  };

  const rail = (
    <aside className="activity-rail">
      <article className="ref-panel activity-rail-card activity-rail-card-dark">
        <span>Goal portfolio</span>
        <h3>{progress}% funded</h3>
        <p>Progress is based only on targets you create and amounts you enter.</p>
      </article>
      <article className="ref-panel activity-rail-card">
        <span>Milestones</span>
        <div className="activity-stat-list">
          <div><strong>{visibleGoals.length}</strong><p>Visible goals</p></div>
          <div><strong>{summary.completed}</strong><p>Completed</p></div>
          <div><strong>{formatGoalCurrency(summary.remaining)}</strong><p>Remaining</p></div>
        </div>
      </article>
    </aside>
  );

  return (
    <>
      <FinanceLayout
        currentUser={currentUser}
        onLogout={onLogout}
        pageTitle="Goals"
        pageSubtitle="A calm milestone portfolio for savings and payoff targets."
        primaryActionLabel="+ Create goal"
        onPrimaryAction={openCreate}
        rail={rail}
      >
        <PremiumHero
          eyebrow="Milestone portfolio"
          title="Track what you are building toward."
          body="Create targets, update progress manually, and keep long-term money decisions visible without turning them into noise."
          variant="goal"
          meta={[`${visibleGoals.length} visible`, `${progress}% funded`, `${summary.completed} complete`]}
          actions={<PremiumButton onClick={openCreate}>Create goal</PremiumButton>}
          visual={<div className="premium-rings" />}
        />

        <PremiumMetrics>
          <PremiumMetric label="Target total" value={formatGoalCurrency(summary.target)} helper="Visible goals" tone="violet" />
          <PremiumMetric label="Committed" value={formatGoalCurrency(summary.current)} helper="Saved or paid down" tone="teal" />
          <PremiumMetric label="Remaining" value={formatGoalCurrency(summary.remaining)} helper="Left to finish" />
          <PremiumMetric label="Complete" value={String(summary.completed)} helper="Finished goals" tone="indigo" />
        </PremiumMetrics>

        <PremiumPanel eyebrow="Focus" title="Search goals">
          <div className="premium-filter-bar">
            <input aria-label="Search goals" placeholder="Search title, status, or type" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </PremiumPanel>

        <PremiumPanel eyebrow="Targets" title="Goal portfolio">
          {isLoading ? <PremiumSkeleton count={4} /> : null}

          {!isLoading && loadError ? (
            <PremiumEmpty title="Goals could not load" body={loadError} actionLabel="Retry" onAction={() => setRefreshKey((value) => value + 1)} />
          ) : null}

          {!isLoading && !loadError && visibleGoals.length ? (
            <div className="premium-list">
              {visibleGoals.map((goal) => (
                <article className="premium-row" key={goal.id}>
                  <div>
                    <strong>{goal.title}</strong>
                    <small>{getGoalTypeLabel(goal.goalType)} - {formatGoalDate(goal.targetDate)}</small>
                  </div>
                  <span>{Math.round(getGoalProgressPercent(goal))}% reached</span>
                  <strong>{formatGoalCurrency(goal.remainingAmount)} left</strong>
                  <div className="premium-row-actions">
                    <button type="button" onClick={() => {
                      setEditingGoal(goal);
                      setIsFormOpen(true);
                    }}>Update</button>
                    <button className="is-danger" type="button" onClick={() => setDeleteCandidate(goal)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoading && !loadError && !goals.length ? (
            <PremiumEmpty
              icon={<GoalsIcon type="target" />}
              title="Create your first financial target"
              body="Start with one savings or payoff goal. You can update current progress whenever money moves."
              actionLabel="Create goal"
              onAction={openCreate}
            />
          ) : null}

          {!isLoading && !loadError && goals.length > 0 && !visibleGoals.length ? (
            <PremiumEmpty title="No goals match this search" body="Clear the search to return to the full goal portfolio." actionLabel="Clear search" onAction={() => setQuery('')} />
          ) : null}
        </PremiumPanel>
      </FinanceLayout>

      {isFormOpen ? (
        <GoalFormDialog
          goal={editingGoal}
          isSaving={isSaving}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingGoal(null);
            }
          }}
          onSubmit={saveGoal}
          saveError={saveError}
        />
      ) : null}

      <DeleteGoalDialog
        goal={deleteCandidate}
        isDeleting={isDeleting}
        onCancel={() => !isDeleting && setDeleteCandidate(null)}
        onConfirm={confirmDeleteGoal}
      />
    </>
  );
}

export default GoalsPage;
