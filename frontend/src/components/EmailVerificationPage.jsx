import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import './LoginPage.css';
import { authStore } from '../utils/authStore';

function EmailVerificationPage({ currentUser, onRefreshSession }) {
  const [searchParams] = useSearchParams();
  const token = String(searchParams.get('token') || '').trim();
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('error');
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const verify = async () => {
      if (!token) {
        setMessage('A verification token is required to confirm this email address.');
        setMessageTone('error');
        setIsVerifying(false);
        return;
      }

      try {
        const result = await authStore.confirmEmailVerification({ token });

        if (isCancelled) {
          return;
        }

        await onRefreshSession?.();
        setMessage(result?.message || 'Email verified successfully.');
        setMessageTone('success');
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setMessage(error.message || 'Rivo could not verify this email address.');
        setMessageTone('error');
      } finally {
        if (!isCancelled) {
          setIsVerifying(false);
        }
      }
    };

    verify();

    return () => {
      isCancelled = true;
    };
  }, [onRefreshSession, token]);

  return (
    <main className="authx-page">
      <section className="authx-shell">
        <section className="authx-auth-column">
          <div className="authx-brand-row">
            <BrandLogo className="authx-brand" title="Rivo" subtitle="Private finance workspace" tone="dark" />
          </div>

          <div className="authx-auth-card">
            <div className="authx-card-copy">
              <span className="authx-panel-kicker">Trust layer</span>
              <h1>Verify your email.</h1>
              <p>
                Rivo confirms ownership of the account email before higher-trust workflows rely on it for recovery and security alerts.
              </p>
            </div>

            <div className="authx-feature-row" aria-hidden="true">
              <span>Verified</span>
              <span>Traceable</span>
              <span>Protected</span>
            </div>

            {isVerifying ? (
              <p className="authx-success">Checking your verification link...</p>
            ) : message ? (
              <p className={messageTone === 'success' ? 'authx-success' : 'authx-error'}>{message}</p>
            ) : null}

            <div className="authx-form">
              <Link className="authx-primary" to={currentUser ? '/settings' : '/login'}>
                {currentUser ? 'Return to settings' : 'Continue to log in'}
              </Link>
            </div>
          </div>
        </section>

        <section className="authx-preview-column" aria-label="Rivo verification summary">
          <div className="authx-product-stage">
            <div className="authx-product-nav">
              <span className="authx-kicker">Verified identity</span>
              <div className="authx-preview-pills">
                <span>Email proof</span>
                <span>Recovery ready</span>
                <span>Audit trail</span>
              </div>
            </div>

            <section className="authx-product-hero">
              <div className="authx-product-copy">
                <span className="authx-scene-chip">Production account trust</span>
                <h2>Recovery channels should belong to the real account owner.</h2>
                <p>
                  Verification closes the gap between a sign-up form and a trustworthy recovery channel for security alerts, password reset, and destructive actions.
                </p>

                <div className="authx-product-tags">
                  <span>Email ownership</span>
                  <span>Security events</span>
                  <span>Re-auth posture</span>
                </div>
              </div>

              <div className="authx-product-card" aria-hidden="true">
                <span className="authx-product-card-chip" />
                <strong>Identity confirmed</strong>
                <small>Verified recovery channel</small>
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

export default EmailVerificationPage;
