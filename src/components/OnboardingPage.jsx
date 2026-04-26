import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import BrandLogo from './BrandLogo';
import { accountStore } from '../utils/accountStore';
import { settingsStore } from '../utils/settingsStore';

const steps = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'account', label: 'First account' },
  { id: 'next', label: 'Next records' },
  { id: 'finish', label: 'Finish' },
];

const preferenceSchema = z.object({
  currency: z.enum(['USD', 'CAD', 'GBP', 'EUR']),
  weekStart: z.enum(['Monday', 'Sunday']),
  workspaceName: z.string().trim().min(2, 'Workspace name must be at least 2 characters.').max(80),
});

const accountSchema = z.object({
  accountType: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'other']),
  currency: z.string().trim().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code.'),
  institutionName: z.string().trim().max(120, 'Keep institution under 120 characters.').optional(),
  isPrimary: z.boolean(),
  name: z.string().trim().min(2, 'Account name is required.').max(120),
  openingBalance: z.coerce.number().min(0, 'Opening balance cannot be negative.'),
});

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
  const storedSettings = useMemo(
    () => settingsStore.getSettingsForUser(currentUser?.id, currentUser?.fullName),
    [currentUser?.fullName, currentUser?.id]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [createdAccountName, setCreatedAccountName] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const preferenceForm = useForm({
    defaultValues: {
      currency: storedSettings.currency,
      weekStart: storedSettings.weekStart,
      workspaceName: storedSettings.workspaceName,
    },
    resolver: zodResolver(preferenceSchema),
  });
  const accountForm = useForm({
    defaultValues: {
      accountType: 'checking',
      currency: storedSettings.currency,
      institutionName: '',
      isPrimary: true,
      name: '',
      openingBalance: 0,
    },
    resolver: zodResolver(accountSchema),
  });

  const activeStep = steps[activeIndex];
  const progress = Math.round(((activeIndex + 1) / steps.length) * 100);

  const goNext = () => {
    setMessage('');
    setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const completeOnboarding = () => {
    settingsStore.updateSettings(
      currentUser.id,
      {
        onboardingCompleted: true,
      },
      currentUser.fullName
    );
    navigate(redirectPath, { replace: true });
  };

  const handlePreferences = (values) => {
    settingsStore.updateSettings(currentUser.id, values, currentUser.fullName);
    goNext();
  };

  const handleAccount = async (values) => {
    setIsSavingAccount(true);
    setMessage('');

    try {
      const account = await accountStore.saveAccount(currentUser.id, {
        ...values,
        maskedIdentifier: '',
        notes: 'Created during onboarding.',
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
        <BrandLogo compact subtitle="" title="Ledgr" tone="dark" />
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
          {message ? <p className="onboarding-message">{message}</p> : null}

          {activeStep.id === 'welcome' ? (
            <article className="onboarding-card onboarding-welcome-card">
              <span className="onboarding-eyebrow">Start clean</span>
              <h2>Your workspace is empty by design.</h2>
              <p>
                Ledgr starts with your choices. Set a few basics now, or skip ahead and add details from each page.
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
              <p>These choices control how the client displays your workspace while backend preferences are expanded.</p>

              <form className="onboarding-form" onSubmit={preferenceForm.handleSubmit(handlePreferences)}>
                <label className="onboarding-field onboarding-field-wide">
                  <span>Workspace name</span>
                  <input type="text" {...preferenceForm.register('workspaceName')} />
                  <OnboardingFieldError message={preferenceForm.formState.errors.workspaceName?.message} />
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
                  <OnboardingFieldError message={accountForm.formState.errors.name?.message} />
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
                  <OnboardingFieldError message={accountForm.formState.errors.openingBalance?.message} />
                </label>

                <label className="onboarding-field">
                  <span>Currency</span>
                  <input type="text" maxLength="3" {...accountForm.register('currency')} disabled={isSavingAccount} />
                  <OnboardingFieldError message={accountForm.formState.errors.currency?.message} />
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
                  <span>Record income, expense, or transfer from the Transactions page.</span>
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
              <h2>Enter Ledgr with a clean foundation.</h2>
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
