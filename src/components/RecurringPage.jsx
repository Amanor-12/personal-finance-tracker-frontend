import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import { PremiumButton, PremiumEmpty, PremiumMetric, PremiumMetrics, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
import DeleteRecurringDialog from './recurring/DeleteRecurringDialog';
import RecurringFormDialog from './recurring/RecurringFormDialog';
import RecurringIcon from './recurring/RecurringIcon';
import { formatDaysUntil, formatRecurringCurrency, formatRecurringDate, getFrequencyLabel } from './recurring/recurringUtils';
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
  }, [currentUser.id, onLogout, refreshKey]);

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
        pageTitle="Recurring"
        pageSubtitle="A renewal timeline for predictable bills and subscriptions."
        primaryActionLabel="+ Add recurring"
        onPrimaryAction={openCreate}
        rail={rail}
      >
        <section className="recurring-renewal-hero">
          <div className="recurring-renewal-copy">
            <span className="premium-eyebrow">Renewal desk</span>
            <h2>Know what repeats before it charges again.</h2>
            <p>Track bills, subscriptions, rent, insurance, and memberships by next payment date and recurring impact.</p>
            <div className="recurring-renewal-meta">
              <span>{summary.active} active</span>
              <span>{formatRecurringCurrency(summary.monthly)} monthly</span>
              <span>{nextPayment ? formatDaysUntil(nextPayment.daysUntilNextPayment) : 'No upcoming'}</span>
            </div>
            <PremiumButton onClick={openCreate}>Add recurring</PremiumButton>
          </div>

          <div className="recurring-renewal-preview" aria-hidden="true">
            <div className="recurring-renewal-card">
              <span>Next</span>
              <strong>{nextPayment ? 'Scheduled' : 'Nothing scheduled'}</strong>
            </div>
            <div className="recurring-renewal-path">
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        <PremiumMetrics>
          <PremiumMetric label="Monthly" value={formatRecurringCurrency(summary.monthly)} helper="Active recurring impact" tone="teal" />
          <PremiumMetric label="Annualized" value={formatRecurringCurrency(summary.annual)} helper="Projected active outflow" tone="indigo" />
          <PremiumMetric label="Active" value={String(summary.active)} helper="Visible active items" />
          <PremiumMetric label="Next" value={nextPayment ? formatDaysUntil(nextPayment.daysUntilNextPayment) : 'None'} helper="Closest renewal" tone="amber" />
        </PremiumMetrics>

        <PremiumPanel eyebrow="Timeline controls" title="Search renewals">
          <div className="premium-filter-bar">
            <input aria-label="Search recurring payments" placeholder="Search bill, category, account, or status" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </PremiumPanel>

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
