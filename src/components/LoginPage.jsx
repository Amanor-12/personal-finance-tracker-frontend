import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';

const REMEMBERED_EMAIL_KEY = 'finance-flow-remembered-email';

const authHighlights = [
  {
    title: 'Real auth flow',
    detail: 'Sign up creates a reusable account. Login validates saved credentials.',
  },
  {
    title: 'No fake balances',
    detail: 'The dashboard stays empty until real finance data exists for the signed-in user.',
  },
  {
    title: 'Protected access',
    detail: 'The dashboard route stays locked until a session exists.',
  },
];

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
      <aside className="auth-sidebar">
        <div className="auth-brand">
          <div className="auth-brand-mark">F</div>
          <div>
            <strong>Fina Inc</strong>
            <span>Personal finance workspace</span>
          </div>
        </div>

        <div className="auth-sidebar-copy">
          <span className="auth-kicker">Secure access</span>
          <h1>{isLogin ? 'Welcome back to your private workspace.' : 'Create a private finance workspace.'}</h1>
          <p>
            {isLogin
              ? 'Use the credentials you created during sign up. The dashboard stays clean and avoids sample balances or placeholder transactions.'
              : 'Sign up first, then log in with the same credentials. The interface is ready now, while personal finance data can be connected later.'}
          </p>
        </div>

        <div className="auth-highlight-list">
          {authHighlights.map((item) => (
            <article key={item.title} className="auth-highlight-card">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>

        <div className="auth-privacy-card">
          <span>Privacy rule</span>
          <p>
            If financial data does not belong to the signed-in user, it should not appear on the
            screen. The UI stays elegant without inventing numbers.
          </p>
        </div>
      </aside>

      <section className="auth-stage">
        <header className="auth-topbar">
          <div className="auth-topbar-pill">React Router</div>
          <div className="auth-topbar-pill">Protected Route</div>
          <div className="auth-topbar-pill">Local Session</div>
        </header>

        <div className="auth-stage-grid">
          <form className="auth-form-card" onSubmit={handleSubmit}>
            <div className="auth-form-header">
              <span className="auth-kicker subtle">{isLogin ? 'Welcome back' : 'New account'}</span>
              <h2>{isLogin ? 'Log in to continue' : 'Create your account'}</h2>
              <p>
                {isLogin
                  ? 'Sign in with the exact credentials you created during sign up.'
                  : 'Your account is stored locally so this frontend can validate login properly.'}
              </p>
            </div>

            {message ? <p className="auth-error">{message}</p> : null}

            {!isLogin ? (
              <label htmlFor="fullName">
                Full name
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
                <button type="button" className="ghost-control" onClick={() => setShowPassword((current) => !current)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {!isLogin ? (
              <label htmlFor="confirmPassword">
                Confirm password
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
                <Link className="text-link" to="/signup">
                  Need an account?
                </Link>
              ) : (
                <Link className="text-link" to="/login">
                  Already registered?
                </Link>
              )}
            </div>

            <button className="primary-action" type="submit">
              {isLogin ? 'Log in' : 'Create account'}
            </button>
          </form>

          <div className="auth-info-column">
            <article className="auth-info-card accent">
              <span className="auth-info-label">After access</span>
              <h3>Dashboard states are truthful.</h3>
              <p>
                The layout is polished now, but balances, charts, and transactions remain empty
                until they belong to the signed-in person.
              </p>
            </article>

            <article className="auth-info-card">
              <span className="auth-info-label">What is live now</span>
              <div className="auth-info-list">
                <div>
                  <span>Sign up</span>
                  <strong>Enabled</strong>
                </div>
                <div>
                  <span>Login validation</span>
                  <strong>Enabled</strong>
                </div>
                <div>
                  <span>Dashboard protection</span>
                  <strong>Enabled</strong>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
