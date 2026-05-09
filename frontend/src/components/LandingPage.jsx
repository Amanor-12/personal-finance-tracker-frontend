import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import './LandingPage.css';

const featureCards = [
  {
    eyebrow: 'Accounts',
    title: 'Keep every money location in one place.',
    body: 'Track checking, savings, credit cards, cash, and manual wallets without forcing fake balances into the workspace.',
  },
  {
    eyebrow: 'Transactions',
    title: 'Review movement clearly.',
    body: 'Search, filter, categorize, export, and clean up transaction history in a workspace built for real day-to-day money tracking.',
  },
  {
    eyebrow: 'Recurring',
    title: 'See fixed costs before they land.',
    body: 'Plus and Pro customers get a dedicated renewal workspace for subscriptions, bills, rent, and recurring financial pressure.',
  },
  {
    eyebrow: 'Insights',
    title: 'Move from tracking to understanding.',
    body: 'Rivo surfaces trends, concentration, pace, and pressure so financial decisions feel clearer instead of noisier.',
  },
];

const tierCards = [
  {
    plan: 'Free',
    tone: 'foundation',
    body: 'A serious manual tracking workspace with enough room to build habits before paying for more control.',
  },
  {
    plan: 'Plus',
    tone: 'control',
    body: 'Recurring bills, reports, exports, and unlimited planning for customers who actively manage their money every week.',
  },
  {
    plan: 'Pro',
    tone: 'intelligence',
    body: 'Deeper analysis, stronger planning signals, and higher-control workflows for customers who want more than recordkeeping.',
  },
];

const trustPoints = [
  {
    title: 'Private by default',
    body: 'Every user starts with an empty personal workspace. Rivo does not pad the product with fake balances or pretend money activity.',
  },
  {
    title: 'Clean upgrade path',
    body: 'Free stays useful. Plus adds control. Pro adds intelligence. Customers can understand the value before paying.',
  },
  {
    title: 'Built for real workflows',
    body: 'Accounts, transactions, budgets, goals, recurring costs, insights, billing, and settings all sit inside one connected product system.',
  },
];

function LandingPage({ currentUser }) {
  const primaryHref = currentUser ? '/dashboard' : '/signup';
  const primaryLabel = currentUser ? 'Open workspace' : 'Start free';
  const secondaryHref = currentUser ? '/billing' : '/pricing';
  const secondaryLabel = currentUser ? 'Manage plan' : 'View pricing';

  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <BrandLogo title="Rivo" subtitle="Personal finance workspace" tone="dark" />
        <nav aria-label="Rivo site navigation" className="landing-nav-links">
          <a href="#product">Product</a>
          <a href="#plans">Plans</a>
          <a href="#trust">Trust</a>
          <Link to={currentUser ? '/dashboard' : '/login'}>{currentUser ? 'Workspace' : 'Sign in'}</Link>
          <Link className="landing-nav-cta" to={primaryHref}>
            {primaryLabel}
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Rivo workspace</span>
          <h1>Personal finance, shaped for clarity.</h1>
          <p>
            Rivo gives customers one calm place to track accounts, transactions, budgets, goals, recurring costs, and the signals that matter before money drift gets expensive.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-button" to={primaryHref}>
              {primaryLabel}
            </Link>
            <Link className="landing-secondary-button" to={secondaryHref}>
              {secondaryLabel}
            </Link>
          </div>
          <div className="landing-hero-pills" aria-label="Rivo qualities">
            <span>Private</span>
            <span>Modern</span>
            <span>Manual first</span>
          </div>
        </div>

        <div className="landing-hero-visual" aria-hidden="true">
          <div className="landing-browser-shell">
            <div className="landing-browser-top">
              <span />
              <span />
              <span />
              <div className="landing-browser-bar" />
              <BrandLogo markOnly tone="dark" />
            </div>

            <div className="landing-browser-body">
              <article className="landing-focus-panel">
                <span className="landing-panel-chip">Overview</span>
                <strong>One place for the full money picture.</strong>
                <p>Customers start empty, then add only what actually belongs to them.</p>
                <div className="landing-mini-tags">
                  <span>Accounts</span>
                  <span>Budgets</span>
                  <span>Goals</span>
                </div>
              </article>

              <article className="landing-preview-card">
                <div className="landing-preview-card-head">
                  <span className="landing-card-dot-group">
                    <i />
                    <i />
                  </span>
                  <strong>Rivo Plus</strong>
                </div>
                <div className="landing-preview-card-body">
                  <span>Recurring control</span>
                  <strong>Upcoming renewals</strong>
                  <small>Built for real monthly pressure.</small>
                </div>
              </article>

              <article className="landing-side-column">
                <div className="landing-side-card">
                  <span>Workspace status</span>
                  <strong>Starts empty</strong>
                  <p>Add accounts, transactions, budgets, and goals when you are ready.</p>
                </div>
                <div className="landing-side-card landing-side-card-accent">
                  <span>Why customers upgrade</span>
                  <strong>Control first. Intelligence next.</strong>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-proof-strip" aria-label="Rivo product principles">
        <article>
          <span>No seeded finance data</span>
          <strong>Customers see their own money story, not a fake dashboard.</strong>
        </article>
        <article>
          <span>Connected product system</span>
          <strong>Overview reflects the real work happening in accounts, transactions, budgets, goals, and recurring bills.</strong>
        </article>
        <article>
          <span>Clear tier value</span>
          <strong>Free is useful. Plus adds control. Pro adds deeper financial intelligence.</strong>
        </article>
      </section>

      <section className="landing-section" id="product">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Product</span>
          <h2>The core money workflows customers actually care about.</h2>
          <p>Rivo is not a decorative dashboard. It is a working finance product built around clear action, clean structure, and trustworthy money visibility.</p>
        </div>

        <div className="landing-feature-grid">
          {featureCards.map((card) => (
            <article key={card.title} className="landing-feature-card">
              <span>{card.eyebrow}</span>
              <strong>{card.title}</strong>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="plans">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Plans</span>
          <h2>Three tiers with a clean value ladder.</h2>
          <p>Customers should understand exactly why they are staying free, moving to Plus, or paying for Pro.</p>
        </div>

        <div className="landing-tier-grid">
          {tierCards.map((card) => (
            <article key={card.plan} className={`landing-tier-card landing-tier-${card.tone}`}>
              <span>{card.plan}</span>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-trust-section" id="trust">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Trust</span>
          <h2>Built to feel calm, serious, and worth paying for.</h2>
          <p>Customers should feel that the product respects their money, their attention, and the difference between free utility and paid value.</p>
        </div>

        <div className="landing-trust-grid">
          {trustPoints.map((point) => (
            <article key={point.title} className="landing-trust-card">
              <strong>{point.title}</strong>
              <p>{point.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-footer-cta">
        <div>
          <span className="landing-eyebrow">Start with clarity</span>
          <h2>Open a finance workspace that feels deliberate from day one.</h2>
        </div>
        <div className="landing-hero-actions">
          <Link className="landing-primary-button" to={primaryHref}>
            {primaryLabel}
          </Link>
          <Link className="landing-secondary-button" to="/pricing">
            See plan details
          </Link>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
