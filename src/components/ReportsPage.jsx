import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import { PremiumEmpty, PremiumMetric, PremiumMetrics, PremiumPanel, PremiumSkeleton, formatMoney } from './premium/PremiumPage';
import ReportsIcon from './reports/ReportsIcon';
import { buildCategoryBreakdown, buildMerchantBreakdown, buildMonthlyTrend, getLargestTrendValue, summarizeReportTransactions } from './reports/reportUtils';
import { accountStore } from '../utils/accountStore';
import { financeStore } from '../utils/financeStore';

function ReportsPage({ currentUser, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurringPayments, setRecurringPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const loadReports = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [nextTransactions, nextAccounts, nextBudgets, nextGoals, nextRecurring] = await Promise.all([
          financeStore.getTransactionsForUser(currentUser.id),
          accountStore.getAccountsForUser(currentUser.id),
          financeStore.getBudgetsForUser(currentUser.id),
          financeStore.getGoalsForUser(currentUser.id),
          financeStore.getRecurringPaymentsForUser(currentUser.id),
        ]);

        if (isCancelled) {
          return;
        }

        setTransactions(nextTransactions);
        setAccounts(nextAccounts);
        setBudgets(nextBudgets);
        setGoals(nextGoals);
        setRecurringPayments(nextRecurring);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error.status === 401) {
          await onLogout();
          return;
        }

        setTransactions([]);
        setAccounts([]);
        setBudgets([]);
        setGoals([]);
        setRecurringPayments([]);
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
  }, [currentUser.id, onLogout, refreshKey]);

  const summary = useMemo(() => summarizeReportTransactions(transactions), [transactions]);
  const categories = useMemo(() => buildCategoryBreakdown(transactions).slice(0, 5), [transactions]);
  const merchants = useMemo(() => buildMerchantBreakdown(transactions).slice(0, 5), [transactions]);
  const trend = useMemo(() => buildMonthlyTrend(transactions), [transactions]);
  const largestTrend = useMemo(() => getLargestTrendValue(trend), [trend]);

  const rail = (
    <aside className="activity-rail">
      <article className="ref-panel activity-rail-card activity-rail-card-dark">
        <span>Analysis state</span>
        <h3>{transactions.length ? 'Signal available' : 'Waiting for data'}</h3>
        <p>Reports answer questions only after transactions exist.</p>
      </article>
      <article className="ref-panel activity-rail-card">
        <span>Workspace inputs</span>
        <div className="activity-stat-list">
          <div><strong>{accounts.filter((account) => account.status === 'active').length}</strong><p>Accounts</p></div>
          <div><strong>{budgets.length}</strong><p>Budgets</p></div>
          <div><strong>{goals.length + recurringPayments.length}</strong><p>Plans</p></div>
        </div>
      </article>
    </aside>
  );

  return (
    <FinanceLayout
      currentUser={currentUser}
      onLogout={onLogout}
      pageTitle="Reports"
      pageSubtitle="An analytics workspace that stays quiet until real activity exists."
      rail={rail}
    >
      <section className="reports-lab-hero">
        <div className="reports-lab-copy">
          <span className="premium-eyebrow">Insight lab</span>
          <h2>Turn real transaction history into useful answers.</h2>
          <p>Reports stay empty until the workspace has signal, then show trends, categories, merchants, and cash flow.</p>
          <div className="reports-lab-meta">
            <span>{transactions.length} transactions</span>
            <span>{accounts.length} accounts</span>
            <span>{budgets.length} budgets</span>
          </div>
        </div>

        <div className="reports-lab-preview" aria-hidden="true">
          <div className="reports-lab-axis" />
          <div className="reports-lab-bars">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="reports-lab-card">
            <span>Signal</span>
            <strong>{transactions.length ? 'Available' : 'Waiting'}</strong>
          </div>
        </div>
      </section>

      <PremiumMetrics>
        <PremiumMetric label="Income" value={formatMoney(summary.income)} helper="All recorded income" tone="indigo" />
        <PremiumMetric label="Expenses" value={formatMoney(summary.expenses)} helper="All recorded expenses" tone="teal" />
        <PremiumMetric label="Net" value={formatMoney(summary.net)} helper="Income minus expenses" tone="violet" />
        <PremiumMetric label="Activity" value={String(summary.transactionCount)} helper="Transaction count" />
      </PremiumMetrics>

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

      {!isLoading && !loadError && !transactions.length ? (
        <PremiumPanel eyebrow="No signal yet" title="Reports are ready when you are">
          <PremiumEmpty
            icon={<ReportsIcon type="chart" />}
            title="Add transactions to unlock insights"
            body="Reports need transaction history before calculating categories, merchants, trends, and cash-flow patterns."
            actionLabel="Go to transactions"
            to="/transactions"
          />
        </PremiumPanel>
      ) : null}

      {!isLoading && !loadError && transactions.length ? (
        <>
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
        </>
      ) : null}
    </FinanceLayout>
  );
}

export default ReportsPage;
