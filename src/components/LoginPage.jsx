import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';

const REMEMBERED_EMAIL_KEY = 'finance-flow-remembered-email';

const previewMenu = ['Home', 'Cards', 'Schedule', 'Support'];

const createInitialForm = (rememberedEmail = '') => ({
  fullName: '',
  email: rememberedEmail,
  password: '',
  confirmPassword: '',
});

function LoginPage({ mode = 'login', onLogin, onSignUp }) {
  const navigate = useNavigate();
  const isLogin = mode === 'login';
  const rememberedEmail = typeof window !== 'undefined'
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
    <main className="auth-shell">
      <section className="auth-scene">
        <div className="auth-preview">
          <aside className="auth-preview-sidebar">
            <div className="preview-brand">
              <div className="preview-brand-mark">F</div>
              <div>
                <strong>Fina Inc</strong>
                <span>Private finance workspace</span>
              </div>
            </div>

            <div className="preview-workspace">
              <span>Workspace</span>
              <div className="preview-workspace-card">
                <div className="preview-workspace-avatar" />
                <div>
                  <strong>{isLogin ? 'Returning access' : 'New workspace'}</strong>
                  <small>{isLogin ? 'Login flow' : 'Sign up flow'}</small>
                </div>
              </div>
            </div>

            <nav className="preview-menu">
              {previewMenu.map((item, index) => (
                <div key={item} className={`preview-menu-item${index === 0 ? ' active' : ''}`}>
                  <span>{item}</span>
                </div>
              ))}
            </nav>
          </aside>

          <section className="auth-preview-stage">
            <header className="auth-preview-topbar">
              <div className="preview-search">Search anything...</div>
              <div className="preview-topbar-actions">
                <div className="preview-topbar-dot" />
                <div className="preview-topbar-dot" />
                <div className="preview-topbar-user">
                  <div className="preview-topbar-avatar" />
                  <div>
                    <strong>{isLogin ? 'Welcome Back' : 'Create Access'}</strong>
                    <span>{isLogin ? 'Private sign in' : 'Private sign up'}</span>
                  </div>
                </div>
              </div>
            </header>

            <div className="auth-preview-copy">
              <h1>{isLogin ? 'Log in to your finance dashboard.' : 'Create your finance dashboard access.'}</h1>
              <p>
                A cleaner entry point with the same visual language as the app you open after authentication.
              </p>
            </div>

            <article className="preview-hero-banner">
              <div>
                <span>Secure Access</span>
                <strong>{isLogin ? 'Welcome back.' : 'New workspace setup.'}</strong>
                <p>Authentication is real. Fake finance data is not.</p>
              </div>
              <div className="preview-hero-rings" aria-hidden="true">
                <div className="preview-hero-ring outer" />
                <div className="preview-hero-ring inner" />
              </div>
            </article>

            <div className="auth-preview-grid">
              <article className="preview-panel preview-graph-panel">
                <h3>Money Flow</h3>
                <div className="preview-graph-area">
                  <div className="preview-graph-grid" />
                  <div className="preview-graph-note">Charts stay empty until real user transactions exist.</div>
                </div>
              </article>

              <div className="preview-side-column">
                <article className="preview-panel preview-card-panel">
                  <h3>Your Card</h3>
                  <div className="preview-card-visual">
                    <span>Secure Wallet</span>
                    <strong>**** **** **** 4242</strong>
                    <small>Preview only. Real cards are user-added later.</small>
                  </div>
                </article>

                <article className="preview-panel preview-expense-panel">
                  <h3>Expenses</h3>
                  <div className="preview-rings">
                    <div className="preview-ring ring-one" />
                    <div className="preview-ring ring-two" />
                    <div className="preview-ring ring-three" />
                    <div className="preview-ring-center">No fake data</div>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </div>

        <form className="auth-form-panel" onSubmit={handleSubmit}>
          <div className="auth-form-brand">
            <div className="auth-form-brand-mark">F</div>
            <span>Finance Flow</span>
          </div>

          <div className="auth-form-header">
            <span className="auth-kicker">{isLogin ? 'Welcome back' : 'Create access'}</span>
            <h2>{isLogin ? 'Log in' : 'Sign up'}</h2>
            <p>
              {isLogin
                ? 'Use the same credentials you created during sign up.'
                : 'Create a secure local account, then use it to access your dashboard.'}
            </p>
          </div>

          {message ? <p className="auth-error">{message}</p> : null}

          {!isLogin ? (
            <label htmlFor="fullName">
              Full Name
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Regan Amanor"
              />
            </label>
          ) : null}

          <label htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="regan@example.com"
              autoComplete="email"
            />
          </label>

          <label htmlFor="password">
            Password
            <div className="password-control">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {!isLogin ? (
            <label htmlFor="confirmPassword">
              Confirm Password
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </label>
          ) : null}

          <div className="auth-form-row">
            <label className="remember-row" htmlFor="rememberEmail">
              <input
                id="rememberEmail"
                type="checkbox"
                checked={rememberEmail}
                onChange={(event) => setRememberEmail(event.target.checked)}
              />
              Remember my email
            </label>

            {isLogin ? (
              <Link className="auth-link" to="/signup">
                Need an account?
              </Link>
            ) : (
              <Link className="auth-link" to="/login">
                Already registered?
              </Link>
            )}
          </div>

          <button className="auth-primary-button" type="submit">
            {isLogin ? 'Log in' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
