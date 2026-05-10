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
  { label: 'CSV export', free: '-', plus: 'Included', pro: 'Included' },
  { label: 'Saved transaction views', free: '-', plus: 'Included', pro: 'Included' },
  { label: 'AI report briefings', free: '-', plus: 'Included', pro: 'Included' },
  { label: 'Cash forecasting', free: '-', plus: '-', pro: 'Included' },
  { label: 'Bulk categorization', free: '-', plus: '-', pro: 'Included' },
  { label: 'AI transaction review', free: '-', plus: '-', pro: 'Included' },
  { label: 'Milestone guidance', free: '-', plus: 'Limited', pro: 'Included' },
  { label: 'Annual billing savings', free: '-', plus: '-', pro: 'Included' },
];

const tierValueRows = [
  {
    eyebrow: 'Plus value',
    title: 'Control recurring costs before they hit',
    body: 'Plus gives active customers one place to manage subscriptions, rent, insurance, and other fixed charges with export-ready workflows.',
  },
  {
    eyebrow: 'Pro control',
    title: 'Handle heavier workflows with less manual cleanup',
    body: 'Pro adds cash forecasting, bulk actions, AI transaction review, and denser milestone guidance for customers running a heavier finance workflow.',
  },
  {
    eyebrow: 'Real operations',
    title: 'Pay for less manual cleanup, not just more pages',
    body: 'Both paid tiers save time, while Pro becomes the higher-control workspace for customers who want faster cleanup and premium support.',
  },
];

const tierSignatures = [
  {
    plan: 'Free',
    title: 'Manual foundation',
    body: 'Track money cleanly, build habits, and keep the workspace calm before you need automation.',
  },
  {
    plan: 'Plus',
    title: 'Control layer',
    body: 'Run recurring bills, exports, and everyday money operations without losing time to manual cleanup.',
  },
  {
    plan: 'Pro',
    title: 'Higher-control layer',
    body: 'Use forecasting, bulk controls, deeper signals, and premium support when financial decisions need more than recordkeeping.',
  },
];

const upgradeMoments = [
  {
    eyebrow: 'Stay on Free',
    title: 'When manual tracking still feels calm',
    body: 'Free is enough when customers only need a clean place to record accounts, transactions, budgets, and goals without operational pressure.',
  },
  {
    eyebrow: 'Move to Plus',
    title: 'When fixed costs and exports start costing time',
    body: 'Plus becomes worth it when recurring bills, CSV workflows, and unlimited planning save enough cleanup to justify a paid workspace.',
  },
  {
    eyebrow: 'Move to Pro',
    title: 'When cleanup and review volume increase',
    body: 'Pro becomes worth it when customers want forecasting, bulk controls, AI review help, and stronger milestone guidance around a heavier workflow.',
  },
];

const pricingFaq = [
  {
    question: 'Can I stay on the free plan long term?',
    answer: 'Yes. Free is designed for manual tracking with starter limits, not as a forced trial.',
  },
  {
    question: 'What is the difference between Plus and Pro?',
    answer: 'Plus is for active manual money management: recurring bills, exports, reporting, saved views, and AI report briefings. Pro adds cash forecasting, bulk ledger tools, AI transaction review, expanded milestone guidance, and annual billing savings.',
  },
  {
    question: 'Can I try Pro before paying?',
    answer: 'Yes. Signed-in users can start one free 10-day Pro trial. After it expires, paid gates close again unless a Pro subscription is active.',
  },
  {
    question: 'Do I lose data if I upgrade later?',
    answer: 'No. Your accounts, transactions, budgets, and goals stay in the same workspace when you move between plans.',
  },
];

function PricingCard({ currentUser, isFeatured, isProcessing, isTrialProcessing, onCheckout, onStartTrial, plan }) {
  const isFree = plan.id === 'free';
  const isPro = plan.id === 'pro_annual';

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
      <div className="pricing-tier-tagline">
        <span>{plan.name === 'Free' ? 'Starter workspace' : plan.name === 'Plus' ? 'Operational control' : 'High-control intelligence'}</span>
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
        <div className="pricing-plan-actions">
          {isPro ? (
            <button className="pricing-primary-button" type="button" disabled={isTrialProcessing} onClick={onStartTrial}>
              {isTrialProcessing ? 'Starting trial...' : 'Start 10-day free trial'}
            </button>
          ) : null}
          <button
            className={isPro ? 'pricing-secondary-button' : 'pricing-primary-button'}
            type="button"
            disabled={isProcessing}
            onClick={() => onCheckout(plan.id)}
          >
            {isProcessing ? 'Starting checkout...' : `Choose ${plan.name}`}
          </button>
        </div>
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
  const [isTrialProcessing, setIsTrialProcessing] = useState(false);
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

      setMessage('Checkout opened, but Rivo could not continue to the secure payment page.');
    } catch (error) {
      setMessage(error.message || 'Checkout could not start.');
    } finally {
      setProcessingPlanId('');
    }
  };

  const handleStartTrial = async () => {
    setIsTrialProcessing(true);
    setMessage('');

    try {
      await billingStore.startProTrial();
      navigate('/billing');
    } catch (error) {
      setMessage(error.message || 'The Pro trial could not start.');
    } finally {
      setIsTrialProcessing(false);
    }
  };

  return (
    <main className="pricing-shell pricing-market-shell">
      <header className="pricing-nav">
        <BrandLogo compact subtitle="" title="Rivo" tone="dark" />
        <nav aria-label="Pricing navigation">
          <Link to={currentUser ? '/dashboard' : '/login'}>{currentUser ? 'Dashboard' : 'Sign in'}</Link>
          <button type="button" onClick={() => navigate(currentUser ? '/billing' : '/signup')}>
            {currentUser ? 'Billing' : 'Get started'}
          </button>
        </nav>
      </header>

      <section className="pricing-market-hero">
        <div>
          <span className="pricing-eyebrow">Rivo plans</span>
          <h1>Start free. Move to Plus for control. Move to Pro for AI-assisted review.</h1>
          <p>
            Free stays useful for manual tracking. Plus is for stronger control. Pro is for forecasting, heavier cleanup, AI-assisted review, and deeper milestone guidance.
          </p>
        </div>
        <div className="pricing-toggle" aria-label="Plan framing">
          <button className="is-active" type="button">
            Real tiers
          </button>
        </div>
      </section>

      {message ? <p className="pricing-message">{message}</p> : null}

      <section className="pricing-market-grid" aria-label="Rivo pricing plans">
        {visiblePlans.map((plan) => (
          <PricingCard
            key={plan.id}
            currentUser={currentUser}
            isFeatured={plan.id !== 'free'}
            isProcessing={processingPlanId === plan.id}
            isTrialProcessing={isTrialProcessing && plan.id === 'pro_annual'}
            onCheckout={handleCheckout}
            onStartTrial={handleStartTrial}
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

      <section className="pricing-proof-grid pricing-signature-grid" aria-label="Tier signatures">
        {tierSignatures.map((item) => (
          <article key={item.plan}>
            <span>{item.plan}</span>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="pricing-proof-grid" aria-label="Upgrade timing guidance">
        {upgradeMoments.map((item) => (
          <article key={item.title}>
            <span>{item.eyebrow}</span>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="pricing-comparison">
        <div>
          <span className="pricing-eyebrow">Plan comparison</span>
          <h2>Clear enough to trust before upgrading.</h2>
        </div>
        <div className="pricing-comparison-table">
          <div className="pricing-comparison-head" aria-hidden="true">
            <span>Feature</span>
            <strong>Free</strong>
            <strong>Plus</strong>
            <strong>Pro</strong>
          </div>
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
