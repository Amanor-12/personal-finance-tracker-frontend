import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';
import { FeatureGate } from './billing/FeatureGate';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
import DeleteRecurringDialog from './recurring/DeleteRecurringDialog';
import RecurringFormDialog from './recurring/RecurringFormDialog';
import RecurringIcon from './recurring/RecurringIcon';
import { formatDaysUntil, formatRecurringCurrency, formatRecurringDate, getFrequencyLabel } from './recurring/recurringUtils';
import { useBillingAccess } from '../context/BillingAccessContext';
import { accountStore } from '../utils/accountStore';
import { financeStore } from '../utils/financeStore';

const summarizePayments = (payments) =>
  payments.reduce(
    (summary, payment) => {
      if (payment.status === 'active') {
        summary.active += 1;
        summary.monthly += payment.monthlyAmount;
        summary.annual += payment.annualAmount;
      }

      return summary;
    },
    { active: 0, annual: 0, monthly: 0 }
  );

function RecurringPage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const { hasFeature, isLoading: isBillingLoading, refreshBillingAccess } = useBillingAccess();
  const hasRecurringAccess = hasFeature('recurringPayments');
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const loadPayments = async () => {
      if (isBillingLoading) {
        return;
      }

      if (!hasRecurringAccess) {
        setPayments([]);
        setCategories([]);
        setAccounts([]);
        setLoadError('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const [nextPayments, nextCategories, nextAccounts] = await Promise.all([
          financeStore.getRecurringPaymentsForUser(currentUser.id),
          financeStore.getCategoriesForUser(currentUser.id),
          accountStore.getAccountsForUser(currentUser.id),
        ]);

        if (isCancelled) {
          return;
        }

        setPayments(nextPayments);
        setCategories(nextCategories.filter((category) => category.type === 'expense'));
        setAccounts(nextAccounts.filter((account) => account.status === 'active'));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setPayments([]);
        setCategories([]);
        setAccounts([]);
        setLoadError(error.message || 'Recurring payments could not load.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPayments();

    return () => {
      isCancelled = true;
    };
  }, [currentUser.id, hasRecurringAccess, isBillingLoading, onLogout, refreshKey]);

  const visiblePayments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return payments
      .filter((payment) => !normalizedQuery || [payment.name, payment.categoryName, payment.accountName, payment.status].some((value) => String(value).toLowerCase().includes(normalizedQuery)))
      .sort((left, right) => new Date(left.nextPaymentDate).getTime() - new Date(right.nextPaymentDate).getTime());
  }, [payments, query]);
  const summary = useMemo(() => summarizePayments(visiblePayments), [visiblePayments]);
  const nextPayment = visiblePayments.find((payment) => payment.status === 'active') || null;

  const openCreate = () => {
    setEditingPayment(null);
    setSaveError('');
    setIsFormOpen(true);
  };

  const savePayment = async (payload) => {
    setIsSaving(true);
    setSaveError('');

    try {
      await financeStore.saveRecurringPayment(currentUser.id, payload);
      await refreshBillingAccess();
      setIsFormOpen(false);
      setEditingPayment(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setSaveError(error.message || 'Recurring payment could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeletePayment = async () => {
    if (!deleteCandidate) {
      return;
    }

    setIsDeleting(true);

    try {
      await financeStore.deleteRecurringPayment(currentUser.id, deleteCandidate.id);
      await refreshBillingAccess();
      setDeleteCandidate(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (error.status === 401) {
        await onLogout();
        return;
      }

      setLoadError(error.message || 'Recurring payment could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
  };

  const rail = (
    <aside className="activity-rail">
      <article className="ref-panel activity-rail-card activity-rail-card-dark">
        <span>Next renewal</span>
        <h3>{nextPayment?.name || 'Nothing scheduled'}</h3>
        <p>{nextPayment ? `${formatRecurringCurrency(nextPayment.amount)} due ${formatDaysUntil(nextPayment.daysUntilNextPayment)}.` : 'Add repeat payments to build a renewal queue.'}</p>
      </article>
      <article className="ref-panel activity-rail-card">
        <span>Renewal setup</span>
        <div className="activity-stat-list">
          <div><strong>{accounts.length}</strong><p>Accounts</p></div>
          <div><strong>{categories.length}</strong><p>Categories</p></div>
          <div><strong>{summary.active}</strong><p>Active</p></div>
        </div>
      </article>
    </aside>
  );

  return (
    <>
      <FinanceLayout
        currentUser={currentUser}
        onLogout={onLogout}
        pageTitle="Subscriptions"
        pageSubtitle="A renewal timeline for predictable bills and subscriptions."
        primaryActionLabel={!isBillingLoading && !hasRecurringAccess ? 'Upgrade' : '+ Add recurring'}
        onPrimaryAction={!isBillingLoading && !hasRecurringAccess ? () => navigate('/pricing') : openCreate}
        rail={rail}
      >
        {isBillingLoading ? (
          <PremiumPanel eyebrow="Access" title="Checking plan access">
            <PremiumSkeleton count={3} />
          </PremiumPanel>
        ) : null}

        {!isBillingLoading && !hasRecurringAccess ? (
          <FeatureGate
            eyebrow="Premium access"
            features={['Recurring bill tracking', 'Upcoming renewal timeline', 'Recurring outflow planning', 'Priority support']}
            helper="Recurring payments are part of Ledgr Premium. Upgrade to track subscriptions, rent, insurance, and fixed monthly charges in one queue."
            title="Unlock recurring payment tracking"
          />
        ) : null}

        {!isBillingLoading && hasRecurringAccess ? (
          <>
        <section className="recurring-queue-console" aria-label="Recurring payment queue">
          <div className="recurring-queue-head">
            <div>
              <span className="ref-section-chip">Renewal queue</span>
              <h2>Predictable charges, sorted before they hit.</h2>
              <p>Track subscriptions, bills, rent, insurance, and memberships by impact and next due date.</p>
            </div>
            <button className="ref-secondary-button" type="button" onClick={openCreate}>Add recurring</button>
          </div>

          <article className="recurring-next-card">
            <span>Next due</span>
            <strong>{nextPayment?.name || 'Nothing scheduled'}</strong>
            <p>{nextPayment ? `${formatRecurringCurrency(nextPayment.amount)} ${formatDaysUntil(nextPayment.daysUntilNextPayment)}` : 'Create one recurring item to build your queue.'}</p>
          </article>
        </section>

        <section className="recurring-queue-secondary" aria-label="Recurring payment tools">
          <div className="recurring-queue-body">
            <div className="recurring-queue-stats">
              <article><span>Monthly</span><strong>{formatRecurringCurrency(summary.monthly)}</strong></article>
              <article><span>Annualized</span><strong>{formatRecurringCurrency(summary.annual)}</strong></article>
              <article><span>Active</span><strong>{summary.active}</strong></article>
            </div>

            <label className="recurring-queue-search">
              <span>Search renewals</span>
              <input aria-label="Search recurring payments" placeholder="Bill, category, account, or status" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>
        </section>

        <PremiumPanel eyebrow="Renewals" title="Recurring payments">
          {isLoading ? <PremiumSkeleton count={4} /> : null}

          {!isLoading && loadError ? (
            <PremiumEmpty title="Recurring payments could not load" body={loadError} actionLabel="Retry" onAction={() => setRefreshKey((value) => value + 1)} />
          ) : null}

          {!isLoading && !loadError && visiblePayments.length ? (
            <div className="recurring-timeline-list">
              {visiblePayments.map((payment) => (
                <article className="recurring-timeline-item" key={payment.id}>
                  <span className="recurring-timeline-dot" />
                  <div className="recurring-timeline-main">
                    <strong>{payment.name}</strong>
                    <small>{payment.categoryName} - {payment.accountName || 'No account'} - {getFrequencyLabel(payment.billingFrequency)}</small>
                  </div>
                  <div className="recurring-timeline-date">
                    <span>{formatRecurringDate(payment.nextPaymentDate)}</span>
                    <strong>{formatRecurringCurrency(payment.amount)}</strong>
                  </div>
                  <div className="recurring-timeline-actions">
                    <button type="button" onClick={() => {
                      setEditingPayment(payment);
                      setIsFormOpen(true);
                    }}>Edit</button>
                    <button className="is-danger" type="button" onClick={() => setDeleteCandidate(payment)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoading && !loadError && !payments.length ? (
            <PremiumEmpty
              icon={<RecurringIcon type="repeat" />}
              title="Add your first recurring payment"
              body="Start with one bill, subscription, rent payment, insurance payment, or membership."
              actionLabel="Add recurring"
              onAction={openCreate}
            />
          ) : null}

          {!isLoading && !loadError && payments.length > 0 && !visiblePayments.length ? (
            <PremiumEmpty title="No renewals match this search" body="Clear the search to return to the full renewal timeline." actionLabel="Clear search" onAction={() => setQuery('')} />
          ) : null}
        </PremiumPanel>
          </>
        ) : null}
      </FinanceLayout>

      {isFormOpen ? (
        <RecurringFormDialog
          accounts={accounts}
          categories={categories}
          isSaving={isSaving}
          onClose={() => {
            if (!isSaving) {
              setIsFormOpen(false);
              setEditingPayment(null);
            }
          }}
          onSubmit={savePayment}
          payment={editingPayment}
          saveError={saveError}
        />
      ) : null}

      <DeleteRecurringDialog
        isDeleting={isDeleting}
        onCancel={() => !isDeleting && setDeleteCandidate(null)}
        onConfirm={confirmDeletePayment}
        payment={deleteCandidate}
      />
    </>
  );
}

export default RecurringPage;
