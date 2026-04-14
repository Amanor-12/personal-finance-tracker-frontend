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
    shield: (
      <path
        d="M10 2.8 4.8 4.6v4.6c0 3.1 2.1 5.7 5.2 7 3.1-1.3 5.2-3.9 5.2-7V4.6Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
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
        <section className="authx-auth-column">
          <div className="authx-brand-row">
            <BrandLogo className="authx-brand" title="Ledgr" subtitle="Private finance workspace" tone="dark" />
          </div>

          <div className="authx-auth-card">
            <div className="authx-mode-toggle">
              <Link className={isLogin ? 'active' : ''} to="/login">
                Log in
              </Link>
              <Link className={!isLogin ? 'active' : ''} to="/signup">
                Sign up
              </Link>
            </div>

            <div className="authx-card-copy">
              <span className="authx-panel-kicker">{isLogin ? 'Secure access' : 'Create access'}</span>
              <h1>{isLogin ? 'Access your Ledgr workspace' : 'Create your Ledgr account'}</h1>
              <p>
                {isLogin
                  ? 'Use your account details to continue into your private workspace.'
                  : 'Create a secure account first. You will use the same details to log in later.'}
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
                  <span>{isLogin ? 'Remember me' : 'Remember my email'}</span>
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
                  <span className="authx-meta-note">Use at least 8 characters.</span>
                )}
              </div>

              <button className="authx-primary" type="submit">
                {isLogin ? 'Access workspace' : 'Create account'}
              </button>
            </form>

            <p className="authx-switch-copy">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Link className="authx-inline-link" to={isLogin ? '/signup' : '/login'}>
                {isLogin ? 'Sign up' : 'Log in'}
              </Link>
            </p>
          </div>
        </section>

        <section className="authx-preview-column" aria-hidden="true">
          <div className="authx-preview-header">
            <span className="authx-kicker">Product preview</span>
            <div className="authx-preview-pills">
              <span>Private</span>
              <span>Secure</span>
              <span>Calm</span>
            </div>
          </div>

          <div className="authx-preview-surface">
            <div className="authx-surface-topbar">
              <div className="authx-surface-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="authx-surface-search" />
              <BrandLogo className="authx-surface-brand" compact markOnly subtitle="" title="" tone="dark" />
            </div>

            <div className="authx-art-grid">
              <div className="authx-art-main">
                <article className="authx-art-hero">
                  <span className="authx-surface-label">Ledgr preview</span>
                  <strong>Money, made calm.</strong>
                  <p>Cards. Budget. Goals.</p>

                  <div className="authx-art-pill-row">
                    <span>Cards</span>
                    <span>Budget</span>
                    <span>Goals</span>
                  </div>

                  <div className="authx-art-rings">
                    <span className="authx-art-ring authx-art-ring-one" />
                    <span className="authx-art-ring authx-art-ring-two" />
                    <span className="authx-art-glass" />
                  </div>
                </article>

                <div className="authx-art-lower">
                  <article className="authx-orbit-panel">
                    <span className="authx-orbit-tag authx-orbit-tag-top">Private</span>
                    <span className="authx-orbit-tag authx-orbit-tag-left">Budget</span>
                    <span className="authx-orbit-tag authx-orbit-tag-right">Goals</span>
                    <span className="authx-orbit-glow" />
                    <span className="authx-orbit-ring authx-orbit-ring-one" />
                    <span className="authx-orbit-ring authx-orbit-ring-two" />
                    <span className="authx-orbit-ring authx-orbit-ring-three" />

                    <div className="authx-orbit-core">
                      <BrandLogo className="authx-orbit-brand" compact markOnly subtitle="" title="" tone="dark" />
                    </div>
                  </article>

                  <article className="authx-signal-panel">
                    <div className="authx-signal-bars" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>

                    <div className="authx-signal-chip-row">
                      <span>Secure</span>
                      <span>Ready</span>
                    </div>
                  </article>
                </div>
              </div>

              <aside className="authx-art-rail">
                <article className="authx-wallet-stack-panel">
                  <div className="authx-wallet-layer authx-wallet-layer-back">
                    <span className="authx-wallet-layer-chip" aria-hidden="true" />
                    <strong>Backup</strong>
                    <small>**** 2458</small>
                  </div>

                  <div className="authx-wallet-layer authx-wallet-layer-front">
                    <div className="authx-wallet-layer-top">
                      <BrandLogo className="authx-wallet-mark" compact markOnly subtitle="" title="" tone="dark" />
                      <span className="authx-wallet-layer-dots" aria-hidden="true">
                        <span />
                        <span />
                      </span>
                    </div>

                    <span className="authx-wallet-layer-chip" aria-hidden="true" />
                    <strong>Primary card</strong>
                    <small>**** 5432</small>
                  </div>
                </article>

                <article className="authx-status-panel">
                  <div className="authx-status-pill-row">
                    <span>Private</span>
                    <span>Local</span>
                    <span>Ready</span>
                  </div>

                  <div className="authx-status-track" aria-hidden="true">
                    <span className="authx-status-track-fill authx-status-track-fill-blue" />
                    <span className="authx-status-track-fill authx-status-track-fill-teal" />
                    <span className="authx-status-track-fill authx-status-track-fill-gold" />
                  </div>

                  <div className="authx-status-list">
                    <div className="authx-status-row">
                      <span>Cards</span>
                      <strong>On</strong>
                    </div>
                    <div className="authx-status-row">
                      <span>Budget</span>
                      <strong>Set</strong>
                    </div>
                    <div className="authx-status-row">
                      <span>Alerts</span>
                      <strong>Ready</strong>
                    </div>
                  </div>
                </article>
              </aside>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
