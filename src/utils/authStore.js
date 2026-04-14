const STORAGE_KEYS = {
  users: 'finance-flow-users',
  session: 'finance-flow-session',
};

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readStoredValue = (key, fallback) => {
  if (!canUseStorage()) {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
};

const writeStoredValue = (key, value) => {
  if (canUseStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  return value;
};

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const { password: _password, ...safeUser } = user;
  const derivedName = safeUser.fullName || safeUser.name || safeUser.email?.split('@')[0] || 'Finance User';

  return {
    ...safeUser,
    fullName: derivedName,
    createdAt: safeUser.createdAt || new Date().toISOString(),
  };
};

const normalizeEmail = (email) => email.trim().toLowerCase();

export const authStore = {
  getUsers() {
    return readStoredValue(STORAGE_KEYS.users, []).map((user) => sanitizeUser(user));
  },
  getSession() {
    return readStoredValue(STORAGE_KEYS.session, null);
  },
  signup({ fullName, email, password }) {
    const users = readStoredValue(STORAGE_KEYS.users, []);
    const normalizedEmail = normalizeEmail(email);

    if (users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
      throw new Error('An account with this email already exists.');
    }

    const newUser = {
      id: `user-${Date.now()}`,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      createdAt: new Date().toISOString(),
    };

    writeStoredValue(STORAGE_KEYS.users, [newUser, ...users]);
    const safeUser = sanitizeUser(newUser);
    writeStoredValue(STORAGE_KEYS.session, safeUser);
    return safeUser;
  },
  login({ email, password }) {
    const users = readStoredValue(STORAGE_KEYS.users, []);
    const normalizedEmail = normalizeEmail(email);

    const existingUser = users.find((user) => normalizeEmail(user.email) === normalizedEmail);

    if (!existingUser || existingUser.password !== password) {
      throw new Error('Incorrect email or password.');
    }

    const safeUser = sanitizeUser(existingUser);
    writeStoredValue(STORAGE_KEYS.session, safeUser);
    return safeUser;
  },
  updateProfile(userId, { fullName, email }) {
    const users = readStoredValue(STORAGE_KEYS.users, []);
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = fullName.trim();
    const existingUser = users.find((user) => user.id === userId);

    if (!existingUser) {
      throw new Error('Account not found.');
    }

    if (!trimmedName) {
      throw new Error('Full name is required.');
    }

    if (!normalizedEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const emailInUse = users.some(
      (user) => user.id !== userId && normalizeEmail(user.email) === normalizedEmail
    );

    if (emailInUse) {
      throw new Error('An account with this email already exists.');
    }

    const nextUser = {
      ...existingUser,
      fullName: trimmedName,
      email: normalizedEmail,
    };

    writeStoredValue(
      STORAGE_KEYS.users,
      users.map((user) => (user.id === userId ? nextUser : user))
    );

    const safeUser = sanitizeUser(nextUser);
    writeStoredValue(STORAGE_KEYS.session, safeUser);
    return safeUser;
  },
  logout() {
    if (canUseStorage()) {
      window.localStorage.removeItem(STORAGE_KEYS.session);
    }
  },
};
