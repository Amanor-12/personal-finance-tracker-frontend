import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import './LoginPage.css';
import { authStore } from '../utils/authStore';

function AuthIcon({ type }) {
  const icons = {
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

function PasswordRecoveryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = String(searchParams.get('token') || '').trim();
  const isResetMode = Boolean(resetToken);
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('error');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestReset = async () => {
    if (!email.includes('@')) {
      setMessage('Enter a valid email address.');
      setMessageTone('error');
      return;
    }

    const result = await authStore.requestPasswordReset({ email });
    setPreviewUrl(result?.delivery?.reset_url || '');
    setMessage(result?.message || 'If an account exists for that email, a reset link has been prepared.');
    setMessageTone('success');
  };

  const handleConfirmReset = async () => {
    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters.');
      setMessageTone('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageTone('error');
      return;
    }

    await authStore.resetPassword({
      token: resetToken,
      newPassword,
    });

    navigate('/login', {
      replace: true,
      state: {
        passwordResetComplete: true,
      },
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setPreviewUrl('');

    try {
      if (isResetMode) {
        await handleConfirmReset();
      } else {
        await handleRequestReset();
      }
    } catch (error) {
      const normalizedMessage = String(error.message || '').trim();
      setMessage(normalizedMessage || 'Rivo could not complete that request. Please try again.');
      setMessageTone('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="authx-page">
      <section className="authx-shell">
        <section className="authx-auth-column">
          <div className="authx-brand-row">
            <BrandLogo className="authx-brand" title="Rivo" subtitle="Private finance workspace" tone="dark" />
          </div>

          <div className="authx-auth-card">
            <div className="authx-card-copy">
              <span className="authx-panel-kicker">{isResetMode ? 'Reset access' : 'Recover access'}</span>
              <h1>{isResetMode ? 'Set a new password.' : 'Recover your workspace.'}</h1>
              <p>
                {isResetMode
                  ? 'Choose a new password for your finance workspace. This link can only be used once.'
                  : 'Enter the email tied to your account and Rivo will prepare a secure password reset link.'}
              </p>
            </div>

            <div className="authx-feature-row" aria-hidden="true">
              <span>Secure</span>
              <span>Private</span>
              <span>Customer-grade</span>
            </div>

            {message ? (
              <p className={messageTone === 'success' ? 'authx-success' : 'authx-error'}>{message}</p>
            ) : null}

            {previewUrl ? (
              <div className="authx-success">
                <strong>Preview reset link</strong>
                <p>
                  Development delivery is enabled in this environment. Open the reset link directly:
                  {' '}
                  <a className="authx-inline-link" href={previewUrl}>
                    Continue to reset password
                  </a>
                </p>
              </div>
            ) : null}

            <form className="authx-form" onSubmit={handleSubmit}>
              {!isResetMode ? (
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
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setMessage('');
                        setPreviewUrl('');
                      }}
                      placeholder="name@example.com"
                      autoComplete="email"
                    />
                  </span>
                </label>
              ) : (
                <>
                  <label className="authx-field" htmlFor="newPassword">
                    <span className="authx-field-label">New password</span>
                    <span className="authx-field-shell">
                      <span className="authx-field-icon">
                        <AuthIcon type="lock" />
                      </span>
                      <input
                        id="newPassword"
                        name="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(event) => {
                          setNewPassword(event.target.value);
                          setMessage('');
                        }}
                        placeholder="Choose a new password"
                        autoComplete="new-password"
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
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setMessage('');
                        }}
                        placeholder="Repeat your new password"
                        autoComplete="new-password"
                      />
                    </span>
                  </label>
                </>
              )}

              <div className="authx-form-meta">
                <span className="authx-meta-note">
                  {isResetMode ? 'Use at least 8 characters.' : 'The response stays generic to protect account privacy.'}
                </span>
                <Link className="authx-text-link" to="/login" state={location.state}>
                  Back to log in
                </Link>
              </div>

              <button className="authx-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Please wait...'
                  : isResetMode
                    ? 'Save new password'
                    : 'Send reset link'}
              </button>
            </form>
          </div>
        </section>

        <section className="authx-preview-column" aria-label="Rivo security summary">
          <div className="authx-product-stage">
            <div className="authx-product-nav">
              <span className="authx-kicker">Security flow</span>
              <div className="authx-preview-pills">
                <span>Recovery</span>
                <span>Session reset</span>
                <span>Protected</span>
              </div>
            </div>

            <section className="authx-product-hero">
              <div className="authx-product-copy">
                <span className="authx-scene-chip">Production account recovery</span>
                <h2>Account access should feel secure, not improvised.</h2>
                <p>
                  Reset links are single-use, short-lived, and invalidated after password rotation so real customers can recover access without weakening trust.
                </p>

                <div className="authx-product-tags">
                  <span>Single-use tokens</span>
                  <span>Session revocation</span>
                  <span>Audit-ready</span>
                </div>
              </div>

              <div className="authx-product-card" aria-hidden="true">
                <span className="authx-product-card-chip" />
                <strong>Recovery ready</strong>
                <small>Short-lived token flow</small>
                <div className="authx-product-card-lines">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </section>

            <div className="authx-product-showcase-row" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default PasswordRecoveryPage;
