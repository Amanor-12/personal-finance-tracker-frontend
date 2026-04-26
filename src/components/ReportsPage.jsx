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

const safePercent = (value) => `${Math.round(Number(value) || 0)}%`;

const getRangeDays = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();

  if (Number.isNaN(diff) || diff < 0) {
    return 0;
  }

  return Math.floor(diff / 86400000) + 1;
};

function ReportsPage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const { access, hasFeature, isLoading: isBillingLoading } = useBillingAccess();
  const [range, setRange] = useState(() => getReportPresetRange('90'));
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const hasReportsAccess = hasFeature('reports');
  const isPro = access.tier === 'pro';

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

  const rangeDays = useMemo(
    () => getRangeDays(reports?.dateRange?.startDate || range.startDate, reports?.dateRange?.endDate || range.endDate),
    [range.endDate, range.startDate, reports?.dateRange?.endDate, reports?.dateRange?.startDate]
  );
  const topCategory = categories[0] || null;
  const topMerchant = merchants[0] || null;
  const merchantShare = summary.expenses > 0 && topMerchant ? (topMerchant.amount / summary.expenses) * 100 : 0;
  const dailyExpenseRate = rangeDays > 0 ? summary.expenses / rangeDays : 0;
  const analyticsCoverage = Math.min(
    100,
    [
      summary.transactionCount > 0 ? 40 : 0,
      inputs.activeAccounts > 0 ? 20 : 0,
      inputs.budgets > 0 ? 15 : 0,
      inputs.goals > 0 ? 10 : 0,
      inputs.recurringPayments > 0 ? 15 : 0,
    ].reduce((total, value) => total + value, 0)
  );

  const analysisCards = [
    {
      label: 'Savings rate',
      value: summary.income > 0 ? safePercent(summary.savingsRate) : '$0 signal',
      helper:
        summary.income > 0
          ? summary.net >= 0
            ? 'How much income remained after expenses in this range.'
            : 'Net outflow is pushing savings rate below zero.'
          : 'Add income transactions to unlock savings analysis.',
    },
    {
      label: 'Largest category',
      value: topCategory ? `${topCategory.category} · ${safePercent(topCategory.share)}` : 'No category signal',
      helper: topCategory
        ? 'Shows which expense bucket dominates this reporting window.'
        : 'Add expense activity to reveal category concentration.',
    },
    {
      label: 'Top merchant exposure',
      value: topMerchant ? `${safePercent(merchantShare)}` : 'No merchant signal',
      helper: topMerchant
        ? `${topMerchant.merchant} is the biggest merchant source in the selected range.`
        : 'Merchants appear once expense transactions are available.',
    },
    {
      label: 'Daily expense pace',
      value: formatMoney(dailyExpenseRate),
      helper: rangeDays ? `Average expense burn over ${rangeDays} day${rangeDays === 1 ? '' : 's'}.` : 'Choose a valid reporting range.',
    },
  ];

  const decisionSupport = useMemo(() => {
    const cards = [];

    if (summary.net < 0) {
      cards.push({
        body: 'Spending is currently outrunning income in the selected range, so cash flow needs intervention.',
        label: 'Cash flow',
        tone: 'warning',
        title: 'Net cash flow is negative',
      });
    } else if (summary.income > 0) {
      cards.push({
        body: `${safePercent(summary.savingsRate)} of income remained after expenses in this window.`,
        label: 'Cash flow',
        tone: 'positive',
        title: 'The range is still net positive',
      });
    }

    if (topCategory) {
      cards.push({
        body: `${topCategory.category} accounts for ${safePercent(topCategory.share)} of total expense activity.`,
        label: 'Concentration',
        tone: topCategory.share >= 45 ? 'warning' : 'neutral',
        title: 'One category is carrying the most weight',
      });
    }

    if (metadata.overspentBudgets > 0) {
      cards.push({
        body: `${metadata.overspentBudgets} budget${metadata.overspentBudgets === 1 ? '' : 's'} are already over the limit in this workspace.`,
        label: 'Budget pressure',
        tone: 'warning',
        title: 'Overspending is already visible',
      });
    }

    if (metadata.monthlyRecurringTotal > 0) {
      cards.push({
        body: `${formatMoney(metadata.monthlyRecurringTotal)} is committed to recurring bills each month before variable spending starts.`,
        label: 'Fixed costs',
        tone: 'neutral',
        title: 'Recurring load is shaping flexibility',
      });
    }

    if (topMerchant) {
      cards.push({
        body: `${topMerchant.merchant} appears ${topMerchant.count} time${topMerchant.count === 1 ? '' : 's'} and represents ${safePercent(merchantShare)} of expense spend.`,
        label: 'Merchant activity',
        tone: merchantShare >= 25 ? 'warning' : 'neutral',
        title: 'Merchant concentration is measurable',
      });
    }

    return [...cards, ...insights].slice(0, 4);
  }, [insights, merchantShare, metadata.monthlyRecurringTotal, metadata.overspentBudgets, summary.income, summary.net, summary.savingsRate, topCategory, topMerchant]);

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
      <article className="ref-panel reports-rail-card reports-rail-card-dark">
        <span className="reports-rail-kicker">Signal strength</span>
        <h3>{summary.transactionCount ? 'Analysis ready' : 'Waiting for activity'}</h3>
        <p>{isPro ? 'Pro turns reporting into a sharper decision workspace.' : 'Plus turns reporting into a clear decision workspace without empty chart noise.'}</p>
        <div className="reports-rail-meter">
          <span style={{ '--reports-meter': `${analyticsCoverage}%` }} />
        </div>
      </article>
      <article className="ref-panel reports-rail-card">
        <span className="reports-rail-kicker">Workspace coverage</span>
        <h3>{inputs.activeAccounts} sources feeding reports</h3>
        <p>Budgets, goals, and recurring payments deepen the quality of insight this page can generate.</p>
        <div className="activity-stat-list">
          <div><strong>{inputs.budgets}</strong><p>Budgets</p></div>
          <div><strong>{inputs.goals}</strong><p>Goals</p></div>
          <div><strong>{inputs.recurringPayments}</strong><p>Recurring</p></div>
        </div>
      </article>
    </aside>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Insights"
      pageSubtitle={isPro ? 'Advanced reporting for customers who want deeper control and signal depth.' : 'Clear reporting for customers who want faster money answers.'}
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
          eyebrow="Plus access"
          features={['Server-backed reporting', 'Date-range analytics', 'Merchant concentration analysis', 'Budget pressure and recurring-load insight']}
          helper="Insights begin in Ledgr Plus because this is where customers move from recording money to understanding it. Pro adds deeper intelligence and richer forecasting on top."
          title="Unlock advanced reporting"
        />
      ) : null}

      {!isBillingLoading && hasReportsAccess ? (
        <>
          <section className="reports-analysis-console" aria-label="Reports analysis console">
            <div className="reports-analysis-copy">
              <span className="ref-section-chip">Insight lab</span>
              <h2>See where money is concentrating, what changed, and what needs attention.</h2>
              <p>Use this workspace to spot spending concentration, merchant dependence, fixed-cost pressure, and cash-flow direction across a real reporting window.</p>
            </div>

            <div className="reports-analysis-state">
              <span>Current window</span>
              <strong>{selectedPresetLabel}</strong>
              <p>{rangeLabel}</p>
            </div>
          </section>

          <PremiumPanel eyebrow="Analysis controls" title="Ask a real finance question">
            <section className="reports-command-deck">
                <div className="reports-command-head">
                  <div>
                    <span className="reports-chip">{isPro ? 'Pro workflow' : 'Plus workflow'}</span>
                    <h3>{isPro ? 'Change the range, compare pressure points, and use the deeper signal layer.' : 'Change the range, compare pressure points, and keep the reporting surface clear.'}</h3>
                    <p>{isPro ? 'The value of Pro is not more charts. It is faster answers, stronger pattern signals, and better forward-looking context.' : 'The value of Plus is clear reporting without guesswork: what is drifting, what is concentrated, and what deserves attention next.'}</p>
                  </div>
                <span>{summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'} in view</span>
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

              <div className="reports-command-grid">
                <label className="reports-select-field">
                  <span>Start date</span>
                  <input type="date" value={range.startDate} onChange={(event) => handleDateChange('startDate', event.target.value)} />
                </label>

                <label className="reports-select-field">
                  <span>End date</span>
                  <input type="date" value={range.endDate} onChange={(event) => handleDateChange('endDate', event.target.value)} />
                </label>

                <label className="reports-select-field">
                  <span>Reporting context</span>
                  <input type="text" value={`${rangeDays || 0} day${rangeDays === 1 ? '' : 's'} selected`} readOnly />
                </label>
              </div>

              <div className="reports-quality-grid" aria-label="Insight summary">
                {analysisCards.map((card) => (
                  <div key={card.label}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <span>{card.helper}</span>
                  </div>
                ))}
              </div>
            </section>
          </PremiumPanel>

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
                body="Reports need real transaction history before concentration, merchant dependence, and cash-flow patterns become useful."
                actionLabel="Go to transactions"
                to="/transactions"
              />
            </PremiumPanel>
          ) : null}

          {!isLoading && !loadError && summary.transactionCount ? (
            <>
              {decisionSupport.length ? (
                <section className="reports-insight-strip" aria-label="Decision support">
                  {(isPro ? decisionSupport : decisionSupport.slice(0, 2)).map((insight, index) => (
                    <article className={`reports-insight-card reports-insight-card-${insight.tone || 'neutral'}`} key={`${insight.title}-${index}`}>
                      <span>{insight.label}</span>
                      <strong>{insight.title}</strong>
                      <p>{insight.body}</p>
                    </article>
                  ))}
                </section>
              ) : null}

              <section className="reports-analysis-grid">
                <PremiumPanel eyebrow="Trend" title="Income vs expenses">
                  <div className="reports-chart-card">
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
                    <div className="reports-chart-legend">
                      <span><i className="reports-dot-income" /> Income</span>
                      <span><i className="reports-dot-expense" /> Expenses</span>
                    </div>
                  </div>
                </PremiumPanel>

                <PremiumPanel eyebrow="What the range is saying" title="Decision support">
                  <div className="reports-insights-card">
                    <div className="reports-insight-list">
                      <article className={`reports-insight-item${summary.net >= 0 ? ' tone-positive' : ' tone-warning'}`}>
                        <span>Net movement</span>
                        <strong>{summary.net >= 0 ? 'The window closed positive' : 'Outflow exceeded inflow'}</strong>
                        <p>{summary.net >= 0 ? `${formatMoney(summary.net)} remained after expenses.` : `${formatMoney(Math.abs(summary.net))} more left the workspace than came in.`}</p>
                      </article>
                      <article className={`reports-insight-item${topCategory && topCategory.share >= 45 ? ' tone-warning' : ''}`}>
                        <span>Largest category</span>
                        <strong>{topCategory ? topCategory.category : 'No category signal yet'}</strong>
                        <p>{topCategory ? `${formatMoney(topCategory.amount)} and ${safePercent(topCategory.share)} of total expense concentration.` : 'Expense categories will appear once spending is tracked.'}</p>
                      </article>
                      <article className={`reports-insight-item${merchantShare >= 25 ? ' tone-warning' : ''}`}>
                        <span>Top merchant</span>
                        <strong>{topMerchant ? topMerchant.merchant : 'No merchant signal yet'}</strong>
                        <p>{topMerchant ? `${topMerchant.count} transaction${topMerchant.count === 1 ? '' : 's'} and ${safePercent(merchantShare)} of expense outflow.` : 'Merchant concentration appears once transaction descriptions exist.'}</p>
                      </article>
                      <article className={`reports-insight-item${metadata.overspentBudgets ? ' tone-warning' : metadata.completedGoals ? ' tone-positive' : ''}`}>
                        <span>Planning pressure</span>
                        <strong>
                          {metadata.overspentBudgets
                            ? `${metadata.overspentBudgets} overspent budget${metadata.overspentBudgets === 1 ? '' : 's'}`
                            : metadata.completedGoals
                              ? `${metadata.completedGoals} goal${metadata.completedGoals === 1 ? '' : 's'} completed`
                              : 'Plans are stable'}
                        </strong>
                        <p>
                          {metadata.overspentBudgets
                            ? 'Budgets are already signaling pressure that can be traced back through transaction activity.'
                            : metadata.completedGoals
                              ? 'Goal completion is reinforcing healthy money movement across the workspace.'
                              : 'Budgets, goals, and recurring items are not currently raising concern.'}
                        </p>
                      </article>
                    </div>
                  </div>
                </PremiumPanel>
              </section>

              <section className="reports-analysis-grid">
                <PremiumPanel eyebrow="Categories" title="Spending concentration">
                  <div className="reports-category-list">
                    {categories.map((category) => (
                      <div className="reports-category-row" key={category.category}>
                        <div>
                          <strong>{category.category}</strong>
                          <span>{safePercent(category.share)} of expenses</span>
                        </div>
                        <div className="reports-category-track">
                          <span style={{ '--reports-category-width': `${Math.max(4, category.share)}%` }} />
                        </div>
                        <b>{formatMoney(category.amount)}</b>
                      </div>
                    ))}
                  </div>
                </PremiumPanel>

                <PremiumPanel eyebrow="Sources" title="Top merchants">
                  <div className="reports-merchant-list">
                    {merchants.map((merchant, index) => (
                      <div className="reports-merchant-row" key={merchant.merchant}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{merchant.merchant}</strong>
                          <small>{merchant.count} transaction{merchant.count === 1 ? '' : 's'}</small>
                        </div>
                        <b>{formatMoney(merchant.amount)}</b>
                      </div>
                    ))}
                  </div>
                </PremiumPanel>
              </section>

              <section className="reports-support-strip" aria-label="Supporting insight facts">
                <article>
                  <span>Overspent budgets</span>
                  <strong>{metadata.overspentBudgets}</strong>
                </article>
                <article>
                  <span>Monthly recurring load</span>
                  <strong>{formatMoney(metadata.monthlyRecurringTotal)}</strong>
                </article>
                <article>
                  <span>Completed goals</span>
                  <strong>{metadata.completedGoals}</strong>
                </article>
              </section>

              {!isPro ? (
                <section className="finance-intelligence-grid" aria-label="Pro insight intelligence">
                  <article className="finance-intelligence-card finance-intelligence-card-accent">
                    <span className="finance-intelligence-kicker">Pro intelligence</span>
                    <h3>Go beyond reporting into stronger financial guidance</h3>
                    <p>Pro adds deeper callouts, smarter budget signals, goal forecasting, and priority support for customers who want tighter control.</p>
                    <div className="finance-pill-row">
                      <span className="finance-pill">Advanced insight signals</span>
                      <span className="finance-pill">Budget intelligence</span>
                      <span className="finance-pill">Goal forecasting</span>
                    </div>
                    <button className="finance-upgrade-action" type="button" onClick={() => navigate('/pricing')}>
                      Move to Pro
                    </button>
                  </article>
                </section>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </FinanceLayout>
  );
}

export default ReportsPage;
