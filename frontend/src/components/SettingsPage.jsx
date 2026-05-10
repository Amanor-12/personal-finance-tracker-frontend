import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServiceCapabilities } from '../context/useServiceCapabilities';
import { useBillingAccess } from '../context/useBillingAccess';
import FinanceLayout from './FinanceLayout';
import { accountStore } from '../utils/accountStore';
import { authStore } from '../utils/authStore';
import { financeStore } from '../utils/financeStore';
import { settingsStore } from '../utils/settingsStore';
import { getTierLabel, isPlusTier, isProTier } from '../utils/tierAccess';
import { useManagedForm } from '../utils/useManagedForm';

const currencyOptions = ['USD', 'CAD', 'GBP', 'EUR'];
const weekStartOptions = ['Monday', 'Sunday'];
const amountViewOptions = ['Compact', 'Detailed'];

const baseSettingsSections = [
  { id: 'profile', label: 'Profile', note: 'Name, email, workspace' },
  { id: 'preferences', label: 'Preferences', note: 'Currency, calendar, display' },
  { id: 'notifications', label: 'Notifications', note: 'Money reminders' },
  { id: 'security', label: 'Security', note: 'Password and sessions' },
  { id: 'billing', label: 'Billing', note: 'Plan and invoices' },
  { id: 'data', label: 'Data', note: 'Export and deletion' },
];

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const validateProfileForm = (values) => {
  const errors = {};
  const fullName = String(values.fullName || '').trim();
  const email = String(values.email || '').trim();
  const workspaceName = String(values.workspaceName || '').trim();

  if (fullName.length < 2) {
    errors.fullName = 'Name must be at least 2 characters.';
  } else if (fullName.length > 120) {
    errors.fullName = 'Keep name under 120 characters.';
  }

  if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (workspaceName.length < 2) {
    errors.workspaceName = 'Workspace name must be at least 2 characters.';
  } else if (workspaceName.length > 80) {
    errors.workspaceName = 'Keep workspace under 80 characters.';
  }

  return errors;
};

const validatePreferencesForm = (values) => {
  const errors = {};

  if (!currencyOptions.includes(values.currency)) {
    errors.currency = 'Choose a supported currency.';
  }

  if (!weekStartOptions.includes(values.weekStart)) {
    errors.weekStart = 'Choose a supported week start.';
  }

  if (!amountViewOptions.includes(values.amountView)) {
    errors.amountView = 'Choose a supported amount view.';
  }

  return errors;
};

const validateNotificationsForm = () => ({});

const validatePasswordForm = (values) => {
  const errors = {};
  const currentPassword = String(values.currentPassword || '');
  const newPassword = String(values.newPassword || '');
  const confirmPassword = String(values.confirmPassword || '');

  if (!currentPassword) {
    errors.currentPassword = 'Current password is required.';
  }

  if (newPassword.length < 8) {
    errors.newPassword = 'Use at least 8 characters.';
  } else if (newPassword.length > 72) {
    errors.newPassword = 'Keep password under 72 characters.';
  }

  if (confirmPassword.length < 8) {
    errors.confirmPassword = 'Confirm the new password.';
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};

const validateDeleteAccountForm = (values) => {
  if (!String(values.currentPassword || '')) {
    return {
      currentPassword: 'Current password is required to delete the account.',
    };
  }

  return {};
};

const emptyMfaStatus = {
  enabled: false,
  enabledAt: null,
  recoveryCodesRemaining: 0,
  setupExpiresAt: null,
  setupInProgress: false,
};

function FieldError({ message }) {
  return message ? <span className="settings-field-error">{message}</span> : null;
}

function SettingsToggle({ checked, disabled = false, label, note, register }) {
  return (
    <label className={`settings-toggle${disabled ? ' is-disabled' : ''}`}>
      <span className="settings-toggle-copy">
        <strong>{label}</strong>
        <span>{note}</span>
      </span>
      <span className={`settings-toggle-pill${checked ? ' is-active' : ''}`}>
        <input type="checkbox" {...register} disabled={disabled} />
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

const formatSessionDate = (value) => {
  if (!value) {
    return 'Not available';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
};

const summarizeUserAgent = (value) => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return 'Unknown device';
  }

  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
};

function SettingsPage({ currentUser, onLogout, onUpdateProfile }) {
  const { tier } = useBillingAccess();
  const { isLoading: isCapabilitiesLoading, supports } = useServiceCapabilities();
  const storedSettings = settingsStore.getSettingsForUser(currentUser?.id, currentUser?.fullName);
  const storedAmountView = storedSettings.amountView;
  const storedCurrency = storedSettings.currency;
  const storedLoginAlerts = storedSettings.loginAlerts;
  const storedPaymentReminders = storedSettings.paymentReminders;
  const storedWeeklySummary = storedSettings.weeklySummary;
  const storedWeekStart = storedSettings.weekStart;
  const storedWorkspaceName = storedSettings.workspaceName;
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
  const [emailVerificationMessage, setEmailVerificationMessage] = useState('');
  const [emailVerificationPreviewUrl, setEmailVerificationPreviewUrl] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [mfaMessage, setMfaMessage] = useState('');
  const [mfaStatus, setMfaStatus] = useState(emptyMfaStatus);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaDisablePassword, setMfaDisablePassword] = useState('');
  const [mfaDisableCode, setMfaDisableCode] = useState('');
  const [mfaBackupPassword, setMfaBackupPassword] = useState('');
  const [mfaBackupCode, setMfaBackupCode] = useState('');
  const [mfaBackupCodes, setMfaBackupCodes] = useState([]);
  const [sessionMessage, setSessionMessage] = useState('');
  const [securityEvents, setSecurityEvents] = useState([]);
  const [securityEventsMessage, setSecurityEventsMessage] = useState('');
  const [deleteAccountMessage, setDeleteAccountMessage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSyncingSettings, setIsSyncingSettings] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMfa, setIsLoadingMfa] = useState(false);
  const [isRevokingOtherSessions, setIsRevokingOtherSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isStartingMfaSetup, setIsStartingMfaSetup] = useState(false);
  const [isConfirmingMfaSetup, setIsConfirmingMfaSetup] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [isRegeneratingMfaBackupCodes, setIsRegeneratingMfaBackupCodes] = useState(false);
  const [sessions, setSessions] = useState([]);

  const profileForm = useManagedForm({
    defaultValues: {
      email: currentUser?.email || '',
      fullName: currentUser?.fullName || '',
      workspaceName: storedWorkspaceName,
    },
    validate: validateProfileForm,
  });
  const preferencesForm = useManagedForm({
    defaultValues: {
      amountView: storedAmountView,
      currency: storedCurrency,
      weekStart: storedWeekStart,
    },
    validate: validatePreferencesForm,
  });
  const notificationForm = useManagedForm({
    defaultValues: {
      loginAlerts: storedLoginAlerts,
      paymentReminders: storedPaymentReminders,
      weeklySummary: storedWeeklySummary,
    },
    validate: validateNotificationsForm,
  });
  const passwordForm = useManagedForm({
    defaultValues: {
      confirmPassword: '',
      currentPassword: '',
      newPassword: '',
    },
    validate: validatePasswordForm,
  });
  const deleteAccountForm = useManagedForm({
    defaultValues: {
      currentPassword: '',
    },
    validate: validateDeleteAccountForm,
  });
  const notificationValues = notificationForm.values;
  const { reset: resetProfileForm } = profileForm;
  const { reset: resetPreferencesForm } = preferencesForm;
  const { reset: resetNotificationForm } = notificationForm;
  const supportsAccountProfile = supports('auth.profile');
  const supportsPreferences = supports('auth.preferences');
  const supportsPasswordUpdate = supports('auth.password');
  const supportsSecurityControls = supports('auth.security');
  const supportsEmailVerification = supports('auth.emailVerification');
  const supportsDeleteAccount = supports('auth.deleteAccount');
  const supportsBillingWorkspace = supports('billing');
  const supportsTransactionExport = supports('transactions.export');
  const supportsSavedViews = supports('transactions.savedViews');
  const settingsSections = baseSettingsSections.filter((section) => {
    if (section.id === 'preferences' || section.id === 'notifications') {
      return supportsPreferences || isCapabilitiesLoading;
    }

    if (section.id === 'security') {
      return supportsPasswordUpdate || supportsSecurityControls || isCapabilitiesLoading;
    }

    if (section.id === 'data') {
      return supportsDeleteAccount || supportsTransactionExport || isCapabilitiesLoading;
    }

    if (section.id === 'profile') {
      return supportsAccountProfile || isCapabilitiesLoading;
    }

    if (section.id === 'billing') {
      return supportsBillingWorkspace || isCapabilitiesLoading;
    }

    return true;
  });
  const settingsPostureCards = [
    {
      label: 'Identity',
      note: supportsEmailVerification
        ? currentUser?.isEmailVerified
          ? 'Recovery and login alerts can trust this address.'
          : 'Confirm the address so recovery and security notices stay dependable.'
        : 'Primary email is attached to the account for recovery and product notices.',
      tone: supportsEmailVerification && !currentUser?.isEmailVerified ? 'warning' : 'positive',
      value: supportsEmailVerification
        ? currentUser?.isEmailVerified
          ? 'Email verified'
          : 'Verification needed'
        : 'Primary email active',
    },
    {
      label: 'Security',
      note: supportsSecurityControls
        ? mfaStatus.enabled
          ? 'Multi-factor protection and session oversight are active for this workspace.'
          : 'Turn on an authenticator app to harden sign-in for this account.'
        : supportsPasswordUpdate
          ? 'Password rotation is available here, even without advanced session controls.'
          : 'Advanced security controls are managed outside this deployment.',
      tone: supportsSecurityControls && !mfaStatus.enabled ? 'warning' : 'info',
      value: supportsSecurityControls
        ? mfaStatus.enabled
          ? 'Multi-factor active'
          : 'Password-only sign-in'
        : supportsPasswordUpdate
          ? 'Password controls ready'
          : 'Managed elsewhere',
    },
    {
      label: 'Preferences',
      note: supportsPreferences
        ? `${storedSettings.amountView} amounts and ${storedSettings.weekStart.toLowerCase()} week settings are active in this workspace.`
        : 'Preference controls are not exposed by the current backend capability set.',
      tone: 'neutral',
      value: supportsPreferences
        ? `${storedSettings.currency} · ${storedSettings.weekStart} week`
        : 'Preferences unavailable',
    },
    {
      label: 'Data',
      note: supportsTransactionExport
        ? 'Export tools are available when you need a clean handoff or archive.'
        : supportsDeleteAccount
          ? 'Deletion controls are available here even though export is not enabled.'
          : 'This workspace currently keeps data controls narrow and in-product only.',
      tone: supportsTransactionExport ? 'positive' : 'info',
      value: supportsTransactionExport
        ? 'Export ready'
        : supportsDeleteAccount
          ? 'Deletion ready'
          : 'In-product only',
    },
  ];

  useEffect(() => {
    if (!settingsSections.some((section) => section.id === activeSection)) {
      setActiveSection(settingsSections[0]?.id || 'profile');
    }
  }, [activeSection, settingsSections]);

  useEffect(() => {
    resetProfileForm({
      email: currentUser?.email || '',
      fullName: currentUser?.fullName || '',
      workspaceName: storedWorkspaceName,
    });
    resetPreferencesForm({
      amountView: storedAmountView,
      currency: storedCurrency,
      weekStart: storedWeekStart,
    });
    resetNotificationForm({
      loginAlerts: storedLoginAlerts,
      paymentReminders: storedPaymentReminders,
      weeklySummary: storedWeeklySummary,
    });
  }, [
    currentUser?.email,
    currentUser?.fullName,
    resetNotificationForm,
    resetPreferencesForm,
    resetProfileForm,
    storedAmountView,
    storedCurrency,
    storedLoginAlerts,
    storedPaymentReminders,
    storedWeeklySummary,
    storedWeekStart,
    storedWorkspaceName,
  ]);

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

        resetProfileForm({
          email: currentUser?.email || '',
          fullName: currentUser?.fullName || '',
          workspaceName: nextSettings.workspaceName,
        });
        resetPreferencesForm({
          amountView: nextSettings.amountView,
          currency: nextSettings.currency,
          weekStart: nextSettings.weekStart,
        });
        resetNotificationForm({
          loginAlerts: nextSettings.loginAlerts,
          paymentReminders: nextSettings.paymentReminders,
          weeklySummary: nextSettings.weeklySummary,
        });
      } catch (error) {
        if (!isCancelled) {
          setPreferencesMessage(error.message || 'Preferences could not sync right now.');
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
  }, [
    currentUser?.email,
    currentUser?.fullName,
    currentUser?.id,
    resetNotificationForm,
    resetPreferencesForm,
    resetProfileForm,
  ]);

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

  useEffect(() => {
    if (
      activeSection !== 'security' ||
      !currentUser?.id ||
      !supportsSecurityControls
    ) {
      return undefined;
    }

    let isCancelled = false;

    const loadSessions = async () => {
      setIsLoadingSessions(true);
      setIsLoadingMfa(true);
      setSessionMessage('');
      setMfaMessage('');
      setSecurityEventsMessage('');

      try {
        const [nextSessions, nextSecurityEvents, nextMfaStatus] = await Promise.all([
          authStore.getSessions(),
          authStore.getSecurityEvents(),
          authStore.getMfaStatus(),
        ]);

        if (!isCancelled) {
          setSessions(nextSessions);
          setSecurityEvents(nextSecurityEvents);
          setMfaStatus(nextMfaStatus);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setSessions([]);
        setSecurityEvents([]);
        setMfaStatus(emptyMfaStatus);
        setSessionMessage(error.message || 'Security controls could not load.');
        setMfaMessage(error.message || 'Multi-factor controls could not load.');
        setSecurityEventsMessage(error.message || 'Security activity could not load.');
      } finally {
        if (!isCancelled) {
          setIsLoadingSessions(false);
          setIsLoadingMfa(false);
        }
      }
    };

    loadSessions();

    return () => {
      isCancelled = true;
    };
  }, [activeSection, currentUser?.id, onLogout, supportsSecurityControls]);

  const handleProfileSubmit = async (values) => {
    setIsSavingProfile(true);
    setProfileMessage('');
    setEmailVerificationMessage('');
    setEmailVerificationPreviewUrl('');

    try {
      const emailChanged = currentUser?.email?.toLowerCase() !== values.email.trim().toLowerCase();
      const result = await onUpdateProfile({
        email: values.email,
        fullName: values.fullName,
      });
      const updatedUser = result.user;

      const nextSettings = await settingsStore.saveRemoteSettings(
        updatedUser.id,
        { workspaceName: values.workspaceName.trim() },
        updatedUser.fullName
      );

      profileForm.reset({
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        workspaceName: nextSettings.workspaceName,
      });

      if (emailChanged) {
        setProfileMessage('Profile saved. The new email now needs verification.');
        setEmailVerificationMessage(
          result.emailVerification?.message || 'A verification link has been prepared for the updated email.'
        );
        setEmailVerificationPreviewUrl(result.emailVerification?.delivery?.verification_url || '');
      } else {
        setProfileMessage('Profile saved.');
      }
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setProfileMessage(error.message || 'Profile could not be saved.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSendVerification = async () => {
    setIsSendingVerification(true);
    setEmailVerificationMessage('');
    setEmailVerificationPreviewUrl('');

    try {
      const result = await authStore.requestEmailVerification();
      setEmailVerificationMessage(result.message || 'A verification link has been prepared.');
      setEmailVerificationPreviewUrl(result?.delivery?.verification_url || '');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setEmailVerificationMessage(error.message || 'Verification email could not be sent.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handlePreferencesSubmit = async (values) => {
    setIsSavingPreferences(true);
    setPreferencesMessage('');

    try {
      const nextSettings = await settingsStore.saveRemoteSettings(currentUser.id, values, currentUser.fullName);
      preferencesForm.reset({
        amountView: nextSettings.amountView,
        currency: nextSettings.currency,
        weekStart: nextSettings.weekStart,
      });
      setPreferencesMessage('Preferences saved.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setPreferencesMessage(error.message || 'Preferences could not be saved.');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleNotificationsSubmit = async (values) => {
    setIsSavingNotifications(true);
    setNotificationMessage('');

    try {
      const nextSettings = await settingsStore.saveRemoteSettings(currentUser.id, values, currentUser.fullName);
      notificationForm.reset({
        loginAlerts: nextSettings.loginAlerts,
        paymentReminders: nextSettings.paymentReminders,
        weeklySummary: nextSettings.weeklySummary,
      });
      setNotificationMessage('Notifications saved.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setNotificationMessage(error.message || 'Notifications could not be saved.');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handlePasswordSubmit = async (values) => {
    setIsSavingPassword(true);
    setSecurityMessage('');

    try {
      await authStore.updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (supportsSecurityControls) {
        const nextSessions = await authStore.getSessions();
        setSessions(nextSessions);
      }
      passwordForm.reset({
        confirmPassword: '',
        currentPassword: '',
        newPassword: '',
      });
      setSecurityMessage(
        supportsSecurityControls
          ? 'Password updated. Other sessions were revoked and the current device was rotated onto a fresh session.'
          : 'Password updated.'
      );
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSecurityMessage(error.message || 'Password could not be updated.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleBeginMfaSetup = async () => {
    setIsStartingMfaSetup(true);
    setMfaMessage('');
    setMfaBackupCodes([]);

    try {
      const setup = await authStore.beginMfaSetup();
      setMfaSetup(setup);
      setMfaSetupCode('');
      setMfaMessage('Authenticator setup prepared. Enter the current code from your app to finish enrollment.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setMfaMessage(error.message || 'Multi-factor setup could not begin.');
    } finally {
      setIsStartingMfaSetup(false);
    }
  };

  const handleConfirmMfaSetup = async () => {
    if (!mfaSetupCode.trim()) {
      setMfaMessage('Enter the current authenticator code to finish setup.');
      return;
    }

    setIsConfirmingMfaSetup(true);
    setMfaMessage('');

    try {
      const result = await authStore.confirmMfaSetup({
        code: mfaSetupCode.trim(),
      });
      setMfaStatus(result.status);
      setMfaBackupCodes(result.backupCodes);
      setMfaSetup(null);
      setMfaSetupCode('');
      setMfaMessage('Multi-factor authentication enabled. Save the backup codes below before leaving this screen.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setMfaMessage(error.message || 'Multi-factor setup could not be confirmed.');
    } finally {
      setIsConfirmingMfaSetup(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!mfaDisablePassword.trim() || !mfaDisableCode.trim()) {
      setMfaMessage('Current password and an authenticator or backup code are required to disable MFA.');
      return;
    }

    setIsDisablingMfa(true);
    setMfaMessage('');

    try {
      const result = await authStore.disableMfa({
        code: mfaDisableCode.trim(),
        currentPassword: mfaDisablePassword,
      });
      setMfaStatus(result.status);
      setMfaSetup(null);
      setMfaSetupCode('');
      setMfaDisablePassword('');
      setMfaDisableCode('');
      setMfaBackupPassword('');
      setMfaBackupCode('');
      setMfaBackupCodes([]);
      setMfaMessage(result.message || 'Multi-factor authentication disabled.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setMfaMessage(error.message || 'Multi-factor authentication could not be disabled.');
    } finally {
      setIsDisablingMfa(false);
    }
  };

  const handleRegenerateMfaBackupCodes = async () => {
    if (!mfaBackupPassword.trim() || !mfaBackupCode.trim()) {
      setMfaMessage('Current password and an authenticator or backup code are required to rotate backup codes.');
      return;
    }

    setIsRegeneratingMfaBackupCodes(true);
    setMfaMessage('');

    try {
      const result = await authStore.regenerateMfaBackupCodes({
        code: mfaBackupCode.trim(),
        currentPassword: mfaBackupPassword,
      });
      setMfaStatus(result.status);
      setMfaBackupCodes(result.backupCodes);
      setMfaBackupPassword('');
      setMfaBackupCode('');
      setMfaMessage('Backup codes regenerated. Replace every previously saved recovery code with the new set below.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setMfaMessage(error.message || 'Backup codes could not be regenerated.');
    } finally {
      setIsRegeneratingMfaBackupCodes(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevokingSessionId(sessionId);
    setSessionMessage('');

    try {
      await authStore.revokeSession(sessionId);
      const nextSessions = await authStore.getSessions();
      setSessions(nextSessions);
      setSessionMessage('Session revoked.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSessionMessage(error.message || 'Session could not be revoked.');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setIsRevokingOtherSessions(true);
    setSessionMessage('');

    try {
      const response = await authStore.revokeOtherSessions();
      const nextSessions = await authStore.getSessions();
      setSessions(nextSessions);
      setSessionMessage(response.message || 'Other sessions revoked.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSessionMessage(error.message || 'Other sessions could not be revoked.');
    } finally {
      setIsRevokingOtherSessions(false);
    }
  };

  const handleDeleteAccount = async (values) => {
    setIsDeletingAccount(true);
    setDeleteAccountMessage('');

    try {
      await authStore.deleteAccount({
        currentPassword: values.currentPassword,
      });
      deleteAccountForm.reset({
        currentPassword: '',
      });
      await onLogout();
    } catch (error) {
      setDeleteAccountMessage(error.message || 'Account could not be deleted.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const totalObjects =
    workspaceStats.accounts +
    workspaceStats.transactions +
    workspaceStats.budgets +
    workspaceStats.goals +
    workspaceStats.recurring;
  const hasPaidExports = isPlusTier(tier);
  const hasProControls = isProTier(tier);
  const currentSession = sessions.find((session) => session.isCurrent) || null;
  const otherSessions = sessions.filter((session) => !session.isCurrent);

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
        <strong>{getTierLabel(tier)} controls</strong>
        <p>
          {isProTier(tier)
            ? 'AI review, milestone guidance, and higher-control workflow tools should feel cohesive here.'
            : isPlusTier(tier)
              ? 'Exports, recurring workflows, reporting, and AI briefings should feel operationally stronger here.'
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
        <div className="settings-command-card settings-command-visual-card" aria-label="Account state">
          <span>Signed in as</span>
          <strong>{currentUser?.email}</strong>
          <p>{storedSettings.workspaceName}</p>
          <div className="settings-command-visual" aria-hidden="true">
            <span className="settings-visual-orbit" />
            <span className="settings-visual-shield">
              <i />
            </span>
            <span className="settings-visual-row settings-visual-row-one" />
            <span className="settings-visual-row settings-visual-row-two" />
            <span className="settings-visual-row settings-visual-row-three" />
          </div>
        </div>
      </section>

      <section className="settings-posture-grid" aria-label="Account posture">
        {settingsPostureCards.map((card) => (
          <article key={card.label} className={`settings-posture-card tone-${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
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
                body="Profile identity and workspace preferences stay attached to the account so they follow the workspace across devices."
              />
              <form className="settings-form" onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
                {isSyncingSettings ? <p className="settings-message">Syncing saved workspace settings...</p> : null}
                {profileMessage ? <p className="settings-message">{profileMessage}</p> : null}
                <div className="settings-field-grid">
                  <label className="settings-field">
                    <span>Full name</span>
                    <input type="text" {...profileForm.register('fullName')} disabled={isSavingProfile} />
                    <FieldError message={profileForm.errors.fullName} />
                  </label>
                  <label className="settings-field">
                    <span>Email</span>
                    <input type="email" {...profileForm.register('email')} disabled={isSavingProfile} />
                    <FieldError message={profileForm.errors.email} />
                  </label>
                  <label className="settings-field settings-field-wide">
                    <span>Workspace name</span>
                    <input type="text" {...profileForm.register('workspaceName')} disabled={isSavingProfile} />
                    <FieldError message={profileForm.errors.workspaceName} />
                  </label>
                </div>
                <button className="settings-save-button" type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save profile'}
                </button>
              </form>
              <div className="settings-session-block">
                <div className="settings-session-header">
                  <div>
                    <span>{supportsEmailVerification ? 'Email verification' : 'Account email'}</span>
                    <strong>
                      {supportsEmailVerification
                        ? currentUser?.isEmailVerified
                          ? 'Verified'
                          : 'Verification needed'
                        : 'Primary contact'}
                    </strong>
                  </div>
                  {supportsEmailVerification && !currentUser?.isEmailVerified ? (
                    <button
                      className="settings-save-button settings-session-revoke-all"
                      type="button"
                      onClick={handleSendVerification}
                      disabled={isSendingVerification}
                    >
                      {isSendingVerification ? 'Sending...' : 'Send verification email'}
                    </button>
                  ) : null}
                </div>

                <div
                  className={`settings-session-card${
                    supportsEmailVerification && currentUser?.isEmailVerified ? ' is-current' : ''
                  }`}
                >
                  <div className="settings-session-copy">
                    <span>Recovery email</span>
                    <strong>{currentUser?.email}</strong>
                    <p>
                      {supportsEmailVerification
                        ? currentUser?.isEmailVerified
                          ? `Verified on ${formatSessionDate(currentUser?.emailVerifiedAt)}.`
                          : 'This address still needs confirmation before recovery and login alerts can be fully trusted.'
                        : 'This address is currently being used for recovery and account notifications.'}
                    </p>
                  </div>
                  <div className="settings-session-badge">
                    {supportsEmailVerification
                      ? currentUser?.isEmailVerified
                        ? 'Verified'
                        : 'Pending'
                      : 'In use'}
                  </div>
                </div>

                {supportsEmailVerification && emailVerificationMessage ? (
                  <p className="settings-message">{emailVerificationMessage}</p>
                ) : null}
                {supportsEmailVerification && emailVerificationPreviewUrl ? (
                  <p className="settings-message">
                    Development delivery is enabled here. Open the verification link directly:
                    {' '}
                    <a className="settings-inline-link" href={emailVerificationPreviewUrl}>
                      Verify email
                    </a>
                  </p>
                ) : null}
              </div>
            </article>
          ) : null}

          {activeSection === 'preferences' ? (
            <article className="settings-editor-card">
              <SectionHeader
                eyebrow="Display"
                title="Money display defaults"
                body="Set the baseline language for amounts, weeks, and display density. These preferences stay with the workspace."
              />
              <form className="settings-form" onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)}>
                {isSyncingSettings ? <p className="settings-message">Loading latest workspace settings...</p> : null}
                {preferencesMessage ? <p className="settings-message">{preferencesMessage}</p> : null}
                <div className="settings-field-grid">
                  <label className="settings-field">
                    <span>Currency</span>
                    <select {...preferencesForm.register('currency')} disabled={isSavingPreferences || isSyncingSettings}>
                      {currencyOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <FieldError message={preferencesForm.errors.currency} />
                  </label>
                  <label className="settings-field">
                    <span>Week starts</span>
                    <select {...preferencesForm.register('weekStart')} disabled={isSavingPreferences || isSyncingSettings}>
                      {weekStartOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <FieldError message={preferencesForm.errors.weekStart} />
                  </label>
                  <label className="settings-field settings-field-wide">
                    <span>Amount view</span>
                    <select {...preferencesForm.register('amountView')} disabled={isSavingPreferences || isSyncingSettings}>
                      {amountViewOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <FieldError message={preferencesForm.errors.amountView} />
                  </label>
                </div>
                <button className="settings-save-button" type="submit" disabled={isSavingPreferences || isSyncingSettings}>
                  {isSavingPreferences ? 'Saving preferences...' : 'Save preferences'}
                </button>
              </form>
            </article>
          ) : null}

          {activeSection === 'notifications' ? (
            <article className="settings-editor-card">
              <SectionHeader
                eyebrow="Notifications"
                title="Choose what deserves attention"
                body="These switches stay attached to the workspace so notification intent remains consistent as delivery expands."
              />
              <form className="settings-form" onSubmit={notificationForm.handleSubmit(handleNotificationsSubmit)}>
                {isSyncingSettings ? <p className="settings-message">Loading latest notification settings...</p> : null}
                {notificationMessage ? <p className="settings-message">{notificationMessage}</p> : null}
                <div className="settings-toggle-list">
                  <SettingsToggle
                    checked={notificationValues.paymentReminders}
                    disabled={isSavingNotifications || isSyncingSettings}
                    label="Payment reminders"
                    note="Show reminders for recurring payments when reminder delivery is connected."
                    register={notificationForm.register('paymentReminders')}
                  />
                  <SettingsToggle
                    checked={notificationValues.weeklySummary}
                    disabled={isSavingNotifications || isSyncingSettings}
                    label="Weekly summary"
                    note="Prepare a weekly recap of actual activity."
                    register={notificationForm.register('weeklySummary')}
                  />
                  <SettingsToggle
                    checked={notificationValues.loginAlerts}
                    disabled={isSavingNotifications || isSyncingSettings}
                    label="Login alerts"
                    note="Keep account-access visibility enabled."
                    register={notificationForm.register('loginAlerts')}
                  />
                </div>
                <button className="settings-save-button" type="submit" disabled={isSavingNotifications || isSyncingSettings}>
                  {isSavingNotifications ? 'Saving notifications...' : 'Save notifications'}
                </button>
              </form>
            </article>
          ) : null}

          {activeSection === 'security' ? (
            <article className="settings-editor-card">
              <SectionHeader
                eyebrow="Security"
                title="Password and session controls"
                body={
                  supportsSecurityControls
                    ? 'Password changes, session visibility, and revoke actions let the account actively control where it stays signed in.'
                    : 'This environment supports profile and password updates, but advanced session and MFA controls stay hidden until the full security layer is enabled.'
                }
              />
              {supportsPasswordUpdate ? (
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
                      <FieldError message={passwordForm.errors.currentPassword} />
                    </label>
                    <label className="settings-field">
                      <span>New password</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        {...passwordForm.register('newPassword')}
                        disabled={isSavingPassword}
                      />
                      <FieldError message={passwordForm.errors.newPassword} />
                    </label>
                    <label className="settings-field">
                      <span>Confirm password</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        {...passwordForm.register('confirmPassword')}
                        disabled={isSavingPassword}
                      />
                      <FieldError message={passwordForm.errors.confirmPassword} />
                    </label>
                  </div>
                  <button className="settings-save-button" type="submit" disabled={isSavingPassword}>
                    {isSavingPassword ? 'Updating...' : 'Update password'}
                  </button>
                </form>
              ) : (
                <div className="settings-session-block">
                  <p className="settings-session-empty">
                    Password changes are not enabled in this environment yet.
                  </p>
                </div>
              )}

              {!supportsSecurityControls ? (
                <div className="settings-session-block">
                  <div className="settings-session-header">
                    <div>
                      <span>Advanced security controls</span>
                      <strong>Not enabled</strong>
                    </div>
                  </div>
                  <p className="settings-session-empty">
                    Multi-factor authentication, session revocation, and security activity remain hidden until the full security layer is enabled.
                  </p>
                </div>
              ) : (
                <>
              <div className="settings-session-block">
                <div className="settings-session-header">
                  <div>
                    <span>Multi-factor authentication</span>
                    <strong>{mfaStatus.enabled ? 'Enabled' : 'Disabled'}</strong>
                  </div>
                  {!mfaStatus.enabled ? (
                    <button
                      className="settings-save-button settings-session-revoke-all"
                      type="button"
                      onClick={handleBeginMfaSetup}
                      disabled={isStartingMfaSetup || !currentUser?.isEmailVerified}
                    >
                      {isStartingMfaSetup ? 'Preparing...' : 'Enable MFA'}
                    </button>
                  ) : null}
                </div>

                {isLoadingMfa ? <p className="settings-message">Loading multi-factor status...</p> : null}
                {mfaMessage ? <p className="settings-message">{mfaMessage}</p> : null}

                <div className="settings-session-list">
                  <article className={`settings-session-card${mfaStatus.enabled ? ' is-current' : ''}`}>
                    <div className="settings-session-copy">
                      <span>Enrollment state</span>
                      <strong>{mfaStatus.enabled ? 'Authenticator protected' : 'Single-factor only'}</strong>
                      <p>
                        {mfaStatus.enabled
                          ? `Enabled on ${formatSessionDate(mfaStatus.enabledAt)} with ${mfaStatus.recoveryCodesRemaining} backup code${mfaStatus.recoveryCodesRemaining === 1 ? '' : 's'} remaining.`
                          : currentUser?.isEmailVerified
                            ? 'Add an authenticator app and backup codes before using this workspace on real customer accounts.'
                            : 'Verify the account email before enabling multi-factor authentication.'}
                      </p>
                      {mfaStatus.setupInProgress && mfaStatus.setupExpiresAt ? (
                        <small>Pending setup expires {formatSessionDate(mfaStatus.setupExpiresAt)}</small>
                      ) : null}
                    </div>
                    <div className="settings-session-badge">
                      {mfaStatus.enabled ? 'Protected' : currentUser?.isEmailVerified ? 'Available' : 'Verify email first'}
                    </div>
                  </article>
                </div>

                {mfaSetup ? (
                  <div className="settings-form">
                    <div className="settings-field-grid">
                      <label className="settings-field settings-field-wide">
                        <span>Manual setup key</span>
                        <input type="text" value={mfaSetup.manualKey} readOnly />
                      </label>
                      <label className="settings-field settings-field-wide">
                        <span>OTP auth URL</span>
                        <textarea value={mfaSetup.otpauthUrl} readOnly rows={3} />
                      </label>
                      <label className="settings-field">
                        <span>Authenticator code</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="123456"
                          value={mfaSetupCode}
                          onChange={(event) => setMfaSetupCode(event.target.value)}
                          disabled={isConfirmingMfaSetup}
                        />
                      </label>
                    </div>
                    <div className="settings-inline-actions">
                      <button
                        className="settings-save-button"
                        type="button"
                        onClick={handleConfirmMfaSetup}
                        disabled={isConfirmingMfaSetup}
                      >
                        {isConfirmingMfaSetup ? 'Confirming...' : 'Confirm MFA setup'}
                      </button>
                      <button
                        className="settings-link-button settings-secondary-button"
                        type="button"
                        onClick={() => {
                          setMfaSetup(null);
                          setMfaSetupCode('');
                          setMfaMessage('');
                        }}
                        disabled={isConfirmingMfaSetup}
                      >
                        Cancel setup
                      </button>
                    </div>
                  </div>
                ) : null}

                {mfaBackupCodes.length ? (
                  <div className="settings-session-block">
                    <div className="settings-session-header">
                      <div>
                        <span>Backup codes</span>
                        <strong>{mfaBackupCodes.length} codes</strong>
                      </div>
                    </div>
                    <div className="settings-backup-code-grid">
                      {mfaBackupCodes.map((code) => (
                        <code className="settings-backup-code" key={code}>
                          {code}
                        </code>
                      ))}
                    </div>
                    <p className="settings-session-empty">
                      These codes are shown once. Replace any older saved recovery codes with this set.
                    </p>
                  </div>
                ) : null}

                {mfaStatus.enabled ? (
                  <div className="settings-field-grid">
                    <label className="settings-field">
                      <span>Current password</span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={mfaBackupPassword}
                        onChange={(event) => setMfaBackupPassword(event.target.value)}
                        disabled={isRegeneratingMfaBackupCodes}
                      />
                    </label>
                    <label className="settings-field">
                      <span>Authenticator or backup code</span>
                      <input
                        type="text"
                        autoComplete="one-time-code"
                        value={mfaBackupCode}
                        onChange={(event) => setMfaBackupCode(event.target.value)}
                        disabled={isRegeneratingMfaBackupCodes}
                      />
                    </label>
                    <div className="settings-action-panel">
                      <span>Rotate backup codes</span>
                      <p>Generate a fresh recovery set and invalidate every existing backup code.</p>
                      <button
                        className="settings-save-button"
                        type="button"
                        onClick={handleRegenerateMfaBackupCodes}
                        disabled={isRegeneratingMfaBackupCodes}
                      >
                        {isRegeneratingMfaBackupCodes ? 'Rotating...' : 'Regenerate backup codes'}
                      </button>
                    </div>
                    <label className="settings-field">
                      <span>Current password</span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={mfaDisablePassword}
                        onChange={(event) => setMfaDisablePassword(event.target.value)}
                        disabled={isDisablingMfa}
                      />
                    </label>
                    <label className="settings-field">
                      <span>Authenticator or backup code</span>
                      <input
                        type="text"
                        autoComplete="one-time-code"
                        value={mfaDisableCode}
                        onChange={(event) => setMfaDisableCode(event.target.value)}
                        disabled={isDisablingMfa}
                      />
                    </label>
                    <div className="settings-action-panel settings-action-panel-danger">
                      <span>Disable MFA</span>
                      <p>Only turn this off if the customer has already moved to a safer sign-in path.</p>
                      <button
                        className="settings-save-button settings-danger-button"
                        type="button"
                        onClick={handleDisableMfa}
                        disabled={isDisablingMfa}
                      >
                        {isDisablingMfa ? 'Disabling...' : 'Disable MFA'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="settings-session-block">
                <div className="settings-session-header">
                  <div>
                    <span>Active sessions</span>
                    <strong>{sessions.length || 0} visible</strong>
                  </div>
                  <button
                    className="settings-save-button settings-session-revoke-all"
                    type="button"
                    onClick={handleRevokeOtherSessions}
                    disabled={!otherSessions.length || isLoadingSessions || isRevokingOtherSessions}
                  >
                    {isRevokingOtherSessions ? 'Revoking...' : 'Revoke other sessions'}
                  </button>
                </div>

                {sessionMessage ? <p className="settings-message">{sessionMessage}</p> : null}
                {isLoadingSessions ? <p className="settings-message">Loading active sessions...</p> : null}

                <div className="settings-session-list">
                  {currentSession ? (
                    <article className="settings-session-card is-current">
                      <div className="settings-session-copy">
                        <span>Current device</span>
                        <strong>{summarizeUserAgent(currentSession.userAgent)}</strong>
                        <p>Signed in on {formatSessionDate(currentSession.createdAt)}</p>
                        <small>
                          Last seen {formatSessionDate(currentSession.lastUsedAt)} | Expires {formatSessionDate(currentSession.expiresAt)}
                        </small>
                        {currentSession.ipAddress ? <small>IP {currentSession.ipAddress}</small> : null}
                      </div>
                      <div className="settings-session-badge">Current</div>
                    </article>
                  ) : null}

                  {otherSessions.length ? (
                    otherSessions.map((session) => (
                      <article className="settings-session-card" key={session.id}>
                        <div className="settings-session-copy">
                          <span>Signed-in device</span>
                          <strong>{summarizeUserAgent(session.userAgent)}</strong>
                          <p>Signed in on {formatSessionDate(session.createdAt)}</p>
                          <small>
                            Last seen {formatSessionDate(session.lastUsedAt)} | Expires {formatSessionDate(session.expiresAt)}
                          </small>
                          {session.ipAddress ? <small>IP {session.ipAddress}</small> : null}
                        </div>
                        <button
                          className="settings-session-revoke-button"
                          type="button"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingSessionId === session.id || isRevokingOtherSessions}
                        >
                          {revokingSessionId === session.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      </article>
                    ))
                  ) : currentSession && !isLoadingSessions ? (
                    <p className="settings-session-empty">No other active sessions are attached to this account.</p>
                  ) : null}
                </div>
              </div>

              <div className="settings-session-block">
                <div className="settings-session-header">
                  <div>
                    <span>Security activity</span>
                    <strong>{securityEvents.length} recent event{securityEvents.length === 1 ? '' : 's'}</strong>
                  </div>
                </div>

                {securityEventsMessage ? <p className="settings-message">{securityEventsMessage}</p> : null}

                <div className="settings-session-list">
                  {securityEvents.length ? (
                    securityEvents.map((event) => (
                      <article className="settings-session-card" key={event.id}>
                        <div className="settings-session-copy">
                          <span>{formatSessionDate(event.createdAt)}</span>
                          <strong>{event.title}</strong>
                          <p>{event.description}</p>
                          {event.ipAddress ? <small>IP {event.ipAddress}</small> : null}
                          {event.userAgent ? <small>{summarizeUserAgent(event.userAgent)}</small> : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="settings-session-empty">Security activity will appear here as the account is used.</p>
                  )}
                </div>
              </div>
                </>
              )}
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
                  <strong>{getTierLabel(tier)}</strong>
                  <p>
                    {isProTier(tier)
                      ? 'The workspace should feel like a higher-control finance product with AI review and denser workflow tooling.'
                      : isPlusTier(tier)
                        ? 'The workspace should feel stronger for recurring control, exports, reporting, and AI briefings.'
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
                body="High-risk actions should stay explicit, confirmed, and backed by safe account controls instead of casual UI shortcuts."
              />
              <div className="settings-data-grid">
                <div>
                  <span>Workspace objects</span>
                  <strong>{totalObjects}</strong>
                  <p>Accounts, transactions, budgets, goals, and recurring payments.</p>
                </div>
                <div>
                  <span>Export</span>
                  <strong>
                    {supportsTransactionExport
                      ? hasPaidExports
                        ? 'Plus unlocked'
                        : 'Free locked'
                      : 'Not enabled'}
                  </strong>
                  <p>
                    {supportsTransactionExport
                      ? hasPaidExports
                        ? 'CSV export stays tied to the current account scope so downloaded data remains properly separated.'
                        : 'Exports unlock in Plus, where heavier cleanup and reporting workflows start saving real time.'
                      : 'Transaction export stays hidden until a full account-scoped export flow is enabled.'}
                  </p>
                </div>
                <div>
                  <span>Advanced controls</span>
                  <strong>{supportsSavedViews ? (hasProControls ? 'Pro posture' : 'Upgrade path') : 'Still offline'}</strong>
                  <p>
                    {supportsSavedViews
                      ? hasProControls
                        ? 'Pro keeps AI review, guidance, and forecast workflows inside the authenticated account layer.'
                        : 'Pro should keep adding real intelligence instead of surface-level badges.'
                      : 'Saved views, AI review, and reporting upgrades stay out of the live product until the full account layer supports them.'}
                  </p>
                </div>
                {supportsDeleteAccount ? (
                  <div className="settings-danger-zone">
                    <span>Delete account</span>
                    <strong>Confirmation required</strong>
                    <p>This permanently removes the account and its workspace data after a current-password check.</p>
                  </div>
                ) : (
                  <div className="settings-danger-zone">
                    <span>Delete account</span>
                    <strong>Unavailable</strong>
                    <p>Account deletion stays hidden until the account can be removed safely with proper review and auditing.</p>
                  </div>
                )}
              </div>

              <div className="settings-inline-actions settings-data-actions">
                {supportsTransactionExport ? (
                  hasPaidExports ? (
                    <Link className="settings-save-button settings-link-button" to="/transactions">
                      Open CSV export tools
                    </Link>
                  ) : (
                    <Link className="settings-save-button settings-link-button" to="/pricing">
                      Upgrade for CSV export
                    </Link>
                  )
                ) : (
                  <span className="settings-disabled-action">
                    Export actions are unavailable in this deployment.
                  </span>
                )}
              </div>

              {supportsDeleteAccount ? (
                <form className="settings-form settings-delete-form" onSubmit={deleteAccountForm.handleSubmit(handleDeleteAccount)}>
                  {deleteAccountMessage ? <p className="settings-message">{deleteAccountMessage}</p> : null}
                  <label className="settings-field settings-field-wide">
                    <span>Current password</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      {...deleteAccountForm.register('currentPassword')}
                      disabled={isDeletingAccount}
                    />
                    <FieldError message={deleteAccountForm.errors.currentPassword} />
                  </label>
                  <button className="settings-danger-button" type="submit" disabled={isDeletingAccount}>
                    {isDeletingAccount ? 'Deleting...' : 'Delete account permanently'}
                  </button>
                </form>
              ) : null}
            </article>
          ) : null}
        </div>
      </section>
    </FinanceLayout>
  );
}

export default SettingsPage;
