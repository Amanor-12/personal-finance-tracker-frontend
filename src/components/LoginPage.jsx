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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setMessage('');
  };

  const handleSubmit = async (event) => {
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
      setIsSubmitting(true);

      if (rememberEmail) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      if (isLogin) {
        await onLogin({
          email: formData.email.trim(),
          password: formData.password,
        });
      } else {
        await onSignUp({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
        });
      }

      navigate(isLogin ? '/dashboard' : '/onboarding');
    } catch (error) {
      const authMessage =
        error.message === 'Request failed'
          ? 'Ledgr could not reach the API. Start the backend server, then try again.'
          : error.message;

      setMessage(authMessage || 'Ledgr could not complete that request. Please try again.');
    } finally {
      setIsSubmitting(false);
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
              <h1>{isLogin ? 'Welcome back.' : 'Start with Ledgr.'}</h1>
              <p>
                {isLogin
                  ? 'Sign in to your private finance workspace.'
                  : 'Create your account and open your finance workspace.'}
              </p>
            </div>

            <div className="authx-feature-row" aria-hidden="true">
              <span>Private</span>
              <span>Fast</span>
              <span>Clean</span>
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
                      setMessage('Password recovery is not wired yet. Use your current credentials for now.')
                    }
                  >
                    Forgot password?
                  </button>
                ) : (
                  <span className="authx-meta-note">Use at least 8 characters.</span>
                )}
              </div>

              <button className="authx-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : isLogin ? 'Access workspace' : 'Create account'}
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
              <span>Premium</span>
              <span>Quiet</span>
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

            <div className="authx-scene">
              <aside className="authx-scene-rail">
                <div className="authx-scene-rail-brand">
                  <BrandLogo className="authx-scene-brand" compact markOnly subtitle="" title="" tone="dark" />
                </div>

                <div className="authx-scene-rail-nav">
                  <span className="authx-scene-rail-pill is-active" />
                  <span className="authx-scene-rail-pill" />
                  <span className="authx-scene-rail-pill" />
                </div>

                <span className="authx-scene-rail-footer">Signature</span>
              </aside>

              <div className="authx-scene-main">
                <section className="authx-scene-hero">
                  <span className="authx-scene-chip">Ledgr signature</span>
                  <h2>Private finance, shaped with restraint.</h2>
                  <p>A softer premium workspace with calm structure and modern depth.</p>

                  <div className="authx-scene-hero-tags">
                    <span>Quiet</span>
                    <span>Secure</span>
                    <span>Modern</span>
                  </div>

                  <div className="authx-scene-hero-orbit authx-scene-hero-orbit-one" />
                  <div className="authx-scene-hero-orbit authx-scene-hero-orbit-two" />
                  <div className="authx-scene-hero-glass" />
                </section>

                <div className="authx-scene-grid">
                  <section className="authx-scene-showcase">
                    <div className="authx-scene-card-head">
                      <strong>Design language</strong>
                      <span>Preview</span>
                    </div>

                    <div className="authx-scene-showcase-body">
                      <div className="authx-scene-showcase-glow" />
                      <div className="authx-scene-showcase-orbit authx-scene-showcase-orbit-one" />
                      <div className="authx-scene-showcase-orbit authx-scene-showcase-orbit-two" />
                      <div className="authx-scene-showcase-orbit authx-scene-showcase-orbit-three" />

                      <span className="authx-scene-showcase-pill authx-scene-showcase-pill-a">Cards</span>
                      <span className="authx-scene-showcase-pill authx-scene-showcase-pill-b">Plans</span>
                      <span className="authx-scene-showcase-pill authx-scene-showcase-pill-c">Goals</span>

                      <div className="authx-scene-showcase-core">
                        <BrandLogo className="authx-scene-showcase-brand" compact markOnly subtitle="" title="" tone="dark" />
                      </div>
                    </div>

                    <div className="authx-scene-showcase-copy">
                      <strong>Clean layers</strong>
                      <span>Composition only</span>
                    </div>
                  </section>

                  <aside className="authx-scene-side-column">
                    <section className="authx-scene-stack">
                      <div className="authx-scene-card-layer authx-scene-card-layer-back" />

                      <div className="authx-scene-card-layer authx-scene-card-layer-front">
                        <div className="authx-scene-card-top">
                          <span className="authx-scene-card-mark" />
                          <span className="authx-scene-card-dots">
                            <span />
                            <span />
                          </span>
                        </div>

                        <span className="authx-scene-card-chip" />
                        <strong>Ledgr Edition</strong>
                        <small>Private surface</small>
                      </div>
                    </section>

                    <section className="authx-scene-notes">
                      <div className="authx-scene-card-head">
                        <strong>Principles</strong>
                        <span>Preview</span>
                      </div>

                      <div className="authx-scene-note-list">
                        <div className="authx-scene-note-row">
                          <span className="authx-scene-note-dot violet" />
                          <div>
                            <strong>Private by default</strong>
                            <span>Calm visual hierarchy</span>
                          </div>
                        </div>

                        <div className="authx-scene-note-row">
                          <span className="authx-scene-note-dot teal" />
                          <div>
                            <strong>Clean surfaces</strong>
                            <span>Soft contrast, less noise</span>
                          </div>
                        </div>

                        <div className="authx-scene-note-row">
                          <span className="authx-scene-note-dot gold" />
                          <div>
                            <strong>Premium motion</strong>
                            <span>Depth without clutter</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
