import { useState } from 'react';
import './LoginForm.css';

const createLoginState = (defaultEmail = '') => ({
  email: defaultEmail,
  password: '',
  rememberMe: Boolean(defaultEmail),
});

function LoginForm({ defaultEmail, demoAccount, onLogin, savedProfilesCount }) {
  const [formData, setFormData] = useState(() => createLoginState(defaultEmail));
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;

    setFormData((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.email.includes('@')) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (formData.password.trim().length < 8) {
      nextErrors.password = 'Use at least 8 characters.';
    }

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const result = onLogin({
      email: formData.email,
      password: formData.password,
      rememberMe: formData.rememberMe,
    });

    if (!result.ok) {
      setErrors({ submit: result.message });
    }
  };

  const loadDemoCredentials = () => {
    setErrors({});
    setFormData({
      email: demoAccount.email,
      password: demoAccount.password,
      rememberMe: true,
    });
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h2>Log In</h2>
      <p>
        Use the demo access below or sign in with an email saved in the profile
        panel. {savedProfilesCount} local profile{savedProfilesCount === 1 ? '' : 's'} currently saved.
      </p>

      <label htmlFor="loginEmail">
        Email
        <input
          id="loginEmail"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="demo@financeflow.app"
        />
      </label>
      {errors.email ? <p className="error-text">{errors.email}</p> : null}

      <label htmlFor="loginPassword">
        Password
        <input
          id="loginPassword"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          placeholder="At least 8 characters"
        />
      </label>
      {errors.password ? <p className="error-text">{errors.password}</p> : null}

      <div className="login-form-options">
        <label className="login-checkbox" htmlFor="rememberMe">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={formData.rememberMe}
            onChange={handleChange}
          />
          Remember this email
        </label>

        <button
          className="inline-text-button"
          type="button"
          onClick={() => setShowPassword((currentValue) => !currentValue)}
        >
          {showPassword ? 'Hide password' : 'Show password'}
        </button>
      </div>

      {errors.submit ? <p className="error-text">{errors.submit}</p> : null}

      <div className="login-form-actions">
        <button type="submit">Open Dashboard</button>
        <button
          className="secondary-action"
          type="button"
          onClick={loadDemoCredentials}
        >
          Use Demo Access
        </button>
      </div>

      <p className="helper-text">
        Demo login: <strong>{demoAccount.email}</strong> /{' '}
        <strong>{demoAccount.password}</strong>
      </p>
    </form>
  );
}

export default LoginForm;
