import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';

const REMEMBERED_EMAIL_KEY = 'finance-flow-remembered-email';

const loginFeatures = [
  'Real sign up and login flow',
  'Remembered email option',
  'Password visibility toggle',
  'Persistent session until logout',
];

const createInitialForm = (rememberedEmail = '') => ({
  fullName: '',
  email: rememberedEmail,
  password: '',
  confirmPassword: '',
});

function LoginPage({ mode = 'login', onLogin, onSignUp }) {
  const navigate = useNavigate();
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

    if (mode === 'signup' && !formData.fullName.trim()) {
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

    if (mode === 'signup' && formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    try {
      if (rememberEmail) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      if (mode === 'login') {
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
    <main className="login-page">
      <section className="login-hero">
        <div className="login-copy">
          <span>Finance Flow Access</span>
          <h1>Start with a secure front door for your finance dashboard.</h1>
          <p>
            Create an account, sign in with real saved credentials, and keep the session active until logout.
            This stays frontend-only, but the authentication flow itself is fully wired.
          </p>

          <div className="login-feature-grid">
            {loginFeatures.map((feature) => (
              <div key={feature}>{feature}</div>
            ))}
          </div>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div>
            <span className="login-kicker">{mode === 'login' ? 'Welcome back' : 'New account'}</span>
            <h2>{mode === 'login' ? 'Log in to continue' : 'Create your account'}</h2>
            <p>
              {mode === 'login'
                ? 'Use the same credentials you created in sign up.'
                : 'Sign up stores your account locally so login can validate it later.'}
            </p>
          </div>

          {message ? <p className="login-error">{message}</p> : null}

          {mode === 'signup' ? (
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

          {mode === 'signup' ? (
            <label htmlFor="confirmPassword">
              Confirm Password
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
              />
            </label>
          ) : null}

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

            {mode === 'login' ? (
              <Link className="link-button" to="/signup">
                Need an account? Sign up
              </Link>
            ) : (
              <Link className="link-button" to="/login">
                Already registered? Log in
              </Link>
            )}
          </div>

          <button className="primary-login" type="submit">
            {mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
