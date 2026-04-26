import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useBillingAccess } from '../context/BillingAccessContext';
import FinanceLayout from './FinanceLayout';
import { accountStore } from '../utils/accountStore';
import { authStore } from '../utils/authStore';
import { financeStore } from '../utils/financeStore';
import { settingsStore } from '../utils/settingsStore';

const currencyOptions = ['USD', 'CAD', 'GBP', 'EUR'];
const weekStartOptions = ['Monday', 'Sunday'];
const amountViewOptions = ['Compact', 'Detailed'];

const settingsSections = [
  { id: 'profile', label: 'Profile', note: 'Name, email, workspace' },
  { id: 'preferences', label: 'Preferences', note: 'Currency, calendar, display' },
  { id: 'notifications', label: 'Notifications', note: 'Money reminders' },
  { id: 'security', label: 'Security', note: 'Password and sessions' },
  { id: 'billing', label: 'Billing', note: 'Plan and invoices' },
  { id: 'data', label: 'Data', note: 'Export and deletion' },
];

const profileSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120, 'Keep name under 120 characters.'),
  workspaceName: z.string().trim().min(2, 'Workspace name must be at least 2 characters.').max(80, 'Keep workspace under 80 characters.'),
});

const preferencesSchema = z.object({
  amountView: z.enum(['Compact', 'Detailed']),
  currency: z.enum(['USD', 'CAD', 'GBP', 'EUR']),
  weekStart: z.enum(['Monday', 'Sunday']),
});

const notificationSchema = z.object({
  loginAlerts: z.boolean(),
  paymentReminders: z.boolean(),
  weeklySummary: z.boolean(),
});

const passwordSchema = z
  .object({
    confirmPassword: z.string().min(8, 'Confirm the new password.'),
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'Use at least 8 characters.').max(72, 'Keep password under 72 characters.'),
  })
  .superRefine((values, context) => {
    if (values.newPassword !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
      });
    }
  });

function FieldError({ message }) {
  return message ? <span className="settings-field-error">{message}</span> : null;
}

function SettingsToggle({ checked, label, note, register }) {
  return (
    <label className="settings-toggle">
      <span className="settings-toggle-copy">
        <strong>{label}</strong>
        <span>{note}</span>
      </span>
      <span className={`settings-toggle-pill${checked ? ' is-active' : ''}`}>
        <input type="checkbox" {...register} />
        <span className="settings-toggle-knob" />
      </span>
    </label>
  );
}

function SectionHeader({ eyebrow, title, body }) {
  return (
    <div className="settings-editor-head">
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function SettingsPage({ currentUser, onLogout, onUpdateProfile }) {
  const { tier } = useBillingAccess();
  const storedSettings = useMemo(
    () => settingsStore.getSettingsForUser(currentUser?.id, currentUser?.fullName),
    [currentUser?.fullName, currentUser?.id]
  );
  const [activeSection, setActiveSection] = useState('profile');
  const [workspaceStats, setWorkspaceStats] = useState({
    accounts: 0,
    budgets: 0,
    goals: 0,
    recurring: 0,
    transactions: 0,
  });
  const [metricsError, setMetricsError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [preferencesMessage, setPreferencesMessage] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const profileForm = useForm({
    defaultValues: {
      email: currentUser?.email || '',
      fullName: currentUser?.fullName || '',
      workspaceName: storedSettings.workspaceName,
    },
    resolver: zodResolver(profileSchema),
  });
  const preferencesForm = useForm({
    defaultValues: {
      amountView: storedSettings.amountView,
      currency: storedSettings.currency,
      weekStart: storedSettings.weekStart,
    },
    resolver: zodResolver(preferencesSchema),
  });
  const notificationForm = useForm({
    defaultValues: {
      loginAlerts: storedSettings.loginAlerts,
      paymentReminders: storedSettings.paymentReminders,
      weeklySummary: storedSettings.weeklySummary,
    },
    resolver: zodResolver(notificationSchema),
  });
  const passwordForm = useForm({
    defaultValues: {
      confirmPassword: '',
      currentPassword: '',
      newPassword: '',
    },
    resolver: zodResolver(passwordSchema),
  });
  const notificationValues = notificationForm.watch();

  useEffect(() => {
    profileForm.reset({
      email: currentUser?.email || '',
      fullName: currentUser?.fullName || '',
      workspaceName: storedSettings.workspaceName,
    });
    preferencesForm.reset({
      amountView: storedSettings.amountView,
      currency: storedSettings.currency,
      weekStart: storedSettings.weekStart,
    });
    notificationForm.reset({
      loginAlerts: storedSettings.loginAlerts,
      paymentReminders: storedSettings.paymentReminders,
      weeklySummary: storedSettings.weeklySummary,
    });
  }, [currentUser?.email, currentUser?.fullName, notificationForm, preferencesForm, profileForm, storedSettings]);

  useEffect(() => {
    let isCancelled = false;

    const loadWorkspaceStats = async () => {
      if (!currentUser?.id) {
        return;
      }

      setMetricsError('');

      try {
        const [accounts, transactions, budgets, goals, recurring] = await Promise.all([
          accountStore.getAccountsForUser(currentUser.id),
          financeStore.getTransactionsForUser(currentUser.id),
          financeStore.getBudgetsForUser(currentUser.id),
          financeStore.getGoalsForUser(currentUser.id),
          financeStore.getRecurringPaymentsForUser(currentUser.id),
        ]);

        if (!isCancelled) {
          setWorkspaceStats({
            accounts: accounts.length,
            budgets: budgets.length,
            goals: goals.length,
            recurring: recurring.length,
            transactions: transactions.length,
          });
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setMetricsError(error.message || 'Workspace metrics could not load.');
      }
    };

    loadWorkspaceStats();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, onLogout]);

  const handleProfileSubmit = async (values) => {
    setIsSavingProfile(true);
    setProfileMessage('');

    try {
      const updatedUser = await onUpdateProfile({
        email: values.email,
        fullName: values.fullName,
      });

      const nextSettings = settingsStore.updateSettings(
        updatedUser.id,
        { workspaceName: values.workspaceName.trim() },
        updatedUser.fullName
      );

      profileForm.reset({
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        workspaceName: nextSettings.workspaceName,
      });
      setProfileMessage('Profile saved.');
    } catch (error) {
      setProfileMessage(error.message || 'Profile could not be saved.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePreferencesSubmit = (values) => {
    const nextSettings = settingsStore.updateSettings(currentUser.id, values, currentUser.fullName);
    preferencesForm.reset({
      amountView: nextSettings.amountView,
      currency: nextSettings.currency,
      weekStart: nextSettings.weekStart,
    });
    setPreferencesMessage('Preferences saved.');
  };

  const handleNotificationsSubmit = (values) => {
    const nextSettings = settingsStore.updateSettings(currentUser.id, values, currentUser.fullName);
    notificationForm.reset({
      loginAlerts: nextSettings.loginAlerts,
      paymentReminders: nextSettings.paymentReminders,
      weeklySummary: nextSettings.weeklySummary,
    });
    setNotificationMessage('Notifications saved.');
  };

  const handlePasswordSubmit = async (values) => {
    setIsSavingPassword(true);
    setSecurityMessage('');

    try {
      await authStore.updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset();
      setSecurityMessage('Password updated.');
    } catch (error) {
      setSecurityMessage(error.message || 'Password could not be updated.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const totalObjects =
    workspaceStats.accounts +
    workspaceStats.transactions +
    workspaceStats.budgets +
    workspaceStats.goals +
    workspaceStats.recurring;
  const hasPaidExports = tier === 'plus' || tier === 'pro';
  const hasProControls = tier === 'pro';

  const rail = (
    <aside className="settings-trust-rail">
      <article className="settings-trust-card settings-trust-card-dark">
        <span>Trust boundary</span>
        <h3>Signed-in workspace only</h3>
        <p>Settings and finance records are read through authenticated routes for the current user.</p>
      </article>

      <article className="settings-trust-card">
        <span>Workspace inventory</span>
        <strong>{metricsError ? 'Unavailable' : totalObjects}</strong>
        <p>{metricsError || 'Real saved objects in this workspace.'}</p>
        <div className="settings-mini-metrics">
          <span>{workspaceStats.accounts} accounts</span>
          <span>{workspaceStats.transactions} transactions</span>
          <span>{workspaceStats.budgets + workspaceStats.goals + workspaceStats.recurring} plans</span>
        </div>
      </article>

      <article className="settings-trust-card">
        <span>Tier posture</span>
        <strong>{tier === 'pro' ? 'Pro controls' : tier === 'plus' ? 'Plus controls' : 'Free controls'}</strong>
        <p>
          {tier === 'pro'
            ? 'Forecasting, smarter planning, and higher-control support pathways should feel cohesive here.'
            : tier === 'plus'
              ? 'Exports, recurring workflows, and unlimited planning should feel operationally stronger here.'
              : 'Free keeps the workspace clean and safe before paid controls become necessary.'}
        </p>
      </article>
    </aside>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Settings"
      pageSubtitle="Control identity, security, preferences, billing, and data boundaries."
      rail={rail}
    >
      <section className="settings-command-hero">
        <div>
          <span className="settings-command-kicker">Account command</span>
          <h2>Quiet controls for serious money software.</h2>
          <p>Keep profile, security, notifications, and data controls separated so sensitive actions never feel casual.</p>
        </div>
        <div className="settings-command-card" aria-label="Account state">
          <span>Signed in as</span>
          <strong>{currentUser?.email}</strong>
          <p>{storedSettings.workspaceName}</p>
        </div>
      </section>

      <section className="settings-hq">
        <aside className="settings-section-nav" aria-label="Settings sections">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              className={`settings-section-button${activeSection === section.id ? ' is-active' : ''}`}
              type="button"
              onClick={() => setActiveSection(section.id)}
            >
              <strong>{section.label}</strong>
              <span>{section.note}</span>
            </button>
          ))}
        </aside>

        <div className="settings-editor">
          {activeSection === 'profile' ? (
            <article className="settings-editor-card">
              <SectionHeader
                eyebrow="Identity"
                title="Profile and workspace"
                body="Name and email update through your backend. Workspace label stays client-side until preferences are promoted to the API."
              />
              <form className="settings-form" onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
                {profileMessage ? <p className="settings-message">{profileMessage}</p> : null}
                <div className="settings-field-grid">
                  <label className="settings-field">
                    <span>Full name</span>
                    <input type="text" {...profileForm.register('fullName')} disabled={isSavingProfile} />
                    <FieldError message={profileForm.formState.errors.fullName?.message} />
                  </label>
                  <label className="settings-field">
                    <span>Email</span>
                    <input type="email" {...profileForm.register('email')} disabled={isSavingProfile} />
                    <FieldError message={profileForm.formState.errors.email?.message} />
                  </label>
                  <label className="settings-field settings-field-wide">
                    <span>Workspace name</span>
                    <input type="text" {...profileForm.register('workspaceName')} disabled={isSavingProfile} />
                    <FieldError message={profileForm.formState.errors.workspaceName?.message} />
                  </label>
                </div>
                <button className="settings-save-button" type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save profile'}
                </button>
              </form>
            </article>
          ) : null}

          {activeSection === 'preferences' ? (
            <article className="settings-editor-card">
              <SectionHeader
                eyebrow="Display"
                title="Money display defaults"
                body="Set the baseline language for amounts, weeks, and display density before deeper backend preferences are added."
              />
              <form className="settings-form" onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)}>
                {preferencesMessage ? <p className="settings-message">{preferencesMessage}</p> : null}
                <div className="settings-field-grid">
                  <label className="settings-field">
                    <span>Currency</span>
                    <select {...preferencesForm.register('currency')}>
                      {currencyOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="settings-field">
                    <span>Week starts</span>
                    <select {...preferencesForm.register('weekStart')}>
                      {weekStartOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="settings-field settings-field-wide">
                    <span>Amount view</span>
                    <select {...preferencesForm.register('amountView')}>
                      {amountViewOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button className="settings-save-button" type="submit">
                  Save preferences
                </button>
              </form>
            </article>
          ) : null}

          {activeSection === 'notifications' ? (
            <article className="settings-editor-card">
              <SectionHeader
                eyebrow="Notifications"
                title="Choose what deserves attention"
                body="These switches prepare the product for backend reminders without sending fake alerts."
              />
              <form className="settings-form" onSubmit={notificationForm.handleSubmit(handleNotificationsSubmit)}>
                {notificationMessage ? <p className="settings-message">{notificationMessage}</p> : null}
                <div className="settings-toggle-list">
                  <SettingsToggle
                    checked={notificationValues.paymentReminders}
                    label="Payment reminders"
                    note="Show reminders for recurring payments when reminder delivery is connected."
                    register={notificationForm.register('paymentReminders')}
                  />
                  <SettingsToggle
                    checked={notificationValues.weeklySummary}
                    label="Weekly summary"
                    note="Prepare a weekly recap of actual activity."
                    register={notificationForm.register('weeklySummary')}
                  />
                  <SettingsToggle
                    checked={notificationValues.loginAlerts}
                    label="Login alerts"
                    note="Keep account-access visibility enabled."
                    register={notificationForm.register('loginAlerts')}
                  />
                </div>
                <button className="settings-save-button" type="submit">
                  Save notifications
                </button>
              </form>
            </article>
          ) : null}

          {activeSection === 'security' ? (
            <article className="settings-editor-card">
              <SectionHeader
                eyebrow="Security"
                title="Password and session controls"
                body="Password updates use the authenticated backend endpoint. Session management can attach here later."
              />
              <form className="settings-form" onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
                {securityMessage ? <p className="settings-message">{securityMessage}</p> : null}
                <div className="settings-field-grid">
                  <label className="settings-field settings-field-wide">
                    <span>Current password</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      {...passwordForm.register('currentPassword')}
                      disabled={isSavingPassword}
                    />
                    <FieldError message={passwordForm.formState.errors.currentPassword?.message} />
                  </label>
                  <label className="settings-field">
                    <span>New password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      {...passwordForm.register('newPassword')}
                      disabled={isSavingPassword}
                    />
                    <FieldError message={passwordForm.formState.errors.newPassword?.message} />
                  </label>
                  <label className="settings-field">
                    <span>Confirm password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      {...passwordForm.register('confirmPassword')}
                      disabled={isSavingPassword}
                    />
                    <FieldError message={passwordForm.formState.errors.confirmPassword?.message} />
                  </label>
                </div>
                <button className="settings-save-button" type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </article>
          ) : null}

          {activeSection === 'billing' ? (
            <article className="settings-editor-card settings-split-card">
              <SectionHeader
                eyebrow="Subscription"
                title="Billing stays separate from finance editing"
                body="Plan state, checkout, invoices, and payment methods belong in a dedicated billing workspace with clearer audit boundaries."
              />
              <div className="settings-status-stack">
                <div>
                  <span>Current tier</span>
                  <strong>{tier === 'pro' ? 'Pro' : tier === 'plus' ? 'Plus' : 'Free'}</strong>
                  <p>
                    {tier === 'pro'
                      ? 'The workspace should feel like a higher-control finance product with deeper analysis and priority handling.'
                      : tier === 'plus'
                        ? 'The workspace should feel stronger for recurring control, exports, and everyday money operations.'
                        : 'Free stays focused on clean manual tracking until paid control is genuinely worth it.'}
                  </p>
                </div>
                <div>
                  <span>Billing area</span>
                  <strong>Dedicated workspace</strong>
                  <p>Open the billing area to review subscription state, invoices, and the exact difference between Free, Plus, and Pro.</p>
                </div>
                <Link className="settings-save-button settings-link-button" to="/billing">
                  Open billing
                </Link>
              </div>
            </article>
          ) : null}

          {activeSection === 'data' ? (
            <article className="settings-editor-card settings-split-card">
              <SectionHeader
                eyebrow="Data"
                title="Export and deletion guardrails"
                body="High-risk actions should stay explicit, confirmed, and backed by safe backend behavior instead of pretending the frontend alone is enough."
              />
              <div className="settings-data-grid">
                <div>
                  <span>Workspace objects</span>
                  <strong>{totalObjects}</strong>
                  <p>Accounts, transactions, budgets, goals, and recurring payments.</p>
                </div>
                <div>
                  <span>Export</span>
                  <strong>{hasPaidExports ? 'Plus unlocked' : 'Free locked'}</strong>
                  <p>
                    {hasPaidExports
                      ? 'CSV workflows belong to the paid operating tiers. The backend export route still needs to become the production source of truth.'
                      : 'Exports unlock in Plus, where heavier cleanup and reporting workflows start saving real time.'}
                  </p>
                </div>
                <div>
                  <span>Advanced controls</span>
                  <strong>{hasProControls ? 'Pro posture' : 'Upgrade path'}</strong>
                  <p>
                    {hasProControls
                      ? 'Pro is where forecasting, smarter planning, and higher-control support should feel cohesive across the app.'
                      : 'Pro should be the intelligence tier, not just another badge. These controls stay honest until they are fully backend-backed.'}
                  </p>
                </div>
                <div className="settings-danger-zone">
                  <span>Delete account</span>
                  <strong>Confirmation required</strong>
                  <p>Enable only after backend re-auth, cascade safety, and audit logging are ready.</p>
                </div>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </FinanceLayout>
  );
}

export default SettingsPage;
