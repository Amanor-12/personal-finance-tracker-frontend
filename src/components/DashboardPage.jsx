import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';
import { useBillingAccess } from '../context/BillingAccessContext';
import { accountStore } from '../utils/accountStore';
import { cardStore } from '../utils/cardStore';
import { financeStore } from '../utils/financeStore';

const overviewActions = [
  { label: 'Wallets', icon: 'wallet', tone: 'mint', to: '/accounts' },
  { label: 'Transactions', icon: 'ledger', tone: 'violet', to: '/transactions' },
  { label: 'Budgets', icon: 'budget', tone: 'amber', to: '/budget' },
  { label: 'Goals', icon: 'goal', tone: 'sky', to: '/goals' },
];

const chartTabs = [
  { label: 'Overview', to: '/dashboard' },
  { label: 'Wallets', to: '/accounts' },
  { label: 'Transactions', to: '/transactions' },
];
const chartMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const expenseLegendTones = ['violet', 'blue', 'teal', 'orange'];
const expenseFallbackLabels = ['Housing', 'Groceries', 'Transport', 'Savings'];
const defaultSnapshot = {
  totalIncome: 0,
  totalExpenses: 0,
  netCashFlow: 0,
  currentMonthKey: '',
  currentMonthLabel: '',
  categorySpend: [],
  recentTransactions: [],
  budgetProgress: [],
  monthlyTrend: [],
};

const defaultWorkspaceSignals = {
  accounts: 0,
  budgets: 0,
  goals: 0,
  recurring: 0,
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const formatCurrency = (value) => currencyFormatter.format(value || 0);
const formatShortDate = (value) => shortDateFormatter.format(new Date(value));

const getCardTitle = (card) => card?.nickname?.trim() || `${card?.brand || 'Ledgr'} Card`;
const matchesCardQuery = (card, query) =>
  !query ||
  [getCardTitle(card), card?.holderName, card?.brand, card?.last4]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));

function WalletActionIcon({ type }) {
  const icons = {
    wallet: (
      <>
        <rect x="2.8" y="4.2" width="10.4" height="7.6" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="M3.7 6.8h8.6M5.4 9.4h2.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    ledger: (
      <>
        <path d="M4.2 5.2h7.6M4.2 8h7.6M4.2 10.8h5.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
        <circle cx="3.1" cy="5.2" r=".7" fill="currentColor" />
        <circle cx="3.1" cy="8" r=".7" fill="currentColor" />
        <circle cx="3.1" cy="10.8" r=".7" fill="currentColor" />
      </>
    ),
    budget: (
      <>
        <path d="M3.6 11.4h8.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
        <path d="M4.6 9.6 6.3 7.8 7.9 9l3-3.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
      </>
    ),
    goal: (
      <>
        <path d="m8 3.4 1.4 2.8 3.1.5-2.2 2.2.5 3.1L8 10.5 5.2 12l.5-3.1-2.2-2.2 3.1-.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="ref-action-svg" viewBox="0 0 16 16">
      {icons[type]}
    </svg>
  );
}

function CardSearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="m10.4 10.4 2.8 2.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function WalletStackCard({ card, depth = 0, placeholder = false, isActive = false, onSelect = null }) {
  const theme = placeholder ? 'indigo' : card?.theme || 'indigo';
  const title = placeholder ? 'Ledgr' : card?.brand || 'Card';
  const label = placeholder ? 'Preview card' : card?.holderName || 'Card holder';
  const number = placeholder ? '**** ----' : `**** ${card.last4}`;
  const expiry = placeholder ? '--/--' : card?.expiry || '--/--';
  const tail = placeholder ? 'preview' : getCardTitle(card);
  const Element = onSelect ? 'button' : 'article';

  return (
    <Element
      type={onSelect ? 'button' : undefined}
      className={`ref-wallet-card ref-stack-card theme-${theme}${placeholder ? ' is-placeholder' : ''}${onSelect ? ' is-clickable' : ''}${isActive ? ' is-active' : ''}`}
      style={{
        '--stack-x': `${depth * 14}px`,
        '--stack-y': `${depth * 18}px`,
        '--stack-scale': `${1 - depth * 0.04}`,
        '--stack-opacity': `${1 - depth * 0.14}`,
        zIndex: 12 - depth,
      }}
      onClick={onSelect}
      aria-pressed={onSelect ? isActive : undefined}
    >
      <div className="ref-wallet-card-top">
        <div className="ref-wallet-card-brand">
          <div className="ref-master-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <strong>{title}</strong>
        </div>
      </div>

      <span className="ref-wallet-chip" aria-hidden="true" />

      <div className="ref-wallet-card-copy">
        <span>{label}</span>
        <strong>{number}</strong>
      </div>

      <div className="ref-wallet-card-bottom">
        <span>{expiry}</span>
        <div className="ref-wallet-tail">
          <span className="ref-wallet-tail-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <small>{tail}</small>
        </div>
      </div>
    </Element>
  );
}

function DashboardPage({ currentUser, onLogout }) {
  const { hasFeature } = useBillingAccess();
  const [isLoading, setIsLoading] = useState(true);
  const [activeCardId, setActiveCardId] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [cards, setCards] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [snapshot, setSnapshot] = useState(defaultSnapshot);
  const [workspaceSignals, setWorkspaceSignals] = useState(defaultWorkspaceSignals);
  const [dataMessage, setDataMessage] = useState('');

  const firstName = currentUser?.fullName?.split(' ')[0] || 'Ledgr';
  const hasRecurringAccess = hasFeature('recurringPayments');

  useEffect(() => {
    let isCancelled = false;

    const loadWorkspaceData = async () => {
      if (!currentUser?.id) {
        setCards([]);
        setExpenseCategories([]);
        setSnapshot(defaultSnapshot);
        setWorkspaceSignals(defaultWorkspaceSignals);
        setActiveCardId('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setDataMessage('');

      try {
        const [nextCards, nextSnapshot, nextCategories] = await Promise.all([
          cardStore.getCardsForUser(currentUser.id),
          financeStore.getDashboardSnapshot(currentUser.id),
          financeStore.getCategoriesForUser(currentUser.id),
        ]);
        const [accountsResult, budgetsResult, goalsResult, recurringResult] = await Promise.allSettled([
          accountStore.getAccountsForUser(currentUser.id),
          financeStore.getBudgetsForUser(currentUser.id),
          financeStore.getGoalsForUser(currentUser.id),
          financeStore.getRecurringPaymentsForUser(currentUser.id),
        ]);

        if (isCancelled) {
          return;
        }

        const nextExpenseCategories = nextCategories.filter((category) => category.type === 'expense');

        setCards(nextCards);
        setSnapshot(nextSnapshot);
        setExpenseCategories(nextExpenseCategories);
        setWorkspaceSignals({
          accounts:
            accountsResult.status === 'fulfilled'
              ? accountsResult.value.filter((account) => account.status === 'active').length
              : 0,
          budgets: budgetsResult.status === 'fulfilled' ? budgetsResult.value.length : 0,
          goals: goalsResult.status === 'fulfilled' ? goalsResult.value.length : 0,
          recurring:
            recurringResult.status === 'fulfilled'
              ? recurringResult.value.filter((payment) => payment.status === 'active').length
              : 0,
        });
        setActiveCardId((currentActiveCardId) =>
          nextCards.some((card) => card.id === currentActiveCardId) ? currentActiveCardId : nextCards[0]?.id || ''
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setCards([]);
        setExpenseCategories([]);
        setSnapshot(defaultSnapshot);
        setWorkspaceSignals(defaultWorkspaceSignals);
        setDataMessage(error.message || 'Could not load your workspace.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadWorkspaceData();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, onLogout]);

  const expenseItems = useMemo(() => {
    const totals = new Map(snapshot.categorySpend.map((item) => [item.category, item.total]));
    const labels = snapshot.categorySpend.length
      ? snapshot.categorySpend.map((item) => item.category)
      : expenseCategories.length
        ? expenseCategories.map((category) => category.name)
        : expenseFallbackLabels;

    return labels.slice(0, 4).map((label, index) => ({
      label,
      tone: expenseLegendTones[index],
      amount: formatCurrency(totals.get(label) || 0),
    }));
  }, [expenseCategories, snapshot.categorySpend]);

  const recentPayments = snapshot.recentTransactions.slice(0, 4);
  const cardSearchQuery = cardSearch.trim().toLowerCase();
  const filteredCards = useMemo(() => {
    if (!cardSearchQuery) {
      return cards;
    }

    return cards.filter((card) => matchesCardQuery(card, cardSearchQuery));
  }, [cardSearchQuery, cards]);

  const activeCard = filteredCards.find((card) => card.id === activeCardId) || filteredCards[0] || null;
  const visibleCards = useMemo(() => {
    if (!filteredCards.length) {
      return [];
    }

    const orderedCards = activeCard
      ? [activeCard, ...filteredCards.filter((card) => card.id !== activeCard.id)]
      : filteredCards;

    return orderedCards.slice(0, 3);
  }, [activeCard, filteredCards]);
  const stackedCards = visibleCards.length ? visibleCards.slice().reverse() : [];
  const cardPickerCards = filteredCards.slice(0, 6);
  const totalCards = cards.length;

  const heroPills = [
    totalCards ? `${totalCards} cards` : 'No cards',
    recentPayments.length ? `${recentPayments.length} payments` : '0 payments',
    workspaceSignals.accounts ? `${workspaceSignals.accounts} accounts` : '0 accounts',
  ];

  const workspaceModules = [
    {
      label: 'Accounts',
      value: workspaceSignals.accounts,
      tone: 'teal',
      route: '/accounts',
      emptyCopy: 'Add the real places your money lives.',
      readyCopy: 'Money locations are ready to use across Ledgr.',
    },
    {
      label: 'Budgets',
      value: workspaceSignals.budgets,
      tone: 'blue',
      route: '/budget',
      emptyCopy: 'Set spending guardrails before activity grows.',
      readyCopy: 'Monthly limits are guiding the workspace.',
    },
    {
      label: 'Goals',
      value: workspaceSignals.goals,
      tone: 'violet',
      route: '/goals',
      emptyCopy: 'Create the next savings or payoff target.',
      readyCopy: 'Savings targets are visible in the workspace.',
    },
    {
      label: 'Renewals',
      value: workspaceSignals.recurring,
      tone: 'orange',
      route: hasRecurringAccess ? '/recurring' : '/pricing',
      emptyCopy: hasRecurringAccess
        ? 'Track recurring bills before they surprise you.'
        : 'Plus adds subscriptions, rent, and fixed charges in one renewal queue.',
      readyCopy: hasRecurringAccess
        ? 'Upcoming renewals are already in view.'
        : 'Upgrade to unlock recurring control before charges land.',
      locked: !hasRecurringAccess,
      actionLabel: hasRecurringAccess ? undefined : 'Unlock',
      requiredTier: 'Plus',
    },
  ];
  const accessibleModules = workspaceModules.filter((module) => !module.locked);
  const connectedModules = accessibleModules.filter((module) => module.value > 0).length;
  const nextWorkspaceModule = accessibleModules.find((module) => module.value === 0) || accessibleModules[0] || workspaceModules[0];
  const workspaceSummary = connectedModules === accessibleModules.length
    ? {
        kicker: 'Workspace connected',
        title: 'Overview is linked to every core finance area.',
        copy: 'Use this page to check the whole workspace, then move into the right page when you need detail or action.',
        actionLabel: 'Open transactions',
        actionRoute: '/transactions',
      }
    : {
        kicker: `${connectedModules}/${accessibleModules.length} areas ready`,
        title: `Next priority: ${nextWorkspaceModule.label.toLowerCase()}.`,
        copy: nextWorkspaceModule.emptyCopy,
        actionLabel: `Open ${nextWorkspaceModule.label.toLowerCase()}`,
        actionRoute: nextWorkspaceModule.route,
      };

  const flowState = recentPayments.length
    ? {
      title: `${recentPayments.length} payment${recentPayments.length > 1 ? 's' : ''} saved`,
      copy: 'Stored in your finance workspace.',
      }
    : {
      title: 'No payments yet',
      copy: 'Payments you record in Transactions will show here.',
      };

  const rail = (
    <>
      <article className="ref-panel ref-wallet-panel">
        <div className="ref-panel-head">
          <div>
            <h3>Wallet Preview</h3>
          </div>

          <div className="ref-panel-actions">
            <Link className="ref-mini-action" to="/accounts">
              Open wallets
            </Link>
          </div>
        </div>

        <label className="ref-card-search" aria-label="Search cards">
          <CardSearchIcon />
          <input
            type="search"
            value={cardSearch}
            onChange={(event) => setCardSearch(event.target.value)}
            placeholder="Search cards"
          />
        </label>

        <div className="ref-card-stack">
          {stackedCards.length
            ? stackedCards.map((card, index) => {
                const depth = stackedCards.length - index - 1;

                return (
                  <WalletStackCard
                    key={card.id}
                    card={card}
                    depth={depth}
                    isActive={activeCard?.id === card.id}
                    onSelect={() => setActiveCardId(card.id)}
                  />
                );
              })
            : <WalletStackCard placeholder depth={0} />}
        </div>

        {cardPickerCards.length ? (
          <div className="ref-card-picker" aria-label="Saved cards">
            {cardPickerCards.map((card) => (
              <button
                key={card.id}
                className={`ref-card-picker-item${activeCard?.id === card.id ? ' is-active' : ''}`}
                type="button"
                onClick={() => setActiveCardId(card.id)}
              >
                <span>{getCardTitle(card)}</span>
                <small>**** {card.last4}</small>
              </button>
            ))}
          </div>
        ) : null}

        <div className="ref-wallet-stack-meta">
          <p className="ref-wallet-stack-caption">
            {cardSearchQuery && !filteredCards.length
              ? 'No card found.'
              : totalCards
                ? `${totalCards} saved to your workspace`
                : 'Your wallet setup in Accounts will show here.'}
          </p>
        </div>

        <div className="ref-wallet-actions">
          {overviewActions.map((action) => (
            <Link key={action.label} className="ref-wallet-action" to={action.to}>
              <span className={`ref-wallet-action-icon ref-wallet-action-icon-${action.tone}`}>
                <WalletActionIcon type={action.icon} />
              </span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </article>

      <article className="ref-panel ref-expenses-panel">
        <div className="ref-panel-head">
          <div>
            <h3>Expenses</h3>
            <p>Monthly category view</p>
          </div>
          <button className="ref-dots-button" type="button" aria-label="Expense options">
            ...
          </button>
        </div>

        <div className="ref-expense-visual">
          <svg aria-hidden="true" className="ref-expense-chart" viewBox="0 0 260 260">
            <circle className="ref-expense-track" cx="120" cy="128" r="90" />
            <circle className="ref-expense-track" cx="120" cy="128" r="70" />
            <circle className="ref-expense-track" cx="120" cy="128" r="50" />
            <circle className="ref-expense-track" cx="120" cy="128" r="30" />

            <circle className="ref-expense-arc ref-expense-arc-violet" cx="120" cy="128" r="90" />
            <circle className="ref-expense-arc ref-expense-arc-blue" cx="120" cy="128" r="70" />
            <circle className="ref-expense-arc ref-expense-arc-teal" cx="120" cy="128" r="50" />
            <circle className="ref-expense-arc ref-expense-arc-orange" cx="120" cy="128" r="30" />
          </svg>

          <div className="ref-expense-summary">
            <strong>{formatCurrency(snapshot.totalExpenses)}</strong>
            <span>{snapshot.currentMonthLabel || 'This month'}</span>
            <small>{recentPayments.length ? 'Tracked from your backend data' : 'No spend yet'}</small>
          </div>
        </div>

        <div className="ref-expense-legend">
          {expenseItems.map((item) => (
            <div key={item.label} className="ref-expense-row">
              <div className="ref-expense-label">
                <span className={`ref-expense-dot ref-expense-dot-${item.tone}`} />
                <span>{item.label}</span>
              </div>
              <strong>{item.amount}</strong>
            </div>
          ))}
        </div>
      </article>
    </>
  );

  return (
    <>
      <FinanceLayout
        currentUser={currentUser}
        onLogout={onLogout}
        pageTitle={`Welcome back, ${firstName}`}
        pageSubtitle="Your connected finance workspace."
        rail={rail}
      >
        <article className="ref-hero-card">
          <div className="ref-hero-copy">
            <span className="ref-section-chip">Workspace</span>
            <h2>Your wallet, ready.</h2>
            <p>Review cards, payments, and setup progress from one clear control center.</p>

            <div className="ref-hero-pill-row">
              {heroPills.map((item) => (
                <span key={item} className="ref-hero-pill">
                  {item}
                </span>
              ))}
            </div>

            <div className="ref-hero-actions">
              <Link className="ref-secondary-link" to="/accounts">
                Open wallets
              </Link>
              <Link className="ref-secondary-link" to="/transactions">
                Open transactions
              </Link>
            </div>
          </div>

          <div className="ref-hero-visual" aria-hidden="true">
            <span className="ref-hero-orbit ref-hero-orbit-one" />
            <span className="ref-hero-orbit ref-hero-orbit-two" />
            <span className="ref-hero-glow" />
            <span className="ref-hero-glass" />
          </div>
        </article>

        <article className="ref-panel ref-flow-panel">
          <div className="ref-flow-header">
            <div className="ref-flow-copy">
              <h3>Money Flow</h3>
              <nav className="ref-flow-tabs" aria-label="Money flow routes">
                {chartTabs.map((tab, index) => (
                  <Link
                    key={tab.label}
                    className={`ref-flow-tab${index === 0 ? ' is-active' : ''}`}
                    to={tab.to}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="ref-flow-legend" aria-label="Workspace legend">
              <span className="ref-flow-legend-item income">{totalCards} cards</span>
              <span className="ref-flow-legend-item expense">{snapshot.recentTransactions.length} payments</span>
            </div>
          </div>

          <div className="ref-chart-shell">
            <div className="ref-chart-grid" aria-hidden="true" />

            <div className="ref-chart-yaxis" aria-hidden="true">
              <span>1,400</span>
              <span>1,200</span>
              <span>1,000</span>
              <span>800</span>
              <span>600</span>
              <span>400</span>
              <span>200</span>
              <span>0</span>
            </div>

            <div className="ref-chart-empty">
              <strong>{isLoading ? 'Loading workspace...' : flowState.title}</strong>
              <p>{dataMessage || (isLoading ? 'Syncing cards, categories, and payments.' : flowState.copy)}</p>
            </div>

            <div className="ref-chart-xaxis" aria-hidden="true">
              {chartMonths.map((month) => (
                <span key={month}>{month}</span>
              ))}
            </div>
          </div>
        </article>

        <div className="ref-bottom-grid">
          <article className="ref-panel ref-payments-panel">
            <div className="ref-panel-head">
              <div>
                <h3>Recent Payments</h3>
              </div>
              <div className="ref-panel-head-actions">
                <Link className="ref-view-link" to="/transactions">Ledger</Link>
                <Link className="ref-inline-filter" to="/transactions">
                  Open
                </Link>
              </div>
            </div>

            {recentPayments.length ? (
              <div className="ref-payment-list">
                {recentPayments.map((payment) => (
                  <article key={payment.id} className="ref-payment-row">
                    <div className="ref-payment-copy">
                      <span className="ref-payment-dot" aria-hidden="true" />
                      <div>
                        <strong>{payment.title}</strong>
                        <small>
                          {payment.paymentSource || 'Expense'} - {formatShortDate(payment.date)}
                        </small>
                      </div>
                    </div>
                    <strong className="ref-payment-amount">{formatCurrency(payment.amount)}</strong>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ref-empty-card">
                <strong>No payments yet</strong>
                <p>Payments you create through the API will show here.</p>
              </div>
            )}
          </article>

          <article className="ref-panel ref-workspace-panel">
            <div className="ref-panel-head">
              <div>
                <h3>Workspace</h3>
              </div>
              <Link className="ref-view-link" to="/reports">Insights</Link>
            </div>

            <div className="ref-workspace-summary">
              <div>
                <span className="ref-workspace-kicker">{workspaceSummary.kicker}</span>
                <strong>{workspaceSummary.title}</strong>
                <p>{workspaceSummary.copy}</p>
              </div>
              <Link className="ref-workspace-cta" to={workspaceSummary.actionRoute}>
                {workspaceSummary.actionLabel}
              </Link>
            </div>

            <div className="ref-workspace-route-list">
              {workspaceModules.map((item) => (
                <article key={item.label} className={`ref-workspace-route${item.locked ? ' is-locked' : ''}`}>
                  <div className="ref-workspace-route-copy">
                    <span className={`ref-expense-dot ref-expense-dot-${item.tone}`} />
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.value ? item.readyCopy : item.emptyCopy}</p>
                    </div>
                  </div>
                  <div className="ref-workspace-route-meta">
                    <strong>{item.locked ? item.requiredTier || 'Plus' : String(item.value).padStart(2, '0')}</strong>
                    <Link to={item.route}>{item.actionLabel || (item.value ? 'Open' : 'Set up')}</Link>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>
      </FinanceLayout>
    </>
  );
}

export default DashboardPage;
