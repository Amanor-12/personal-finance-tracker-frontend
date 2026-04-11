import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import './LoginPage.css';

const REMEMBERED_EMAIL_KEY = 'finance-flow-remembered-email';

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
        <section className="login-visual-panel">
          <div className="login-visual-backdrop" />
          <div className="login-visual-content">
            <BrandLogo className="login-brand" title="Fina Inc" subtitle="Private finance workspace" />

            <div className="login-visual-copy">
              <span className="login-visual-kicker">Secure Access</span>
              <h1>{isLogin ? 'Secure access for your wallet workspace.' : 'Create your private wallet workspace.'}</h1>
              <p>
                {isLogin
                  ? 'The auth view follows the same dashboard system: premium layout, real account flow, and no invented finance data.'
                  : 'Create an account first, then return here to access the dashboard with your own saved credentials and card details.'}
              </p>
            </div>

            <div className="login-scene-topbar">
              <div className="login-scene-search">Search anything...</div>
              <div className="login-scene-actions">
                <div className="login-scene-dot" />
                <div className="login-scene-dot" />
                <div className="login-scene-user">
                  <div className="login-scene-user-avatar" />
                  <div>
                    <strong>Fina Inc</strong>
                    <span>Private workspace</span>
                  </div>
                </div>
              </div>
            </div>

            <article className="login-scene-hero">
              <div className="login-scene-hero-copy">
                <span className="login-scene-hero-kicker">Private Wallet</span>
                <strong>{isLogin ? 'Sign in to continue from a clean dashboard shell.' : 'Create an account before you add your first card.'}</strong>
                <p>No fake balances, no fake transactions, and no other user data leaking into the interface.</p>
              </div>
              <div className="login-scene-hero-art" aria-hidden="true">
                <div className="login-scene-hero-ring ring-back" />
                <div className="login-scene-hero-ring ring-front" />
                <div className="login-scene-hero-shine" />
              </div>
            </article>

            <div className="login-scene-grid">
              <article className="login-scene-wallet-card">
                <div className="login-scene-card-brand">
                  <span className="wallet-mini-dot red" />
                  <span className="wallet-mini-dot gold" />
                  <strong>Master Credit</strong>
                </div>
                <div className="login-scene-card-chip" />
                <div className="login-scene-card-balance">
                  <span>Secure wallet</span>
                  <strong>**** **** **** 4242</strong>
                </div>
                <div className="login-scene-card-meta">
                  <span>--/--</span>
                  <small>Private view</small>
                </div>
              </article>

              <article className="login-scene-graph-card">
                <div className="login-scene-panel-header">
                  <strong>Money Flow</strong>
                  <span>Current layout</span>
                </div>
                <div className="login-scene-graph-area">
                  <div className="login-scene-graph-grid" />
                  <svg aria-hidden="true" className="login-scene-graph-line" viewBox="0 0 320 170" preserveAspectRatio="none">
                    <path d="M8 118 C42 110, 66 74, 96 84 S152 132, 188 102 242 60, 314 88" />
                    <path d="M8 136 C52 144, 82 112, 118 122 S186 150, 220 136 272 108, 314 124" />
                  </svg>
                </div>
              </article>

              <article className="login-scene-expense-card">
                <div className="login-scene-panel-header">
                  <strong>Expenses</strong>
                  <span>No fake values</span>
                </div>

                <svg className="login-scene-expense-chart" viewBox="0 0 220 220" aria-hidden="true">
                  <g transform="rotate(140 110 110)">
                    <circle className="login-track" cx="110" cy="110" r="76" />
                    <circle className="login-track" cx="110" cy="110" r="58" />
                    <circle className="login-track" cx="110" cy="110" r="40" />
                    <circle className="login-track" cx="110" cy="110" r="22" />

                    <circle className="login-arc login-arc-violet" cx="110" cy="110" r="76" />
                    <circle className="login-arc login-arc-blue" cx="110" cy="110" r="58" />
                    <circle className="login-arc login-arc-green" cx="110" cy="110" r="40" />
                    <circle className="login-arc login-arc-orange" cx="110" cy="110" r="22" />
                  </g>
                </svg>

                <div className="login-scene-expense-summary">
                  <strong>$0.00</strong>
                  <span>Ready for real transactions</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <form className="login-form-panel" onSubmit={handleSubmit}>
          <div className="login-form-header">
            <span className="login-form-kicker">{isLogin ? 'Welcome Back' : 'Create Account'}</span>
            <h2>{isLogin ? 'Login to your account to continue.' : 'Create your account to continue.'}</h2>
            <p>
              {isLogin
                ? 'Use the same credentials you created during sign up.'
                : 'Create a secure local account, then use it to access your dashboard.'}
            </p>
          </div>

          {message ? <p className="login-form-error">{message}</p> : null}

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
                  placeholder="Full Name"
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
                placeholder="Email"
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
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                />
              </span>
            </label>
          ) : null}

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
              <button className="login-forgot-link" type="button" onClick={() => setMessage('Password reset will be connected when your backend is ready.')}>
                Forgot password?
              </button>
            ) : (
              <Link className="login-alt-link" to="/login">
                Already registered?
              </Link>
            )}
          </div>

          <button className="login-primary-button" type="submit">
            {isLogin ? 'Login' : 'Create account'}
          </button>

          <p className="login-switch-copy">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link className="login-switch-link" to={isLogin ? '/signup' : '/login'}>
              {isLogin ? 'Sign up' : 'Log in'}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
