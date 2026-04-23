import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';

const supportPaths = [
  {
    title: 'Set up accounts',
    body: 'Create manual accounts first so every transaction has a clear money location.',
    cta: 'Open accounts',
    keywords: 'accounts wallets bank cash card setup',
    to: '/accounts',
  },
  {
    title: 'Record transactions',
    body: 'Track income, expenses, transfers, categories, notes, edits, and deletion.',
    cta: 'Open transactions',
    keywords: 'transactions income expense transfer category delete edit',
    to: '/transactions',
  },
  {
    title: 'Plan spending',
    body: 'Use budgets and goals once you are ready to plan with real categories and amounts.',
    cta: 'Open budget',
    keywords: 'budget goals spending plan saving',
    to: '/budget',
  },
  {
    title: 'Review insights',
    body: 'Reports become useful after real transactions exist. Empty states stay honest until then.',
    cta: 'Open reports',
    keywords: 'reports insights analytics charts cash flow',
    to: '/reports',
  },
];

const faqItems = [
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
  const [query, setQuery] = useState('');
  const visiblePaths = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return supportPaths;
    }

    return supportPaths.filter((path) =>
      [path.title, path.body, path.keywords].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [query]);

  const rail = (
    <aside className="support-concierge-rail">
      <article className="support-rail-card support-rail-card-dark">
        <span>Support model</span>
        <h3>Self-serve first</h3>
        <p>Help should move users to the right action before they need direct contact.</p>
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
