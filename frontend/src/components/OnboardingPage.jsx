import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { accountStore } from '../utils/accountStore';
import { settingsStore } from '../utils/settingsStore';
import { useManagedForm } from '../utils/useManagedForm';

const steps = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'account', label: 'First account' },
  { id: 'next', label: 'Next records' },
  { id: 'finish', label: 'Finish' },
];

const onboardingCurrencyOptions = ['USD', 'CAD', 'GBP', 'EUR'];
const onboardingWeekStartOptions = ['Monday', 'Sunday'];
const onboardingAccountTypeOptions = ['checking', 'savings', 'credit_card', 'cash', 'investment', 'other'];

const validatePreferenceForm = (values) => {
  const errors = {};
  const workspaceName = String(values.workspaceName || '').trim();

  if (workspaceName.length < 2) {
    errors.workspaceName = 'Workspace name must be at least 2 characters.';
  } else if (workspaceName.length > 80) {
    errors.workspaceName = 'Keep workspace under 80 characters.';
  }

  if (!onboardingCurrencyOptions.includes(values.currency)) {
    errors.currency = 'Choose a supported currency.';
  }

  if (!onboardingWeekStartOptions.includes(values.weekStart)) {
    errors.weekStart = 'Choose a supported week start.';
  }

  return errors;
};

const validateAccountForm = (values) => {
  const errors = {};
  const name = String(values.name || '').trim();
  const institutionName = String(values.institutionName || '').trim();
  const currency = String(values.currency || '').trim().toUpperCase();
  const openingBalance = Number(values.openingBalance);

  if (name.length < 2) {
    errors.name = 'Account name is required.';
  } else if (name.length > 120) {
    errors.name = 'Keep account name under 120 characters.';
  }

  if (!onboardingAccountTypeOptions.includes(values.accountType)) {
    errors.accountType = 'Choose a supported account type.';
  }

  if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    errors.openingBalance = 'Opening balance cannot be negative.';
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.currency = 'Use a 3-letter currency code.';
  }

  if (institutionName.length > 120) {
    errors.institutionName = 'Keep institution under 120 characters.';
  }

  return errors;
};

function OnboardingFieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="onboarding-field-error">{message}</span>;
}

function OnboardingPage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from?.pathname || '/dashboard';
  const storedSettings = settingsStore.getSettingsForUser(currentUser?.id, currentUser?.fullName);
  const [activeIndex, setActiveIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [createdAccountName, setCreatedAccountName] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSyncingSettings, setIsSyncingSettings] = useState(false);

  const preferenceForm = useManagedForm({
    defaultValues: {
      currency: storedSettings.currency,
      weekStart: storedSettings.weekStart,
      workspaceName: storedSettings.workspaceName,
    },
    validate: validatePreferenceForm,
  });
  const accountForm = useManagedForm({
    defaultValues: {
      accountType: 'checking',
      currency: storedSettings.currency,
      institutionName: '',
      isPrimary: true,
      name: '',
      openingBalance: 0,
    },
    validate: validateAccountForm,
  });
  const { reset: resetPreferenceForm } = preferenceForm;
  const { reset: resetAccountForm } = accountForm;

  const activeStep = steps[activeIndex];
  const progress = Math.round(((activeIndex + 1) / steps.length) * 100);

  useEffect(() => {
    let isCancelled = false;

    const syncSettings = async () => {
      if (!currentUser?.id) {
        return;
      }

      setIsSyncingSettings(true);

      try {
        const nextSettings = await settingsStore.syncRemoteSettings(currentUser.id, currentUser.fullName);

        if (isCancelled) {
          return;
        }

        resetPreferenceForm({
          currency: nextSettings.currency,
          weekStart: nextSettings.weekStart,
          workspaceName: nextSettings.workspaceName,
        });
        resetAccountForm({
          accountType: 'checking',
          currency: nextSettings.currency,
          institutionName: '',
          isPrimary: true,
          name: '',
          openingBalance: 0,
        });
      } catch (error) {
        if (!isCancelled) {
          setMessage(error.message || 'Workspace preferences could not sync.');
        }
      } finally {
        if (!isCancelled) {
          setIsSyncingSettings(false);
        }
      }
    };

    syncSettings();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.fullName, currentUser?.id, resetAccountForm, resetPreferenceForm]);

  const goNext = () => {
    setMessage('');
    setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const completeOnboarding = async () => {
    await settingsStore.saveRemoteSettings(
      currentUser.id,
      {
        onboardingCompleted: true,
      },
      currentUser.fullName
    );
    navigate(redirectPath, { replace: true });
  };

  const handlePreferences = async (values) => {
    await settingsStore.saveRemoteSettings(
      currentUser.id,
      {
        ...values,
        workspaceName: String(values.workspaceName || '').trim(),
      },
      currentUser.fullName
    );
    goNext();
  };

  const handleAccount = async (values) => {
    setIsSavingAccount(true);
    setMessage('');

    try {
      const account = await accountStore.saveAccount(currentUser.id, {
        ...values,
        currency: String(values.currency || '').trim().toUpperCase(),
        institutionName: String(values.institutionName || '').trim(),
        maskedIdentifier: '',
        name: String(values.name || '').trim(),
        notes: 'Created during onboarding.',
        openingBalance: Number(values.openingBalance) || 0,
      });
      setCreatedAccountName(account.name);
      goNext();
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setMessage(error.message || 'Account could not be created.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  return (
    <main className="onboarding-shell">
      <header className="onboarding-topbar">
        <BrandLogo compact subtitle="" title="Rivo" tone="dark" />
        <div>
          <Link to={redirectPath}>Skip setup</Link>
          <button type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <section className="onboarding-layout">
        <aside className="onboarding-rail">
          <span className="onboarding-eyebrow">Private setup</span>
          <h1>Set up a workspace that starts clean.</h1>
          <p>Choose your defaults, add a first account if you are ready, and skip anything you want to do later.</p>

          <div className="onboarding-progress">
            <div>
              <span>Progress</span>
              <strong>{progress}%</strong>
            </div>
            <span className="onboarding-progress-track">
              <span style={{ width: `${progress}%` }} />
            </span>
          </div>

          <nav className="onboarding-steps" aria-label="Onboarding steps">
            {steps.map((step, index) => (
              <button
                key={step.id}
                className={index === activeIndex ? 'is-active' : ''}
                type="button"
                onClick={() => setActiveIndex(index)}
              >
                <span>{index + 1}</span>
                <strong>{step.label}</strong>
              </button>
            ))}
          </nav>
        </aside>

        <section className="onboarding-panel">
          {isSyncingSettings ? <p className="onboarding-message">Syncing workspace defaults...</p> : null}
          {message ? <p className="onboarding-message">{message}</p> : null}

          {activeStep.id === 'welcome' ? (
            <article className="onboarding-card onboarding-welcome-card">
              <span className="onboarding-eyebrow">Start clean</span>
              <h2>Your workspace is empty by design.</h2>
              <p>
                Rivo starts with your choices. Set a few basics now, or skip ahead and add details from each page.
              </p>
              <div className="onboarding-action-row">
                <button className="onboarding-primary" type="button" onClick={goNext}>
                  Begin setup
                </button>
                <button className="onboarding-secondary" type="button" onClick={completeOnboarding}>
                  Skip to dashboard
                </button>
              </div>
            </article>
          ) : null}

          {activeStep.id === 'preferences' ? (
            <article className="onboarding-card">
              <span className="onboarding-eyebrow">Defaults</span>
              <h2>Set the money language.</h2>
              <p>These choices stay with your workspace so amounts, dates, and labels behave consistently across devices.</p>

              <form className="onboarding-form" onSubmit={preferenceForm.handleSubmit(handlePreferences)}>
                <label className="onboarding-field onboarding-field-wide">
                  <span>Workspace name</span>
                  <input type="text" {...preferenceForm.register('workspaceName')} />
                  <OnboardingFieldError message={preferenceForm.errors.workspaceName} />
                </label>

                <label className="onboarding-field">
                  <span>Currency</span>
                  <select {...preferenceForm.register('currency')}>
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>

                <label className="onboarding-field">
                  <span>Week starts</span>
                  <select {...preferenceForm.register('weekStart')}>
                    <option value="Monday">Monday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </label>

                <div className="onboarding-action-row">
                  <button className="onboarding-primary" type="submit">
                    Save and continue
                  </button>
                  <button className="onboarding-secondary" type="button" onClick={goNext}>
                    Skip
                  </button>
                </div>
              </form>
            </article>
          ) : null}

          {activeStep.id === 'account' ? (
            <article className="onboarding-card">
              <span className="onboarding-eyebrow">First account</span>
              <h2>Add one real account, or skip.</h2>
              <p>Start with a checking, savings, cash, card, investment, or other manual account.</p>

              <form className="onboarding-form" onSubmit={accountForm.handleSubmit(handleAccount)}>
                <label className="onboarding-field">
                  <span>Account name</span>
                  <input type="text" placeholder="Everyday checking" {...accountForm.register('name')} disabled={isSavingAccount} />
                  <OnboardingFieldError message={accountForm.errors.name} />
                </label>

                <label className="onboarding-field">
                  <span>Account type</span>
                  <select {...accountForm.register('accountType')} disabled={isSavingAccount}>
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit_card">Credit card</option>
                    <option value="cash">Cash</option>
                    <option value="investment">Investment</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="onboarding-field">
                  <span>Opening balance</span>
                  <input type="number" min="0" step="0.01" {...accountForm.register('openingBalance')} disabled={isSavingAccount} />
                  <OnboardingFieldError message={accountForm.errors.openingBalance} />
                </label>

                <label className="onboarding-field">
                  <span>Currency</span>
                  <input type="text" maxLength="3" {...accountForm.register('currency')} disabled={isSavingAccount} />
                  <OnboardingFieldError message={accountForm.errors.currency} />
                </label>

                <label className="onboarding-field onboarding-field-wide">
                  <span>Institution optional</span>
                  <input type="text" {...accountForm.register('institutionName')} disabled={isSavingAccount} />
                </label>

                <label className="onboarding-check onboarding-field-wide">
                  <input type="checkbox" {...accountForm.register('isPrimary')} disabled={isSavingAccount} />
                  <span>Make this the primary account</span>
                </label>

                <div className="onboarding-action-row onboarding-field-wide">
                  <button className="onboarding-primary" type="submit" disabled={isSavingAccount}>
                    {isSavingAccount ? 'Creating...' : 'Create account'}
                  </button>
                  <button className="onboarding-secondary" type="button" onClick={goNext} disabled={isSavingAccount}>
                    Skip for now
                  </button>
                </div>
              </form>
            </article>
          ) : null}

          {activeStep.id === 'next' ? (
            <article className="onboarding-card">
              <span className="onboarding-eyebrow">Optional next actions</span>
              <h2>{createdAccountName ? `${createdAccountName} is ready.` : 'Keep setup lightweight.'}</h2>
              <p>Transactions, budgets, and goals are better created when you have the real details in front of you.</p>

              <div className="onboarding-next-grid">
                <Link to="/transactions">
                  <strong>Add transaction</strong>
                  <span>Record income or expense from the Transactions page.</span>
                </Link>
                <Link to="/budget">
                  <strong>Create budget</strong>
                  <span>Plan category spending once your categories and transactions exist.</span>
                </Link>
                <Link to="/goals">
                  <strong>Set goal</strong>
                  <span>Create a savings or payoff target with your real numbers.</span>
                </Link>
              </div>

              <div className="onboarding-action-row">
                <button className="onboarding-primary" type="button" onClick={goNext}>
                  Continue
                </button>
                <button className="onboarding-secondary" type="button" onClick={completeOnboarding}>
                  Finish now
                </button>
              </div>
            </article>
          ) : null}

          {activeStep.id === 'finish' ? (
            <article className="onboarding-card onboarding-finish-card">
              <span className="onboarding-eyebrow">Workspace ready</span>
              <h2>Enter Rivo with a clean foundation.</h2>
              <p>
                The app will show empty states until you add real accounts, transactions, budgets, goals, and recurring
                payments.
              </p>
              <button className="onboarding-primary" type="button" onClick={completeOnboarding}>
                Go to dashboard
              </button>
            </article>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default OnboardingPage;
