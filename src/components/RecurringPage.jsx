import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';
import { FeatureGate } from './billing/FeatureGate';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton } from './premium/PremiumPage';
import DeleteRecurringDialog from './recurring/DeleteRecurringDialog';
import RecurringFormDialog from './recurring/RecurringFormDialog';
import RecurringIcon from './recurring/RecurringIcon';
import {
  EMPTY_RECURRING_FILTERS,
  filterRecurringPayments,
  formatDaysUntil,
  formatRecurringCurrency,
  formatRecurringDate,
  getFrequencyLabel,
  getRecurringTone,
  recurringFrequencyOptions,
  recurringSortOptions,
  recurringStatusOptions,
  sortRecurringPayments,
  summarizeRecurringPayments,
} from './recurring/recurringUtils';
import { useBillingAccess } from '../context/BillingAccessContext';
import { accountStore } from '../utils/accountStore';
import { financeStore } from '../utils/financeStore';

function RecurringPage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const { hasFeature, isLoading: isBillingLoading, refreshBillingAccess } = useBillingAccess();
  const hasRecurringAccess = hasFeature('recurringPayments');
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState(EMPTY_RECURRING_FILTERS);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
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
    const filtered = filterRecurringPayments(payments, filters);
    return sortRecurringPayments(filtered, filters.sortBy);
  }, [filters, payments]);

  const summary = useMemo(() => summarizeRecurringPayments(visiblePayments), [visiblePayments]);
  const nextPayment = summary.upcoming;
  const selectedPayment = visiblePayments.find((payment) => payment.id === selectedPaymentId) || visiblePayments[0] || null;
  const dueSoonPayments = useMemo(
    () =>
      visiblePayments.filter(
        (payment) =>
          payment.status === 'active' &&
          payment.daysUntilNextPayment !== null &&
          payment.daysUntilNextPayment <= 7
      ),
    [visiblePayments]
  );
  const overduePayments = useMemo(
    () =>
      visiblePayments.filter(
        (payment) =>
          payment.status === 'active' &&
          payment.daysUntilNextPayment !== null &&
          payment.daysUntilNextPayment < 0
      ),
    [visiblePayments]
  );
  const unassignedPayments = useMemo(
    () => visiblePayments.filter((payment) => payment.status === 'active' && !payment.accountId),
    [visiblePayments]
  );
  const highestMonthlyPayment = useMemo(
    () =>
      [...visiblePayments]
        .filter((payment) => payment.status === 'active')
        .sort((left, right) => right.monthlyAmount - left.monthlyAmount)[0] || null,
    [visiblePayments]
  );

  useEffect(() => {
    setSelectedPaymentId((currentPaymentId) =>
      visiblePayments.some((payment) => payment.id === currentPaymentId) ? currentPaymentId : visiblePayments[0]?.id || ''
    );
  }, [visiblePayments]);

  const updateFilter = (name, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_RECURRING_FILTERS);
  };

  const openCreate = () => {
    setEditingPayment(null);
    setSaveError('');
    setIsFormOpen(true);
  };

  const openEdit = (payment) => {
    setEditingPayment(payment);
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
        <p>
          {nextPayment
            ? `${formatRecurringCurrency(nextPayment.amount)} due ${formatDaysUntil(nextPayment.daysUntilNextPayment)}.`
            : 'Add repeat payments to build a renewal queue.'}
        </p>
      </article>
      <article className="ref-panel activity-rail-card">
        <span>Queue health</span>
        <div className="activity-stat-list">
          <div><strong>{summary.activeCount}</strong><p>Active</p></div>
          <div><strong>{dueSoonPayments.length}</strong><p>Due soon</p></div>
          <div><strong>{unassignedPayments.length}</strong><p>Unlinked</p></div>
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
            features={['Recurring bill tracking', 'Upcoming renewal timeline', 'Monthly fixed-cost view', 'Annualized commitment view']}
            helper="Recurring payments are part of Ledgr Premium because active customers need one place to stay ahead of subscriptions, rent, insurance, and other fixed charges before they hit."
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
                <button className="ref-secondary-button" type="button" onClick={openCreate}>
                  Add recurring
                </button>
              </div>

              <article className="recurring-next-card">
                <span>Next due</span>
                <strong>{nextPayment?.name || 'Nothing scheduled'}</strong>
                <p>
                  {nextPayment
                    ? `${formatRecurringCurrency(nextPayment.amount)} ${formatDaysUntil(nextPayment.daysUntilNextPayment)}`
                    : 'Create one recurring item to build your queue.'}
                </p>
              </article>
            </section>

            <PremiumPanel eyebrow="Recurring command" title="Run the renewal queue with intent">
              <section className="recurring-command-deck">
                <div className="recurring-workbench-head">
                  <div>
                    <span className="recurring-chip">Premium workflow</span>
                    <h3>Search, sort, and triage fixed costs before they become noise.</h3>
                    <p>Keep upcoming charges, missing account links, and biggest monthly commitments visible in one command surface.</p>
                  </div>
                  <span>{visiblePayments.length} of {payments.length} renewals in view</span>
                </div>

                <div className="recurring-command-search">
                  <label className="recurring-search-field">
                    <span className="recurring-search-icon" aria-hidden="true">
                      <RecurringIcon type="search" />
                    </span>
                    <input
                      aria-label="Search recurring payments"
                      placeholder="Bill, category, account, or status"
                      type="search"
                      value={filters.query}
                      onChange={(event) => updateFilter('query', event.target.value)}
                    />
                  </label>

                  <label className="recurring-select-field">
                    <span>Sort by</span>
                    <select aria-label="Sort recurring payments" value={filters.sortBy} onChange={(event) => updateFilter('sortBy', event.target.value)}>
                      {recurringSortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="recurring-command-grid">
                  <label className="recurring-select-field">
                    <span>Status</span>
                    <select aria-label="Recurring payment status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                      {recurringStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="recurring-select-field">
                    <span>Frequency</span>
                    <select aria-label="Recurring payment frequency" value={filters.frequency} onChange={(event) => updateFilter('frequency', event.target.value)}>
                      <option value="all">All frequencies</option>
                      {recurringFrequencyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button className="recurring-reset-button" type="button" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              </section>
            </PremiumPanel>

            <PremiumPanel eyebrow="Renewals" title="Recurring payments">
              {isLoading ? <PremiumSkeleton count={4} /> : null}

              {!isLoading && loadError ? (
                <PremiumEmpty title="Recurring payments could not load" body={loadError} actionLabel="Retry" onAction={() => setRefreshKey((value) => value + 1)} />
              ) : null}

              {!isLoading && !loadError && visiblePayments.length ? (
                <section className="recurring-workbench">
                  <div className="recurring-health-grid" aria-label="Recurring health">
                    <article className="recurring-health-tile">
                      <span>Monthly recurring total</span>
                      <strong>{formatRecurringCurrency(summary.monthlyTotal)}</strong>
                    </article>
                    <article className="recurring-health-tile">
                      <span>Annualized cost</span>
                      <strong>{formatRecurringCurrency(summary.annualTotal)}</strong>
                    </article>
                    <article className={`recurring-health-tile${dueSoonPayments.length || overduePayments.length ? ' is-alert' : ''}`}>
                      <span>Needs attention</span>
                      <strong>
                        {overduePayments.length
                          ? `${overduePayments.length} overdue`
                          : dueSoonPayments.length
                            ? `${dueSoonPayments.length} due soon`
                            : 'Nothing urgent'}
                      </strong>
                    </article>
                  </div>

                  <div className="recurring-workbench-grid">
                    <div className="recurring-card-list" aria-label="Recurring payment list">
                      {visiblePayments.map((payment) => {
                        const tone = getRecurringTone(payment);

                        return (
                          <button
                            key={payment.id}
                            className={`recurring-payment-card${selectedPayment?.id === payment.id ? ' is-selected' : ''}`}
                            type="button"
                            onClick={() => setSelectedPaymentId(payment.id)}
                          >
                            <div className="recurring-payment-top">
                              <div>
                                <span className={`recurring-status-pill tone-${tone.tone}`}>{tone.label}</span>
                                <strong>{payment.name}</strong>
                              </div>
                              <div className="recurring-payment-amounts">
                                <span>Charge</span>
                                <strong>{formatRecurringCurrency(payment.amount)}</strong>
                              </div>
                            </div>

                            <div className="recurring-payment-footer">
                              <span>{payment.categoryName || 'No category'} - {payment.accountName || 'No account'} - {getFrequencyLabel(payment.billingFrequency)}</span>
                              <span className="recurring-date-chip">{formatRecurringDate(payment.nextPaymentDate)} - {formatDaysUntil(payment.daysUntilNextPayment)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <aside className="recurring-detail-card" aria-label="Selected recurring payment">
                      {selectedPayment ? (
                        <>
                          <div className="recurring-detail-top">
                            <div className="recurring-detail-copy">
                              <span className="recurring-detail-kicker">Selected renewal</span>
                              <h4>{selectedPayment.name}</h4>
                            </div>
                            <span className={`recurring-status-pill tone-${getRecurringTone(selectedPayment).tone}`}>
                              {getRecurringTone(selectedPayment).label}
                            </span>
                          </div>

                          <div className="recurring-detail-figure">
                            <strong>{formatRecurringCurrency(selectedPayment.amount)}</strong>
                            <span>{formatRecurringCurrency(selectedPayment.monthlyAmount)} monthly impact · {formatRecurringCurrency(selectedPayment.annualAmount)} annualized</span>
                          </div>

                          <div className={`recurring-orbit${selectedPayment ? '' : ' is-empty'}`} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                            <strong>
                              {selectedPayment.daysUntilNextPayment === null
                                ? '--'
                                : selectedPayment.daysUntilNextPayment < 0
                                  ? '!'
                                  : selectedPayment.daysUntilNextPayment}
                            </strong>
                          </div>

                          <div>
                            <div className="recurring-detail-row">
                              <span>Next payment</span>
                              <strong>{formatRecurringDate(selectedPayment.nextPaymentDate)} · {formatDaysUntil(selectedPayment.daysUntilNextPayment)}</strong>
                            </div>
                            <div className="recurring-detail-row">
                              <span>Category</span>
                              <strong>{selectedPayment.categoryName || 'No category'}</strong>
                            </div>
                            <div className="recurring-detail-row">
                              <span>Account</span>
                              <strong>{selectedPayment.accountName || 'No account linked yet'}</strong>
                            </div>
                            <div className="recurring-detail-row">
                              <span>Billing frequency</span>
                              <strong>{getFrequencyLabel(selectedPayment.billingFrequency)}</strong>
                            </div>
                          </div>

                          <div className="recurring-health-grid">
                            <article className={`recurring-health-tile${selectedPayment.daysUntilNextPayment !== null && selectedPayment.daysUntilNextPayment <= 7 ? ' is-alert' : ''}`}>
                              <span>Renewal pressure</span>
                              <strong>{formatDaysUntil(selectedPayment.daysUntilNextPayment)}</strong>
                            </article>
                            <article className="recurring-health-tile">
                              <span>Account coverage</span>
                              <strong>{selectedPayment.accountName ? 'Linked' : 'Needs account'}</strong>
                            </article>
                            <article className="recurring-health-tile">
                              <span>Queue count</span>
                              <strong>{summary.activeCount} active</strong>
                            </article>
                          </div>

                          {selectedPayment.notes ? <p className="recurring-detail-note">{selectedPayment.notes}</p> : null}

                          <div className="recurring-detail-actions">
                            <button className="recurring-detail-button recurring-detail-button-secondary" type="button" onClick={() => openEdit(selectedPayment)}>
                              <RecurringIcon type="edit" />
                              Edit
                            </button>
                            <button className="recurring-detail-button recurring-detail-button-danger" type="button" onClick={() => setDeleteCandidate(selectedPayment)}>
                              <RecurringIcon type="trash" />
                              Delete
                            </button>
                          </div>

                          <div className="recurring-upcoming-list">
                            <article className="recurring-upcoming-item">
                              <div>
                                <strong>Due soon</strong>
                                <span>Charges within seven days</span>
                              </div>
                              <span>{dueSoonPayments.length}</span>
                            </article>
                            <article className="recurring-upcoming-item">
                              <div>
                                <strong>Largest monthly cost</strong>
                                <span>{highestMonthlyPayment?.name || 'No active renewal'}</span>
                              </div>
                              <span>{highestMonthlyPayment ? formatRecurringCurrency(highestMonthlyPayment.monthlyAmount) : '$0.00'}</span>
                            </article>
                            <article className="recurring-upcoming-item">
                              <div>
                                <strong>Missing account links</strong>
                                <span>Recurring items that still need a source account</span>
                              </div>
                              <span>{unassignedPayments.length}</span>
                            </article>
                          </div>
                        </>
                      ) : (
                        <div className="recurring-empty-inline">
                          <strong>Select a recurring payment</strong>
                          <p>Choose an item from the queue to inspect due date, account coverage, and renewal impact.</p>
                        </div>
                      )}
                    </aside>
                  </div>
                </section>
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
                <PremiumEmpty title="No renewals match this view" body="Clear the filters to return to the full renewal queue." actionLabel="Clear filters" onAction={clearFilters} />
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
