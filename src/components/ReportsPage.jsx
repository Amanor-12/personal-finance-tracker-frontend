import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FinanceLayout from './FinanceLayout';
import { FeatureGate } from './billing/FeatureGate';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton, formatMoney } from './premium/PremiumPage';
import ReportsIcon from './reports/ReportsIcon';
import {
  formatReportDate,
  getLargestTrendValue,
  getReportPresetRange,
  reportPresetOptions,
} from './reports/reportUtils';
import { useBillingAccess } from '../context/BillingAccessContext';
import { financeStore } from '../utils/financeStore';

function ReportsPage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const { hasFeature, isLoading: isBillingLoading } = useBillingAccess();
  const [range, setRange] = useState(() => getReportPresetRange('90'));
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const hasReportsAccess = hasFeature('reports');

  useEffect(() => {
    let isCancelled = false;

    const loadReports = async () => {
      if (isBillingLoading) {
        return;
      }

      if (!hasReportsAccess) {
        setReports(null);
        setLoadError('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const overview = await financeStore.getReportsOverview(range);

        if (isCancelled) {
          return;
        }

        setReports(overview);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setReports(null);
        setLoadError(error.message || 'Reports could not load.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      isCancelled = true;
    };
  }, [currentUser.id, hasReportsAccess, isBillingLoading, onLogout, range, refreshKey]);

  const summary = reports?.summary || {
    expenses: 0,
    income: 0,
    net: 0,
    savingsRate: 0,
    transactionCount: 0,
  };
  const categories = reports?.topCategories || [];
  const merchants = reports?.topMerchants || [];
  const trend = reports?.trend || [];
  const insights = reports?.insights || [];
  const inputs = reports?.supportingInputs || {
    activeAccounts: 0,
    budgets: 0,
    goals: 0,
    recurringPayments: 0,
  };
  const metadata = reports?.metadata || {
    activeRecurringCount: 0,
    completedGoals: 0,
    monthlyRecurringTotal: 0,
    overspentBudgets: 0,
  };
  const largestTrend = useMemo(() => getLargestTrendValue(trend), [trend]);

  const selectedPresetLabel =
    reportPresetOptions.find((option) => option.value === range.preset)?.label || 'Custom';
  const rangeLabel =
    reports?.dateRange?.startDate && reports?.dateRange?.endDate
      ? `${formatReportDate(reports.dateRange.startDate)} to ${formatReportDate(reports.dateRange.endDate)}`
      : 'Range unavailable';

  const handlePresetSelect = (preset) => {
    setRange(getReportPresetRange(preset));
  };

  const handleDateChange = (field, value) => {
    setRange((current) => ({
      ...current,
      preset: 'custom',
      [field]: value,
    }));
  };

  const rail = (
    <aside className="activity-rail">
      <article className="ref-panel activity-rail-card activity-rail-card-dark">
        <span>Analysis state</span>
        <h3>{summary.transactionCount ? 'Signal available' : 'Waiting for data'}</h3>
        <p>Premium reports answer questions only after real transactions exist.</p>
      </article>
      <article className="ref-panel activity-rail-card">
        <span>Workspace inputs</span>
        <div className="activity-stat-list">
          <div><strong>{inputs.activeAccounts}</strong><p>Accounts</p></div>
          <div><strong>{inputs.budgets}</strong><p>Budgets</p></div>
          <div><strong>{inputs.goals + inputs.recurringPayments}</strong><p>Plans</p></div>
        </div>
      </article>
    </aside>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Insights"
      pageSubtitle="Premium reporting that stays quiet until real activity exists."
      primaryActionLabel={!isBillingLoading && !hasReportsAccess ? 'Upgrade' : undefined}
      onPrimaryAction={!isBillingLoading && !hasReportsAccess ? () => navigate('/pricing') : undefined}
      rail={rail}
    >
      {isBillingLoading ? (
        <PremiumPanel eyebrow="Access" title="Checking plan access">
          <PremiumSkeleton count={3} />
        </PremiumPanel>
      ) : null}

      {!isBillingLoading && !hasReportsAccess ? (
        <FeatureGate
          eyebrow="Premium access"
          features={['Server-backed reporting', 'Spending concentration', 'Merchant analysis', 'Monthly cash-flow trends']}
          helper="Insights are part of Ledgr Premium. Upgrade to unlock backend-powered reporting across income, expenses, merchants, and cash flow."
          title="Unlock advanced reporting"
        />
      ) : null}

      {!isBillingLoading && hasReportsAccess ? (
        <>
          <section className="reports-analysis-console" aria-label="Reports analysis console">
            <div className="reports-analysis-copy">
              <span className="ref-section-chip">Insight lab</span>
              <h2>Financial analysis backed by your real workspace.</h2>
              <p>Review category concentration, merchant exposure, and net cash movement across a selected reporting range.</p>
            </div>

            <div className="reports-analysis-state">
              <span>Current window</span>
              <strong>{selectedPresetLabel}</strong>
              <p>{rangeLabel}</p>
            </div>
          </section>

          <section className="reports-analysis-secondary" aria-label="Insight summary">
            <div className="reports-analysis-kpis">
              <article><span>Income</span><strong>{formatMoney(summary.income)}</strong></article>
              <article><span>Expenses</span><strong>{formatMoney(summary.expenses)}</strong></article>
              <article><span>Net</span><strong>{formatMoney(summary.net)}</strong></article>
              <article><span>Activity</span><strong>{summary.transactionCount}</strong></article>
            </div>

            <div className="reports-filter-board">
              <div className="reports-filter-head">
                <span>Reporting range</span>
                <strong>{selectedPresetLabel}</strong>
              </div>
              <div className="reports-filter-pills">
                {reportPresetOptions.map((option) => (
                  <button
                    key={option.value}
                    className={range.preset === option.value ? 'is-active' : ''}
                    type="button"
                    onClick={() => handlePresetSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="reports-filter-dates">
                <label>
                  <span>Start</span>
                  <input type="date" value={range.startDate} onChange={(event) => handleDateChange('startDate', event.target.value)} />
                </label>
                <label>
                  <span>End</span>
                  <input type="date" value={range.endDate} onChange={(event) => handleDateChange('endDate', event.target.value)} />
                </label>
              </div>
            </div>
          </section>

          {isLoading ? (
            <PremiumPanel eyebrow="Reports" title="Loading analysis">
              <PremiumSkeleton count={4} />
            </PremiumPanel>
          ) : null}

          {!isLoading && loadError ? (
            <PremiumPanel eyebrow="Reports" title="Analysis unavailable">
              <PremiumEmpty title="Reports could not load" body={loadError} actionLabel="Retry" onAction={() => setRefreshKey((value) => value + 1)} />
            </PremiumPanel>
          ) : null}

          {!isLoading && !loadError && !summary.transactionCount ? (
            <PremiumPanel eyebrow="No signal yet" title="Reports are ready when you are">
              <PremiumEmpty
                icon={<ReportsIcon type="chart" />}
                title="Add transactions to unlock insights"
                body="Reports need real transaction history before category concentration, merchant activity, and cash-flow patterns become useful."
                actionLabel="Go to transactions"
                to="/transactions"
              />
            </PremiumPanel>
          ) : null}

          {!isLoading && !loadError && summary.transactionCount ? (
            <>
              {insights.length ? (
                <section className="reports-insight-strip" aria-label="Insight callouts">
                  {insights.map((insight) => (
                    <article className={`reports-insight-card reports-insight-card-${insight.tone}`} key={`${insight.label}-${insight.title}`}>
                      <span>{insight.label}</span>
                      <strong>{insight.title}</strong>
                      <p>{insight.body}</p>
                    </article>
                  ))}
                </section>
              ) : null}

              <PremiumPanel eyebrow="Trend" title="Income vs expenses">
                <div className="reports-trend-chart premium-report-chart">
                  {trend.map((item) => (
                    <div className="reports-trend-column" key={item.monthKey}>
                      <div className="reports-trend-bars">
                        <span className="reports-trend-income" style={{ '--reports-bar-height': `${Math.max(4, (item.income / largestTrend) * 100)}%` }} />
                        <span className="reports-trend-expense" style={{ '--reports-bar-height': `${Math.max(4, (item.expenses / largestTrend) * 100)}%` }} />
                      </div>
                      <strong>{item.label}</strong>
                    </div>
                  ))}
                </div>
              </PremiumPanel>

              <section className="reports-analysis-grid">
                <PremiumPanel eyebrow="Categories" title="Spending concentration">
                  <div className="reports-category-list">
                    {categories.map((category) => (
                      <div className="reports-category-row" key={category.category}>
                        <div><strong>{category.category}</strong><span>{category.share.toFixed(0)}% of expenses</span></div>
                        <div className="reports-category-track"><span style={{ '--reports-category-width': `${Math.max(4, category.share)}%` }} /></div>
                        <b>{formatMoney(category.amount)}</b>
                      </div>
                    ))}
                  </div>
                </PremiumPanel>

                <PremiumPanel eyebrow="Sources" title="Top merchants">
                  <div className="reports-merchant-list">
                    {merchants.map((merchant, index) => (
                      <div className="reports-merchant-row" key={merchant.merchant}>
                        <span>0{index + 1}</span>
                        <div><strong>{merchant.merchant}</strong><small>{merchant.count} transaction{merchant.count === 1 ? '' : 's'}</small></div>
                        <b>{formatMoney(merchant.amount)}</b>
                      </div>
                    ))}
                  </div>
                </PremiumPanel>
              </section>

              <section className="reports-support-strip" aria-label="Supporting insight facts">
                <article><span>Overspent budgets</span><strong>{metadata.overspentBudgets}</strong></article>
                <article><span>Monthly recurring load</span><strong>{formatMoney(metadata.monthlyRecurringTotal)}</strong></article>
                <article><span>Completed goals</span><strong>{metadata.completedGoals}</strong></article>
              </section>
            </>
          ) : null}
        </>
      ) : null}
    </FinanceLayout>
  );
}

export default ReportsPage;
