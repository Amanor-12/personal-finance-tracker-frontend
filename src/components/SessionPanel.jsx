import './SessionPanel.css';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function SessionPanel({ currentIncome, goal, profiles, savings, session }) {
  const loginTime = new Date(session.loggedInAt).toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const checklist = [
    {
      label: 'Frontend session is active and protected content is unlocked.',
      complete: true,
    },
    {
      label:
        profiles.length > 0
          ? 'At least one finance profile is stored locally.'
          : 'Save a finance profile to personalize this dashboard further.',
      complete: profiles.length > 0,
    },
    {
      label:
        savings >= goal
          ? 'Savings target reached for the current demo goal.'
          : `${currencyFormatter.format(goal - savings)} left to reach the starter savings goal.`,
      complete: savings >= goal,
    },
  ];

  return (
    <section className="session-panel">
      <h2>Workspace Status</h2>
      <p>
        This panel makes the post-login screen feel intentional instead of stopping
        at a form submission.
      </p>

      <div className="session-grid">
        <div>
          <span>Signed in as</span>
          <strong>{session.email}</strong>
        </div>
        <div>
          <span>Current income</span>
          <strong>{currencyFormatter.format(currentIncome)}</strong>
        </div>
        <div>
          <span>Remember me</span>
          <strong>{session.rememberMe ? 'Enabled' : 'Off'}</strong>
        </div>
        <div>
          <span>Login time</span>
          <strong>{loginTime}</strong>
        </div>
      </div>

      <ul className="session-checklist">
        {checklist.map((item) => (
          <li key={item.label} className={item.complete ? 'is-complete' : ''}>
            {item.label}
          </li>
        ))}
      </ul>

      <p className="session-note">
        When your backend is ready, replace the mock login handler in the app state
        layer and keep the rest of this layout as-is.
      </p>
    </section>
  );
}

export default SessionPanel;
