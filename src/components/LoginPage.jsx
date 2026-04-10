import { useState } from 'react';
import './LoginPage.css';

const REMEMBERED_EMAIL_KEY = 'finance-flow-remembered-email';

const loginFeatures = [
  'Frontend-only validation',
  'Remembered email option',
  'Password visibility toggle',
  'Demo sign-in while the backend is separate',
];

function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({
    email: window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || '',
    password: '',
  });
  const [rememberEmail, setRememberEmail] = useState(
    Boolean(window.localStorage.getItem(REMEMBERED_EMAIL_KEY)),
  );
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

    if (!formData.email.includes('@')) {
      setMessage('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters for this frontend demo.');
      return;
    }

    if (rememberEmail) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email.trim());
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    onLogin({
      email: formData.email.trim(),
      name: formData.email.split('@')[0],
    });
  };

  const handleDemoLogin = () => {
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    onLogin({
      email: 'demo@financeflow.dev',
      name: 'Demo User',
    });
  };

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="login-copy">
          <span>Finance Flow Login</span>
          <h1>Start with a secure front door for your finance dashboard.</h1>
          <p>
            Sign in first, then review budgets, savings, and saved profile details.
            This is frontend-only for now, so it is ready to connect to your backend later.
          </p>

          <div className="login-feature-grid">
            {loginFeatures.map((feature) => (
              <div key={feature}>{feature}</div>
            ))}
          </div>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div>
            <span className="login-kicker">Welcome back</span>
            <h2>Log in to continue</h2>
            <p>Use any valid email and a 6+ character password for the frontend demo.</p>
          </div>

          {message ? <p className="login-error">{message}</p> : null}

          <label htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="regan@example.com"
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
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="login-options">
            <label className="remember-row" htmlFor="rememberEmail">
              <input
                id="rememberEmail"
                type="checkbox"
                checked={rememberEmail}
                onChange={(event) => setRememberEmail(event.target.checked)}
              />
              Remember my email
            </label>
            <button
              className="link-button"
              type="button"
              onClick={() => setMessage('Password reset will be connected when the backend is ready.')}
            >
              Forgot password?
            </button>
          </div>

          <button className="primary-login" type="submit">
            Log in
          </button>

          <button className="secondary-login" type="button" onClick={handleDemoLogin}>
            Demo login
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
