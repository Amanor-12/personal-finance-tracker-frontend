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

function BillingPlanCard({
  currentPlanId,
  isAvailable,
  isProcessing,
  isTrialProcessing,
  onCheckout,
  onManageCurrentPlan,
  onStartTrial,
  plan,
  recommendedPlanId,
  trial,
}) {
  const isCurrent = currentPlanId === plan.id || currentPlanId === plan.checkoutPlanId;
  const isFree = plan.id === 'free';
  const isPro = plan.id === 'pro_annual' || plan.checkoutPlanId === 'premium_annual';
  const isRecommended = plan.id === recommendedPlanId;
  const canStartTrial = isPro && !isCurrent && trial?.eligible;

  return (
    <article className={`billing-plan-card${isCurrent ? ' is-current' : ''}`}>
      <div className="billing-plan-head">
        <span>{plan.eyebrow}</span>
        {isCurrent ? <strong>Current</strong> : null}
        {!isCurrent && isRecommended ? <em>Recommended</em> : null}
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
      {isCurrent ? (
        isFree ? (
          <button className="billing-secondary-action" type="button" disabled>
            Current plan
          </button>
        ) : (
          <button className="billing-secondary-action" type="button" disabled={!isAvailable || isProcessing} onClick={onManageCurrentPlan}>
            {isProcessing ? 'Opening...' : 'Manage current plan'}
          </button>
        )
      ) : isFree ? (
        <Link className="billing-secondary-action" to="/dashboard">
          Keep Free
        </Link>
      ) : (
        <div className="billing-plan-actions">
          {canStartTrial ? (
            <button className="billing-primary-action" type="button" disabled={isTrialProcessing} onClick={onStartTrial}>
              {isTrialProcessing ? 'Starting trial...' : 'Start 10-day free trial'}
            </button>
          ) : null}
          <button
            className={canStartTrial ? 'billing-secondary-action' : 'billing-primary-action'}
            type="button"
            disabled={isProcessing || !isAvailable}
            onClick={() => onCheckout(plan.id)}
          >
            {!isAvailable ? 'Billing unavailable' : isProcessing ? 'Starting checkout...' : `Choose ${plan.name}`}
          </button>
        </div>
      )}
    </article>
  );
}

function BillingPage({ currentUser, onLogout }) {
  const [billing, setBilling] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
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
  const currentPlanId = billing?.currentPlan?.id || 'free';
  const isProTrial = activeTier === 'pro' && status === 'trialing';
  const recommendedPlanId = activeTier === 'free' ? 'plus_monthly' : activeTier === 'plus' ? 'pro_annual' : '';
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

      setActionMessage('Checkout opened, but Rivo could not continue to the secure payment page.');
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

      setActionMessage('Billing management opened, but Rivo could not continue to the secure billing page.');
    } catch (error) {
      setActionMessage(error.message || 'Billing portal could not open.');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    setActionMessage('');

    try {
      const overview = await billingStore.startProTrial();
      setBilling(overview);
      setActionMessage('Your 10-day Pro trial is active. Paid gates are unlocked only until the trial expires.');
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setActionMessage(error.message || 'The Pro trial could not start.');
    } finally {
      setIsStartingTrial(false);
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
              ? 'Plan comparison is available, but live checkout and account billing are not enabled in this environment yet.'
              : 'See the current plan, renewal state, and next billing action in one place.'}
          </p>
        </div>
        <div className="billing-status-card">
          <span>Status</span>
          <strong>{statusLabel}</strong>
          <p>
            {isProTrial
              ? `Trial ends: ${formatDate(billing?.subscription?.trialEndsAt)}`
              : `Renewal: ${formatDate(billing?.subscription?.currentPeriodEnd)}`}
          </p>
        </div>
      </section>

      {isLoading ? <BillingSkeleton /> : null}

      {!isLoading && isBillingUnavailableInDeployment ? (
        <section className="billing-empty-state">
          <span>Billing not enabled</span>
          <h3>Live billing is not enabled in this environment yet.</h3>
          <p>Use pricing to review plans. In-app billing management appears once checkout, invoices, and the billing portal are active.</p>
          <Link className="billing-primary-action" to="/pricing">
            Open pricing
          </Link>
        </section>
      ) : null}

      {!isLoading && !isBillingUnavailableInDeployment && errorMessage ? (
        <section className="billing-empty-state">
          <span>Billing unavailable</span>
          <h3>{errorMessage}</h3>
          <p>Retry in a moment. Subscription access is tied to your secure account state.</p>
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
              <p>Access follows the secure subscription state attached to this account.</p>
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
            <article>
              <span>Next step</span>
              <strong>{activeTier === 'pro' ? 'Stay on Pro' : activeTier === 'plus' ? 'Consider Pro' : 'Start with Plus'}</strong>
              <p>
                {activeTier === 'pro'
                  ? 'Your highest-control plan is already active.'
                  : activeTier === 'plus'
                    ? 'Move to Pro when forecasting, AI ledger review, and milestone guidance start saving real time.'
                    : 'Move to Plus when recurring bills, exports, and reporting become part of the weekly workflow.'}
              </p>
            </article>
          </section>

          <section className="billing-plan-grid" aria-label="Rivo plans">
            {plans.map((plan) => (
              <BillingPlanCard
                key={plan.id}
                currentPlanId={currentPlanId}
                isAvailable={stripeConfigured}
                isProcessing={processingPlanId === plan.id || (isOpeningPortal && currentPlanId === plan.id)}
                isTrialProcessing={isStartingTrial && plan.id === 'pro_annual'}
                onCheckout={handleCheckout}
                onManageCurrentPlan={handlePortal}
                onStartTrial={handleStartTrial}
                plan={plan}
                recommendedPlanId={recommendedPlanId}
                trial={billing?.trial}
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
                    <div className="billing-invoice-copy">
                      <span>{invoice.number}</span>
                      <small>
                        {invoice.paidAt
                          ? `Paid ${formatDate(invoice.paidAt)}`
                          : invoice.issuedAt
                            ? `Issued ${formatDate(invoice.issuedAt)}`
                            : 'Billing receipt'}
                      </small>
                    </div>
                    <em className={`billing-invoice-status billing-invoice-status-${invoice.status || 'open'}`}>
                      {invoice.status}
                    </em>
                    <div className="billing-invoice-meta">
                      <strong>{invoice.amountPaid}</strong>
                      {invoice.hostedInvoiceUrl ? (
                        <a href={invoice.hostedInvoiceUrl} rel="noreferrer" target="_blank">
                          View receipt
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="billing-invoice-empty">
                <strong>No invoices yet</strong>
                <p>Invoices will appear here once this account completes a paid billing cycle.</p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </FinanceLayout>
  );
}

export default BillingPage;

