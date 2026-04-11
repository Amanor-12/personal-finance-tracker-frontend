import { NavLink } from 'react-router-dom';

const getInitials = (fullName = '') =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase())
    .join('') || 'FF';

const formatJoinedDate = (value) => new Date(value).toLocaleDateString('en-CA');

const navigationGroups = [
  {
    label: 'Menu',
    items: [
      { label: 'Home', active: true },
      { label: 'Transactions', caption: 'Soon' },
      { label: 'Budgets', caption: 'Soon' },
      { label: 'Insights', caption: 'Soon' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Accounts', caption: 'Private' },
      { label: 'Notifications', caption: 'Quiet' },
      { label: 'Settings', caption: 'Later' },
    ],
  },
];

const setupSteps = [
  { title: 'Account created', detail: 'Completed', done: true },
  { title: 'Protected route active', detail: 'Completed', done: true },
  { title: 'Personal finance data connected', detail: 'Waiting', done: false },
  { title: 'Insight cards enabled', detail: 'Waiting', done: false },
];

const readinessStates = [
  { label: 'Profile', value: 'Available' },
  { label: 'Balances', value: 'Not loaded' },
  { label: 'Transactions', value: 'Not loaded' },
];

function DashboardPage({ currentUser, onLogout }) {
  const initials = getInitials(currentUser?.fullName);
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const joinedDate = currentUser?.createdAt ? formatJoinedDate(currentUser.createdAt) : 'Not available';

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-block">
          <div className="brand-mark">F</div>
          <div>
            <strong>Fina Inc</strong>
            <span>Personal finance workspace</span>
          </div>
        </div>

        <div className="workspace-profile">
          <div className="workspace-avatar">{initials}</div>
          <div>
            <strong>{currentUser?.fullName}</strong>
            <span>{currentUser?.email}</span>
          </div>
        </div>

        {navigationGroups.map((group) => (
          <section key={group.label} className="sidebar-group">
            <span className="sidebar-label">{group.label}</span>
            <div className="sidebar-list">
              {group.items.map((item) =>
                item.active ? (
                  <NavLink key={item.label} className="sidebar-item active" to="/dashboard">
                    <span>{item.label}</span>
                    <small>Current</small>
                  </NavLink>
                ) : (
                  <div key={item.label} className="sidebar-item">
                    <span>{item.label}</span>
                    <small>{item.caption}</small>
                  </div>
                )
              )}
            </div>
          </section>
        ))}

        <div className="sidebar-footer-card">
          <span>Privacy first</span>
          <p>
            This workspace stays visually complete without inventing balances, transactions, or
            spending history that do not belong to the signed-in person.
          </p>
        </div>
      </aside>

      <section className="dashboard-stage">
        <header className="dashboard-topbar">
          <label className="search-shell">
            <span>Search</span>
            <input aria-label="Search workspace" placeholder="Search workspace" readOnly value="" />
          </label>

          <div className="topbar-actions">
            <button className="topbar-icon-button" type="button" aria-label="Notifications">
              N
            </button>
            <button className="topbar-icon-button" type="button" aria-label="Messages">
              M
            </button>
            <div className="topbar-user">
              <div className="topbar-avatar">{initials}</div>
              <div>
                <strong>{currentUser?.fullName}</strong>
                <span>Protected session</span>
              </div>
            </div>
            <button className="soft-button" type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </header>

        <div className="dashboard-grid">
          <section className="dashboard-primary">
            <div className="dashboard-heading">
              <h1>Welcome back {firstName}</h1>
              <p>
                Your finance workspace is ready. Real balances and activity appear only after your
                own records exist.
              </p>
            </div>

            <article className="spotlight-card">
              <div className="spotlight-copy">
                <span className="section-chip">Private workspace</span>
                <h2>Your dashboard is ready for your own data.</h2>
                <p>
                  No seeded balances. No sample transactions. No borrowed charts. The interface is
                  polished, but the financial state stays empty until it is genuinely yours.
                </p>

                <div className="spotlight-meta-row">
                  <div className="meta-pill">
                    <span>Session</span>
                    <strong>Active</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Storage</span>
                    <strong>Local only</strong>
                  </div>
                </div>
              </div>

              <div className="spotlight-visual" aria-hidden="true">
                <div className="visual-orb orb-one" />
                <div className="visual-orb orb-two" />
                <div className="visual-glass-card">
                  <span>Data state</span>
                  <strong>Waiting for personal records</strong>
                  <p>Charts and balances stay empty instead of guessing what should be here.</p>
                </div>
              </div>
            </article>

            <article className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Money Flow</h3>
                  <p>No activity yet</p>
                </div>
                <div className="tab-strip">
                  <span className="tab-pill active">Overview</span>
                  <span className="tab-pill">Income</span>
                  <span className="tab-pill">Expenses</span>
                </div>
              </div>

              <div className="empty-graph">
                <div className="graph-grid" aria-hidden="true" />
                <div className="graph-overlay">
                  <strong>No personal transactions to visualize yet</strong>
                  <p>
                    When your own finance records are added later, this space can show movement
                    without displaying fabricated history today.
                  </p>
                </div>
              </div>
            </article>

            <div className="lower-panels">
              <article className="panel-card">
                <div className="panel-header">
                  <div>
                    <h3>Account Readiness</h3>
                    <p>What is live versus what still needs your own data</p>
                  </div>
                </div>

                <div className="checklist">
                  {setupSteps.map((step) => (
                    <div key={step.title} className="checklist-item">
                      <div className={`check-indicator${step.done ? ' done' : ''}`} />
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel-card">
                <div className="panel-header">
                  <div>
                    <h3>Signed-In Profile</h3>
                    <p>Only the current user is visible in this view</p>
                  </div>
                </div>

                <div className="integrity-list">
                  <div className="integrity-row">
                    <span>Full name</span>
                    <strong>{currentUser?.fullName}</strong>
                  </div>
                  <div className="integrity-row">
                    <span>Email</span>
                    <strong>{currentUser?.email}</strong>
                  </div>
                  <div className="integrity-row">
                    <span>Account created</span>
                    <strong>{joinedDate}</strong>
                  </div>
                  <div className="integrity-row">
                    <span>Route protection</span>
                    <strong>Enabled</strong>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <aside className="dashboard-secondary">
            <article className="identity-card">
              <span className="section-chip muted">Workspace access</span>

              <div className="identity-header">
                <div className="identity-avatar">{initials}</div>
                <div>
                  <strong>{currentUser?.fullName}</strong>
                  <p>{currentUser?.email}</p>
                </div>
              </div>

              <div className="identity-details">
                <div>
                  <span>Created</span>
                  <strong>{joinedDate}</strong>
                </div>
                <div>
                  <span>Authentication</span>
                  <strong>Protected route</strong>
                </div>
                <div>
                  <span>Financial data</span>
                  <strong>Not seeded</strong>
                </div>
              </div>
            </article>

            <article className="panel-card compact-card">
              <div className="panel-header">
                <div>
                  <h3>Workspace Status</h3>
                  <p>What is accurate right now</p>
                </div>
              </div>

              <div className="status-chip-grid">
                <div className="status-chip-card">
                  <span>Access</span>
                  <strong>Ready</strong>
                </div>
                <div className="status-chip-card">
                  <span>Profile</span>
                  <strong>Loaded</strong>
                </div>
                <div className="status-chip-card">
                  <span>Charts</span>
                  <strong>Empty</strong>
                </div>
                <div className="status-chip-card">
                  <span>Data</span>
                  <strong>Waiting</strong>
                </div>
              </div>
            </article>

            <article className="panel-card compact-card">
              <div className="panel-header">
                <div>
                  <h3>Data Readiness</h3>
                  <p>Designed to stay honest before records exist</p>
                </div>
              </div>

              <div className="ring-visual" aria-hidden="true">
                <div className="ring ring-large" />
                <div className="ring ring-medium" />
                <div className="ring ring-small" />
              </div>

              <div className="readiness-list">
                {readinessStates.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card compact-card">
              <div className="panel-header">
                <div>
                  <h3>Privacy Note</h3>
                  <p>The rule behind this screen</p>
                </div>
              </div>

              <p className="privacy-copy">
                If a value does not belong to the signed-in user, it does not belong on the
                dashboard. That applies to balances, spending, transactions, and charts.
              </p>
            </article>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
