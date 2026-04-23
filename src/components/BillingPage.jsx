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

function BillingPlanCard({ currentPlanId, isProcessing, onCheckout, plan }) {
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
        <button className="billing-primary-action" type="button" disabled={isProcessing} onClick={() => onCheckout(plan.id)}>
          {isProcessing ? 'Starting checkout...' : 'Start checkout'}
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
  const missingConfig = billing?.provider?.missing || [];

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
        <span>Stripe readiness</span>
        <h3>{stripeConfigured ? 'Configured' : 'Configuration needed'}</h3>
        <p>Paid plan actions call protected backend routes. The client does not fake subscription success.</p>
        {missingConfig.length ? (
          <div className="billing-config-list">
            {missingConfig.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
      </article>

      <article className="billing-sidecar-dark">
        <span>Billing separation</span>
        <h3>App billing is not personal spending</h3>
        <p>Ledgr subscription billing stays separate from the user's tracked recurring payments.</p>
      </article>
    </aside>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Billing"
      pageSubtitle="Manage the Ledgr subscription with Stripe-ready checkout, portal, and invoice states."
      rail={rail}
    >
      <section className="billing-studio-hero">
        <div>
          <span className="billing-eyebrow">Subscription workspace</span>
          <h2>{billing?.currentPlan?.name || 'Free'} plan</h2>
          <p>Review status, choose a plan, open the customer portal, and keep invoices ready for real Stripe records.</p>
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
              <p>{billing?.currentPlan?.priceLabel || '$0'} billed through Ledgr.</p>
            </article>
            <article>
              <span>Subscription status</span>
              <strong>{statusLabel}</strong>
              <p>Supports trialing, active, past due, incomplete, canceled, and none.</p>
            </article>
            <article>
              <span>Customer portal</span>
              <strong>{stripeConfigured ? 'Available' : 'Awaiting config'}</strong>
              <button className="billing-secondary-action" type="button" disabled={isOpeningPortal} onClick={handlePortal}>
                {isOpeningPortal ? 'Opening...' : 'Manage billing'}
              </button>
            </article>
          </section>

          <section className="billing-plan-grid" aria-label="Ledgr plans">
            {plans.map((plan) => (
              <BillingPlanCard
                key={plan.id}
                currentPlanId={billing?.currentPlan?.id}
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
