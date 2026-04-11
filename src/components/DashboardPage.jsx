import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { cardStore } from '../utils/cardStore';

const menuItems = [
  { label: 'Home', active: true, icon: 'home' },
  { label: 'Projects', caption: 'Soon', icon: 'projects' },
  { label: 'Schedule', caption: 'Soon', icon: 'schedule' },
  { label: 'Performance', caption: 'Soon', icon: 'performance' },
  { label: 'Task List', caption: 'Soon', icon: 'task' },
  { label: 'Team', caption: 'Soon', icon: 'team' },
  { label: 'Message', caption: 'Soon', icon: 'message' },
];

const otherItems = [{ label: 'Help & Support', icon: 'support' }];

const walletActions = [
  { key: 'send', label: 'Send', detail: 'Add card', icon: 'send', tone: 'lavender' },
  { key: 'receive', label: 'Receive', detail: 'Protected', icon: 'receive', tone: 'mint' },
  { key: 'invoice', label: 'Invoicing', detail: 'Private', icon: 'invoice', tone: 'amber' },
  { key: 'more', label: 'More', detail: 'Logout', icon: 'more', tone: 'sky' },
];

const themeLabels = {
  indigo: 'Indigo',
  emerald: 'Emerald',
  sunset: 'Sunset',
};

const expenseLegend = [
  { label: 'Shopping', value: '$0.00', colorClass: 'legend-violet' },
  { label: 'Essentials', value: '$0.00', colorClass: 'legend-blue' },
  { label: 'Bills', value: '$0.00', colorClass: 'legend-green' },
  { label: 'Travel', value: '$0.00', colorClass: 'legend-orange' },
];

const createInitialCardForm = (fullName = '') => ({
  nickname: '',
  holderName: fullName,
  brand: 'Visa',
  last4: '',
  expiry: '',
  theme: 'indigo',
});

const getInitials = (fullName = '') =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase())
    .join('') || 'FF';

const formatJoinedDate = (value) => new Date(value).toLocaleDateString('en-CA');

function SidebarIcon({ type }) {
  const icons = {
    home: (
      <path
        d="M3.5 8.2 8 4.5l4.5 3.7v4.3a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5Z M6.3 13V9.8h3.4V13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    ),
    projects: (
      <>
        <rect x="2.5" y="3.5" width="11" height="9" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 6.2h6M5 9h4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </>
    ),
    schedule: (
      <>
        <rect x="2.8" y="3.8" width="10.4" height="9.6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.2 2.8v2M10.8 2.8v2M4.7 7.2h6.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </>
    ),
    performance: (
      <>
        <rect x="3" y="3.5" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.2 10.4 7 8.5l1.6 1.6 2.6-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      </>
    ),
    task: (
      <>
        <path d="M4 5.2h1.4l.9 1.1L8 4.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
        <path d="M9.7 5.2h2.8M9.7 8.1h2.8M4 10h1.4l.9 1.1L8 9.2M9.7 10h2.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      </>
    ),
    team: (
      <>
        <circle cx="6" cy="6.1" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="10.8" cy="6.8" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.6 12.6c.4-1.8 1.8-2.8 4-2.8 2.1 0 3.5 1 3.9 2.8M10.1 12.3c.2-.8.8-1.4 1.8-1.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </>
    ),
    message: (
      <>
        <path d="M3.2 4.5a2 2 0 0 1 2-2h5.6a2 2 0 0 1 2 2v4.8a2 2 0 0 1-2 2H7.1l-2.6 2v-2H5.2a2 2 0 0 1-2-2Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      </>
    ),
    support: (
      <>
        <circle cx="8" cy="8" r="5.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6.6 6.4a1.7 1.7 0 1 1 2.5 1.5c-.8.4-1.1.8-1.1 1.5M8 11.9h.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="sidebar-icon-svg" viewBox="0 0 16 16">
      {icons[type]}
    </svg>
  );
}

function TopbarIcon({ type }) {
  const icons = {
    notification: (
      <>
        <path
          d="M8 2.8a3.2 3.2 0 0 0-3.2 3.2v1.3c0 .9-.3 1.7-.8 2.5L3 11.4h10l-1-1.6a4.7 4.7 0 0 1-.8-2.5V6A3.2 3.2 0 0 0 8 2.8Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
        <path d="M6.4 12.5c.3 1 1 1.5 1.6 1.5.7 0 1.4-.5 1.7-1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </>
    ),
    message: (
      <path
        d="M3.2 4.5a2 2 0 0 1 2-2h5.6a2 2 0 0 1 2 2v4.8a2 2 0 0 1-2 2H7.1l-2.6 2v-2H5.2a2 2 0 0 1-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    ),
    chevron: <path d="m5.2 6.3 2.8 2.8 2.8-2.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />,
    dots: (
      <>
        <circle cx="8" cy="4.4" r="1.1" fill="currentColor" />
        <circle cx="8" cy="8" r="1.1" fill="currentColor" />
        <circle cx="8" cy="11.6" r="1.1" fill="currentColor" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="topbar-icon-svg" viewBox="0 0 16 16">
      {icons[type]}
    </svg>
  );
}

function WalletActionIcon({ type }) {
  const icons = {
    send: <path d="M3.2 8 12.8 3.5 9.7 12.8 8.1 8.8 3.2 8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />,
    receive: (
      <>
        <path d="M8 3.2v9.2M8 12.4 4.8 9.2M8 12.4l3.2-3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
        <path d="M3.8 13.2h8.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </>
    ),
    invoice: (
      <>
        <rect x="3.4" y="2.8" width="9.2" height="10.4" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.4 5.4h5.2M5.4 8h5.2M5.4 10.6h3.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </>
    ),
    more: (
      <>
        <circle cx="4.4" cy="8" r="1.1" fill="currentColor" />
        <circle cx="8" cy="8" r="1.1" fill="currentColor" />
        <circle cx="11.6" cy="8" r="1.1" fill="currentColor" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="wallet-action-svg" viewBox="0 0 16 16">
      {icons[type]}
    </svg>
  );
}

function DashboardPage({ currentUser, onLogout }) {
  const [cards, setCards] = useState([]);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardForm, setCardForm] = useState(() => createInitialCardForm(currentUser?.fullName));
  const [cardMessage, setCardMessage] = useState('');

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    setCards(cardStore.getCardsForUser(currentUser.id));
    setCardForm(createInitialCardForm(currentUser.fullName));
    setCardMessage('');
    setIsAddingCard(false);
  }, [currentUser?.fullName, currentUser?.id]);

  const handleCardChange = (event) => {
    const { name, value } = event.target;
    setCardForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setCardMessage('');
  };

  const handleAddCard = (event) => {
    event.preventDefault();

    if (!cardForm.nickname.trim()) {
      setCardMessage('Card nickname is required.');
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

    const nextCard = cardStore.addCard(currentUser.id, {
      ...cardForm,
      nickname: cardForm.nickname,
      holderName: cardForm.holderName || currentUser.fullName,
    });

    setCards((currentCards) => [nextCard, ...currentCards]);
    setCardForm(createInitialCardForm(currentUser.fullName));
    setCardMessage('');
    setIsAddingCard(false);
  };

  const handleDeleteCard = (cardId) => {
    const nextCards = cardStore.deleteCard(currentUser.id, cardId);
    setCards(nextCards);
  };

  const handleWalletAction = (key) => {
    if (key === 'send') {
      setIsAddingCard(true);
    }

    if (key === 'more') {
      onLogout();
    }
  };

  const initials = getInitials(currentUser?.fullName);
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const joinedDate = currentUser?.createdAt ? formatJoinedDate(currentUser.createdAt) : 'Not available';
  const primaryCard = cards[0];

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-block">
          <BrandLogo className="sidebar-brand-logo" compact title="Fina Inc" subtitle="Private finance workspace" />
          <div className="brand-chevron">&lt;&lt;</div>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-label">Workspace</span>
          <div className="workspace-profile">
            <div className="workspace-avatar">{initials}</div>
            <div className="workspace-copy">
              <strong>{currentUser?.fullName}</strong>
              <span>Private workspace</span>
            </div>
            <div className="workspace-chevron">
              <TopbarIcon type="chevron" />
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Menu</span>
          <nav className="sidebar-list">
            {menuItems.map((item) =>
              item.active ? (
                <NavLink key={item.label} className="sidebar-item active" to="/dashboard">
                  <span className="sidebar-item-main">
                    <span className="sidebar-icon-shell">
                      <SidebarIcon type={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </span>
                </NavLink>
              ) : (
                <div key={item.label} className="sidebar-item">
                  <span className="sidebar-item-main">
                    <span className="sidebar-icon-shell">
                      <SidebarIcon type={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </span>
                  <small>{item.caption}</small>
                </div>
              )
            )}
          </nav>
        </div>

        <div className="sidebar-section sidebar-others">
          <span className="sidebar-label">Others</span>
          <div className="sidebar-list">
            {otherItems.map((item) => (
              <div key={item.label} className="sidebar-item sidebar-item-support">
                <span className="sidebar-item-main">
                  <span className="sidebar-icon-shell">
                    <SidebarIcon type={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer-link">
          <span className="sidebar-item-main">
            <span className="sidebar-icon-shell">
              <SidebarIcon type="support" />
            </span>
            <span>Support</span>
          </span>
        </div>
      </aside>

      <section className="dashboard-stage">
        <header className="dashboard-topbar">
          <label className="search-shell">
            <input aria-label="Search anything" placeholder="Search anything..." readOnly value="" />
          </label>

          <div className="topbar-actions">
            <button className="topbar-icon-button" type="button" aria-label="Notifications">
              <TopbarIcon type="notification" />
            </button>
            <button className="topbar-icon-button" type="button" aria-label="Messages">
              <TopbarIcon type="message" />
            </button>
            <div className="topbar-user-block">
              <div className="topbar-user">
                <div className="topbar-avatar">{initials}</div>
                <div className="topbar-user-copy">
                  <strong>{currentUser?.fullName}</strong>
                  <span>Member since {joinedDate}</span>
                </div>
              </div>
              <button className="topbar-user-caret" type="button" aria-label="Open account menu">
                <TopbarIcon type="chevron" />
              </button>
            </div>
            <button className="topbar-logout-button" type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        </header>

        <div className="dashboard-grid">
          <section className="dashboard-main">
            <div className="dashboard-heading">
              <div>
                <h1>Welcome Back {firstName}</h1>
                <p>Here is what is happening in your finance workspace today.</p>
              </div>
              <button className="primary-card-action" type="button" onClick={() => setIsAddingCard(true)}>
                + New Card
              </button>
            </div>

            <article className="hero-banner">
              <div className="hero-banner-copy">
                <span className="banner-kicker">Private wallet</span>
                <h2>{cards.length ? 'Your saved cards are ready to use.' : 'Start building your secure wallet.'}</h2>
                <p>
                  The design stays fully populated and structured without pretending you already have
                  balances, expenses, or transaction history.
                </p>
                <button className="banner-cta" type="button" onClick={() => setIsAddingCard(true)}>
                  {cards.length ? 'Add another card' : 'Add first card'}
                </button>
              </div>

              <div className="hero-banner-art" aria-hidden="true">
                <div className="banner-ring ring-back" />
                <div className="banner-ring ring-front" />
                <div className="banner-shine" />
              </div>
            </article>

            {isAddingCard ? (
              <article className="content-panel add-card-panel">
                <div className="panel-header">
                  <div>
                    <h3>Add a Card</h3>
                    <p>Only masked card display details are stored for this user.</p>
                  </div>
                </div>

                <form className="card-form" onSubmit={handleAddCard}>
                  {cardMessage ? <p className="form-error">{cardMessage}</p> : null}

                  <div className="card-form-grid">
                    <label htmlFor="nickname">
                      Card nickname
                      <input
                        id="nickname"
                        name="nickname"
                        type="text"
                        value={cardForm.nickname}
                        onChange={handleCardChange}
                        placeholder="Main Visa"
                      />
                    </label>

                    <label htmlFor="holderName">
                      Card holder
                      <input
                        id="holderName"
                        name="holderName"
                        type="text"
                        value={cardForm.holderName}
                        onChange={handleCardChange}
                        placeholder="Card holder name"
                      />
                    </label>

                    <label htmlFor="brand">
                      Brand
                      <select id="brand" name="brand" value={cardForm.brand} onChange={handleCardChange}>
                        <option>Visa</option>
                        <option>Mastercard</option>
                        <option>Amex</option>
                        <option>Debit</option>
                      </select>
                    </label>

                    <label htmlFor="theme">
                      Card theme
                      <select id="theme" name="theme" value={cardForm.theme} onChange={handleCardChange}>
                        <option value="indigo">Indigo</option>
                        <option value="emerald">Emerald</option>
                        <option value="sunset">Sunset</option>
                      </select>
                    </label>

                    <label htmlFor="last4">
                      Last 4 digits
                      <input
                        id="last4"
                        name="last4"
                        type="text"
                        inputMode="numeric"
                        maxLength="4"
                        value={cardForm.last4}
                        onChange={handleCardChange}
                        placeholder="4242"
                      />
                    </label>

                    <label htmlFor="expiry">
                      Expiry
                      <input
                        id="expiry"
                        name="expiry"
                        type="text"
                        maxLength="5"
                        value={cardForm.expiry}
                        onChange={handleCardChange}
                        placeholder="04/28"
                      />
                    </label>
                  </div>

                  <div className="card-form-actions">
                    <button className="secondary-button" type="button" onClick={() => setIsAddingCard(false)}>
                      Cancel
                    </button>
                    <button className="primary-card-action" type="submit">
                      Save card
                    </button>
                  </div>
                </form>
              </article>
            ) : null}

            <article className="content-panel graph-panel">
              <div className="panel-header">
                <div>
                  <h3>Money Flow</h3>
                  <p>{cards.length ? 'Waiting for your real transactions.' : 'Add a card first, then connect real finance activity later.'}</p>
                </div>
                <div className="tab-strip">
                  <span className="tab-pill active">All Card</span>
                  {cards.slice(0, 3).map((card) => (
                    <span key={card.id} className="tab-pill">
                      {card.nickname}
                    </span>
                  ))}
                </div>
              </div>

              <div className="graph-surface">
                <div className="graph-grid" aria-hidden="true" />
                <div className="graph-placeholder">
                  <strong>No transaction history yet</strong>
                  <p>
                    This chart area stays blank until you connect real transactions for the
                    signed-in user.
                  </p>
                </div>
              </div>
            </article>

            <div className="dashboard-bottom-grid">
              <article className="content-panel saving-panel">
                <div className="panel-header">
                  <div>
                    <h3>Saved Cards</h3>
                    <p>Your own masked cards stored in this frontend workspace.</p>
                  </div>
                  <span className="panel-badge">This user</span>
                </div>

                {cards.length ? (
                  <div className="saved-card-list">
                    {cards.map((card) => (
                      <article key={card.id} className="saved-card-row">
                        <div className={`saved-card-badge theme-${card.theme}`}>
                          {card.brand.slice(0, 1)}
                        </div>
                        <div className="saved-card-copy">
                          <strong>{card.nickname}</strong>
                          <span>
                            {card.brand} ending in {card.last4}
                          </span>
                        </div>
                        <span className="saved-card-expiry">{card.expiry}</span>
                        <button className="row-link" type="button" onClick={() => handleDeleteCard(card.id)}>
                          Remove
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel-state">
                    <strong>No cards added yet</strong>
                    <p>Use the new card button to save your own masked card details.</p>
                  </div>
                )}
              </article>

              <article className="content-panel statistics-panel">
                <div className="panel-header">
                  <div>
                    <h3>Statistics</h3>
                    <p>Real system state without fake finance amounts.</p>
                  </div>
                  <span className="panel-link">View all</span>
                </div>

                <div className="stats-visual-wrap">
                  <div className="stats-donut" aria-hidden="true">
                    <div className="stats-donut-inner">
                      <strong>{cards.length}</strong>
                      <span>Cards</span>
                    </div>
                  </div>

                  <div className="stats-list">
                    <div>
                      <span>Profile</span>
                      <strong>{firstName}</strong>
                    </div>
                    <div>
                      <span>Access</span>
                      <strong>Protected</strong>
                    </div>
                    <div>
                      <span>Theme</span>
                      <strong>{primaryCard ? themeLabels[primaryCard.theme] : 'Waiting'}</strong>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <aside className="dashboard-rail">
            <article className="content-panel wallet-panel">
              <div className="panel-header">
                <div>
                  <h3>Your Card</h3>
                  <p>{primaryCard ? 'Masked card details for this account' : 'Add a card to personalize this wallet'}</p>
                </div>
                <button className="icon-dots" type="button" aria-label="Card options">
                  <TopbarIcon type="dots" />
                </button>
              </div>

              <div className={`wallet-card theme-${primaryCard?.theme || 'indigo'}${primaryCard ? '' : ' preview'}`}>
                <div className="wallet-card-sheen" aria-hidden="true" />

                <div className="wallet-card-brand-line">
                  <div className="wallet-card-brand-markers">
                    <span className="wallet-brand-dot wallet-brand-dot-red" />
                    <span className="wallet-brand-dot wallet-brand-dot-gold" />
                  </div>
                  <strong>{primaryCard ? `${primaryCard.brand} Credit` : 'Secure Wallet'}</strong>
                </div>

                <div className="wallet-card-chip" aria-hidden="true" />

                <div className="wallet-card-balance">
                  <span>{primaryCard ? 'Saved Card' : 'Card Status'}</span>
                  <strong>{primaryCard ? `**** ${primaryCard.last4}` : 'Add your card'}</strong>
                </div>

                <div className="wallet-card-meta">
                  <span>{primaryCard ? primaryCard.expiry : '--/--'}</span>
                  <div className="wallet-card-tail">
                    <span className="wallet-brand-dot wallet-brand-dot-red" />
                    <span className="wallet-brand-dot wallet-brand-dot-gold" />
                    <small>{primaryCard ? primaryCard.holderName : 'No holder yet'}</small>
                  </div>
                </div>
              </div>

              <div className="wallet-action-grid">
                {walletActions.map((action) => (
                  <button
                    key={action.key}
                    className="wallet-action-tile"
                    type="button"
                    onClick={() => handleWalletAction(action.key)}
                  >
                    <div className={`wallet-action-icon ${action.tone}`}>
                      <WalletActionIcon type={action.icon} />
                    </div>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="content-panel expenses-panel">
              <div className="panel-header">
                <div>
                  <h3>Expenses</h3>
                  <p>{cards.length ? 'Waiting for real spending to appear here' : 'No spend recorded yet'}</p>
                </div>
                <button className="icon-dots" type="button" aria-label="Expense options">
                  <TopbarIcon type="dots" />
                </button>
              </div>

              <div className="expense-rings-wrap">
                <svg className="expense-chart" viewBox="0 0 220 220" aria-hidden="true">
                  <g transform="rotate(140 110 110)">
                    <circle className="expense-track" cx="110" cy="110" r="76" />
                    <circle className="expense-track" cx="110" cy="110" r="58" />
                    <circle className="expense-track" cx="110" cy="110" r="40" />
                    <circle className="expense-track" cx="110" cy="110" r="22" />

                    <circle className="expense-arc expense-arc-violet" cx="110" cy="110" r="76" />
                    <circle className="expense-arc expense-arc-blue" cx="110" cy="110" r="58" />
                    <circle className="expense-arc expense-arc-green" cx="110" cy="110" r="40" />
                    <circle className="expense-arc expense-arc-orange" cx="110" cy="110" r="22" />
                  </g>
                </svg>

                <div className="expense-summary">
                  <strong>$0.00</strong>
                  <span>0%</span>
                  <small>No spend recorded this month</small>
                </div>
              </div>

              <div className="expense-legend">
                {expenseLegend.map((item) => (
                  <div key={item.label} className="expense-legend-row">
                    <div className="expense-legend-label">
                      <span className={`legend-dot ${item.colorClass}`} />
                      <span>{item.label}</span>
                    </div>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
