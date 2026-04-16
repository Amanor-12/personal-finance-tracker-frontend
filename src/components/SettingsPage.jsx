import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import { cardStore } from '../utils/cardStore';
import { financeStore } from '../utils/financeStore';
import { settingsStore } from '../utils/settingsStore';

const currencyOptions = ['USD', 'CAD', 'GBP', 'EUR'];
const weekStartOptions = ['Monday', 'Sunday'];
const amountViewOptions = ['Compact', 'Detailed'];

const createProfileForm = (user, settings) => ({
  fullName: user?.fullName || '',
  email: user?.email || '',
  workspaceName: settings.workspaceName,
});

const createPreferenceForm = (settings) => ({
  currency: settings.currency,
  weekStart: settings.weekStart,
  amountView: settings.amountView,
});

const createAlertForm = (settings) => ({
  paymentReminders: settings.paymentReminders,
  weeklySummary: settings.weeklySummary,
  loginAlerts: settings.loginAlerts,
});

function SettingsToggle({ checked, label, note, onChange }) {
  return (
    <label className="settings-toggle">
      <div className="settings-toggle-copy">
        <strong>{label}</strong>
        <span>{note}</span>
      </div>

      <span className={`settings-toggle-pill${checked ? ' is-active' : ''}`}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="settings-toggle-knob" />
      </span>
    </label>
  );
}

function SettingsPage({ currentUser, onLogout, onUpdateProfile }) {
  const storedSettings = useMemo(
    () => settingsStore.getSettingsForUser(currentUser?.id, currentUser?.fullName),
    [currentUser?.fullName, currentUser?.id]
  );

  const [cardsCount, setCardsCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);

  const [profileForm, setProfileForm] = useState(() => createProfileForm(currentUser, storedSettings));
  const [preferenceForm, setPreferenceForm] = useState(() => createPreferenceForm(storedSettings));
  const [alertForm, setAlertForm] = useState(() => createAlertForm(storedSettings));
  const [profileMessage, setProfileMessage] = useState('');
  const [preferenceMessage, setPreferenceMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    let isCancelled = false;

    const loadMetrics = async () => {
      if (!currentUser?.id) {
        setCardsCount(0);
        setPaymentsCount(0);
        return;
      }

      try {
        const [cards, snapshot] = await Promise.all([
          cardStore.getCardsForUser(currentUser.id),
          financeStore.getDashboardSnapshot(currentUser.id),
        ]);

        if (isCancelled) {
          return;
        }

        setCardsCount(cards.length);
        setPaymentsCount(snapshot.recentTransactions.length);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
        }
      }
    };

    loadMetrics();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, onLogout]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setProfileMessage('');
  };

  const handlePreferenceChange = (event) => {
    const { name, value } = event.target;
    setPreferenceForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setPreferenceMessage('');
  };

  const handleAlertToggle = (name) => {
    setAlertForm((currentForm) => ({
      ...currentForm,
      [name]: !currentForm[name],
    }));
    setAlertMessage('');
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    try {
      const updatedUser = await onUpdateProfile({
        fullName: profileForm.fullName,
        email: profileForm.email,
      });

      const nextSettings = settingsStore.updateSettings(
        updatedUser.id,
        {
          workspaceName: profileForm.workspaceName.trim() || `${updatedUser.fullName.split(' ')[0]} Space`,
        },
        updatedUser.fullName
      );

      setProfileForm(createProfileForm(updatedUser, nextSettings));
      setProfileMessage('Profile saved.');
    } catch (error) {
      setProfileMessage(error.message);
    }
  };

  const handlePreferenceSubmit = (event) => {
    event.preventDefault();

    const nextSettings = settingsStore.updateSettings(currentUser.id, preferenceForm, currentUser.fullName);
    setPreferenceForm(createPreferenceForm(nextSettings));
    setPreferenceMessage('Preferences saved.');
  };

  const handleAlertSubmit = (event) => {
    event.preventDefault();

    const nextSettings = settingsStore.updateSettings(currentUser.id, alertForm, currentUser.fullName);
    setAlertForm(createAlertForm(nextSettings));
    setAlertMessage('Alerts saved.');
  };

  const rail = (
    <>
      <article className="ref-panel settings-rail-card">
        <div className="settings-rail-head">
          <span className="ref-section-chip settings-chip">Connected</span>
          <h3>Workspace status</h3>
          <p>Your profile now syncs with the backend API.</p>
        </div>

        <div className="settings-metric-list">
          <div className="settings-metric">
            <span>Cards</span>
            <strong>{String(cardsCount).padStart(2, '0')}</strong>
          </div>
          <div className="settings-metric">
            <span>Payments</span>
            <strong>{String(paymentsCount).padStart(2, '0')}</strong>
          </div>
          <div className="settings-metric">
            <span>Mode</span>
            <strong>API</strong>
          </div>
        </div>
      </article>

      <article className="ref-panel settings-rail-card">
        <div className="settings-rail-head">
          <h3>Privacy</h3>
          <p>Preferences stay local, profile data is synced.</p>
        </div>

        <div className="settings-tag-list">
          <span className="settings-tag">Private</span>
          <span className="settings-tag">Editable</span>
          <span className="settings-tag">Synced</span>
        </div>
      </article>
    </>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Settings"
      pageSubtitle="Profile sync and workspace preferences."
      rail={rail}
    >
      <article className="ref-panel settings-hero-card">
        <span className="ref-section-chip settings-chip">Settings</span>
        <h2>Keep Ledgr yours.</h2>
        <p>Update your profile, workspace, and app preferences.</p>
      </article>

      <div className="settings-grid">
        <article className="ref-panel settings-card">
          <div className="settings-card-head">
            <h3>Profile</h3>
            <p>Name, email, and workspace title.</p>
          </div>

          <form className="settings-form" onSubmit={handleProfileSubmit}>
            {profileMessage ? <p className="settings-message">{profileMessage}</p> : null}

            <div className="settings-field-grid">
              <label className="settings-field">
                <span>Full name</span>
                <input name="fullName" type="text" value={profileForm.fullName} onChange={handleProfileChange} />
              </label>

              <label className="settings-field">
                <span>Email</span>
                <input name="email" type="email" value={profileForm.email} onChange={handleProfileChange} />
              </label>

              <label className="settings-field settings-field-wide">
                <span>Workspace name</span>
                <input name="workspaceName" type="text" value={profileForm.workspaceName} onChange={handleProfileChange} />
              </label>
            </div>

            <button className="settings-save-button" type="submit">
              Save profile
            </button>
          </form>
        </article>

        <article className="ref-panel settings-card">
          <div className="settings-card-head">
            <h3>Preferences</h3>
            <p>Set your default local view.</p>
          </div>

          <form className="settings-form" onSubmit={handlePreferenceSubmit}>
            {preferenceMessage ? <p className="settings-message">{preferenceMessage}</p> : null}

            <div className="settings-field-grid">
              <label className="settings-field">
                <span>Currency</span>
                <select name="currency" value={preferenceForm.currency} onChange={handlePreferenceChange}>
                  {currencyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-field">
                <span>Week start</span>
                <select name="weekStart" value={preferenceForm.weekStart} onChange={handlePreferenceChange}>
                  {weekStartOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-field settings-field-wide">
                <span>Amount view</span>
                <select name="amountView" value={preferenceForm.amountView} onChange={handlePreferenceChange}>
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

        <article className="ref-panel settings-card settings-card-wide">
          <div className="settings-card-head">
            <h3>Alerts</h3>
            <p>Choose what should stay on.</p>
          </div>

          <form className="settings-form" onSubmit={handleAlertSubmit}>
            {alertMessage ? <p className="settings-message">{alertMessage}</p> : null}

            <div className="settings-toggle-list">
              <SettingsToggle
                checked={alertForm.paymentReminders}
                label="Payment reminders"
                note="Keep local due-date reminders visible."
                onChange={() => handleAlertToggle('paymentReminders')}
              />
              <SettingsToggle
                checked={alertForm.weeklySummary}
                label="Weekly summary"
                note="Show a simple weekly recap later."
                onChange={() => handleAlertToggle('weeklySummary')}
              />
              <SettingsToggle
                checked={alertForm.loginAlerts}
                label="Login alerts"
                note="Keep sign-in alerts enabled."
                onChange={() => handleAlertToggle('loginAlerts')}
              />
            </div>

            <button className="settings-save-button" type="submit">
              Save alerts
            </button>
          </form>
        </article>
      </div>
    </FinanceLayout>
  );
}

export default SettingsPage;
