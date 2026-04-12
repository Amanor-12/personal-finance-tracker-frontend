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
    shield: (
      <>
        <path
          d="M10 2.8 15 4.7v4.5c0 3.3-2.1 5.9-5 7-2.9-1.1-5-3.7-5-7V4.7l5-1.9Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path
          d="m7.4 9.5 1.6 1.6 3.6-3.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </>
    ),
    spark: (
      <>
        <path
          d="m10 2.8 1.4 3.8L15 8l-3.6 1.4L10 13.2 8.6 9.4 5 8l3.6-1.4L10 2.8Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="authx-icon-svg" viewBox="0 0 20 20">
      {icons[type]}
    </svg>
  );
}

function LoginPage({ mode = 'login', onLogin, onSignUp }) {
  const navigate = useNavigate();
  const isLogin = mode === 'login';
  const rememberedEmail =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || ''
      : '';
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
    <main className="authx-page">
      <section className="authx-shell">
        <section className="authx-visual">
          <div className="authx-glow authx-glow-one" aria-hidden="true" />
          <div className="authx-glow authx-glow-two" aria-hidden="true" />
          <div className="authx-grid" aria-hidden="true" />

          <div className="authx-visual-head">
            <BrandLogo
              className="authx-brand"
              title="Ledgr"
              subtitle="Finance with clarity"
              tone="light"
            />
            <span className="authx-visual-pill">
              {isLogin ? 'Private access' : 'New workspace'}
            </span>
          </div>

          <div className="authx-visual-copy">
            <span className="authx-kicker">Private finance workspace</span>
            <h1>
              {isLogin
                ? 'Sign in to the workspace built for calm financial control.'
                : 'Create a Ledgr account with a premium first impression.'}
            </h1>
            <p>
              Designed for modern finance teams and private operators who want clarity, trust, and
              clean control from the first screen.
            </p>
          </div>

          <div className="authx-app-preview">
            <div className="authx-preview-topbar">
              <div className="authx-preview-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="authx-preview-search">Search Ledgr</div>
            </div>

            <div className="authx-preview-body">
              <div className="authx-preview-main">
                <div className="authx-preview-hero">
                  <span className="authx-preview-hero-kicker">Capital overview</span>
                  <strong>One place for cards, balances, and your next financial move.</strong>
                  <div className="authx-preview-hero-bars" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className="authx-preview-chart" aria-hidden="true">
                  <span className="authx-preview-line authx-preview-line-one" />
                  <span className="authx-preview-line authx-preview-line-two" />
                </div>

                <div className="authx-preview-stats" aria-hidden="true">
                  <div className="authx-preview-stat">
                    <span>Cash flow</span>
                    <strong>Monitored</strong>
                  </div>
                  <div className="authx-preview-stat">
                    <span>Wallets</span>
                    <strong>Private</strong>
                  </div>
                  <div className="authx-preview-stat">
                    <span>Workspace</span>
                    <strong>Secure</strong>
                  </div>
                </div>
              </div>

              <aside className="authx-preview-rail">
                <div className="authx-preview-card">
                  <div className="authx-preview-card-top">
                    <div className="authx-preview-card-dots" aria-hidden="true">
                      <span />
                      <span />
                    </div>
                    <small>Primary card</small>
                  </div>
                  <div className="authx-preview-chip" aria-hidden="true" />
                  <strong>{isLogin ? 'Protected access' : 'Account setup'}</strong>
                  <span>{isLogin ? 'Private and ready' : 'Secure and ready'}</span>
                </div>
              </aside>
            </div>
          </div>

          <div className="authx-visual-footer">
            <div className="authx-feature-pill">
              <AuthIcon type="shield" />
              <span>Private by default</span>
            </div>
            <div className="authx-feature-pill">
              <AuthIcon type="spark" />
              <span>Premium fintech design</span>
            </div>
          </div>
        </section>

        <section className="authx-panel">
          <div className="authx-card">
            <div className="authx-card-top">
              <nav className="authx-switch" aria-label="Authentication mode">
                <Link className={`authx-switch-link${isLogin ? ' active' : ''}`} to="/login">
                  Log in
                </Link>
                <Link className={`authx-switch-link${isLogin ? '' : ' active'}`} to="/signup">
                  Sign up
                </Link>
              </nav>

              <span className="authx-status">Workspace access</span>
            </div>

            <div className="authx-card-copy">
              <span className="authx-card-kicker">{isLogin ? 'Welcome back' : 'Create account'}</span>
              <h2>{isLogin ? 'Sign in to Ledgr' : 'Create your Ledgr account'}</h2>
              <p>
                {isLogin
                  ? 'Use the credentials linked to your private finance workspace.'
                  : 'Set up one secure account and start with a clean private workspace.'}
              </p>
            </div>

            {message ? <p className="authx-error">{message}</p> : null}

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
                    placeholder="Enter your email"
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
                    placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <button
                    className="authx-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
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
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                  </span>
                </label>
              ) : null}

              <div className="authx-form-meta">
                <label className="authx-remember" htmlFor="rememberEmail">
                  <input
                    id="rememberEmail"
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(event) => setRememberEmail(event.target.checked)}
                  />
                  <span>Remember me on this device</span>
                </label>

                {isLogin ? (
                  <button
                    className="authx-text-link"
                    type="button"
                    onClick={() =>
                      setMessage(
                        'Password recovery will be available soon. Use your current credentials for now.'
                      )
                    }
                  >
                    Forgot password?
                  </button>
                ) : (
                  <span className="authx-note">Use at least 8 characters.</span>
                )}
              </div>

              <button className="authx-primary" type="submit">
                {isLogin ? 'Log in' : 'Create account'}
              </button>
            </form>

            <div className="authx-card-foot">
              <p className="authx-switch-copy">
                {isLogin ? "Don't have an account yet? " : 'Already have an account? '}
                <Link className="authx-inline-link" to={isLogin ? '/signup' : '/login'}>
                  {isLogin ? 'Sign up' : 'Log in'}
                </Link>
              </p>

              <div className="authx-mini-notes">
                <span className="authx-mini-note">
                  <AuthIcon type="shield" />
                  Secure session
                </span>
                <span className="authx-mini-note">
                  <AuthIcon type="spark" />
                  Premium experience
                </span>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
