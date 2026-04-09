import { useEffect, useState } from 'react';
import './App.css';
import hero from './assets/hero.png';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import ActivityFeed from './components/ActivityFeed';
import Card from './components/Card';
import Counter from './components/Counter';
import LoginForm from './components/LoginForm';
import Navbar from './components/Navbar';
import RegisterForm from './components/RegisterForm';
import SessionPanel from './components/SessionPanel';

const demoAccount = {
  fullName: 'Demo Member',
  email: 'demo@financeflow.app',
  password: 'Budget2026!',
  monthlyIncome: 4200,
};

const financeGoal = 1000;

const activityItems = [
  {
    id: 1,
    title: 'Payday deposit',
    note: 'Salary scheduled for Friday morning.',
    type: 'income',
    tag: 'Income',
    amount: '+$2,350',
  },
  {
    id: 2,
    title: 'Electricity bill',
    note: 'Due in 2 days to stay on track.',
    type: 'bill',
    tag: 'Bill',
    amount: '-$94',
  },
  {
    id: 3,
    title: 'Emergency fund transfer',
    note: 'Automatic transfer to savings goal.',
    type: 'savings',
    tag: 'Savings',
    amount: '+$150',
  },
  {
    id: 4,
    title: 'Groceries',
    note: 'Weekly budget stayed below plan.',
    type: 'spending',
    tag: 'Spending',
    amount: '-$82',
  },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const parseIncomeValue = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number(String(value).replace(/[^0-9.]/g, ''));
};

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
    const normalizedEmail = newProfile.email.toLowerCase();

    setProfiles((currentProfiles) =>
      [
        newProfile,
        ...currentProfiles.filter(
          (profile) => profile.email.toLowerCase() !== normalizedEmail,
        ),
      ].slice(0, 4),
    );

    setSession((currentSession) => {
      if (!currentSession || currentSession.email.toLowerCase() !== normalizedEmail) {
        return currentSession;
      }

      return {
        ...currentSession,
        fullName: newProfile.fullName,
      };
    });
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
  const currentProfile = session
    ? profiles.find(
        (profile) => profile.email.toLowerCase() === session.email.toLowerCase(),
      )
    : null;
  const monthlyIncome = currentProfile
    ? parseIncomeValue(currentProfile.monthlyIncome)
    : demoAccount.monthlyIncome;
  const savingsProgress = Math.min(
    Math.round((savings / financeGoal) * 100),
    100,
  );

  const navItems = session
    ? [
        { href: '#home', label: 'Home' },
        { href: '#overview', label: 'Overview' },
        { href: '#workspace', label: 'Workspace' },
        { href: '#activity', label: 'Activity' },
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
          title: 'Monthly Income',
          description:
            'This value comes from your saved frontend profile and can later be replaced by backend data.',
          amount: currencyFormatter.format(monthlyIncome || demoAccount.monthlyIncome),
        },
        {
          title: 'Savings Progress',
          description:
            'The savings tracker writes to local storage and updates the dashboard instantly.',
          amount: `${savingsProgress}%`,
        },
        {
          title: 'Profiles Saved',
          description:
            'Each saved profile stays available locally so your demo can show onboarding and persistence.',
          amount: String(profiles.length),
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

  const registerDefaults = {
    fullName:
      session?.fullName === demoAccount.fullName ? '' : session?.fullName ?? '',
    email: session?.email ?? '',
    monthlyIncome: currentProfile
      ? String(parseIncomeValue(currentProfile.monthlyIncome))
      : '',
  };

  if (!session) {
    return (
      <>
        <Navbar
          isAuthenticated={false}
          navItems={[]}
          onLogout={handleLogout}
          userName={session?.fullName}
        />

        <main className="auth-page">
          <section className="auth-stage">
            <div className="auth-showcase">
              <span className="auth-eyebrow">Personal Finance Login</span>
              <h1>Start with a focused login screen, then unlock the dashboard.</h1>
              <p>
                This keeps the app presentation cleaner: first you sign in, then you
                reveal the actual finance workspace. Your backend can replace the mock
                login logic later without changing the rest of the UI.
              </p>

              <div className="auth-stage-stats">
                <div>
                  <strong>Demo Ready</strong>
                  <small>Fast login for class presentation</small>
                </div>
                <div>
                  <strong>{profiles.length}</strong>
                  <small>Profiles already stored locally</small>
                </div>
                <div>
                  <strong>{rememberedEmail ? 'On' : 'Off'}</strong>
                  <small>Remembered email status</small>
                </div>
              </div>

              <div className="auth-visual-card">
                <img src={hero} alt="Personal finance dashboard preview" />
                <div className="auth-credential-card">
                  <span>Demo Access</span>
                  <strong>{demoAccount.email}</strong>
                  <small>Password: {demoAccount.password}</small>
                </div>
              </div>
            </div>

            <div className="auth-form-panel">
              <LoginForm
                key={rememberedEmail || 'login-form'}
                defaultEmail={rememberedEmail}
                demoAccount={demoAccount}
                onLogin={handleLogin}
                savedProfilesCount={profiles.length}
              />

              <div className="auth-note">
                <h2>Backend handoff</h2>
                <p>
                  When your API is ready, swap the mock login handler with your real
                  request and keep this screen as the dedicated entry point.
                </p>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

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

        <section className="workspace" id="workspace">
          <div className="workspace-panel">
            <Counter
              goal={financeGoal}
              savings={savings}
              onSavingsChange={setSavings}
            />
          </div>
          <div className="workspace-panel">
            <RegisterForm
              key={session.email}
              defaultValues={registerDefaults}
              onRegister={handleRegister}
            />
          </div>
        </section>

        <section className="dashboard-grid" id="activity">
          <div className="workspace-panel">
            <ActivityFeed items={activityItems} />
          </div>
          <div className="workspace-panel">
            <SessionPanel
              currentIncome={monthlyIncome}
              goal={financeGoal}
              profiles={profiles}
              savings={savings}
              session={session}
            />
          </div>
        </section>

        <section className="status-strip">
          <div className="status-card">
            <h3>Latest Saved Profile</h3>
            {latestProfile ? (
              <ul>
                <li>Name: {latestProfile.fullName}</li>
                <li>Email: {latestProfile.email}</li>
                <li>
                  Monthly income:{' '}
                  {currencyFormatter.format(
                    parseIncomeValue(latestProfile.monthlyIncome),
                  )}
                </li>
              </ul>
            ) : (
              <p>
                You are logged in with the frontend auth shell. Save a profile to
                personalize the income card and latest profile summary.
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
      </main>
    </>
  );
}

export default App;
