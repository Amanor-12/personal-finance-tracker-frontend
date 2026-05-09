const SESSION_STORAGE_KEY = 'ledgr-session-user';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.sessionStorage);
const normalizeToken = (token) => (typeof token === 'string' ? token.trim() : '');

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.fullName || user.name || '',
    email: user.email || '',
    createdAt: user.createdAt || user.created_at || null,
    emailVerifiedAt: user.emailVerifiedAt || user.email_verified_at || null,
    isEmailVerified:
      typeof user.isEmailVerified === 'boolean'
        ? user.isEmailVerified
        : Boolean(user.emailVerifiedAt || user.email_verified_at),
    updatedAt: user.updatedAt || user.updated_at || null,
  };
};

const normalizeStoredSession = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const sourceUser = value.user && typeof value.user === 'object' ? value.user : value;
  const user = normalizeUser(sourceUser);

  if (!user?.id) {
    return null;
  }

  return {
    token: normalizeToken(value.token),
    user,
  };
};

const readStoredSession = () => {
  if (!canUseStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return normalizeStoredSession(JSON.parse(rawValue));
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

export const sessionStore = {
  clearSession() {
    if (canUseStorage()) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  },
  getSession() {
    return readStoredSession()?.user || null;
  },
  getToken() {
    return readStoredSession()?.token || '';
  },
  hasToken() {
    return Boolean(this.getToken());
  },
  setSession(user, token) {
    const nextUser = normalizeUser(user);

    if (!nextUser?.id) {
      throw new Error('Rivo received an incomplete account profile from the API.');
    }

    const nextSession = {
      token: token === undefined ? this.getToken() : normalizeToken(token),
      user: nextUser,
    };

    if (canUseStorage()) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    }

    return nextSession.user;
  },
  updateUser(user) {
    const currentSession = readStoredSession();
    const currentUser = currentSession?.user || null;

    if (!currentUser?.id) {
      return null;
    }

    return this.setSession({
      ...currentUser,
      ...user,
    }, currentSession?.token);
  },
};
