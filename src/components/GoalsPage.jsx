import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import DeleteGoalDialog from './goals/DeleteGoalDialog';
import GoalFormDialog from './goals/GoalFormDialog';
import GoalsIcon from './goals/GoalsIcon';
import { formatGoalCurrency, formatGoalDate, getGoalProgressPercent, getGoalTypeLabel } from './goals/goalUtils';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
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
        <section className="goals-portfolio-console" aria-label="Goal portfolio console">
          <div className="goals-portfolio-panel">
            <span className="ref-section-chip">Goal portfolio</span>
            <h2>Targets that feel calm and accountable.</h2>
            <p>Track savings, payoff goals, and milestones with progress that stays useful without becoming noisy.</p>
            <button className="ref-secondary-button" type="button" onClick={openCreate}>Create goal</button>
          </div>

          <article className="goals-progress-orb" style={{ '--goal-progress': `${Math.min(100, progress)}%` }}>
            <span>{progress}%</span>
            <strong>funded</strong>
            <small>{visibleGoals.length} visible goals</small>
          </article>

          <div className="goals-portfolio-values">
            <article><span>Target total</span><strong>{formatGoalCurrency(summary.target)}</strong></article>
            <article><span>Committed</span><strong>{formatGoalCurrency(summary.current)}</strong></article>
            <article><span>Remaining</span><strong>{formatGoalCurrency(summary.remaining)}</strong></article>
            <article><span>Complete</span><strong>{summary.completed}</strong></article>
          </div>

          <label className="goals-portfolio-search">
            <span>Find a goal</span>
            <input aria-label="Search goals" placeholder="Search title, status, or type" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </section>

        <PremiumPanel eyebrow="Targets" title="Goal portfolio">
          {isLoading ? <PremiumSkeleton count={4} /> : null}

          {!isLoading && loadError ? (
            <PremiumEmpty title="Goals could not load" body={loadError} actionLabel="Retry" onAction={() => setRefreshKey((value) => value + 1)} />
          ) : null}

          {!isLoading && !loadError && visibleGoals.length ? (
            <div className="goals-card-grid">
              {visibleGoals.map((goal) => (
                <article className="goals-portfolio-card" key={goal.id}>
                  <div className="goals-card-top">
                    <span>{getGoalTypeLabel(goal.goalType)}</span>
                    <strong>{Math.round(getGoalProgressPercent(goal))}%</strong>
                  </div>
                  <h3>{goal.title}</h3>
                  <p>Target date: {formatGoalDate(goal.targetDate)}</p>
                  <div className="goals-progress-track">
                    <span style={{ width: `${Math.min(100, getGoalProgressPercent(goal))}%` }} />
                  </div>
                  <div className="goals-card-values">
                    <span>{formatGoalCurrency(goal.currentAmount)} saved</span>
                    <strong>{formatGoalCurrency(goal.remainingAmount)} left</strong>
                  </div>
                  <div className="goals-card-actions">
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
