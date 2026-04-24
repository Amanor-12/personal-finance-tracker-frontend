import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';
import { useBillingAccess } from '../context/BillingAccessContext';
const baseFaqItems = [
  {
    question: 'Why does my workspace start empty?',
    answer: 'Ledgr does not seed fake money data. Your workspace only shows accounts, transactions, budgets, goals, and recurring payments you create or connect later.',
  },
  {
    question: 'Is billing the same as recurring payments?',
    answer: 'No. Billing is for your Ledgr subscription. Recurring payments are your personal bills and subscriptions.',
  },
  {
    question: 'Are protected routes real?',
    answer: 'Yes. Protected pages require a signed-in session before rendering and API calls use the stored auth token.',
  },
  {
    question: 'Where do bank connections fit?',
    answer: 'Manual accounts work now. Bank aggregation can be added later without changing the core account and transaction workflow.',
  },
];

function SupportPage({ currentUser, onLogout }) {
  const { access, billing, hasFeature, isLoading: isBillingLoading } = useBillingAccess();
  const [query, setQuery] = useState('');
  const isPremium = access.isPremium;
  const hasRecurringAccess = hasFeature('recurringPayments');
  const hasReportsAccess = hasFeature('reports');
  const planLabel = billing?.currentPlan?.name || (isPremium ? 'Premium' : 'Free');
  const supportPaths = useMemo(
    () => [
      {
        title: 'Set up accounts',
        body: 'Create manual accounts first so every transaction, budget, and goal has a clear money location.',
        cta: 'Open accounts',
        keywords: 'accounts wallets bank cash card setup',
        to: '/accounts',
      },
      {
        title: 'Record transactions',
        body: 'Track income, expenses, transfers, categories, notes, edits, and deletion from one ledger.',
        cta: 'Open transactions',
        keywords: 'transactions income expense transfer category delete edit ledger',
        to: '/transactions',
      },
      {
        title: 'Plan spending',
        body: 'Use budgets and goals together so day-to-day spend and longer-term targets stay connected.',
        cta: 'Open budget',
        keywords: 'budget goals spending plan saving',
        to: '/budget',
      },
      {
        title: hasRecurringAccess ? 'Track recurring bills' : 'Unlock recurring payments',
        body: hasRecurringAccess
          ? 'Subscriptions, rent, insurance, and memberships stay in one renewal queue with due dates and annualized cost.'
          : 'Recurring bills are part of Premium so active customers can see subscriptions and fixed costs before they hit.',
        cta: hasRecurringAccess ? 'Open subscriptions' : 'View premium',
        keywords: 'subscriptions recurring bills rent insurance premium renewals',
        to: hasRecurringAccess ? '/recurring' : '/pricing',
      },
      {
        title: hasReportsAccess ? 'Read advanced insights' : 'Unlock advanced reports',
        body: hasReportsAccess
          ? 'Backend-powered reporting answers real questions about merchants, categories, concentration, and cash flow.'
          : 'Reports are Premium because they move the user from recording money to understanding it with real backend analysis.',
        cta: hasReportsAccess ? 'Open insights' : 'View premium',
        keywords: 'reports insights analytics merchants concentration premium',
        to: hasReportsAccess ? '/reports' : '/pricing',
      },
      {
        title: isPremium ? 'Manage your premium plan' : 'Compare plans and billing',
        body: isPremium
          ? 'Open billing to manage invoices, payment methods, portal access, and subscription state.'
          : 'See what Premium adds, what Free still includes, and how billing stays separate from personal spending.',
        cta: isPremium ? 'Open billing' : 'View pricing',
        keywords: 'billing pricing plan invoices checkout stripe premium',
        to: isPremium ? '/billing' : '/pricing',
      },
    ],
    [hasRecurringAccess, hasReportsAccess, isPremium]
  );
  const faqItems = useMemo(
    () => [
      ...baseFaqItems,
      {
        question: 'What does Premium actually unlock?',
        answer: isPremium
          ? 'Your workspace currently includes recurring payment tracking, backend-powered reports, unlimited planning space, and priority support access.'
          : 'Premium unlocks recurring payment tracking, backend-powered reports, unlimited planning capacity, and priority support without changing your core manual tracking workflow.',
      },
    ],
    [isPremium]
  );
  const visiblePaths = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return supportPaths;
    }

    return supportPaths.filter((path) =>
      [path.title, path.body, path.keywords].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [query, supportPaths]);

  const rail = (
    <aside className="support-concierge-rail">
      <article className="support-rail-card support-rail-card-dark">
        <span>{isBillingLoading ? 'Plan access' : `${planLabel} support`}</span>
        <h3>{isPremium ? 'Priority support is active' : 'Self-serve support on Free'}</h3>
        <p>
          {isPremium
            ? 'Billing, premium tools, and priority support live inside the same workspace.'
            : 'Free customers get guided product help. Premium adds faster support and deeper finance tooling.'}
        </p>
        <Link to={isPremium ? '/billing' : '/pricing'}>{isPremium ? 'Manage billing' : 'See premium'}</Link>
      </article>
      <article className="support-rail-card">
        <span>Account controls</span>
        <h3>Use Settings</h3>
        <p>Profile, password, preferences, billing entry, and data controls live there.</p>
        <Link to="/settings">Open settings</Link>
      </article>
    </aside>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Help & Support"
      pageSubtitle="Find the right product area without leaving the finance workflow."
      rail={rail}
    >
      <section className="support-concierge-hero">
        <div>
          <span className="support-eyebrow">Ledgr concierge</span>
          <h2>Fast answers. Clear next steps.</h2>
          <p>Search the core product areas and move directly into the workflow that solves the issue.</p>
        </div>
        <div className="support-hero-tools">
          <label className="support-search">
            <span>Search help</span>
            <input
              aria-label="Search support content"
              type="search"
              value={query}
              placeholder="Try accounts, transactions, billing..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="support-plan-note">
            <div>
              <span>{isBillingLoading ? 'Loading access' : `${planLabel} workspace`}</span>
              <strong>
                {isPremium
                  ? 'Premium tools and priority support are already available.'
                  : 'Premium adds renewals, deeper reports, and faster support.'}
              </strong>
            </div>
            <Link to={isPremium ? '/billing' : '/pricing'}>{isPremium ? 'Manage plan' : 'View premium'}</Link>
          </div>
        </div>
      </section>

      <section className="support-path-grid" aria-label="Support paths">
        {visiblePaths.map((path) => (
          <article className="support-path-card" key={path.title}>
            <span className="support-eyebrow">{path.cta}</span>
            <h3>{path.title}</h3>
            <p>{path.body}</p>
            <Link to={path.to}>{path.cta}</Link>
          </article>
        ))}
      </section>

      {!visiblePaths.length ? (
        <section className="support-empty-search">
          <h3>No help result found</h3>
          <p>Try searching for account, transaction, budget, report, billing, or security.</p>
          <button type="button" onClick={() => setQuery('')}>
            Clear search
          </button>
        </section>
      ) : null}

      <section className="support-faq-card">
        <div className="support-faq-head">
          <span className="support-eyebrow">Common questions</span>
          <h3>Answers that matter for a real finance app</h3>
        </div>
        <div className="support-faq-list">
          {faqItems.map((item) => (
            <article key={item.question}>
              <h4>{item.question}</h4>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </FinanceLayout>
  );
}

export default SupportPage;
