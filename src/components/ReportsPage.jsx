import { useEffect, useMemo, useState } from 'react';
import FinanceLayout from './FinanceLayout';
import { PremiumEmpty, PremiumPanel, PremiumSkeleton, formatMoney } from './premium/PremiumPage';
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
      pageTitle="Insights"
      pageSubtitle="An analytics workspace that stays quiet until real activity exists."
      rail={rail}
    >
      <section className="reports-analysis-console" aria-label="Reports analysis console">
        <div className="reports-analysis-copy">
          <span className="ref-section-chip">Insight lab</span>
          <h2>Useful answers only when real signal exists.</h2>
          <p>Reports stay quiet until transactions exist, then explain income, spending, trends, merchants, and cash flow.</p>
        </div>

        <div className="reports-analysis-state">
          <span>Analysis state</span>
          <strong>{transactions.length ? 'Signal available' : 'Waiting for transactions'}</strong>
          <p>{transactions.length ? `${transactions.length} transactions ready for analysis.` : 'Add transactions first so charts do not become decoration.'}</p>
        </div>

        <div className="reports-analysis-kpis">
          <article><span>Income</span><strong>{formatMoney(summary.income)}</strong></article>
          <article><span>Expenses</span><strong>{formatMoney(summary.expenses)}</strong></article>
          <article><span>Net</span><strong>{formatMoney(summary.net)}</strong></article>
          <article><span>Activity</span><strong>{summary.transactionCount}</strong></article>
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
