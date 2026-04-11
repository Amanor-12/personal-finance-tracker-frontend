import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cardStore } from '../utils/cardStore';

const navigationItems = [
  { label: 'Home', active: true },
  { label: 'Projects', caption: 'Soon' },
  { label: 'Schedule', caption: 'Soon' },
  { label: 'Performance', caption: 'Soon' },
  { label: 'Task List', caption: 'Soon' },
  { label: 'Team', caption: 'Soon' },
  { label: 'Message', caption: 'Soon' },
];

const walletActions = [
  { key: 'send', label: 'Add Card', detail: 'Save masked card' },
  { key: 'receive', label: 'Session', detail: 'Protected route' },
  { key: 'invoice', label: 'Privacy', detail: 'No fake data' },
  { key: 'more', label: 'Logout', detail: 'End access' },
];

const themeLabels = {
  indigo: 'Indigo',
  emerald: 'Emerald',
  sunset: 'Sunset',
};

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
          <div className="brand-mark">F</div>
          <div>
            <strong>Fina Inc</strong>
            <span>Private finance workspace</span>
          </div>
          <div className="brand-chevron">+</div>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-label">Workspace</span>
          <div className="workspace-profile">
            <div className="workspace-avatar">{initials}</div>
            <div>
              <strong>{currentUser?.fullName}</strong>
              <span>{currentUser?.email}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Menu</span>
          <nav className="sidebar-list">
            {navigationItems.map((item) =>
              item.active ? (
                <NavLink key={item.label} className="sidebar-item active" to="/dashboard">
                  <span>{item.label}</span>
                </NavLink>
              ) : (
                <div key={item.label} className="sidebar-item">
                  <span>{item.label}</span>
                  <small>{item.caption}</small>
                </div>
              )
            )}
          </nav>
        </div>

        <div className="sidebar-support">
          <span>Help & Support</span>
          <p>Cards shown here belong only to the signed-in user. Transactions and balances stay empty until they are real.</p>
        </div>
      </aside>

      <section className="dashboard-stage">
        <header className="dashboard-topbar">
          <label className="search-shell">
            <input aria-label="Search anything" placeholder="Search anything..." readOnly value="" />
          </label>

          <div className="topbar-actions">
            <button className="topbar-icon-button" type="button" aria-label="Notifications">
              !
            </button>
            <button className="topbar-icon-button" type="button" aria-label="Messages">
              +
            </button>
            <div className="topbar-user">
              <div className="topbar-avatar">{initials}</div>
              <div>
                <strong>{currentUser?.fullName}</strong>
                <span>Member since {joinedDate}</span>
              </div>
            </div>
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
                <h2>{cards.length ? 'Your saved cards are ready to use.' : 'Start by adding your first card.'}</h2>
                <p>
                  The layout is intentionally premium and complete, but it still avoids fake balances,
                  fake expenses, and fake transactions.
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
                  <p>{primaryCard ? 'Masked card details for this account' : 'No card saved yet'}</p>
                </div>
                <button className="icon-dots" type="button" aria-label="Card options">
                  ...
                </button>
              </div>

              {primaryCard ? (
                <div className={`wallet-card theme-${primaryCard.theme}`}>
                  <div className="wallet-card-top">
                    <span>{primaryCard.brand}</span>
                    <small>{primaryCard.nickname}</small>
                  </div>

                  <div className="wallet-card-number">**** **** **** {primaryCard.last4}</div>

                  <div className="wallet-card-bottom">
                    <div>
                      <span>Card Holder</span>
                      <strong>{primaryCard.holderName}</strong>
                    </div>
                    <div>
                      <span>Expiry</span>
                      <strong>{primaryCard.expiry}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="wallet-card empty">
                  <span>No card saved</span>
                  <strong>Add your first card</strong>
                  <p>Only masked display details are shown here after you add them.</p>
                </div>
              )}

              <div className="wallet-action-grid">
                {walletActions.map((action) => (
                  <button
                    key={action.key}
                    className="wallet-action-tile"
                    type="button"
                    onClick={() => handleWalletAction(action.key)}
                  >
                    <div className="wallet-action-icon">{action.label.slice(0, 1)}</div>
                    <strong>{action.label}</strong>
                    <span>{action.detail}</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="content-panel expenses-panel">
              <div className="panel-header">
                <div>
                  <h3>Expenses</h3>
                  <p>No spend data until you add real transactions</p>
                </div>
                <button className="icon-dots" type="button" aria-label="Expense options">
                  ...
                </button>
              </div>

              <div className="expense-rings" aria-hidden="true">
                <div className="expense-ring expense-ring-one" />
                <div className="expense-ring expense-ring-two" />
                <div className="expense-ring expense-ring-three" />
                <div className="expense-ring expense-ring-four" />
                <div className="expense-center">
                  <strong>No expense data</strong>
                  <span>Add real transactions later</span>
                </div>
              </div>
            </article>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
