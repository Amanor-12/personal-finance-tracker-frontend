import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { billingPlans, billingStore } from '../utils/billingStore';

const comparisonRows = [
  { label: 'Basic tracking', free: 'Included', plus: 'Included', pro: 'Included' },
  { label: 'Budgets', free: 'Limited', plus: 'Unlimited', pro: 'Unlimited' },
  { label: 'Savings goals', free: 'Limited', plus: 'Unlimited', pro: 'Unlimited' },
  { label: 'Recurring bills', free: '-', plus: 'Included', pro: 'Included' },
  { label: 'Advanced analytics', free: '-', plus: 'Included', pro: 'Included' },
  { label: 'PDF/CSV export', free: '-', plus: 'Included', pro: 'Included' },
  { label: 'AI spending insights', free: '-', plus: 'Basic', pro: 'Advanced' },
  { label: 'Smart budget generation', free: '-', plus: 'Limited', pro: 'Included' },
  { label: 'Financial forecast', free: '-', plus: '-', pro: 'Included' },
  { label: 'Priority support', free: '-', plus: '-', pro: 'Included' },
  { label: 'Early access features', free: '-', plus: '-', pro: 'Included' },
];

const tierValueRows = [
  {
    eyebrow: 'Plus value',
    title: 'Control recurring costs before they hit',
    body: 'Plus gives active customers one place to manage subscriptions, rent, insurance, and other fixed charges with export-ready workflows.',
  },
  {
    eyebrow: 'Pro intelligence',
    title: 'Move from tracking money to understanding it',
    body: 'Pro adds stronger reporting, better signals, and forecasting so customers can see drift before it becomes a problem.',
  },
  {
    eyebrow: 'Real operations',
    title: 'Pay for less manual cleanup, not just more pages',
    body: 'Both paid tiers save time, while Pro becomes the high-control workspace for customers who want deeper planning and premium support.',
  },
];

const pricingFaq = [
  {
    question: 'Can I stay on the free plan long term?',
    answer: 'Yes. Free is designed for manual tracking with starter limits, not as a forced trial.',
  },
  {
    question: 'What is the difference between Plus and Pro?',
    answer: 'Plus is for active manual money management: recurring bills, exports, and unlimited planning. Pro adds stronger intelligence, forecasting, priority support, and earlier access to new tools.',
  },
  {
    question: 'Do I lose data if I upgrade later?',
    answer: 'No. Your accounts, transactions, budgets, and goals stay in the same workspace when you move between plans.',
  },
];

function PricingCard({ currentUser, isFeatured, isProcessing, onCheckout, plan }) {
  const isFree = plan.id === 'free';
  const isPaid = !isFree;

  return (
    <article className={`pricing-card${isFeatured ? ' is-featured' : ''}`}>
      <div className="pricing-card-head">
        <span className="pricing-eyebrow">{plan.eyebrow}</span>
        {isFeatured ? <strong>{plan.name === 'Plus' ? 'Best for active customers' : 'Best for high-control customers'}</strong> : null}
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
          {isProcessing ? 'Starting checkout...' : `Choose ${plan.name}`}
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
    return billingPlans;
  }, []);

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
          <span className="pricing-eyebrow">Ledgr plans</span>
          <h1>Start free. Move to Plus for control. Move to Pro for intelligence.</h1>
          <p>
            Ledgr Free stays useful for manual tracking. Plus becomes the everyday paid workspace. Pro becomes the high-control tier for customers who want deeper analysis, forecasting, and premium support.
          </p>
        </div>
        <div className="pricing-toggle" aria-label="Plan framing">
          <button className="is-active" type="button">
            Real tiers
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
        {tierValueRows.map((row) => (
          <article key={row.title}>
            <span>{row.eyebrow}</span>
            <strong>{row.title}</strong>
            <p>{row.body}</p>
          </article>
        ))}
      </section>

      <section className="pricing-comparison">
        <div>
          <span className="pricing-eyebrow">Plan comparison</span>
          <h2>Clear enough to trust before upgrading.</h2>
        </div>
        <div className="pricing-comparison-table">
          {comparisonRows.map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong>{row.free}</strong>
              <strong>{row.plus}</strong>
              <strong>{row.pro}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing-proof-grid pricing-faq-grid" aria-label="Pricing questions">
        {pricingFaq.map((item) => (
          <article key={item.question}>
            <span>FAQ</span>
            <strong>{item.question}</strong>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default PricingPage;
