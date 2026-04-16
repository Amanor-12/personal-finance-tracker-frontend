import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import { cardStore } from '../utils/cardStore';
import { financeStore } from '../utils/financeStore';

const quickActions = [
  { label: 'Pay', icon: 'send', tone: 'violet', action: 'payment' },
  { label: 'Receive', icon: 'receive', tone: 'mint', action: null },
  { label: 'Invoice', icon: 'invoice', tone: 'amber', action: 'payment' },
  { label: 'Add Card', icon: 'plus', tone: 'sky', action: 'card' },
];

const chartTabs = ['Overview', 'Cards', 'Payments'];
const chartMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const cardThemeOptions = [
  { label: 'Indigo', value: 'indigo' },
  { label: 'Emerald', value: 'emerald' },
  { label: 'Sunset', value: 'sunset' },
];
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

const createCardForm = (fullName = '') => ({
  nickname: '',
  holderName: fullName,
  brand: 'Mastercard',
  last4: '',
  expiry: '',
  theme: 'indigo',
});

const createPaymentForm = ({ cardId = '', categoryId = '' } = {}) => ({
  title: '',
  amount: '',
  categoryId,
  paymentSource: cardId,
  note: '',
  date: new Date().toISOString().slice(0, 10),
});

const getCardTitle = (card) => card?.nickname?.trim() || `${card?.brand || 'Ledgr'} Card`;
const matchesCardQuery = (card, query) =>
  !query ||
  [getCardTitle(card), card?.holderName, card?.brand, card?.last4]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));

function WalletActionIcon({ type }) {
  const icons = {
    send: <path d="m4 10.4 8-5-2 7.6-2.2-2.4L4 10.4Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />,
    receive: (
      <>
        <path d="M8 4v7.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="m5.6 9.6 2.4 2.5 2.4-2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </>
    ),
    invoice: (
      <>
        <rect x="4.1" y="3.8" width="7.8" height="9.4" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 6.6h4M6 8.8h4M6 11h2.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </>
    ),
    plus: (
      <>
        <path d="M8 4.2v7.6M4.2 8h7.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCardComposerOpen, setIsCardComposerOpen] = useState(false);
  const [isPaymentComposerOpen, setIsPaymentComposerOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [cards, setCards] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [snapshot, setSnapshot] = useState(defaultSnapshot);
  const [dataMessage, setDataMessage] = useState('');
  const [cardForm, setCardForm] = useState(() => createCardForm(currentUser?.fullName));
  const [paymentForm, setPaymentForm] = useState(() => createPaymentForm());
  const [cardMessage, setCardMessage] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');

  const firstName = currentUser?.fullName?.split(' ')[0] || 'Ledgr';

  useEffect(() => {
    let isCancelled = false;

    const loadWorkspaceData = async () => {
      if (!currentUser?.id) {
        setCards([]);
        setExpenseCategories([]);
        setSnapshot(defaultSnapshot);
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

        if (isCancelled) {
          return;
        }

        const nextExpenseCategories = nextCategories.filter((category) => category.type === 'expense');

        setCards(nextCards);
        setSnapshot(nextSnapshot);
        setExpenseCategories(nextExpenseCategories);
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
  }, [currentUser?.id, onLogout, refreshKey]);

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
  ];

  const workspaceRows = [
    { label: 'Cards', value: String(totalCards).padStart(2, '0'), tone: 'teal' },
    { label: 'Payments', value: String(snapshot.recentTransactions.length).padStart(2, '0'), tone: 'violet' },
    { label: 'Sync', value: 'API', tone: 'orange' },
  ];

  const flowState = recentPayments.length
    ? {
        title: `${recentPayments.length} payment${recentPayments.length > 1 ? 's' : ''} saved`,
        copy: 'Stored in your finance workspace.',
      }
    : {
        title: 'No payments yet',
        copy: 'Add one payment to start tracking.',
      };

  const openCardComposer = () => {
    setCardForm(createCardForm(currentUser?.fullName));
    setCardMessage('');
    setIsCardComposerOpen(true);
  };

  const openPaymentComposer = () => {
    setPaymentForm(
      createPaymentForm({
        cardId: activeCard?.id || cards[0]?.id || '',
        categoryId: expenseCategories[0]?.id || '',
      })
    );
    setPaymentMessage('');
    setIsPaymentComposerOpen(true);
  };

  const closeComposers = () => {
    setIsCardComposerOpen(false);
    setIsPaymentComposerOpen(false);
    setCardMessage('');
    setPaymentMessage('');
  };

  const handleCardChange = (event) => {
    const { name, value } = event.target;
    setCardForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setCardMessage('');
  };

  const handlePaymentChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setPaymentMessage('');
  };

  const handleCardSubmit = async (event) => {
    event.preventDefault();

    if (!cardForm.nickname.trim()) {
      setCardMessage('Give the card a short name.');
      return;
    }

    if (!cardForm.holderName.trim()) {
      setCardMessage('Card holder name is required.');
      return;
    }

    if (!/^\d{4}$/.test(cardForm.last4)) {
      setCardMessage('Use exactly 4 digits for the last four.');
      return;
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardForm.expiry)) {
      setCardMessage('Expiry must use MM/YY.');
      return;
    }

    try {
      const nextCard = await cardStore.addCard(currentUser.id, {
        ...cardForm,
        holderName: cardForm.holderName.trim(),
        nickname: cardForm.nickname.trim(),
      });

      setActiveCardId(nextCard.id);
      setCardSearch('');
      setRefreshKey((value) => value + 1);
      closeComposers();
    } catch (error) {
      setCardMessage(error.message || 'Could not save that card.');
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (!paymentForm.title.trim()) {
      setPaymentMessage('Who is this payment for?');
      return;
    }

    if (!Number(paymentForm.amount) || Number(paymentForm.amount) <= 0) {
      setPaymentMessage('Enter a valid amount.');
      return;
    }

    if (!paymentForm.categoryId) {
      setPaymentMessage('Choose a category first.');
      return;
    }

    try {
      await financeStore.addTransaction(currentUser.id, {
        type: 'expense',
        description: paymentForm.note.trim()
          ? `${paymentForm.title.trim()} - ${paymentForm.note.trim()}`
          : paymentForm.title.trim(),
        categoryId: paymentForm.categoryId,
        amount: Number(paymentForm.amount),
        transactionDate: paymentForm.date,
      });

      setRefreshKey((value) => value + 1);
      closeComposers();
    } catch (error) {
      setPaymentMessage(error.message || 'Could not save that payment.');
    }
  };

  const handleQuickAction = (action) => {
    if (action === 'card') {
      openCardComposer();
    }

    if (action === 'payment') {
      openPaymentComposer();
    }
  };

  const handleDeleteActiveCard = async () => {
    if (!currentUser?.id || !activeCard) {
      return;
    }

    const shouldDelete = window.confirm(`Delete ${getCardTitle(activeCard)}?`);

    if (!shouldDelete) {
      return;
    }

    try {
      const remainingCards = await cardStore.deleteCard(currentUser.id, activeCard.id);
      const matchingCards = remainingCards.filter((card) => matchesCardQuery(card, cardSearchQuery));

      setActiveCardId(matchingCards[0]?.id || remainingCards[0]?.id || '');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setDataMessage(error.message || 'Could not delete that card.');
    }
  };

  const rail = (
    <>
      <article className="ref-panel ref-wallet-panel">
        <div className="ref-panel-head">
          <div>
            <h3>Your Card</h3>
          </div>

          <div className="ref-panel-actions">
            <button className="ref-mini-action" type="button" onClick={openCardComposer}>
              + Add Card
            </button>
            <button className="ref-dots-button" type="button" aria-label="Card options">
              ...
            </button>
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
                : 'Add your first card.'}
          </p>

          {activeCard ? (
            <button className="ref-inline-delete" type="button" onClick={handleDeleteActiveCard}>
              Delete
            </button>
          ) : null}
        </div>

        <div className="ref-wallet-actions">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="ref-wallet-action"
              type="button"
              onClick={() => handleQuickAction(action.action)}
            >
              <span className={`ref-wallet-action-icon ref-wallet-action-icon-${action.tone}`}>
                <WalletActionIcon type={action.icon} />
              </span>
              <span>{action.label}</span>
            </button>
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
        primaryActionLabel="+ New Payment"
        onPrimaryAction={openPaymentComposer}
        rail={rail}
      >
        <article className="ref-hero-card">
          <div className="ref-hero-copy">
            <span className="ref-section-chip">Workspace</span>
            <h2>Your wallet, ready.</h2>
            <p>Add cards and track payments from your API.</p>

            <div className="ref-hero-pill-row">
              {heroPills.map((item) => (
                <span key={item} className="ref-hero-pill">
                  {item}
                </span>
              ))}
            </div>

            <button className="ref-secondary-button" type="button" onClick={openCardComposer}>
              + Add Card
            </button>
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
              <div className="ref-flow-tabs" role="tablist" aria-label="Money flow views">
                {chartTabs.map((tab, index) => (
                  <button
                    key={tab}
                    className={`ref-flow-tab${index === 0 ? ' is-active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={index === 0}
                  >
                    {tab}
                  </button>
                ))}
              </div>
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
              <button className="ref-inline-filter" type="button" onClick={openPaymentComposer}>
                + New
              </button>
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
              <button className="ref-view-link" type="button">
                API
              </button>
            </div>

            <div className="ref-statistics-body">
              <div className="ref-stat-ring">
                <div className="ref-stat-ring-center">
                  <strong>{snapshot.recentTransactions.length}</strong>
                  <span>Payments</span>
                </div>
              </div>

              <div className="ref-stat-list">
                {workspaceRows.map((item) => (
                  <div key={item.label} className="ref-stat-row">
                    <div className="ref-stat-label">
                      <span className={`ref-expense-dot ref-expense-dot-${item.tone}`} />
                      <span>{item.label}</span>
                    </div>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </FinanceLayout>

      {isCardComposerOpen ? (
        <div className="ref-modal-backdrop" role="presentation" onClick={closeComposers}>
          <section
            className="ref-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-card-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ref-modal-head">
              <div>
                <span className="ref-modal-kicker">Cards</span>
                <h3 id="add-card-title">Add a new card</h3>
              </div>
              <button className="ref-modal-close" type="button" onClick={closeComposers} aria-label="Close add card">
                x
              </button>
            </div>

            <form className="ref-modal-form" onSubmit={handleCardSubmit}>
              {cardMessage ? <p className="ref-form-message">{cardMessage}</p> : null}

              <div className="ref-field-grid">
                <label className="ref-field">
                  <span>Card name</span>
                  <input name="nickname" type="text" value={cardForm.nickname} onChange={handleCardChange} placeholder="Daily Card" />
                </label>

                <label className="ref-field">
                  <span>Card holder</span>
                  <input name="holderName" type="text" value={cardForm.holderName} onChange={handleCardChange} placeholder="Card holder name" />
                </label>

                <label className="ref-field">
                  <span>Brand</span>
                  <select name="brand" value={cardForm.brand} onChange={handleCardChange}>
                    <option>Mastercard</option>
                    <option>Visa</option>
                    <option>Amex</option>
                    <option>Debit</option>
                  </select>
                </label>

                <label className="ref-field">
                  <span>Theme</span>
                  <select name="theme" value={cardForm.theme} onChange={handleCardChange}>
                    {cardThemeOptions.map((theme) => (
                      <option key={theme.value} value={theme.value}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ref-field">
                  <span>Last 4</span>
                  <input
                    name="last4"
                    type="text"
                    inputMode="numeric"
                    maxLength="4"
                    value={cardForm.last4}
                    onChange={handleCardChange}
                    placeholder="5432"
                  />
                </label>

                <label className="ref-field">
                  <span>Expiry</span>
                  <input name="expiry" type="text" maxLength="5" value={cardForm.expiry} onChange={handleCardChange} placeholder="01/27" />
                </label>
              </div>

              <div className="ref-modal-actions">
                <button className="ref-modal-secondary" type="button" onClick={closeComposers}>
                  Cancel
                </button>
                <button className="ref-modal-primary" type="submit">
                  Save Card
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isPaymentComposerOpen ? (
        <div className="ref-modal-backdrop" role="presentation" onClick={closeComposers}>
          <section
            className="ref-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-payment-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ref-modal-head">
              <div>
                <span className="ref-modal-kicker">Payments</span>
                <h3 id="new-payment-title">Create a payment</h3>
              </div>
              <button className="ref-modal-close" type="button" onClick={closeComposers} aria-label="Close payment form">
                x
              </button>
            </div>

            <form className="ref-modal-form" onSubmit={handlePaymentSubmit}>
              {paymentMessage ? <p className="ref-form-message">{paymentMessage}</p> : null}

              <div className="ref-field-grid">
                <label className="ref-field">
                  <span>Payee</span>
                  <input name="title" type="text" value={paymentForm.title} onChange={handlePaymentChange} placeholder="Apple Music" />
                </label>

                <label className="ref-field">
                  <span>Amount</span>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={handlePaymentChange}
                    placeholder="64.00"
                  />
                </label>

                <label className="ref-field">
                  <span>Category</span>
                  <select name="categoryId" value={paymentForm.categoryId} onChange={handlePaymentChange}>
                    <option value="">Choose category</option>
                    {expenseCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ref-field">
                  <span>Source</span>
                  <select name="paymentSource" value={paymentForm.paymentSource} onChange={handlePaymentChange}>
                    <option value="">Wallet</option>
                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {getCardTitle(card)} - {card.last4}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ref-field">
                  <span>Date</span>
                  <input name="date" type="date" value={paymentForm.date} onChange={handlePaymentChange} />
                </label>

                <label className="ref-field ref-field-wide">
                  <span>Note</span>
                  <input name="note" type="text" value={paymentForm.note} onChange={handlePaymentChange} placeholder="Optional note" />
                </label>
              </div>

              <div className="ref-modal-actions">
                <button className="ref-modal-secondary" type="button" onClick={closeComposers}>
                  Cancel
                </button>
                <button className="ref-modal-primary" type="submit">
                  Save Payment
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default DashboardPage;
