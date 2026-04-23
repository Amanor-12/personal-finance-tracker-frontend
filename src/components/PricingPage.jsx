import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { billingPlans, billingStore } from '../utils/billingStore';

const comparisonRows = [
  { label: 'Manual accounts', free: true, premium: true },
  { label: 'Transactions, budgets, and goals', free: true, premium: true },
  { label: 'Recurring payments workspace', free: false, premium: true },
  { label: 'Reports and insight surfaces', free: false, premium: true },
  { label: 'Billing portal and invoice history', free: false, premium: true },
];

function PricingCard({ currentUser, isFeatured, isProcessing, onCheckout, plan }) {
  const isFree = plan.id === 'free';

  return (
    <article className={`pricing-card${isFeatured ? ' is-featured' : ''}`}>
      <div className="pricing-card-head">
        <span className="pricing-eyebrow">{plan.eyebrow}</span>
        {isFeatured ? <strong>Best for launch</strong> : null}
      </div>
      <h2>{plan.name}</h2>
      <p>{plan.description}</p>
      <div className="pricing-price">
        <strong>{plan.price}</strong>
        {plan.suffix ? <span>{plan.suffix}</span> : null}
      </div>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {isFree ? (
        <Link className="pricing-secondary-button" to={currentUser ? '/dashboard' : '/signup'}>
          {currentUser ? 'Open workspace' : 'Start free'}
        </Link>
      ) : currentUser ? (
        <button className="pricing-primary-button" type="button" disabled={isProcessing} onClick={() => onCheckout(plan.id)}>
          {isProcessing ? 'Starting checkout...' : 'Start checkout'}
        </button>
      ) : (
        <Link className="pricing-primary-button" to="/signup">
          Create account
        </Link>
      )}
    </article>
  );
}

function PricingPage({ currentUser }) {
  const navigate = useNavigate();
  const [billingCadence, setBillingCadence] = useState('monthly');
  const [processingPlanId, setProcessingPlanId] = useState('');
  const [message, setMessage] = useState('');

  const visiblePlans = useMemo(() => {
    const premiumPlanId = billingCadence === 'annual' ? 'premium_annual' : 'premium_monthly';
    return billingPlans.filter((plan) => plan.id === 'free' || plan.id === premiumPlanId);
  }, [billingCadence]);

  const handleCheckout = async (planId) => {
    setProcessingPlanId(planId);
    setMessage('');

    try {
      const session = await billingStore.createCheckoutSession(planId);

      if (session?.url) {
        window.location.assign(session.url);
        return;
      }

      setMessage('Checkout session created, but the backend did not return a redirect URL.');
    } catch (error) {
      setMessage(error.message || 'Checkout could not start.');
    } finally {
      setProcessingPlanId('');
    }
  };

  return (
    <main className="pricing-shell pricing-market-shell">
      <header className="pricing-nav">
        <BrandLogo compact subtitle="" title="Ledgr" tone="dark" />
        <nav aria-label="Pricing navigation">
          <Link to={currentUser ? '/dashboard' : '/login'}>{currentUser ? 'Dashboard' : 'Sign in'}</Link>
          <button type="button" onClick={() => navigate(currentUser ? '/billing' : '/signup')}>
            {currentUser ? 'Billing' : 'Get started'}
          </button>
        </nav>
      </header>

      <section className="pricing-market-hero">
        <div>
          <span className="pricing-eyebrow">Stripe-ready SaaS billing</span>
          <h1>Pricing for a private finance workspace, not fake finance data.</h1>
          <p>
            Pick a Ledgr plan. Your personal accounts, transactions, budgets, and goals stay separate from app billing.
          </p>
        </div>
        <div className="pricing-toggle" aria-label="Billing cadence">
          <button
            className={billingCadence === 'monthly' ? 'is-active' : ''}
            type="button"
            onClick={() => setBillingCadence('monthly')}
          >
            Monthly
          </button>
          <button
            className={billingCadence === 'annual' ? 'is-active' : ''}
            type="button"
            onClick={() => setBillingCadence('annual')}
          >
            Annual
          </button>
        </div>
      </section>

      {message ? <p className="pricing-message">{message}</p> : null}

      <section className="pricing-market-grid" aria-label="Ledgr pricing plans">
        {visiblePlans.map((plan) => (
          <PricingCard
            key={plan.id}
            currentUser={currentUser}
            isFeatured={plan.id !== 'free'}
            isProcessing={processingPlanId === plan.id}
            onCheckout={handleCheckout}
            plan={plan}
          />
        ))}
      </section>

      <section className="pricing-proof-grid">
        <article>
          <span>Checkout</span>
          <strong>Stripe Checkout Sessions</strong>
          <p>Paid plan buttons ask the backend to create subscription-mode Checkout Sessions.</p>
        </article>
        <article>
          <span>Management</span>
          <strong>Customer Portal</strong>
          <p>Users manage payment methods, invoices, and cancellation through Stripe portal access.</p>
        </article>
        <article>
          <span>State handling</span>
          <strong>No fake success state</strong>
          <p>Trialing, active, past due, incomplete, canceled, and none are handled as real statuses.</p>
        </article>
      </section>

      <section className="pricing-comparison">
        <div>
          <span className="pricing-eyebrow">Plan comparison</span>
          <h2>Clear enough to trust before payment.</h2>
        </div>
        <div className="pricing-comparison-table">
          {comparisonRows.map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong>{row.free ? 'Free' : '-'}</strong>
              <strong>{row.premium ? 'Premium' : '-'}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default PricingPage;
