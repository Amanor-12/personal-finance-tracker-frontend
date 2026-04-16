const SESSION_STORAGE_KEY = 'ledgr-api-session';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readStoredSession = () => {
  if (!canUseStorage()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.fullName || user.name || '',
    email: user.email || '',
    createdAt: user.createdAt || user.created_at || null,
    updatedAt: user.updatedAt || user.updated_at || null,
  };
};

export const sessionStore = {
  clearSession() {
    if (canUseStorage()) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  },
  getSession() {
    const session = readStoredSession();

    if (!session?.token || !session?.user) {
      return null;
    }

    return {
      token: session.token,
      user: normalizeUser(session.user),
    };
  },
  getToken() {
    return this.getSession()?.token || '';
  },
  hasToken() {
    return Boolean(this.getToken());
  },
  setSession({ token, user }) {
    const nextSession = {
      token,
      user: normalizeUser(user),
    };

    if (canUseStorage()) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    }

    return nextSession.user;
  },
  updateUser(user) {
    const currentSession = this.getSession();

    if (!currentSession?.token) {
      return null;
    }

    return this.setSession({
      token: currentSession.token,
      user,
    });
  },
};
