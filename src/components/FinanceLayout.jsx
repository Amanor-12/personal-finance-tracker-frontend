import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { settingsStore } from '../utils/settingsStore';

const navItems = [
  { label: 'Overview', to: '/dashboard', icon: 'overview' },
  { label: 'Wallets', to: '/accounts', icon: 'accounts' },
  { label: 'Transactions', to: '/transactions', icon: 'transactions' },
  { label: 'Budgets', to: '/budget', icon: 'budget' },
  { label: 'Goals', to: '/goals', icon: 'goals' },
  { label: 'Subscriptions', to: '/recurring', icon: 'recurring' },
  { label: 'Insights', to: '/reports', icon: 'reports' },
];

const otherItems = [
  { label: 'Activity', to: '/activity', icon: 'activity' },
  { label: 'Billing', to: '/billing', icon: 'billing' },
  { label: 'Settings', to: '/settings', icon: 'settings' },
  { label: 'Help & Support', to: '/help', icon: 'help' },
];

const searchItems = [
  ...navItems.map((item) => ({
    icon: item.icon,
    label: item.label,
    note: 'Open page',
    section: 'Pages',
    to: item.to,
  })),
  ...otherItems.map((item) => ({
    icon: item.icon,
    label: item.label,
    note: 'Open page',
    section: 'Pages',
    to: item.to,
  })),
  { icon: 'transactions', label: 'Add transaction', note: 'Go to the ledger and create a new record', section: 'Actions', to: '/transactions' },
  { icon: 'accounts', label: 'Add account', note: 'Open wallets and create a money location', section: 'Actions', to: '/accounts' },
  { icon: 'budget', label: 'Create budget', note: 'Open budgets and set a monthly limit', section: 'Actions', to: '/budget' },
  { icon: 'goals', label: 'Create goal', note: 'Open goals and add a savings target', section: 'Actions', to: '/goals' },
  { icon: 'recurring', label: 'Add recurring payment', note: 'Open subscriptions and track a fixed bill', section: 'Actions', to: '/recurring' },
];

function SidebarIcon({ type }) {
  const icons = {
    overview: (
      <>
        <path d="M3.5 8.1 8 4.7l4.5 3.4v4.1a.6.6 0 0 1-.6.6H4.1a.6.6 0 0 1-.6-.6Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
        <path d="M6.4 12.8V9.7h3.2v3.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
      </>
    ),
    accounts: (
      <>
        <rect x="2.8" y="4.2" width="10.4" height="7.6" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="M3.7 6.8h8.6M5.4 9.4h2.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    transactions: (
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
    bills: (
      <>
        <rect x="3.2" y="3.8" width="9.6" height="8.8" rx="1.9" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="M5.2 6.4h5.6M5.2 8.6h5.6M5.2 10.8h3.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    goals: (
      <>
        <path d="m8 3.4 1.4 2.8 3.1.5-2.2 2.2.5 3.1L8 10.5 5.2 12l.5-3.1-2.2-2.2 3.1-.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
      </>
    ),
    reports: (
      <>
        <path d="M4 11.4V9.1M7 11.4V5.8M10 11.4V7.4M13 11.4V4.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
        <path d="M3.2 12.2h10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    recurring: (
      <>
        <path d="M4.5 5.3h5.4A2.4 2.4 0 0 1 12.3 7.7v.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
        <path d="m10.4 3.6 1.9 1.7-1.9 1.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
        <path d="M11.5 10.7H6.1a2.4 2.4 0 0 1-2.4-2.4v-.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
        <path d="m5.6 12.4-1.9-1.7L5.6 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
      </>
    ),
    billing: (
      <>
        <rect x="3.2" y="4" width="9.6" height="8" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="M4.4 6.7h7.2M5.4 10h2.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
        <circle cx="10.6" cy="10" r=".8" fill="currentColor" />
      </>
    ),
    activity: (
      <>
        <path d="M3.4 11.6h9.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
        <path d="M4.2 9.2 6.4 7l1.8 1.5 3.2-4.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
        <circle cx="4.2" cy="9.2" r=".8" fill="currentColor" />
        <circle cx="6.4" cy="7" r=".8" fill="currentColor" />
        <circle cx="8.2" cy="8.5" r=".8" fill="currentColor" />
        <circle cx="11.4" cy="4.4" r=".8" fill="currentColor" />
      </>
    ),
    settings: (
      <>
        <circle cx="8" cy="8" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="M8 3.6v1M8 11.4v1M12.4 8h-1M4.6 8h-1M11.1 4.9l-.7.7M5.6 10.4l-.7.7M11.1 11.1l-.7-.7M5.6 5.6l-.7-.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      </>
    ),
    help: (
      <>
        <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="M6.6 6.4a1.7 1.7 0 1 1 2.5 1.5c-.8.4-1.1.8-1.1 1.5M8 11.7h.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    message: (
      <>
        <path d="M3.4 4.2h9.2v6.5H6.3l-2.9 2V4.2Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.45" />
        <path d="M5.6 6.7h4.8M5.6 8.8h3.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      </>
    ),
    search: (
      <>
        <circle cx="7.1" cy="7.1" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="m9.5 9.5 2.5 2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    bell: (
      <>
        <path d="M8 3.1A2.9 2.9 0 0 0 5.1 6v1.2c0 .8-.2 1.5-.6 2.2l-.7 1.2h8.4l-.7-1.2a4 4 0 0 1-.6-2.2V6A2.9 2.9 0 0 0 8 3.1Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" />
        <path d="M6.6 11.7c.3.8.8 1.2 1.4 1.2s1.1-.4 1.4-1.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    chevron: <path d="m5.4 6.4 2.6 2.6 2.6-2.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.55" />,
  };

  return (
    <svg aria-hidden="true" className="ref-icon-svg" viewBox="0 0 16 16">
      {icons[type]}
    </svg>
  );
}

const getInitials = (fullName = '') =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase())
    .join('') || 'LD';

function FinanceLayout({
  currentUser,
  onLogout,
  pageTitle,
  pageSubtitle,
  primaryActionLabel,
  onPrimaryAction,
  children,
  rail,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initials = getInitials(currentUser?.fullName);
  const firstName = currentUser?.fullName?.split(' ')[0] || 'Ledgr';
  const workspaceName = settingsStore.getSettingsForUser(currentUser?.id, currentUser?.fullName).workspaceName;
  const hasRail = Boolean(rail);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    setSearchQuery('');
    setIsSearchFocused(false);
  }, [location.pathname]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    const items = normalizedSearchQuery
      ? searchItems.filter((item) =>
          [item.label, item.note, item.section]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearchQuery))
        )
      : searchItems;

    return items.slice(0, 7);
  }, [normalizedSearchQuery]);
  const showSearchResults = isSearchFocused || Boolean(normalizedSearchQuery);

  const handleSearchSelect = (to) => {
    setSearchQuery('');
    setIsSearchFocused(false);
    navigate(to);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsSearchFocused(false);
      return;
    }

    if (event.key === 'Enter' && searchResults[0]) {
      event.preventDefault();
      handleSearchSelect(searchResults[0].to);
    }
  };

  return (
    <main className="ref-shell">
      <aside className="ref-sidebar">
        <div className="ref-sidebar-top">
          <div className="ref-brand-lockup">
            <BrandLogo className="ref-brand" compact subtitle="" title="Ledgr" tone="dark" />
            <span className="ref-brand-arrow" aria-hidden="true">
              {'<<'}
            </span>
          </div>

          <section className="ref-sidebar-block">
            <span className="ref-sidebar-label">Workspace</span>
            <div className="ref-workspace-card">
              <div className="ref-workspace-avatar">{initials}</div>
              <div className="ref-workspace-copy">
                <strong>{workspaceName || `${firstName} Space`}</strong>
                <span>Private workspace</span>
              </div>
            </div>
          </section>

          <section className="ref-sidebar-block">
            <span className="ref-sidebar-label">Finance</span>
            <nav className="ref-nav">
              {navItems.map((item) =>
                item.to ? (
                  <NavLink
                    key={item.label}
                    className={({ isActive }) => `ref-nav-item${isActive ? ' is-active' : ''}`}
                    to={item.to}
                  >
                    <span className="ref-nav-icon">
                      <SidebarIcon type={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                ) : (
                  <div key={item.label} className="ref-nav-item is-disabled">
                    <span className="ref-nav-icon">
                      <SidebarIcon type={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </div>
                )
              )}
            </nav>
          </section>

          <section className="ref-sidebar-block">
            <span className="ref-sidebar-label">Others</span>
            <div className="ref-nav">
              {otherItems.map((item) =>
                item.to ? (
                  <NavLink
                    key={item.label}
                    className={({ isActive }) => `ref-nav-item${isActive ? ' is-active' : ''}`}
                    to={item.to}
                  >
                    <span className="ref-nav-icon">
                      <SidebarIcon type={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                ) : (
                  <div key={item.label} className="ref-nav-item is-disabled">
                    <span className="ref-nav-icon">
                      <SidebarIcon type={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        <div className="ref-sidebar-bottom">
          <NavLink className={({ isActive }) => `ref-support-link${isActive ? ' is-active' : ''}`} to="/help">
            <span className="ref-nav-icon">
              <SidebarIcon type="help" />
            </span>
            <span>Support</span>
          </NavLink>
        </div>
      </aside>

      <section className="ref-stage">
        <header className="ref-topbar">
          <label className={`ref-search${showSearchResults ? ' is-open' : ''}`}>
            <span className="ref-search-icon">
              <SidebarIcon type="search" />
            </span>
            <input
              aria-autocomplete="list"
              aria-expanded={showSearchResults}
              aria-label="Search pages and actions"
              placeholder="Search pages, actions, support"
              type="search"
              value={searchQuery}
              onBlur={() => {
                window.setTimeout(() => setIsSearchFocused(false), 120);
              }}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
            />

            {showSearchResults ? (
              <div className="ref-search-panel" role="listbox" aria-label="Workspace search results">
                {searchResults.length ? (
                  <div className="ref-search-list">
                    {searchResults.map((item) => (
                      <button
                        key={`${item.section}-${item.label}-${item.to}`}
                        className="ref-search-item"
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSearchSelect(item.to)}
                      >
                        <span className="ref-search-item-icon">
                          <SidebarIcon type={item.icon} />
                        </span>
                        <span className="ref-search-item-copy">
                          <small>{item.section}</small>
                          <strong>{item.label}</strong>
                          <span>{item.note}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="ref-search-empty">
                    <strong>No matching routes</strong>
                    <span>Try searching for transactions, wallets, budgets, goals, billing, or support.</span>
                  </div>
                )}
              </div>
            ) : null}
          </label>

          <div className="ref-topbar-actions">
            <NavLink className="ref-icon-button" to="/activity" aria-label="Activity and notifications">
              <SidebarIcon type="bell" />
            </NavLink>
            <NavLink className="ref-icon-button" to="/help" aria-label="Help and support">
              <SidebarIcon type="message" />
            </NavLink>

            <div className="ref-user-chip">
              <div className="ref-user-avatar">{initials}</div>
              <div className="ref-user-copy">
                <strong>{currentUser?.fullName}</strong>
                <span>Private workspace</span>
              </div>
              <span className="ref-user-caret">
                <SidebarIcon type="chevron" />
              </span>
            </div>

            <button className="ref-logout-button" type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        </header>

        <div className="ref-heading-row">
          <div className="ref-heading-copy">
            <h1>{pageTitle}</h1>
            {pageSubtitle ? <p>{pageSubtitle}</p> : null}
          </div>

          {primaryActionLabel ? (
            <button className="ref-primary-button" type="button" onClick={onPrimaryAction}>
              {primaryActionLabel}
            </button>
          ) : null}
        </div>

        <div className={`ref-content-grid${hasRail ? '' : ' is-single-column'}`}>
          <section className="ref-main">{children}</section>
          {hasRail ? <aside className="ref-rail">{rail}</aside> : null}
        </div>
      </section>
    </main>
  );
}

export default FinanceLayout;
