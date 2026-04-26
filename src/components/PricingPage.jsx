import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { billingPlans, billingStore } from '../utils/billingStore';

const comparisonRows = [
  { label: 'Best for', free: 'Manual tracking', premium: 'Active money management' },
  { label: 'Accounts', free: '2 active', premium: 'Unlimited' },
  { label: 'Budgets', free: 'Up to 6', premium: 'Unlimited' },
  { label: 'Goals', free: 'Up to 3', premium: 'Unlimited' },
  { label: 'Recurring bill and renewal control', free: '-', premium: 'Included' },
  { label: 'Server-backed reports and insights', free: '-', premium: 'Included' },
  { label: 'Saved views, export, and planning intelligence', free: '-', premium: 'Included' },
];

const premiumValueRows = [
  {
    eyebrow: 'Recurring control',
    title: 'See bills before they hit',
    body: 'Pro keeps subscriptions, rent, insurance, and other fixed charges in one renewal workspace with due-soon context.',
  },
  {
    eyebrow: 'Advanced insights',
    title: 'Understand what is changing',
    body: 'Pro reports answer real questions about category concentration, merchant exposure, pace, and net cash flow.',
  },
  {
    eyebrow: 'Power workflows',
    title: 'Do less manual cleanup',
    body: 'Pro adds saved ledger views, CSV export, and stronger planning intelligence across budgets and goals.',
  },
];

const pricingFaq = [
  {
    question: 'Can I stay on the free plan long term?',
    answer: 'Yes. Free is designed for manual tracking with starter limits, not as a forced trial.',
  },
  {
    question: 'What makes Pro worth paying for?',
    answer: 'Pro saves time and gives better control: recurring bill tracking, backend-powered insights, less manual cleanup, and more planning room.',
  },
  {
    question: 'Do I lose data if I upgrade later?',
    answer: 'No. Your accounts, transactions, budgets, and goals stay in the same workspace when you move between plans.',
  },
];

function PricingCard({ currentUser, isFeatured, isProcessing, onCheckout, plan }) {
  const isFree = plan.id === 'free';

  return (
    <article className={`pricing-card${isFeatured ? ' is-featured' : ''}`}>
      <div className="pricing-card-head">
        <span className="pricing-eyebrow">{plan.eyebrow}</span>
        {isFeatured ? <strong>Best for active customers</strong> : null}
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
          <span className="pricing-eyebrow">Ledgr plans</span>
          <h1>Start free. Move to Pro when money management needs more control.</h1>
          <p>
            Ledgr Free stays useful for manual tracking. Pro becomes worth paying for when customers need recurring control,
            deeper reporting, transaction power tools, and unlimited planning space.
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
        {premiumValueRows.map((row) => (
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
              <strong>{row.premium}</strong>
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
