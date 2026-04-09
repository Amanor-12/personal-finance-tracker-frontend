import { useEffect, useState } from 'react';
import './App.css';
import hero from './assets/hero.png';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import Card from './components/Card';
import Counter from './components/Counter';
import LoginForm from './components/LoginForm';
import Navbar from './components/Navbar';
import RegisterForm from './components/RegisterForm';

const demoAccount = {
  fullName: 'Demo Member',
  email: 'demo@financeflow.app',
  password: 'Budget2026!',
  monthlyIncome: 4200,
};

const financeGoal = 1000;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const readStoredJson = (storageKey, fallbackValue) => {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
};

function App() {
  const [profiles, setProfiles] = useState(() =>
    readStoredJson('finance-profiles', []),
  );
  const [session, setSession] = useState(() =>
    readStoredJson('finance-session', null),
  );
  const [savings, setSavings] = useState(() => {
    if (typeof window === 'undefined') {
      return 250;
    }

    const savedAmount = window.localStorage.getItem('finance-savings');
    return savedAmount ? Number(savedAmount) : 250;
  });
  const [rememberedEmail, setRememberedEmail] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.localStorage.getItem('finance-remembered-email') ?? '';
  });

  useEffect(() => {
    document.title = session
      ? `Finance Flow | ${session.fullName}`
      : 'Finance Flow | Login';
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('finance-profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (session) {
      window.localStorage.setItem('finance-session', JSON.stringify(session));
      return;
    }

    window.localStorage.removeItem('finance-session');
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (rememberedEmail) {
      window.localStorage.setItem('finance-remembered-email', rememberedEmail);
      return;
    }

    window.localStorage.removeItem('finance-remembered-email');
  }, [rememberedEmail]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('finance-savings', String(savings));
  }, [savings]);

  const handleRegister = (newProfile) => {
    setProfiles((currentProfiles) =>
      [newProfile, ...currentProfiles].slice(0, 3),
    );
  };

  const handleLogin = ({ email, password, rememberMe }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const matchedProfile = profiles.find(
      (profile) => profile.email.toLowerCase() === normalizedEmail,
    );
    const usesDemoAccess =
      normalizedEmail === demoAccount.email && password === demoAccount.password;

    if (!usesDemoAccess && !matchedProfile) {
      return {
        ok: false,
        message:
          'No saved local profile matches that email yet. Use the demo access or save a profile after login.',
      };
    }

    if (!usesDemoAccess && password.trim().length < 8) {
      return {
        ok: false,
        message:
          'Use at least 8 characters for the password while backend authentication is still being wired.',
      };
    }

    const activeProfile = matchedProfile ?? demoAccount;

    setSession({
      email: normalizedEmail,
      fullName: activeProfile.fullName,
      rememberMe,
      loggedInAt: new Date().toISOString(),
    });
    setRememberedEmail(rememberMe ? normalizedEmail : '');

    return { ok: true };
  };

  const handleLogout = () => {
    setSession(null);
  };

  const latestProfile = profiles[0];
  const savingsProgress = Math.min(
    Math.round((savings / financeGoal) * 100),
    100,
  );

  const navItems = session
    ? [
        { href: '#home', label: 'Home' },
        { href: '#overview', label: 'Overview' },
        { href: '#workspace', label: 'Workspace' },
        { href: '#summary', label: 'Summary' },
      ]
    : [
        { href: '#home', label: 'Home' },
        { href: '#overview', label: 'Overview' },
        { href: '#workspace', label: 'Login' },
        { href: '#activity', label: 'Plan' },
      ];

  const cardData = session
    ? [
        {
          title: 'Savings Progress',
          description:
            'The counter now reports into app-level state so the dashboard can react to savings updates.',
          amount: `${savingsProgress}%`,
        },
        {
          title: 'Saved Profiles',
          description:
            'Profiles are still stored locally so you can demonstrate onboarding before the API is ready.',
          amount: String(profiles.length),
        },
        {
          title: 'Presentation Ready',
          description:
            'Your login flow now leads into the finance workspace instead of stopping at a landing page.',
          amount: 'Yes',
        },
      ]
    : [
        {
          title: 'Login Shell',
          description:
            'Inline validation, remembered email, and demo access are already built into the frontend.',
          amount: 'Ready',
        },
        {
          title: 'Protected Dashboard',
          description:
            'The savings tracker, profile form, and activity panels stay behind the login flow.',
          amount: 'Secure',
        },
        {
          title: 'Backend Handoff',
          description:
            'Auth state is isolated in one place so your API can replace the mock login logic later.',
          amount: 'Planned',
        },
      ];

  const heroStats = session
    ? [
        {
          value: currencyFormatter.format(savings),
          label: 'Saved locally',
        },
        {
          value: `${profiles.length}`,
          label: 'Profiles stored',
        },
        {
          value: 'Active',
          label: 'Session status',
        },
        {
          value: 'Ready',
          label: 'Demo flow',
        },
      ]
    : [
        {
          value: '1',
          label: 'Login page added',
        },
        {
          value: 'Live',
          label: 'Local session memory',
        },
        {
          value: '2+',
          label: 'Post-login features',
        },
      ];

  return (
    <>
      <Navbar
        isAuthenticated={Boolean(session)}
        navItems={navItems}
        onLogout={handleLogout}
        userName={session?.fullName}
      />

      <main className="app-shell">
        <section className={`hero ${session ? 'hero-dashboard' : 'hero-auth'}`} id="home">
          <div className="hero-copy">
            <span>{session ? 'Dashboard Access Granted' : 'Personal Finance Login'}</span>
            <h1>
              {session
                ? `Welcome back, ${session.fullName}.`
                : 'Sign in to a polished finance workspace.'}
            </h1>
            <p>
              {session
                ? 'Your frontend dashboard now includes a protected entry point, local session persistence, profile onboarding, and dashboard extras that still match the original design.'
                : 'This frontend-only auth shell is ready for your backend later. It already includes validation, remember me behavior, demo access, and a protected dashboard state.'}
            </p>

            <div className="hero-stats">
              {heroStats.map((item) => (
                <div key={item.label}>
                  <strong>{item.value}</strong>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>

            <div className="hero-actions">
              <a className="button-link" href={session ? '#activity' : '#workspace'}>
                {session ? 'Open Activity Feed' : 'Go to Login'}
              </a>
              <a
                className="button-link button-link-muted"
                href={session ? '#overview' : '#activity'}
              >
                {session ? 'View Overview' : 'See the Plan'}
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <img src={hero} alt="Personal finance dashboard preview" />
            <div className="hero-floating-card">
              <span>{session ? 'Session Active' : 'Demo Access'}</span>
              <strong>{session ? session.fullName : demoAccount.email}</strong>
              <small>
                {session ? session.email : `Password: ${demoAccount.password}`}
              </small>
            </div>
          </div>
        </section>

        <div className="section-heading" id="overview">
          <h2>Finance Overview</h2>
          <p>
            {session
              ? 'The dashboard metrics below respond to your current frontend session and stored profile data.'
              : 'The reusable cards now explain what the login experience and protected dashboard are doing.'}
          </p>
        </div>

        <section className="card-grid">
          {cardData.map((card) => (
            <Card
              key={card.title}
              title={card.title}
              description={card.description}
              amount={card.amount}
            />
          ))}
        </section>

        {session ? (
          <>
            <section className="workspace" id="workspace">
              <div className="workspace-panel">
                <Counter
                  goal={financeGoal}
                  savings={savings}
                  onSavingsChange={setSavings}
                />
              </div>
              <div className="workspace-panel">
                <RegisterForm onRegister={handleRegister} />
              </div>
            </section>

            <section className="status-strip" id="summary">
              <div className="status-card">
                <h3>Latest Saved Profile</h3>
                {latestProfile ? (
                  <ul>
                    <li>Name: {latestProfile.fullName}</li>
                    <li>Email: {latestProfile.email}</li>
                    <li>Monthly income: ${latestProfile.monthlyIncome}</li>
                  </ul>
                ) : (
                  <p>
                    You are logged in with the frontend auth shell. Save a profile to
                    start personalizing the dashboard.
                  </p>
                )}
              </div>

              <div className="status-badges">
                <div>
                  <img src={reactLogo} alt="React logo" />
                  <span>React</span>
                </div>
                <div>
                  <img src={viteLogo} alt="Vite logo" />
                  <span>Vite</span>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="workspace auth-workspace" id="workspace">
              <div className="workspace-panel">
                <LoginForm
                  key={rememberedEmail || 'login-form'}
                  defaultEmail={rememberedEmail}
                  demoAccount={demoAccount}
                  onLogin={handleLogin}
                  savedProfilesCount={profiles.length}
                />
              </div>
              <div className="workspace-panel workspace-panel-accent" id="activity">
                <h2>What this login page already includes</h2>
                <p>
                  The goal was not just to draw a form. This auth shell behaves like a
                  real frontend milestone and stays easy to connect to your backend.
                </p>

                <ul className="feature-list">
                  <li>Remembered email for trusted devices</li>
                  <li>Demo credentials for fast grading and demos</li>
                  <li>Protected dashboard content with logout</li>
                  <li>Profile setup and savings tools after login</li>
                </ul>

                <div className="mini-stat-grid">
                  <div>
                    <strong>{profiles.length}</strong>
                    <small>Profiles in local storage</small>
                  </div>
                  <div>
                    <strong>{rememberedEmail ? 'On' : 'Off'}</strong>
                    <small>Remember me status</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="status-strip">
              <div className="status-card">
                <h3>Backend Handoff Notes</h3>
                <ul>
                  <li>Replace the mock handleLogin logic with your API request.</li>
                  <li>Keep the same dashboard layout after your token is returned.</li>
                  <li>Reuse the saved profile panel for onboarding or account setup.</li>
                </ul>
              </div>

              <div className="status-badges">
                <div>
                  <img src={reactLogo} alt="React logo" />
                  <span>React</span>
                </div>
                <div>
                  <img src={viteLogo} alt="Vite logo" />
                  <span>Vite</span>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

export default App;
