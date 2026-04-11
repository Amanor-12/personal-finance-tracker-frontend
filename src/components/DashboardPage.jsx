import hero from '../assets/hero.png';

const formatJoinedDate = (value) => new Date(value).toLocaleDateString('en-CA');

function DashboardPage({ currentUser, registeredUsers }) {
  const overviewCards = [
    {
      title: 'Authenticated Session',
      value: 'Active',
      description: 'The current session stays signed in until the user logs out.',
    },
    {
      title: 'Registered Accounts',
      value: String(registeredUsers.length),
      description: 'Accounts are stored locally so login can validate them later.',
    },
    {
      title: 'Current User',
      value: currentUser.fullName,
      description: 'The app loads the saved user profile from the active session.',
    },
  ];

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <span>Secure finance access</span>
          <h1>Sign up and log in with real frontend account validation.</h1>
          <p>
            This version focuses on a clean authentication experience: account creation,
            credential validation, persistent session state, and a protected dashboard view.
          </p>

          <div className="hero-stats">
            <div>
              <strong>{registeredUsers.length}</strong>
              <small>Saved account{registeredUsers.length === 1 ? '' : 's'}</small>
            </div>
            <div>
              <strong>{currentUser.email}</strong>
              <small>Signed-in email</small>
            </div>
            <div>
              <strong>{formatJoinedDate(currentUser.createdAt)}</strong>
              <small>Account created</small>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <img src={hero} alt="Personal finance dashboard preview" />
        </div>
      </section>

      <div className="section-heading">
        <h2>Account Overview</h2>
        <p>These cards reflect the real auth state stored in local storage.</p>
      </div>

      <section className="card-grid">
        {overviewCards.map((card) => (
          <article key={card.title} className="overview-card">
            <span className="card-label">Auth status</span>
            <div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace">
        <div className="workspace-panel">
          <h2>Your Account</h2>
          <ul className="detail-list">
            <li>
              <span>Full Name</span>
              <strong>{currentUser.fullName}</strong>
            </li>
            <li>
              <span>Email</span>
              <strong>{currentUser.email}</strong>
            </li>
            <li>
              <span>Session Status</span>
              <strong>Authenticated</strong>
            </li>
            <li>
              <span>Storage Mode</span>
              <strong>Frontend localStorage</strong>
            </li>
          </ul>
        </div>

        <div className="workspace-panel">
          <h2>Saved Accounts</h2>
          <p>Every sign-up creates a reusable account that can be used again on the login form.</p>

          {registeredUsers.length === 0 ? (
            <p className="inline-note">No saved accounts yet.</p>
          ) : (
            <div className="account-list">
              {registeredUsers.map((user) => (
                <article key={user.id} className="account-item">
                  <div>
                    <strong>{user.fullName}</strong>
                    <p>{user.email}</p>
                  </div>
                  <span>{formatJoinedDate(user.createdAt)}</span>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
