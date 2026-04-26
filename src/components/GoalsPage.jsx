import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResourceLimitCard } from './billing/FeatureGate';
import FinanceLayout from './FinanceLayout';
import DeleteGoalDialog from './goals/DeleteGoalDialog';
import GoalFormDialog from './goals/GoalFormDialog';
import GoalsIcon from './goals/GoalsIcon';
import { formatGoalCurrency, formatGoalDate, getGoalProgressPercent, getGoalTypeLabel } from './goals/goalUtils';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
import { useBillingAccess } from '../context/BillingAccessContext';
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

const getGoalState = (goal) => {
  if (goal.status === 'Completed') {
    return 'completed';
  }

  if (goal.targetDate) {
    const dueDate = new Date(goal.targetDate).getTime();
    const now = Date.now();
    const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 30) {
      return 'due_soon';
    }
  }

  return 'active';
};

const getGoalMonthlyPace = (goal) => {
  if (!goal?.targetDate || goal?.status === 'Completed' || Number(goal?.remainingAmount) <= 0) {
    return null;
  }

  const daysRemaining = Math.max(
    1,
    Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));

  return goal.remainingAmount / monthsRemaining;
};

function GoalsPage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const { access, isLoading: isBillingLoading, refreshBillingAccess } = useBillingAccess();
  const [goals, setGoals] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('progress');
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
    return [...goals]
      .filter((goal) => (statusFilter === 'all' ? true : getGoalState(goal) === statusFilter))
      .filter((goal) => !normalizedQuery || [goal.title, goal.status, goal.goalType].some((value) => String(value).toLowerCase().includes(normalizedQuery)))
      .sort((left, right) => {
        if (sortBy === 'deadline') {
          const leftDate = left.targetDate ? new Date(left.targetDate).getTime() : Number.POSITIVE_INFINITY;
          const rightDate = right.targetDate ? new Date(right.targetDate).getTime() : Number.POSITIVE_INFINITY;
          return leftDate - rightDate;
        }

        if (sortBy === 'value') {
          return right.targetAmount - left.targetAmount;
        }

        return getGoalProgressPercent(right) - getGoalProgressPercent(left);
      });
  }, [goals, query, sortBy, statusFilter]);
  const summary = useMemo(() => summarizeGoals(visibleGoals), [visibleGoals]);
  const progress = summary.target ? Math.round((summary.current / summary.target) * 100) : 0;
  const goalLimit = access.limits.goals;
  const goalUsage = access.usage.goals || 0;
  const canCreateGoal = goalLimit === null || goalUsage < goalLimit;
  const nextGoalFocus = useMemo(
    () =>
      [...visibleGoals].sort((left, right) => {
        const leftDate = left.targetDate ? new Date(left.targetDate).getTime() : Number.POSITIVE_INFINITY;
        const rightDate = right.targetDate ? new Date(right.targetDate).getTime() : Number.POSITIVE_INFINITY;
        return leftDate - rightDate;
      })[0] || null,
    [visibleGoals]
  );
  const activeGoals = useMemo(() => visibleGoals.filter((goal) => goal.status !== 'Completed'), [visibleGoals]);
  const dueSoonGoals = useMemo(
    () =>
      activeGoals.filter((goal) => {
        if (!goal.targetDate) {
          return false;
        }

        const daysRemaining = Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysRemaining >= 0 && daysRemaining <= 30;
      }),
    [activeGoals]
  );
  const paceFocus = useMemo(
    () =>
      activeGoals
        .map((goal) => ({
          goal,
          monthlyPace: getGoalMonthlyPace(goal),
        }))
        .filter((item) => item.monthlyPace)
        .sort((left, right) => right.monthlyPace - left.monthlyPace)[0] || null,
    [activeGoals]
  );
  const largestRemainingGoal = useMemo(
    () => [...activeGoals].sort((left, right) => right.remainingAmount - left.remainingAmount)[0] || null,
    [activeGoals]
  );
  const milestoneSignals = useMemo(() => {
    const signals = [];

    if (dueSoonGoals.length) {
      signals.push({
        body: `${dueSoonGoals.length} ${dueSoonGoals.length === 1 ? 'goal needs' : 'goals need'} attention inside the next 30 days.`,
        tone: 'watch',
        title: 'Due soon',
      });
    }

    if (paceFocus) {
      signals.push({
        body: `${paceFocus.goal.title} needs about ${formatGoalCurrency(paceFocus.monthlyPace)} per month to stay on pace.`,
        tone: 'healthy',
        title: 'Monthly pace needed',
      });
    }

    if (largestRemainingGoal) {
      signals.push({
        body: `${largestRemainingGoal.title} still has ${formatGoalCurrency(largestRemainingGoal.remainingAmount)} left to fund.`,
        tone: 'neutral',
        title: 'Largest remaining target',
      });
    }

    if (!signals.length) {
      signals.push({
        body: 'Create a target to see milestone pacing, due-soon signals, and contribution guidance.',
        tone: 'healthy',
        title: 'Milestones are ready',
      });
    }

    return signals.slice(0, 4);
  }, [dueSoonGoals.length, largestRemainingGoal, paceFocus]);
  const milestoneQueue = useMemo(
    () =>
      activeGoals
        .map((goal) => ({
          goal,
          monthlyPace: getGoalMonthlyPace(goal),
        }))
        .sort((left, right) => {
          const leftDate = left.goal.targetDate ? new Date(left.goal.targetDate).getTime() : Number.POSITIVE_INFINITY;
          const rightDate = right.goal.targetDate ? new Date(right.goal.targetDate).getTime() : Number.POSITIVE_INFINITY;
          return leftDate - rightDate;
        })
        .slice(0, 3),
    [activeGoals]
  );
  const premiumGoalIntelligence = access.isPremium;

  const openCreate = () => {
    if (!canCreateGoal) {
      navigate('/pricing');
      return;
    }

    setEditingGoal(null);
    setSaveError('');
    setIsFormOpen(true);
  };

  const saveGoal = async (payload) => {
    setIsSaving(true);
    setSaveError('');

    try {
      await financeStore.saveGoal(currentUser.id, payload);
      await refreshBillingAccess();
      setIsFormOpen(false);
      setEditingGoal(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSaveError(error.message || 'Goal could not be saved.');
      await refreshBillingAccess();
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
      await refreshBillingAccess();
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
        primaryActionLabel={!isBillingLoading && !canCreateGoal ? 'Upgrade' : '+ Create goal'}
        onPrimaryAction={!isBillingLoading && !canCreateGoal ? () => navigate('/pricing') : openCreate}
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
        </section>

        <section className="goals-portfolio-secondary" aria-label="Goal portfolio summary">
          {!isBillingLoading && goalLimit !== null ? (
            <ResourceLimitCard
              body="Free workspaces can track a focused set of targets. Upgrade when you want more simultaneous savings or payoff goals."
              limit={goalLimit}
              resourceLabel="goals"
              usage={goalUsage}
            />
          ) : null}

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

          <label className="goals-portfolio-filter">
            <span>Status</span>
            <select aria-label="Goal status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All goals</option>
              <option value="active">Active</option>
              <option value="due_soon">Due soon</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label className="goals-portfolio-filter">
            <span>Sort</span>
            <select aria-label="Goal sort order" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="progress">Highest progress</option>
              <option value="deadline">Nearest deadline</option>
              <option value="value">Largest target</option>
            </select>
          </label>

          <article className="goals-portfolio-focus">
            <span>Next focus</span>
            <strong>{nextGoalFocus?.title || 'No active milestone yet'}</strong>
            <p>
              {nextGoalFocus
                ? `${formatGoalCurrency(nextGoalFocus.remainingAmount)} left${nextGoalFocus.targetDate ? ` by ${formatGoalDate(nextGoalFocus.targetDate)}` : ''}.`
                : 'Create a goal to see the next milestone needing attention.'}
            </p>
          </article>
        </section>

        <section className="finance-intelligence-grid" aria-label="Goal milestone intelligence">
          <article className="finance-intelligence-card">
            <div className="finance-intelligence-head">
              <div>
                <span className="finance-intelligence-kicker">Milestone intelligence</span>
                <h3>{premiumGoalIntelligence ? 'Pro milestone guidance is live' : 'Pro adds milestone guidance'}</h3>
              </div>
              {!premiumGoalIntelligence ? (
                <button className="finance-upgrade-action" type="button" onClick={() => navigate('/pricing')}>
                  Unlock intelligence
                </button>
              ) : null}
            </div>
            <p className="finance-intelligence-copy">
              {premiumGoalIntelligence
                ? 'Ledgr highlights which target needs attention next, how quickly it needs funding, and which milestones are getting close.'
                : 'Free keeps goals simple. Pro adds due-soon signals, contribution pacing, and milestone guidance so customers know where to act next.'}
            </p>
            <div className="finance-intelligence-list">
              {(premiumGoalIntelligence ? milestoneSignals : milestoneSignals.slice(0, 2)).map((signal) => (
                <article className={`finance-intelligence-row tone-${signal.tone}`} key={signal.title}>
                  <strong>{signal.title}</strong>
                  <p>{signal.body}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="finance-intelligence-card finance-intelligence-card-accent">
            <span className="finance-intelligence-kicker">Contribution pace</span>
            <h3>{paceFocus ? `${formatGoalCurrency(paceFocus.monthlyPace)} / month` : 'No pace pressure yet'}</h3>
            <p>
              {paceFocus
                ? `${paceFocus.goal.title} is the next milestone that benefits most from a consistent contribution rhythm.`
                : 'Once a dated goal exists, this section shows the monthly pace needed to stay on track.'}
            </p>
            <div className="finance-pill-row">
              {premiumGoalIntelligence ? (
                milestoneQueue.length ? (
                  milestoneQueue.map((item) => (
                    <span className="finance-pill" key={item.goal.id}>
                      {item.goal.title}{item.monthlyPace ? ` · ${formatGoalCurrency(item.monthlyPace)}/mo` : ''}
                    </span>
                  ))
                ) : (
                  <span className="finance-pill">Milestones appear here</span>
                )
              ) : (
                <>
                  <span className="finance-pill">Due-soon goals</span>
                  <span className="finance-pill">Monthly pace</span>
                  <span className="finance-pill">Next milestone</span>
                </>
              )}
            </div>
          </article>
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
                    <small className={`goals-card-state goals-card-state-${getGoalState(goal)}`}>
                      {getGoalState(goal) === 'completed'
                        ? 'Completed'
                        : getGoalState(goal) === 'due_soon'
                          ? 'Due soon'
                          : 'Active'}
                    </small>
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
            <PremiumEmpty
              title="No goals match this view"
              body="Clear the search or reset status and sort controls to return to the full goal portfolio."
              actionLabel="Reset view"
              onAction={() => {
                setQuery('');
                setStatusFilter('all');
                setSortBy('progress');
              }}
            />
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
