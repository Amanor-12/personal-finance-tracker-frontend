import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';
import { useServiceCapabilities } from '../context/useServiceCapabilities';
import { billingPlans, billingStore, getPlanDisplayName, subscriptionStatusCopy } from '../utils/billingStore';

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
  const isCurrent = currentPlanId === plan.id || currentPlanId === plan.checkoutPlanId;
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
          Keep Free
        </Link>
      ) : (
        <button className="billing-primary-action" type="button" disabled={isProcessing || !isAvailable} onClick={() => onCheckout(plan.id)}>
          {!isAvailable ? 'Billing unavailable' : isProcessing ? 'Starting checkout...' : `Choose ${plan.name}`}
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
  const { isLoading: isCapabilitiesLoading, supports } = useServiceCapabilities();
  const supportsBillingWorkspace = supports('billing');
  const isBillingUnavailableInDeployment = !isCapabilitiesLoading && !supportsBillingWorkspace;

  const loadBilling = useCallback(async () => {
    if (isBillingUnavailableInDeployment) {
      setBilling(null);
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

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
  }, [isBillingUnavailableInDeployment, onLogout]);

  useEffect(() => {
    if (isCapabilitiesLoading) {
      return;
    }

    loadBilling();
  }, [isCapabilitiesLoading, loadBilling]);

  const plans = useMemo(
    () =>
      billingPlans.map((plan) => ({
        ...plan,
        ...(billing?.plans?.find((backendPlan) => backendPlan.id === plan.id || backendPlan.id === plan.checkoutPlanId) || {}),
      })),
    [billing?.plans]
  );
  const status = billing?.subscription?.status || 'none';
  const statusLabel = subscriptionStatusCopy[status] || status;
  const stripeConfigured = Boolean(billing?.provider?.configured);
  const activeTier = billing?.access?.tier || 'free';
  const tierHighlights =
    activeTier === 'pro'
      ? ['Cash forecasting is available', 'AI transaction review is available', 'Expanded milestone guidance is available', 'Paid workspace limits are lifted']
      : activeTier === 'plus'
        ? ['Renewal tracking is active', 'Unlimited planning is active', 'Saved views and CSV export are active', 'AI report briefings are available']
        : ['Keep Free tier limits', 'Move to Plus for stronger control', 'Move to Pro for AI review tools', 'Invoices stay attached to the same account'];

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
        <span>Current tier</span>
        <h3>{activeTier === 'pro' ? 'Pro is active' : activeTier === 'plus' ? 'Plus is active' : 'Free is active'}</h3>
        <p>
          {activeTier === 'pro'
            ? 'AI review, milestone guidance, and higher-control workflow tools are active for this workspace.'
            : activeTier === 'plus'
              ? 'Recurring control, reporting, exports, and AI briefings are active for this workspace.'
              : 'Free keeps the workspace on manual tracking until an upgrade is genuinely worth it.'}
        </p>
        <div className="billing-config-list">
          {tierHighlights.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>

      <article className="billing-sidecar-dark">
        <span>Billing actions</span>
        <h3>{stripeConfigured ? 'Manage plan changes in one place' : 'Checkout comes online after payments are configured'}</h3>
        <p>
          {stripeConfigured
            ? 'Use the billing portal for payment methods, invoices, cancellations, and plan changes without affecting finance records.'
            : 'Plan comparison is ready now. Checkout, invoices, and payment methods will become available after Stripe is configured.'}
        </p>
      </article>
    </aside>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Billing"
      pageSubtitle="Manage plan access, invoices, and billing actions without touching finance data."
      rail={rail}
    >
      <section className="billing-studio-hero">
        <div>
          <span className="billing-eyebrow">Subscription workspace</span>
          <h2>{getPlanDisplayName(billing?.currentPlan?.id, billing?.currentPlan?.name)} plan</h2>
          <p>
            {isBillingUnavailableInDeployment
              ? 'Plan comparison is available, but live checkout and account billing are not enabled in this deployment yet.'
              : 'See the current plan, renewal state, and next billing action in one place.'}
          </p>
        </div>
        <div className="billing-status-card">
          <span>Status</span>
          <strong>{statusLabel}</strong>
          <p>Renewal: {formatDate(billing?.subscription?.currentPeriodEnd)}</p>
        </div>
      </section>

      {isLoading ? <BillingSkeleton /> : null}

      {!isLoading && isBillingUnavailableInDeployment ? (
        <section className="billing-empty-state">
          <span>Billing not enabled</span>
          <h3>This deployment does not have a live billing backend yet.</h3>
          <p>Use pricing to review plans. Only expose in-app billing management after checkout, invoices, and portal actions are wired to a real service.</p>
          <Link className="billing-primary-action" to="/pricing">
            Open pricing
          </Link>
        </section>
      ) : null}

      {!isLoading && !isBillingUnavailableInDeployment && errorMessage ? (
        <section className="billing-empty-state">
          <span>Billing unavailable</span>
          <h3>{errorMessage}</h3>
          <p>Retry once the finance service is available. Subscription state always comes from account data returned by the backend.</p>
          <button className="billing-primary-action" type="button" onClick={loadBilling}>
            Retry
          </button>
        </section>
      ) : null}

      {!isLoading && !isBillingUnavailableInDeployment && !errorMessage ? (
        <>
          {actionMessage ? <p className="billing-action-message">{actionMessage}</p> : null}

          <section className="billing-control-strip">
            <article>
              <span>Current plan</span>
              <strong>{getPlanDisplayName(billing?.currentPlan?.id, billing?.currentPlan?.name)}</strong>
              <p>{billing?.currentPlan?.priceLabel || '$0'} for the current workspace access level.</p>
            </article>
            <article>
              <span>Subscription status</span>
              <strong>{statusLabel}</strong>
              <p>Access follows the real subscription state returned by the backend.</p>
            </article>
            <article>
              <span>Customer portal</span>
              <strong>{stripeConfigured ? 'Available' : 'Unavailable'}</strong>
              <button className="billing-secondary-action" type="button" disabled={isOpeningPortal || !stripeConfigured} onClick={handlePortal}>
                {isOpeningPortal ? 'Opening...' : 'Manage billing'}
              </button>
            </article>
            <article>
              <span>Workspace access</span>
              <strong>{activeTier === 'pro' ? 'Pro unlocked' : activeTier === 'plus' ? 'Plus unlocked' : 'Free limits active'}</strong>
              <p>
                {activeTier === 'pro'
                  ? 'Recurring, reports, AI briefings, AI review, and milestone guidance are active.'
                  : activeTier === 'plus'
                    ? 'Recurring, exports, reports, saved views, and AI briefings are active.'
                  : `Free includes ${billing?.access?.limits?.accounts ?? 0} accounts, ${billing?.access?.limits?.budgets ?? 0} budgets, and ${billing?.access?.limits?.goals ?? 0} goals.`}
              </p>
            </article>
          </section>

          <section className="billing-plan-grid" aria-label="Rivo plans">
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

          {!stripeConfigured ? (
            <section className="billing-empty-state">
              <span>Checkout unavailable</span>
              <h3>Billing actions will appear once payments are configured.</h3>
              <p>Plan structure is ready. Stripe checkout, invoices, and the customer portal will activate after billing keys are connected.</p>
            </section>
          ) : null}

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

