import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import './LoginPage.css';

const REMEMBERED_EMAIL_KEY = 'ledgr-remembered-email';

const createInitialForm = (rememberedEmail = '') => ({
  fullName: '',
  email: rememberedEmail,
  password: '',
  confirmPassword: '',
});

const isLocalDevelopmentHost = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

function AuthIcon({ type }) {
  const icons = {
    user: (
      <>
        <circle cx="10" cy="7" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4.8 15c.6-2.4 2.5-3.8 5.2-3.8s4.6 1.4 5.2 3.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </>
    ),
    mail: (
      <>
        <rect
          x="3.6"
          y="5"
          width="12.8"
          height="10"
          rx="2.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m4.9 6.6 5.1 4 5.1-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </>
    ),
    lock: (
      <>
        <rect
          x="4.6"
          y="8.2"
          width="10.8"
          height="7.6"
          rx="2.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M6.8 8.2V6.6A3.2 3.2 0 0 1 10 3.4a3.2 3.2 0 0 1 3.2 3.2v1.6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </>
    ),
    eye: (
      <>
        <path
          d="M2.8 10c1.7-3 4.3-4.6 7.2-4.6s5.5 1.6 7.2 4.6c-1.7 3-4.3 4.6-7.2 4.6S4.5 13 2.8 10Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <circle cx="10" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="authx-icon-svg" viewBox="0 0 20 20">
      {icons[type]}
    </svg>
  );
}

function LoginPage({ mode = 'login', onCompleteMfaLogin, onLogin, onSignUp }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = mode === 'login';
  const redirectPath = location.state?.from?.pathname || '/dashboard';
  const initialMessage = location.state?.passwordResetComplete
    ? 'Password updated. Sign in with your new password.'
    : '';
  const initialMessageTone = location.state?.passwordResetComplete ? 'success' : 'error';
  const rememberedEmail =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || ''
      : '';
  const [formData, setFormData] = useState(createInitialForm(rememberedEmail));
  const [rememberEmail, setRememberEmail] = useState(Boolean(rememberedEmail));
  const [showPassword, setShowPassword] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [message, setMessage] = useState(initialMessage);
  const [messageTone, setMessageTone] = useState(initialMessageTone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMfaStep = isLogin && Boolean(mfaChallenge?.challengeToken);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setMessage('');
    setMessageTone('error');
  };

  const handleMfaChange = (event) => {
    setMfaCode(event.target.value);
    setMessage('');
    setMessageTone('error');
  };

  const handleResetMfa = () => {
    setMfaChallenge(null);
    setMfaCode('');
    setMessage('');
    setMessageTone('error');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isMfaStep) {
      if (!mfaCode.trim()) {
        setMessage('Enter the six-digit authenticator code or one of your backup codes.');
        setMessageTone('error');
        return;
      }

      try {
        setIsSubmitting(true);
        await onCompleteMfaLogin({
          challengeToken: mfaChallenge.challengeToken,
          code: mfaCode.trim(),
        });
        navigate(redirectPath, { replace: true });
      } catch (error) {
        setMessage(error.message || 'Rivo could not verify the multi-factor code.');
        setMessageTone('error');
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (!isLogin && !formData.fullName.trim()) {
      setMessage('Full name is required.');
      setMessageTone('error');
      return;
    }

    if (!formData.email.includes('@')) {
      setMessage('Please enter a valid email address.');
      setMessageTone('error');
      return;
    }

    if (formData.password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      setMessageTone('error');
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageTone('error');
      return;
    }

    try {
      setIsSubmitting(true);

      if (rememberEmail) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      if (isLogin) {
        const result = await onLogin({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (result?.requiresMfa) {
          setMfaChallenge({
            challengeExpiresAt: result.challengeExpiresAt,
            challengeToken: result.challengeToken,
          });
          setMfaCode('');
          setMessage(result.message || 'Multi-factor authentication required.');
          setMessageTone('success');
          return;
        }
      } else {
        await onSignUp({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
        });
      }

      navigate(
        isLogin ? redirectPath : '/onboarding',
        isLogin ? { replace: true } : { replace: true, state: { from: location.state?.from || null } }
      );
    } catch (error) {
      const normalizedMessage = String(error.message || '').trim().toLowerCase();
      const authMessage =
        error.status === 0 ||
        normalizedMessage === 'request failed' ||
        normalizedMessage === 'request failed.' ||
        normalizedMessage.includes('cannot reach the finance service')
          ? isLocalDevelopmentHost()
            ? 'Rivo cannot reach the finance service. Start the local finance service, then try again.'
            : "Rivo can't connect right now. Please try again in a moment."
          : error.message;

      setMessage(authMessage || 'Rivo could not complete that request. Please try again.');
      setMessageTone('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="authx-page">
      <section className="authx-shell">
        <section className="authx-auth-column">
          <div className="authx-brand-row">
            <BrandLogo className="authx-brand" title="Rivo" subtitle="Private finance workspace" tone="dark" />
          </div>

          <div className="authx-auth-card">
            <div className="authx-mode-toggle">
              <Link className={isLogin ? 'active' : ''} to="/login" state={location.state}>
                Log in
              </Link>
              <Link className={!isLogin ? 'active' : ''} to="/signup" state={location.state}>
                Sign up
              </Link>
            </div>

            <div className="authx-card-copy">
              <span className="authx-panel-kicker">
                {isMfaStep ? 'Multi-factor check' : isLogin ? 'Secure access' : 'Create access'}
              </span>
              <h1>{isMfaStep ? 'Confirm this sign-in.' : isLogin ? 'Welcome back.' : 'Start with Rivo.'}</h1>
              <p>
                {isMfaStep
                  ? 'Enter the current authenticator code or one of your backup codes to finish signing in.'
                  : isLogin
                  ? 'Sign in to your private finance workspace.'
                  : 'Create your account and open your finance workspace.'}
              </p>
            </div>

            <div className="authx-feature-row" aria-hidden="true">
              <span>Private workspace</span>
              <span>No seeded data</span>
              <span>Manual-first</span>
            </div>

            {message ? (
              <p
                aria-live={messageTone === 'success' ? 'polite' : 'assertive'}
                className={messageTone === 'success' ? 'authx-success' : 'authx-error'}
              >
                {message}
              </p>
            ) : null}

            <form className="authx-form" onSubmit={handleSubmit}>
              {!isLogin ? (
                <label className="authx-field" htmlFor="fullName">
                  <span className="authx-field-label">Full name</span>
                  <span className="authx-field-shell">
                    <span className="authx-field-icon">
                      <AuthIcon type="user" />
                    </span>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      autoComplete="name"
                    />
                  </span>
                </label>
              ) : null}

              {isMfaStep ? (
                <>
                  <label className="authx-field" htmlFor="mfaCode">
                    <span className="authx-field-label">Authenticator or backup code</span>
                    <span className="authx-field-shell">
                      <span className="authx-field-icon">
                        <AuthIcon type="lock" />
                      </span>
                      <input
                        id="mfaCode"
                        name="mfaCode"
                        type="text"
                        value={mfaCode}
                        onChange={handleMfaChange}
                        placeholder="123456 or ABCD-EFGH"
                        autoComplete="one-time-code"
                      />
                    </span>
                  </label>

                  <div className="authx-form-meta">
                    <span className="authx-meta-note">
                      Signing in as {formData.email.trim() || 'this account'}.
                    </span>
                    <button className="authx-text-link" type="button" onClick={handleResetMfa}>
                      Use a different account
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label className="authx-field" htmlFor="email">
                    <span className="authx-field-label">Email</span>
                    <span className="authx-field-shell">
                      <span className="authx-field-icon">
                        <AuthIcon type="mail" />
                      </span>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@example.com"
                        autoComplete="email"
                      />
                    </span>
                  </label>

                  <label className="authx-field" htmlFor="password">
                    <span className="authx-field-label">Password</span>
                    <span className="authx-field-shell">
                      <span className="authx-field-icon">
                        <AuthIcon type="lock" />
                      </span>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                      />
                      <button
                        className="authx-password-toggle"
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        <AuthIcon type="eye" />
                      </button>
                    </span>
                  </label>

                  {!isLogin ? (
                    <label className="authx-field" htmlFor="confirmPassword">
                      <span className="authx-field-label">Confirm password</span>
                      <span className="authx-field-shell">
                        <span className="authx-field-icon">
                          <AuthIcon type="lock" />
                        </span>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm your password"
                          autoComplete="new-password"
                        />
                      </span>
                    </label>
                  ) : null}

                  <div className="authx-form-meta">
                    <label className="authx-check" htmlFor="rememberEmail">
                      <input
                        id="rememberEmail"
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(event) => setRememberEmail(event.target.checked)}
                      />
                      <span className="authx-check-box">
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path
                            d="m5.2 10.2 3.1 3.1 6.4-6.7"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </span>
                      <span>Remember this email</span>
                    </label>

                    {isLogin ? (
                      <button
                        className="authx-text-link"
                        type="button"
                        onClick={() =>
                          navigate('/forgot-password', {
                            state: {
                              email: formData.email.trim(),
                              from: location.state?.from || null,
                            },
                          })
                        }
                      >
                        Forgot password?
                      </button>
                    ) : (
                      <span className="authx-meta-note">Use at least 8 characters.</span>
                    )}
                  </div>
                </>
              )}

              <button className="authx-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Please wait...'
                  : isMfaStep
                    ? 'Verify sign-in'
                    : isLogin
                      ? 'Access workspace'
                      : 'Create account'}
              </button>
            </form>

            {!isMfaStep ? (
              <p className="authx-switch-copy">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Link className="authx-inline-link" to={isLogin ? '/signup' : '/login'} state={location.state}>
                  {isLogin ? 'Sign up' : 'Log in'}
                </Link>
              </p>
            ) : null}
          </div>
        </section>

        <section className="authx-preview-column" aria-label="Rivo product summary">
          <div className="authx-product-stage">
            <div className="authx-product-nav">
              <span className="authx-kicker">Rivo workspace</span>
              <div className="authx-preview-pills">
                <span>Accounts</span>
                <span>Budgets</span>
                <span>Renewals</span>
              </div>
            </div>

            <section className="authx-product-hero">
              <div className="authx-product-copy">
                <span className="authx-scene-chip">Private finance workspace</span>
                <h2>Money feels clearer when everything has a place.</h2>
                <p>
                  Sign in to organize accounts, spending, budgets, subscriptions, and goals from one calm workspace.
                </p>

                <div className="authx-product-tags">
                  <span>Accounts</span>
                  <span>Transactions</span>
                  <span>Budgets</span>
                  <span>Goals</span>
                </div>
              </div>

              <div className="authx-product-card" aria-hidden="true">
                <span className="authx-product-card-chip" />
                <strong>Ready to organize</strong>
                <small>Your workspace, your records</small>
                <div className="authx-product-card-lines">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </section>

            <div className="authx-product-showcase-row" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
