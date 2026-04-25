import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';
import { billingPlans, billingStore, subscriptionStatusCopy } from '../utils/billingStore';

const formatDate = (value) => {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

function BillingSkeleton() {
  return (
    <div className="billing-skeleton-grid" aria-label="Loading billing workspace">
      <div className="billing-skeleton-card" />
      <div className="billing-skeleton-card" />
      <div className="billing-skeleton-card is-wide" />
    </div>
  );
}

function BillingPlanCard({ currentPlanId, isAvailable, isProcessing, onCheckout, plan }) {
  const isCurrent = currentPlanId === plan.id;
  const isFree = plan.id === 'free';

  return (
    <article className={`billing-plan-card${isCurrent ? ' is-current' : ''}`}>
      <div className="billing-plan-head">
        <span>{plan.eyebrow}</span>
        {isCurrent ? <strong>Current</strong> : null}
      </div>
      <h3>{plan.name}</h3>
      <p>{plan.description}</p>
      <div className="billing-plan-price">
        <strong>{plan.priceLabel || plan.price || '$0'}</strong>
        {plan.suffix ? <span>{plan.suffix}</span> : null}
      </div>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {isFree ? (
        <Link className="billing-secondary-action" to="/dashboard">
          Keep free plan
        </Link>
      ) : (
        <button className="billing-primary-action" type="button" disabled={isProcessing || !isAvailable} onClick={() => onCheckout(plan.id)}>
          {!isAvailable ? 'Billing unavailable' : isProcessing ? 'Starting checkout...' : 'Start checkout'}
        </button>
      )}
    </article>
  );
}

function BillingPage({ currentUser, onLogout }) {
  const [billing, setBilling] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState('');
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const loadBilling = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const overview = await billingStore.getOverview();
      setBilling(overview);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setErrorMessage(error.message || 'Billing could not load.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const plans = useMemo(
    () =>
      billingPlans.map((plan) => ({
        ...plan,
        ...(billing?.plans?.find((backendPlan) => backendPlan.id === plan.id) || {}),
      })),
    [billing?.plans]
  );
  const status = billing?.subscription?.status || 'none';
  const statusLabel = subscriptionStatusCopy[status] || status;
  const stripeConfigured = Boolean(billing?.provider?.configured);
  const premiumHighlights = billing?.access?.isPremium
    ? ['Recurring renewals workspace', 'Advanced insights and reports', 'Unlimited planning capacity', 'Saved views and export tools']
    : ['Keep free plan limits', 'Upgrade when you need deeper control', 'Manage payment details in one place', 'Invoices stay attached to the same account'];

  const handleCheckout = async (planId) => {
    setProcessingPlanId(planId);
    setActionMessage('');

    try {
      const session = await billingStore.createCheckoutSession(planId);

      if (session?.url) {
        window.location.assign(session.url);
        return;
      }

      setActionMessage('Checkout session was created, but no redirect URL was returned.');
    } catch (error) {
      setActionMessage(error.message || 'Checkout could not start.');
    } finally {
      setProcessingPlanId('');
    }
  };

  const handlePortal = async () => {
    setIsOpeningPortal(true);
    setActionMessage('');

    try {
      const session = await billingStore.createPortalSession();

      if (session?.url) {
        window.location.assign(session.url);
        return;
      }

      setActionMessage('Billing portal session was created, but no redirect URL was returned.');
    } catch (error) {
      setActionMessage(error.message || 'Billing portal could not open.');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const rail = (
    <aside className="billing-sidecar">
      <article className="billing-readiness-card">
        <span>Plan value</span>
        <h3>{billing?.access?.isPremium ? 'Premium is active' : 'Free plan is active'}</h3>
        <p>
          {billing?.access?.isPremium
            ? 'Recurring control, deeper reporting, and unlimited planning are live in this workspace.'
            : 'Free keeps manual tracking clean. Premium is there when the workspace needs more automation, analysis, and room to scale.'}
        </p>
        <div className="billing-config-list">
          {premiumHighlights.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>

      <article className="billing-sidecar-dark">
        <span>Confidence</span>
        <h3>{stripeConfigured ? 'Manage changes in one billing hub' : 'Billing becomes available once payments are configured'}</h3>
        <p>
          {stripeConfigured
            ? 'Update payment details, review invoices, and move between plans without touching the finance data inside the workspace.'
            : 'Once billing is configured, customers can upgrade, review invoices, and manage payment methods from here.'}
        </p>
      </article>
    </aside>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Billing"
      pageSubtitle="Choose the right Ledgr plan, manage invoices, and keep premium access clear."
      rail={rail}
    >
      <section className="billing-studio-hero">
        <div>
          <span className="billing-eyebrow">Subscription workspace</span>
          <h2>{billing?.currentPlan?.name || 'Free'} plan</h2>
          <p>See what the current plan unlocks, move to Premium when it adds real value, and keep billing changes simple.</p>
        </div>
        <div className="billing-status-card">
          <span>Status</span>
          <strong>{statusLabel}</strong>
          <p>Renewal: {formatDate(billing?.subscription?.currentPeriodEnd)}</p>
        </div>
      </section>

      {isLoading ? <BillingSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <section className="billing-empty-state">
          <span>Billing unavailable</span>
          <h3>{errorMessage}</h3>
          <p>Retry after the API is running. Subscription state is never guessed in the frontend.</p>
          <button className="billing-primary-action" type="button" onClick={loadBilling}>
            Retry
          </button>
        </section>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          {actionMessage ? <p className="billing-action-message">{actionMessage}</p> : null}

          <section className="billing-control-strip">
            <article>
              <span>Current plan</span>
              <strong>{billing?.currentPlan?.name || 'Free'}</strong>
              <p>{billing?.currentPlan?.priceLabel || '$0'} for the finance workspace and its current feature set.</p>
            </article>
            <article>
              <span>Subscription status</span>
              <strong>{statusLabel}</strong>
              <p>Plan access responds to real subscription states instead of pretending a payment went through.</p>
            </article>
            <article>
              <span>Customer portal</span>
              <strong>{stripeConfigured ? 'Available' : 'Coming online'}</strong>
              <button className="billing-secondary-action" type="button" disabled={isOpeningPortal || !stripeConfigured} onClick={handlePortal}>
                {isOpeningPortal ? 'Opening...' : 'Manage billing'}
              </button>
            </article>
            <article>
              <span>Workspace access</span>
              <strong>{billing?.access?.isPremium ? 'Premium unlocked' : 'Free limits active'}</strong>
              <p>
                {billing?.access?.isPremium
                  ? 'Recurring control, advanced reporting, saved transaction workflows, and unlimited planning are active.'
                  : `Free includes ${billing?.access?.limits?.accounts ?? 0} accounts, ${billing?.access?.limits?.budgets ?? 0} budgets, and ${billing?.access?.limits?.goals ?? 0} goals.`}
              </p>
            </article>
          </section>

          <section className="billing-value-grid" aria-label="Premium plan value">
            <article>
              <span>Premium unlocks</span>
              <strong>Recurring command center</strong>
              <p>Track subscriptions, bills, rent, and renewals before they hit the account.</p>
            </article>
            <article>
              <span>Premium unlocks</span>
              <strong>Deeper analysis</strong>
              <p>Use server-backed insights to understand concentration, pace, and cash flow changes.</p>
            </article>
            <article>
              <span>Premium unlocks</span>
              <strong>Power workflows</strong>
              <p>Save ledger views, export data, and use smarter planning signals across budgets and goals.</p>
            </article>
          </section>

          <section className="billing-plan-grid" aria-label="Ledgr plans">
            {plans.map((plan) => (
              <BillingPlanCard
                key={plan.id}
                currentPlanId={billing?.currentPlan?.id}
                isAvailable={stripeConfigured}
                isProcessing={processingPlanId === plan.id}
                onCheckout={handleCheckout}
                plan={plan}
              />
            ))}
          </section>

          <section className="billing-invoices">
            <div className="billing-section-head">
              <div>
                <span className="billing-eyebrow">Invoice history</span>
                <h3>Receipts from Stripe</h3>
              </div>
              <Link to="/pricing">View pricing</Link>
            </div>

            {billing?.invoices?.length ? (
              <div className="billing-invoice-table">
                {billing.invoices.map((invoice) => (
                  <div key={invoice.id} className="billing-invoice-row">
                    <span>{invoice.number}</span>
                    <strong>{invoice.amountPaid}</strong>
                    <em>{invoice.status}</em>
                  </div>
                ))}
              </div>
            ) : (
              <div className="billing-invoice-empty">
                <strong>No invoices yet</strong>
                <p>Invoices will appear after Stripe returns billing records for this account.</p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </FinanceLayout>
  );
}

export default BillingPage;
