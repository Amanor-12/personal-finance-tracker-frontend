import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBillingAccess } from '../context/BillingAccessContext';
import FinanceLayout from './FinanceLayout';
import { accountStore } from '../utils/accountStore';
import { financeStore } from '../utils/financeStore';
import { isProTier, isPlusTier } from '../utils/tierAccess';

const activityTypes = {
  account: { label: 'Account', route: '/accounts' },
  budget: { label: 'Budget', route: '/budget' },
  goal: { label: 'Goal', route: '/goals' },
  recurring: { label: 'Recurring', route: '/recurring' },
  transaction: { label: 'Transaction', route: '/transactions' },
};
const activityFilterOptions = [
  { label: 'Everything', value: 'all' },
  { label: 'Transactions', value: 'transaction' },
  { label: 'Accounts', value: 'account' },
  { label: 'Budgets', value: 'budget' },
  { label: 'Goals', value: 'goal' },
  { label: 'Recurring', value: 'recurring' },
];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

const getEventDate = (record, fallbackKey) =>
  record.updatedAt || record.createdAt || record[fallbackKey] || new Date().toISOString();

const formatEventDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return `${dateFormatter.format(date)} at ${timeFormatter.format(date)}`;
};

const buildActivityEvents = ({ accounts, budgets, goals, recurringPayments, transactions }) => [
  ...transactions.map((transaction) => ({
    id: `transaction-${transaction.id}`,
    amount: transaction.amount,
    date: getEventDate(transaction, 'transactionDate'),
    description: transaction.categoryName || 'Transaction recorded',
    title: transaction.description || 'Transaction recorded',
    type: 'transaction',
  })),
  ...accounts.map((account) => ({
    id: `account-${account.id}`,
    date: getEventDate(account),
    description: `${account.accountType.replace('_', ' ')} account`,
    title: account.name,
    type: 'account',
  })),
  ...budgets.map((budget) => ({
    id: `budget-${budget.id}`,
    amount: budget.amountLimit,
    date: getEventDate(budget),
    description: `${budget.month}/${budget.year} monthly budget`,
    title: budget.categoryName,
    type: 'budget',
  })),
  ...goals.map((goal) => ({
    id: `goal-${goal.id}`,
    amount: goal.targetAmount,
    date: getEventDate(goal),
    description: goal.status || 'Goal target',
    title: goal.title,
    type: 'goal',
  })),
  ...recurringPayments.map((payment) => ({
    id: `recurring-${payment.id}`,
    amount: payment.amount,
    date: getEventDate(payment, 'nextPaymentDate'),
    description: payment.billingFrequency,
    title: payment.name,
    type: 'recurring',
  })),
].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

const formatAmount = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    style: 'currency',
  }).format(Number(value) || 0);
};

function ActivitySkeleton() {
  return (
    <div className="activity-skeleton-list" aria-label="Loading activity">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function ActivityPage({ currentUser, onLogout }) {
  const { hasFeature, isPro, tier } = useBillingAccess();
  const [records, setRecords] = useState({
    accounts: [],
    budgets: [],
    goals: [],
    recurringPayments: [],
    transactions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    let isCancelled = false;

    const loadActivity = async () => {
      if (!currentUser?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const [accounts, transactions, budgets, goals, recurringPayments] = await Promise.all([
          accountStore.getAccountsForUser(currentUser.id),
          financeStore.getTransactionsForUser(currentUser.id),
          financeStore.getBudgetsForUser(currentUser.id),
          financeStore.getGoalsForUser(currentUser.id),
          financeStore.getRecurringPaymentsForUser(currentUser.id),
        ]);

        if (!isCancelled) {
          setRecords({ accounts, budgets, goals, recurringPayments, transactions });
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setLoadError(error.message || 'Activity could not load.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadActivity();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, onLogout, refreshKey]);

  const events = useMemo(() => buildActivityEvents(records), [records]);
  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesType = typeFilter === 'all' || event.type === typeFilter;
      const matchesQuery =
        !normalizedQuery ||
        [event.title, event.description, activityTypes[event.type]?.label]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesType && matchesQuery;
    });
  }, [events, query, typeFilter]);
  const visibleEvents = filteredEvents.slice(0, 30);
  const hasActiveFilters = Boolean(query.trim()) || typeFilter !== 'all';
  const stats = useMemo(
    () => [
      { label: 'Transactions', value: records.transactions.length },
      { label: 'Accounts', value: records.accounts.length },
      { label: 'Plans', value: records.budgets.length + records.goals.length + records.recurringPayments.length },
    ],
    [records]
  );
  const latestEvent = visibleEvents[0] || events[0] || null;

  const isPlus = isPlusTier(tier);
  const rail = (
    <aside className="activity-signal-rail">
      <article className="activity-signal-card">
        <span>Workspace signal</span>
        <h3>{events.length ? `${events.length} events` : 'No events yet'}</h3>
        <p>Activity is assembled from real records only. No marketing messages or fake notifications appear here.</p>
      </article>
      <article className="activity-signal-card activity-signal-card-light">
        <span>Record mix</span>
        <div className="activity-stat-list">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="activity-signal-card">
        <span>Tier lens</span>
        <h3>{isPro ? 'Pro audit context' : hasFeature('reports') ? 'Plus audit context' : 'Free audit context'}</h3>
        <p>
          {isPro
            ? 'Activity should support higher-control review before opening deeper reporting and forecasting.'
            : hasFeature('reports')
              ? 'This stream should help paid customers move quickly between renewals, reporting, and the transaction ledger.'
              : 'Free keeps activity simple: review changes, then jump into the correct page to act there.'}
        </p>
      </article>
    </aside>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Activity"
      pageSubtitle="A private audit stream of meaningful workspace changes."
      rail={rail}
    >
      <section className="activity-ledger-hero">
        <div>
          <span className="activity-eyebrow">Audit stream</span>
          <h2>Every important change in one calm timeline.</h2>
          <p>Use this page to see what changed recently and jump back to the exact finance area that produced it.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>
          Refresh stream
        </button>
      </section>

      <section className="activity-ledger">
        <div className="billing-value-grid" aria-label="Activity guidance">
          <article>
            <span>Latest signal</span>
            <strong>{latestEvent ? latestEvent.title : 'Nothing recorded yet'}</strong>
            <p>
              {latestEvent
                ? `${activityTypes[latestEvent.type]?.label || 'Record'} updated ${formatEventDate(latestEvent.date)}.`
                : 'The timeline will stay empty until real accounts, transactions, budgets, goals, or renewals are saved.'}
            </p>
          </article>
          <article>
            <span>Best next move</span>
            <strong>
              {records.transactions.length
                ? 'Review the ledger first'
                : records.accounts.length
                  ? 'Add the first transaction'
                  : 'Create the first account'}
            </strong>
            <p>
              {records.transactions.length
                ? 'Transactions usually create the fastest path into budgets, reports, and recurring analysis.'
                : records.accounts.length
                  ? 'Once an account exists, the activity stream becomes more meaningful after the first money movement.'
                  : 'Activity only becomes useful after the workspace has a real money location to work from.'}
            </p>
          </article>
          <article>
            <span>Paid layer</span>
            <strong>{isPro ? 'Pro depth active' : isPlus ? 'Plus depth active' : 'Free foundation active'}</strong>
            <p>
              {isPro
                ? 'Use this stream as the fast audit surface before opening deeper insight and planning pages.'
                : isPlus
                  ? 'Paid customers can move from this timeline into renewals, reports, and exports without losing context.'
                  : 'Free keeps the timeline clean while paid layers add stronger analysis and operating workflows.'}
            </p>
          </article>
        </div>

        <div className="activity-workbench-head">
          <div>
            <span className="activity-eyebrow">Recent events</span>
            <h3>Workspace timeline</h3>
          </div>
          <Link to="/transactions">Add transaction</Link>
        </div>

        {!isLoading && !loadError && events.length ? (
          <>
            <div className="activity-toolbar">
              <label className="activity-search">
                <span>Search the stream</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Merchant, goal, budget, account, or note"
                />
              </label>

              <div className="activity-filter-pills" aria-label="Filter activity by type">
                {activityFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`activity-filter-pill${typeFilter === option.value ? ' is-active' : ''}`}
                    onClick={() => setTypeFilter(option.value)}
                    aria-pressed={typeFilter === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {hasActiveFilters ? (
                <button className="activity-clear-filters" type="button" onClick={() => {
                  setQuery('');
                  setTypeFilter('all');
                }}>
                  Clear filters
                </button>
              ) : null}
            </div>

            <div className="activity-results-meta">
              <strong>
                {visibleEvents.length === filteredEvents.length
                  ? `${filteredEvents.length} event${filteredEvents.length === 1 ? '' : 's'} in view`
                  : `${visibleEvents.length} of ${filteredEvents.length} events in view`}
              </strong>
              <span>{hasActiveFilters ? 'Filtered from your private workspace records.' : 'Newest records appear first.'}</span>
            </div>
          </>
        ) : null}

        {isLoading ? <ActivitySkeleton /> : null}

        {!isLoading && loadError ? (
          <div className="activity-empty-state" role="alert">
            <h2>Activity could not load</h2>
            <p>{loadError}</p>
            <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !loadError && visibleEvents.length ? (
          <div className="activity-timeline">
            {visibleEvents.map((event) => {
              const meta = activityTypes[event.type];

              return (
                <Link className={`activity-event activity-${event.type}`} key={event.id} to={meta.route}>
                  <span className="activity-event-dot" />
                  <div className="activity-event-main">
                    <span className="activity-type-pill">{meta.label}</span>
                    <strong>{event.title}</strong>
                    <p>{event.description}</p>
                  </div>
                  <span className="activity-event-date">{formatEventDate(event.date)}</span>
                  {event.amount !== undefined ? <b>{formatAmount(event.amount)}</b> : null}
                </Link>
              );
            })}
          </div>
        ) : null}

        {!isLoading && !loadError && events.length && !filteredEvents.length ? (
          <div className="activity-empty-state activity-empty-results">
            <span className="activity-eyebrow">No matches</span>
            <h2>No activity matches the current filters.</h2>
            <p>Try another keyword or open the full stream again to keep reviewing workspace changes.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setTypeFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : null}

        {!isLoading && !loadError && !events.length ? (
          <div className="activity-empty-state">
            <span className="activity-eyebrow">Quiet workspace</span>
            <h2>Your activity stream will build from real records.</h2>
            <p>Create an account, add a transaction, set a budget, save a goal, or track a recurring payment.</p>
            <Link to="/accounts">Create first account</Link>
          </div>
        ) : null}
      </section>
    </FinanceLayout>
  );
}

export default ActivityPage;
