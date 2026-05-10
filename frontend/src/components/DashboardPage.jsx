import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';
import { formatAccountCurrency, getAccountTypeLabel } from './accounts/accountUtils';
import { useBillingAccess } from '../context/useBillingAccess';
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
const axisValueFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});
const monthLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const CHART_HEIGHT = 220;
const CHART_WIDTH = 760;
const CHART_HORIZONTAL_PADDING = 14;
const CHART_VERTICAL_PADDING = 12;
const DEFAULT_CHART_SCALE = 1400;

const formatCurrency = (value) => currencyFormatter.format(value || 0);
const formatShortDate = (value) => shortDateFormatter.format(new Date(value));
const formatAxisValue = (value) => axisValueFormatter.format(value || 0);

const getDashboardAccountTheme = (accountType) => {
  if (accountType === 'savings' || accountType === 'investment') {
    return 'emerald';
  }

  if (accountType === 'cash') {
    return 'sunset';
  }

  return 'indigo';
};

const createAccountWalletItem = (account) => ({
  balanceLabel: formatAccountCurrency(account.currentBalance, account.currency),
  brand: account.institutionName || 'Rivo Wallet',
  currency: account.currency || 'USD',
  holderName: `${getAccountTypeLabel(account.accountType)} account`,
  id: `account-${account.id}`,
  last4: account.maskedIdentifier || account.accountType || 'manual',
  nickname: account.name || account.institutionName || getAccountTypeLabel(account.accountType),
  sourceType: 'account',
  theme: getDashboardAccountTheme(account.accountType),
});

const getCardTitle = (card) => {
  if (card?.nickname?.trim()) {
    return card.nickname.trim();
  }

  if (card?.sourceType === 'account') {
    return card?.brand || 'Wallet';
  }

  return `${card?.brand || 'Rivo'} Card`;
};
const matchesCardQuery = (card, query) =>
  !query ||
  [getCardTitle(card), card?.holderName, card?.brand, card?.last4, card?.balanceLabel]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));

const padValue = (value) => String(value).padStart(2, '0');
const toMonthKey = (date) => `${date.getFullYear()}-${padValue(date.getMonth() + 1)}`;
const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const createRollingMonthWindow = (referenceDate = new Date()) =>
  Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - (11 - index),
      1
    );

    return {
      expenses: 0,
      income: 0,
      label: monthLabelFormatter.format(monthDate),
      monthKey: toMonthKey(monthDate),
    };
  });

const buildTransactionFlowSeries = (transactions = []) => {
  const referenceTransaction = [...transactions]
    .filter((transaction) => transaction?.transactionDate)
    .sort(
      (left, right) =>
        new Date(right.transactionDate || 0).getTime() -
        new Date(left.transactionDate || 0).getTime()
    )[0];
  const referenceDate = referenceTransaction?.transactionDate
    ? new Date(referenceTransaction.transactionDate)
    : new Date();
  const series = createRollingMonthWindow(referenceDate);
  const buckets = new Map(series.map((point) => [point.monthKey, point]));

  transactions.forEach((transaction) => {
    const parsedDate = new Date(transaction.transactionDate || '');

    if (Number.isNaN(parsedDate.getTime())) {
      return;
    }

    const bucket = buckets.get(toMonthKey(parsedDate));

    if (!bucket) {
      return;
    }

    if (transaction.type === 'income') {
      bucket.income += Number(transaction.amount) || 0;
      return;
    }

    bucket.expenses += Number(transaction.amount) || 0;
  });

  return series;
};

const normalizeMoneyFlowSeries = (monthlyTrend = [], transactions = []) => {
  if (Array.isArray(monthlyTrend) && monthlyTrend.length) {
    const recentTrend = monthlyTrend.slice(-12);
    const normalizedTrend = recentTrend.map((point, index) => ({
      expenses: Number(point.expenses) || 0,
      income: Number(point.income) || 0,
      label: point.label || chartMonths[index + Math.max(0, 12 - recentTrend.length)] || '',
      monthKey: point.monthKey || point.month_key || `month-${index}`,
    }));

    if (normalizedTrend.length === 12) {
      return normalizedTrend;
    }

    const paddedSeries = createRollingMonthWindow(new Date());
    const startIndex = Math.max(0, paddedSeries.length - normalizedTrend.length);

    normalizedTrend.forEach((point, index) => {
      paddedSeries[startIndex + index] = point;
    });

    return paddedSeries;
  }

  return buildTransactionFlowSeries(transactions);
};

const getRecurringMonthlyAmount = (payment) => {
  const monthlyAmount = Number(payment.monthlyAmount) || 0;

  if (monthlyAmount > 0) {
    return monthlyAmount;
  }

  const annualAmount = Number(payment.annualAmount) || 0;

  if (annualAmount > 0) {
    return annualAmount / 12;
  }

  const amount = Number(payment.amount) || 0;

  if (!amount) {
    return 0;
  }

  switch (payment.billingFrequency) {
    case 'weekly':
      return (amount * 52) / 12;
    case 'biweekly':
      return (amount * 26) / 12;
    case 'quarterly':
      return amount / 3;
    case 'annual':
      return amount / 12;
    case 'monthly':
    case 'custom':
    default:
      return amount;
  }
};

const buildPlannedMoneyFlowSeries = (budgets = [], recurringPayments = []) => {
  const series = createRollingMonthWindow(new Date());
  const budgetTotals = budgets.reduce((totals, budget) => {
    const month = Number(budget.month);
    const year = Number(budget.year);

    if (!Number.isInteger(month) || !Number.isInteger(year)) {
      return totals;
    }

    const monthKey = `${year}-${padValue(month)}`;
    totals.set(monthKey, (totals.get(monthKey) || 0) + (Number(budget.amountLimit) || 0));
    return totals;
  }, new Map());
  const recurringTotal = recurringPayments
    .filter((payment) => payment.status === 'active')
    .reduce((total, payment) => total + getRecurringMonthlyAmount(payment), 0);

  return series.map((point) => ({
    ...point,
    expenses: (budgetTotals.get(point.monthKey) || 0) + recurringTotal,
    income: 0,
  }));
};

const getRoundedChartScale = (maxValue) => {
  if (!maxValue) {
    return DEFAULT_CHART_SCALE;
  }

  const roughStep = maxValue / 7;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalizedStep = roughStep / magnitude;
  const stepMultiplier =
    normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;

  return Math.max(stepMultiplier * magnitude * 7, 7);
};

const buildChartAxisValues = (scaleMax) =>
  Array.from({ length: 8 }, (_, index) => Math.round(scaleMax - (scaleMax / 7) * index));

const getChartX = (index, pointCount) => {
  if (pointCount <= 1) {
    return CHART_WIDTH / 2;
  }

  const usableWidth = CHART_WIDTH - CHART_HORIZONTAL_PADDING * 2;
  return CHART_HORIZONTAL_PADDING + (usableWidth / (pointCount - 1)) * index;
};

const getChartY = (value, scaleMax) => {
  const usableHeight = CHART_HEIGHT - CHART_VERTICAL_PADDING * 2;
  const boundedValue = scaleMax ? Math.min(Math.max(value, 0), scaleMax) : 0;
  const normalizedHeight = scaleMax ? (boundedValue / scaleMax) * usableHeight : 0;

  return CHART_HEIGHT - CHART_VERTICAL_PADDING - normalizedHeight;
};

const buildLinePath = (series, key, scaleMax) =>
  series
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${getChartX(index, series.length).toFixed(2)} ${getChartY(
        point[key],
        scaleMax
      ).toFixed(2)}`;
    })
    .join(' ');

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
  const isAccount = card?.sourceType === 'account';
  const theme = placeholder ? 'indigo' : card?.theme || 'indigo';
  const title = placeholder ? 'Rivo' : card?.brand || (isAccount ? 'Wallet' : 'Card');
  const label = placeholder ? 'Preview wallet' : card?.holderName || (isAccount ? 'Money source' : 'Card holder');
  const number = placeholder ? '**** ----' : isAccount ? card?.balanceLabel || '$0.00' : `**** ${card?.last4 || '----'}`;
  const expiry = placeholder ? '--/--' : isAccount ? card?.currency || 'USD' : card?.expiry || '--/--';
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
  const [accounts, setAccounts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [cardSearch, setCardSearch] = useState('');
  const [cards, setCards] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [recurringPayments, setRecurringPayments] = useState([]);
  const [snapshot, setSnapshot] = useState(defaultSnapshot);
  const [transactions, setTransactions] = useState([]);
  const [workspaceSignals, setWorkspaceSignals] = useState(defaultWorkspaceSignals);
  const [dataMessage, setDataMessage] = useState('');

  const firstName = currentUser?.fullName?.split(' ')[0] || 'Rivo';
  const hasRecurringAccess = hasFeature('recurringPayments');

  useEffect(() => {
    let isCancelled = false;

    const loadWorkspaceData = async () => {
      if (!currentUser?.id) {
        setAccounts([]);
        setBudgets([]);
        setCards([]);
        setExpenseCategories([]);
        setRecurringPayments([]);
        setSnapshot(defaultSnapshot);
        setTransactions([]);
        setWorkspaceSignals(defaultWorkspaceSignals);
        setActiveCardId('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setDataMessage('');

      try {
        const [cardsResult, snapshotResult, categoriesResult, transactionsResult] = await Promise.allSettled([
          cardStore.getCardsForUser(currentUser.id),
          financeStore.getDashboardSnapshot(currentUser.id),
          financeStore.getCategoriesForUser(currentUser.id),
          financeStore.getTransactionsForUser(currentUser.id),
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

        const allResults = [
          cardsResult,
          snapshotResult,
          categoriesResult,
          transactionsResult,
          accountsResult,
          budgetsResult,
          goalsResult,
          recurringResult,
        ];
        const unauthorizedResult = allResults.find(
          (result) => result.status === 'rejected' && result.reason?.status === 401
        );

        if (unauthorizedResult) {
          await onLogout();
          return;
        }

        const nextCards = cardsResult.status === 'fulfilled' ? cardsResult.value : [];
        const nextSnapshot = snapshotResult.status === 'fulfilled' ? snapshotResult.value : defaultSnapshot;
        const nextCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
        const nextTransactions =
          transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];
        const nextAccounts =
          accountsResult.status === 'fulfilled'
            ? accountsResult.value.filter((account) => account.status === 'active')
            : [];
        const nextBudgets = budgetsResult.status === 'fulfilled' ? budgetsResult.value : [];
        const nextRecurringPayments =
          recurringResult.status === 'fulfilled' ? recurringResult.value : [];
        const nextExpenseCategories = nextCategories.filter((category) => category.type === 'expense');
        const issues = [
          snapshotResult.status === 'rejected'
            ? snapshotResult.reason?.message || 'Dashboard summary is unavailable.'
            : '',
          transactionsResult.status === 'rejected'
            ? transactionsResult.reason?.message || 'Transaction history is unavailable.'
            : '',
          cardsResult.status === 'rejected'
            ? cardsResult.reason?.message || 'Cards are unavailable.'
            : '',
        ].filter(Boolean);
        const nextWalletItems = nextCards.length
          ? nextCards.map((card) => ({ ...card, sourceType: 'card' }))
          : nextAccounts.map(createAccountWalletItem);

        setAccounts(nextAccounts);
        setBudgets(nextBudgets);
        setCards(nextCards);
        setSnapshot(nextSnapshot);
        setTransactions(nextTransactions);
        setRecurringPayments(nextRecurringPayments);
        setExpenseCategories(nextExpenseCategories);
        setWorkspaceSignals({
          accounts: nextAccounts.length,
          budgets: nextBudgets.length,
          goals: goalsResult.status === 'fulfilled' ? goalsResult.value.length : 0,
          recurring: nextRecurringPayments.filter((payment) => payment.status === 'active').length,
        });
        setActiveCardId((currentActiveCardId) =>
          nextWalletItems.some((card) => card.id === currentActiveCardId)
            ? currentActiveCardId
            : nextWalletItems[0]?.id || ''
        );
        setDataMessage(issues[0] || '');
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setAccounts([]);
        setCards([]);
        setBudgets([]);
        setExpenseCategories([]);
        setRecurringPayments([]);
        setSnapshot(defaultSnapshot);
        setTransactions([]);
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

  const recentPayments = useMemo(() => {
    if (snapshot.recentTransactions.length) {
      return snapshot.recentTransactions.slice(0, 4);
    }

    return transactions
      .filter((transaction) => transaction.type === 'expense')
      .sort(
        (left, right) =>
          new Date(right.transactionDate || right.createdAt || 0).getTime() -
          new Date(left.transactionDate || left.createdAt || 0).getTime()
      )
      .slice(0, 4)
      .map((transaction) => ({
        ...transaction,
        date: transaction.transactionDate,
        paymentSource: transaction.categoryName,
        title: transaction.description || transaction.categoryName,
      }));
  }, [snapshot.recentTransactions, transactions]);
  const actualMoneyFlowSeries = useMemo(
    () => normalizeMoneyFlowSeries(snapshot.monthlyTrend, transactions),
    [snapshot.monthlyTrend, transactions]
  );
  const plannedMoneyFlowSeries = useMemo(
    () => buildPlannedMoneyFlowSeries(budgets, recurringPayments),
    [budgets, recurringPayments]
  );
  const hasActualMoneyFlowData = actualMoneyFlowSeries.some(
    (point) => point.income > 0 || point.expenses > 0
  );
  const hasPlannedMoneyFlowData = plannedMoneyFlowSeries.some(
    (point) => point.income > 0 || point.expenses > 0
  );
  const moneyFlowMode = hasActualMoneyFlowData
    ? 'actual'
    : hasPlannedMoneyFlowData
      ? 'planned'
      : 'empty';
  const moneyFlowSeries =
    moneyFlowMode === 'actual'
      ? actualMoneyFlowSeries
      : moneyFlowMode === 'planned'
        ? plannedMoneyFlowSeries
        : actualMoneyFlowSeries;
  const moneyFlowTotals = useMemo(
    () => {
      const seriesTotals = moneyFlowSeries.reduce(
        (totals, point) => ({
          expenses: totals.expenses + point.expenses,
          income: totals.income + point.income,
        }),
        { expenses: 0, income: 0 }
      );

      if (moneyFlowMode !== 'actual') {
        return seriesTotals;
      }

      return {
        expenses: snapshot.totalExpenses || seriesTotals.expenses,
        income: snapshot.totalIncome || seriesTotals.income,
      };
    },
    [moneyFlowMode, moneyFlowSeries, snapshot.totalExpenses, snapshot.totalIncome]
  );
  const hasMoneyFlowData = moneyFlowMode !== 'empty';
  const moneyFlowSummaryCopy =
    moneyFlowMode === 'planned'
      ? 'Projected from your budgets and active recurring payments until transactions arrive.'
      : hasMoneyFlowData
        ? 'Built from recorded income and spending activity.'
        : 'Records a live trend as soon as transaction activity exists.';
  const expenseLegendLabel = moneyFlowMode === 'planned' ? 'Planned expenses' : 'Expenses';
  const moneyFlowScaleMax = useMemo(() => {
    const maxValue = Math.max(
      ...moneyFlowSeries.map((point) => Math.max(point.income, point.expenses)),
      0
    );

    return getRoundedChartScale(maxValue);
  }, [moneyFlowSeries]);
  const moneyFlowAxisValues = useMemo(
    () => buildChartAxisValues(moneyFlowScaleMax),
    [moneyFlowScaleMax]
  );
  const incomeLinePath = useMemo(
    () => buildLinePath(moneyFlowSeries, 'income', moneyFlowScaleMax),
    [moneyFlowScaleMax, moneyFlowSeries]
  );
  const expenseLinePath = useMemo(
    () => buildLinePath(moneyFlowSeries, 'expenses', moneyFlowScaleMax),
    [moneyFlowScaleMax, moneyFlowSeries]
  );
  const highlightedMoneyFlowPoint = useMemo(() => {
    const populatedPoints = moneyFlowSeries
      .map((point, index) => ({
        ...point,
        index,
      }))
      .filter((point) => point.income > 0 || point.expenses > 0);

    return populatedPoints[populatedPoints.length - 1] || null;
  }, [moneyFlowSeries]);
  const flowGuideX = highlightedMoneyFlowPoint
    ? getChartX(highlightedMoneyFlowPoint.index, moneyFlowSeries.length)
    : 0;
  const flowGuideTop = highlightedMoneyFlowPoint
    ? Math.min(
        getChartY(highlightedMoneyFlowPoint.income, moneyFlowScaleMax),
        getChartY(highlightedMoneyFlowPoint.expenses, moneyFlowScaleMax)
      )
    : 0;
  const tooltipWidth = 188;
  const tooltipHeight = 64;
  const flowTooltipX = highlightedMoneyFlowPoint
    ? clampValue(flowGuideX - tooltipWidth / 2, 8, CHART_WIDTH - tooltipWidth - 8)
    : 0;
  const flowTooltipY = highlightedMoneyFlowPoint
    ? clampValue(flowGuideTop - tooltipHeight - 12, 8, CHART_HEIGHT - tooltipHeight - 8)
    : 0;
  const walletItems = useMemo(
    () =>
      cards.length
        ? cards.map((card) => ({ ...card, sourceType: 'card' }))
        : accounts.map(createAccountWalletItem),
    [accounts, cards]
  );
  const cardSearchQuery = cardSearch.trim().toLowerCase();
  const filteredCards = useMemo(() => {
    if (!cardSearchQuery) {
      return walletItems;
    }

    return walletItems.filter((card) => matchesCardQuery(card, cardSearchQuery));
  }, [cardSearchQuery, walletItems]);

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
  const totalWalletItems = walletItems.length;
  const heroPills = [
    totalWalletItems ? `${totalWalletItems} wallet${totalWalletItems > 1 ? 's' : ''}` : 'No wallets',
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
      readyCopy: 'Money locations are ready to use across Rivo.',
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
        : 'Move to Plus to unlock recurring control before charges land.',
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
        title: 'No transaction activity yet',
        copy: 'Income and spending you record in Transactions will show here.',
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
            disabled={!totalWalletItems}
            type="search"
            value={cardSearch}
            onChange={(event) => setCardSearch(event.target.value)}
            placeholder={totalWalletItems ? 'Search wallets' : 'Wallets appear here after setup'}
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
            : (
              <div className="ref-empty-card ref-wallet-stack-empty">
                <strong>No wallets connected yet</strong>
                <p>Add an account from Wallets and it will appear here as the overview money source.</p>
                <Link className="ref-inline-filter" to="/accounts">
                  Open wallets
                </Link>
              </div>
            )}
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
                <small>{card.sourceType === 'account' ? card.last4 : `**** ${card.last4}`}</small>
              </button>
            ))}
          </div>
        ) : null}

        <div className="ref-wallet-stack-meta">
          <p className="ref-wallet-stack-caption">
            {cardSearchQuery && !filteredCards.length
              ? 'No wallet found.'
              : totalWalletItems
                ? `${totalWalletItems} visible in your workspace`
                : 'Open Wallets to add the accounts you use every day.'}
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
            <small>{recentPayments.length ? 'Tracked from your workspace data' : 'No spend yet'}</small>
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
            <p>Review wallets, payments, and setup progress from one clear control center.</p>

            <div className="ref-hero-pill-row" aria-label="Workspace status">
              {heroPills.map((pill) => (
                <span key={pill}>{pill}</span>
              ))}
            </div>

            <div className="ref-hero-actions">
              <Link className="ref-primary-cta" to="/accounts">
                Open wallets
              </Link>
              <Link className="ref-secondary-cta" to="/transactions">
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
              <p className="ref-flow-note">{moneyFlowSummaryCopy}</p>
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

            <div className="ref-flow-legend" aria-label="Money flow legend">
              <span className="ref-flow-legend-item income">
                Income {formatCurrency(moneyFlowTotals.income)}
              </span>
              <span className="ref-flow-legend-item expense">
                {expenseLegendLabel} {formatCurrency(moneyFlowTotals.expenses)}
              </span>
            </div>
          </div>

          <div className="ref-chart-shell">
            <div className="ref-chart-grid" aria-hidden="true" />

            <div className="ref-chart-yaxis" aria-hidden="true">
              {moneyFlowAxisValues.map((value) => (
                <span key={value}>{formatAxisValue(value)}</span>
              ))}
            </div>

            <div className={`ref-chart-stage${hasMoneyFlowData ? '' : ' is-empty'}`}>
              <svg
                aria-label="Income and expense trend"
                className="ref-chart-svg"
                role="img"
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              >
                <defs>
                  <linearGradient id="ref-flow-income-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(36, 196, 112, 0.22)" />
                    <stop offset="100%" stopColor="rgba(36, 196, 112, 0.02)" />
                  </linearGradient>
                  <linearGradient id="ref-flow-expense-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(246, 165, 59, 0.22)" />
                    <stop offset="100%" stopColor="rgba(246, 165, 59, 0.02)" />
                  </linearGradient>
                </defs>

                {hasMoneyFlowData && highlightedMoneyFlowPoint ? (
                  <path
                    className="ref-chart-guide"
                    d={`M ${flowGuideX.toFixed(2)} ${CHART_VERTICAL_PADDING} L ${flowGuideX.toFixed(
                      2
                    )} ${(CHART_HEIGHT - CHART_VERTICAL_PADDING).toFixed(2)}`}
                  />
                ) : null}

                {hasMoneyFlowData ? (
                  <>
                    <path
                      d={`${incomeLinePath} L ${getChartX(
                        moneyFlowSeries.length - 1,
                        moneyFlowSeries.length
                      ).toFixed(2)} ${(CHART_HEIGHT - CHART_VERTICAL_PADDING).toFixed(2)} L ${getChartX(
                        0,
                        moneyFlowSeries.length
                      ).toFixed(2)} ${(CHART_HEIGHT - CHART_VERTICAL_PADDING).toFixed(2)} Z`}
                      fill="url(#ref-flow-income-gradient)"
                      opacity="0.75"
                    />
                    <path
                      d={`${expenseLinePath} L ${getChartX(
                        moneyFlowSeries.length - 1,
                        moneyFlowSeries.length
                      ).toFixed(2)} ${(CHART_HEIGHT - CHART_VERTICAL_PADDING).toFixed(2)} L ${getChartX(
                        0,
                        moneyFlowSeries.length
                      ).toFixed(2)} ${(CHART_HEIGHT - CHART_VERTICAL_PADDING).toFixed(2)} Z`}
                      fill="url(#ref-flow-expense-gradient)"
                      opacity="0.55"
                    />
                    <path className="ref-chart-line ref-chart-line-income" d={incomeLinePath} />
                    <path className="ref-chart-line ref-chart-line-expense" d={expenseLinePath} />

                    {moneyFlowSeries.map((point, index) => (
                      <g key={point.monthKey || `${point.label}-${index}`}>
                        <circle
                          className="ref-chart-point ref-chart-point-income"
                          cx={getChartX(index, moneyFlowSeries.length)}
                          cy={getChartY(point.income, moneyFlowScaleMax)}
                          r="5.5"
                        />
                        <circle
                          className="ref-chart-point ref-chart-point-expense"
                          cx={getChartX(index, moneyFlowSeries.length)}
                          cy={getChartY(point.expenses, moneyFlowScaleMax)}
                          r="5.5"
                        />
                      </g>
                    ))}

                    {highlightedMoneyFlowPoint ? (
                      <g className="ref-chart-tooltip">
                        <rect
                          height={tooltipHeight}
                          rx="18"
                          width={tooltipWidth}
                          x={flowTooltipX}
                          y={flowTooltipY}
                        />
                        <text x={flowTooltipX + 16} y={flowTooltipY + 20}>
                          {highlightedMoneyFlowPoint.label}
                        </text>
                        <text className="value-label" x={flowTooltipX + 16} y={flowTooltipY + 38}>
                          Income
                        </text>
                        <text className="value-number" x={flowTooltipX + tooltipWidth - 16} y={flowTooltipY + 38}>
                          {formatCurrency(highlightedMoneyFlowPoint.income)}
                        </text>
                        <text className="value-label" x={flowTooltipX + 16} y={flowTooltipY + 54}>
                          {expenseLegendLabel}
                        </text>
                        <text className="value-number" x={flowTooltipX + tooltipWidth - 16} y={flowTooltipY + 54}>
                          {formatCurrency(highlightedMoneyFlowPoint.expenses)}
                        </text>
                      </g>
                    ) : null}
                  </>
                ) : null}
              </svg>
            </div>

            {!hasMoneyFlowData ? (
              <div className="ref-chart-empty">
                <strong>{isLoading ? 'Loading workspace...' : flowState.title}</strong>
                <p>{dataMessage || (isLoading ? 'Syncing accounts, categories, and transaction activity.' : flowState.copy)}</p>
              </div>
            ) : null}

            <div className="ref-chart-xaxis" aria-hidden="true">
              {moneyFlowSeries.map((point, index) => (
                <span key={point.monthKey || `${point.label}-${index}`}>{point.label}</span>
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
                <strong>No recorded payments yet</strong>
                <p>Payments you record in Transactions will show here.</p>
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
