import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';
import { useBillingAccess } from '../context/BillingAccessContext';
import { getPlanDisplayName } from '../utils/billingStore';
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
  const isPlus = access.tier === 'plus' || access.tier === 'pro';
  const isPro = access.tier === 'pro';
  const hasRecurringAccess = hasFeature('recurringPayments');
  const hasReportsAccess = hasFeature('reports');
  const planLabel = getPlanDisplayName(billing?.currentPlan?.id, billing?.currentPlan?.name || (isPro ? 'Pro' : isPlus ? 'Plus' : 'Free'));
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
              : 'Recurring bills start in Plus so active customers can see subscriptions and fixed costs before they hit.',
        cta: hasRecurringAccess ? 'Open subscriptions' : 'View Plus',
        keywords: 'subscriptions recurring bills rent insurance plus pro renewals',
        to: hasRecurringAccess ? '/recurring' : '/pricing',
      },
      {
        title: hasReportsAccess ? 'Read advanced insights' : 'Unlock advanced reports',
        body: hasReportsAccess
          ? 'Backend-powered reporting answers real questions about merchants, categories, concentration, and cash flow.'
          : 'Reports begin in Plus because they move the user from recording money to understanding it with real backend analysis.',
        cta: hasReportsAccess ? 'Open insights' : 'View Plus',
        keywords: 'reports insights analytics merchants concentration plus pro',
        to: hasReportsAccess ? '/reports' : '/pricing',
      },
      {
        title: isPro ? 'Manage your Pro plan' : isPlus ? 'Manage your Plus plan' : 'Compare plans and billing',
        body: isPro
          ? 'Open billing to manage invoices, payment methods, portal access, and subscription state.'
          : isPlus
            ? 'Open billing to manage your paid workspace and compare whether Pro adds enough extra intelligence for you.'
            : 'See what Plus adds, what Pro adds, what Free still includes, and how billing stays separate from personal spending.',
        cta: isPlus ? 'Open billing' : 'View pricing',
        keywords: 'billing pricing plan invoices checkout stripe pro',
        to: isPlus ? '/billing' : '/pricing',
      },
    ],
    [hasRecurringAccess, hasReportsAccess, isPlus, isPro]
  );
  const faqItems = useMemo(
    () => [
      ...baseFaqItems,
      {
        question: 'What do Plus and Pro actually unlock?',
        answer: isPro
          ? 'Your workspace currently includes recurring payment tracking, backend-powered reports, unlimited planning, priority support, and the deeper Pro intelligence layer.'
          : isPlus
            ? 'Plus unlocks recurring payment tracking, backend-powered reports, unlimited planning, exports, and saved views. Pro adds stronger intelligence, forecasting, and priority support on top.'
            : 'Plus unlocks recurring payment tracking, backend-powered reports, unlimited planning, exports, and saved views. Pro adds stronger intelligence, forecasting, and priority support on top.',
      },
    ],
    [isPlus, isPro]
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
        <h3>{isPro ? 'Priority support is active' : isPlus ? 'Paid workspace support is active' : 'Self-serve support on Free'}</h3>
        <p>
          {isPro
            ? 'Billing, Pro tools, and priority support live inside the same workspace.'
            : isPlus
              ? 'Plus customers get guided product help around recurring control, exports, and insights. Pro adds faster support and deeper finance intelligence.'
              : 'Free customers get guided product help. Plus adds the first paid control layer, and Pro adds deeper finance tooling.'}
        </p>
        <Link to={isPlus ? '/billing' : '/pricing'}>{isPlus ? 'Manage billing' : 'See plans'}</Link>
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
                {isPro
                  ? 'Pro tools and priority support are already available.'
                  : isPlus
                    ? 'Plus tools are active. Pro adds deeper intelligence and faster support.'
                    : 'Plus adds renewals and reports. Pro adds deeper intelligence and faster support.'}
              </strong>
            </div>
            <Link to={isPlus ? '/billing' : '/pricing'}>{isPlus ? 'Manage plan' : 'View plans'}</Link>
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
