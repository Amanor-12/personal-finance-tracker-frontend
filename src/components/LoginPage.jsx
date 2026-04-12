import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import './LoginPage.css';

const REMEMBERED_EMAIL_KEY = 'ledgr-remembered-email';

const createInitialForm = (rememberedEmail = '') => ({
  fullName: '',
  email: rememberedEmail,
  password: '',
  confirmPassword: '',
});

function AuthIcon({ type }) {
  const icons = {
    user: (
      <>
        <circle cx="10" cy="7" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.8 15c.6-2.4 2.5-3.8 5.2-3.8s4.6 1.4 5.2 3.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </>
    ),
    mail: (
      <>
        <rect x="3.6" y="5" width="12.8" height="10" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m4.9 6.6 5.1 4 5.1-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </>
    ),
    lock: (
      <>
        <rect x="4.6" y="8.2" width="10.8" height="7.6" rx="2.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.8 8.2V6.6A3.2 3.2 0 0 1 10 3.4a3.2 3.2 0 0 1 3.2 3.2v1.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="auth-input-icon-svg" viewBox="0 0 20 20">
      {icons[type]}
    </svg>
  );
}

function LoginPage({ mode = 'login', onLogin, onSignUp }) {
  const navigate = useNavigate();
  const isLogin = mode === 'login';
  const rememberedEmail =
    typeof window !== 'undefined' ? window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || '' : '';
  const [formData, setFormData] = useState(createInitialForm(rememberedEmail));
  const [rememberEmail, setRememberEmail] = useState(Boolean(rememberedEmail));
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setMessage('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isLogin && !formData.fullName.trim()) {
      setMessage('Full name is required.');
      return;
    }

    if (!formData.email.includes('@')) {
      setMessage('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    try {
      if (rememberEmail) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      if (isLogin) {
        onLogin({
          email: formData.email.trim(),
          password: formData.password,
        });
      } else {
        onSignUp({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
        });
      }

      navigate('/dashboard');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-stage">
        <section className="login-showcase">
          <div className="login-showcase-ambient login-showcase-ambient-one" aria-hidden="true" />
          <div className="login-showcase-ambient login-showcase-ambient-two" aria-hidden="true" />
          <div className="login-showcase-grid" aria-hidden="true" />

          <div className="login-showcase-head">
            <BrandLogo className="login-brand" title="Ledgr" subtitle="Private money workspace" tone="light" />
            <span className="login-showcase-badge">{isLogin ? 'Private access' : 'New account'}</span>
          </div>

          <div className="login-showcase-copy">
            <h1>
              {isLogin
                ? 'A cleaner way into your money workspace.'
                : 'Create a Ledgr account with a cleaner first step.'}
            </h1>
            <p>Real authentication now. Your backend can connect later.</p>
          </div>

          <div className="login-showcase-visual">
            <article className="login-showcase-card login-showcase-card-primary">
              <div className="login-showcase-card-head">
                <span className="login-showcase-card-label">Ledgr session</span>
                <span className="login-showcase-card-dot" aria-hidden="true" />
              </div>
              <strong>
                {isLogin
                  ? 'Sign in with the account you already created and move straight into Ledgr.'
                  : 'Create the account once and keep access tied to your own workspace.'}
              </strong>
              <div className="login-showcase-card-footer">
                <span>Private by default</span>
                <span>Real auth flow</span>
              </div>
            </article>

            <div className="login-showcase-row">
              <article className="login-showcase-card login-showcase-card-secondary">
                <div className="login-showcase-wallet-top">
                  <div className="login-showcase-wallet-dots" aria-hidden="true">
                    <span />
                    <span />
                  </div>
                  <small>Wallet access</small>
                </div>

                <div className="login-showcase-wallet-chip" aria-hidden="true" />

                <div className="login-showcase-wallet-copy">
                  <span>{isLogin ? 'Secure entry' : 'Account setup'}</span>
                  <strong>{isLogin ? 'Ledgr access' : 'Ledgr onboarding'}</strong>
                </div>

                <div className="login-showcase-wallet-foot">
                  <span>**** 4242</span>
                  <span>Protected</span>
                </div>
              </article>

              <div className="login-showcase-metrics">
                <article className="login-showcase-stat">
                  <span>Validation</span>
                  <strong>Real account rules</strong>
                </article>
                <article className="login-showcase-stat">
                  <span>Session</span>
                  <strong>Local and private</strong>
                </article>
                <article className="login-showcase-stat">
                  <span>Design</span>
                  <strong>Minimal with color</strong>
                </article>
              </div>
            </div>
          </div>
        </section>

        <form className="login-form-panel" onSubmit={handleSubmit}>
          <div className="login-form-wrap">
            <div className="login-form-header">
              <span className="login-form-kicker">{isLogin ? 'Welcome back' : 'Create account'}</span>
              <h2>{isLogin ? 'Sign in to Ledgr' : 'Create your Ledgr account'}</h2>
              <p>
                {isLogin
                  ? 'Use the credentials you created during sign up.'
                  : 'Create an account to open your private workspace.'}
              </p>
            </div>

            {message ? <p className="login-form-error">{message}</p> : null}

            <div className="login-fields">
              {!isLogin ? (
                <label className="login-field" htmlFor="fullName">
                  <span className="login-field-shell">
                    <span className="auth-input-icon">
                      <AuthIcon type="user" />
                    </span>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Full name"
                    />
                  </span>
                </label>
              ) : null}

              <label className="login-field" htmlFor="email">
                <span className="login-field-shell">
                  <span className="auth-input-icon">
                    <AuthIcon type="mail" />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    autoComplete="email"
                  />
                </span>
              </label>

              <label className="login-field" htmlFor="password">
                <span className="login-field-shell">
                  <span className="auth-input-icon">
                    <AuthIcon type="lock" />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <button className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>

              {!isLogin ? (
                <label className="login-field" htmlFor="confirmPassword">
                  <span className="login-field-shell">
                    <span className="auth-input-icon">
                      <AuthIcon type="lock" />
                    </span>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                  </span>
                </label>
              ) : null}
            </div>

            <div className="login-meta-row">
              <label className="remember-row" htmlFor="rememberEmail">
                <input
                  id="rememberEmail"
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(event) => setRememberEmail(event.target.checked)}
                />
                Remember me
              </label>

              {isLogin ? (
                <button
                  className="login-forgot-link"
                  type="button"
                  onClick={() => setMessage('Password reset will be connected when your backend is ready.')}
                >
                  Forgot password?
                </button>
              ) : (
                <Link className="login-alt-link" to="/login">
                  Already registered?
                </Link>
              )}
            </div>

            <button className="login-primary-button" type="submit">
              {isLogin ? 'Sign in' : 'Create account'}
            </button>

            <p className="login-switch-copy">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Link className="login-switch-link" to={isLogin ? '/signup' : '/login'}>
                {isLogin ? 'Sign up' : 'Log in'}
              </Link>
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
