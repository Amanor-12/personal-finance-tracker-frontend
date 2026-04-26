const SETTINGS_STORAGE_KEY = 'ledgr-user-settings';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readStoredSettings = () => {
  if (!canUseStorage()) {
    return {};
  }

  const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!rawValue) {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({}));
    return {};
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({}));
    return {};
  }
};

const writeStoredSettings = (value) => {
  if (canUseStorage()) {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
  }

  return value;
};

const createDefaultSettings = (fullName = '') => {
  const firstName = fullName.split(' ').filter(Boolean)[0] || 'Rivo';

  return {
    workspaceName: `${firstName} Space`,
    currency: 'USD',
    weekStart: 'Monday',
    amountView: 'Compact',
    paymentReminders: true,
    weeklySummary: false,
    loginAlerts: true,
    onboardingCompleted: false,
  };
};

export const settingsStore = {
  getSettingsForUser(userId, fullName = '') {
    if (!userId) {
      return createDefaultSettings(fullName);
    }

    const settings = readStoredSettings();
    return {
      ...createDefaultSettings(fullName),
      ...(settings[userId] || {}),
    };
  },
  updateSettings(userId, updates, fullName = '') {
    if (!userId) {
      return createDefaultSettings(fullName);
    }

    const settings = readStoredSettings();
    const nextSettings = {
      ...createDefaultSettings(fullName),
      ...(settings[userId] || {}),
      ...updates,
    };

    writeStoredSettings({
      ...settings,
      [userId]: nextSettings,
    });

    return nextSettings;
  },
};
