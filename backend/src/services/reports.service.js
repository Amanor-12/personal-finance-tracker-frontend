const pool = require('../config/db');
const AppError = require('../utils/AppError');

const defaultForecastMonths = 4;
const historyWindowMonths = 6;

const defaultReportRange = () => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - 89);

  return {
    endDate: end.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
  };
};

const toNumber = (value) => Number(value || 0);
const clampInteger = (value, min, max, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsedValue));
};
const parseDateOnly = (value) => new Date(`${value}T00:00:00Z`);
const startOfUtcMonth = (value) => {
  const date = value instanceof Date ? new Date(value.getTime()) : parseDateOnly(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};
const addUtcMonths = (date, months) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
const formatMonthKey = (date) => date.toISOString().slice(0, 7);
const formatMonthLabel = (date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });
const average = (values) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

const weightedAverage = (items, field) => {
  if (!items.length) {
    return 0;
  }

  const { total, totalWeight } = items.reduce(
    (accumulator, item, index) => {
      const weight = 1 + index * 0.2;
      return {
        total: accumulator.total + toNumber(item[field]) * weight,
        totalWeight: accumulator.totalWeight + weight,
      };
    },
    { total: 0, totalWeight: 0 }
  );

  return totalWeight > 0 ? total / totalWeight : 0;
};

const calculateMomentum = (items, field) => {
  if (items.length < 3) {
    return 0;
  }

  const recent = items.slice(-2);
  const baseline = items.slice(0, -2);

  if (!baseline.length) {
    return 0;
  }

  return average(recent.map((item) => toNumber(item[field]))) - average(baseline.map((item) => toNumber(item[field])));
};

const toMonthSeries = (rows) =>
  rows.map((row) => {
    const monthStart = startOfUtcMonth(row.month_key ? `${row.month_key}-01` : row.month_start);

    return {
      expenses: toNumber(row.expenses),
      income: toNumber(row.income),
      label: row.label || formatMonthLabel(monthStart),
      monthKey: row.month_key || formatMonthKey(monthStart),
      monthStart,
      net: toNumber(row.income) - toNumber(row.expenses),
      transactionCount: Number(row.transaction_count) || 0,
    };
  });

const buildInsightCards = ({
  activeRecurringCount,
  completedGoals,
  monthlyRecurringTotal,
  overspentBudgets,
  summary,
  topCategories,
  topMerchants,
}) => {
  const insights = [];

  if (summary.transactionCount === 0) {
    return insights;
  }

  if (summary.net >= 0 && summary.income > 0) {
    insights.push({
      body: `${Math.max(summary.savingsRate, 0).toFixed(0)}% of income remained after expenses in the selected range.`,
      label: 'Cash flow',
      tone: 'positive',
      title: 'Net position is positive',
    });
  } else if (summary.net < 0) {
    insights.push({
      body: 'Expenses are higher than income in the selected range.',
      label: 'Cash flow',
      tone: 'warning',
      title: 'Cash flow needs attention',
    });
  }

  if (topCategories[0]) {
    insights.push({
      body: `${topCategories[0].category} represents ${topCategories[0].share.toFixed(0)}% of expense spend in this range.`,
      label: 'Spending concentration',
      tone: topCategories[0].share >= 45 ? 'warning' : 'neutral',
      title: 'Largest category',
    });
  }

  if (topMerchants[0]) {
    insights.push({
      body: `${topMerchants[0].merchant} appears ${topMerchants[0].count} time${topMerchants[0].count === 1 ? '' : 's'} in the selected range.`,
      label: 'Merchant activity',
      tone: 'neutral',
      title: 'Top merchant source',
    });
  }

  if (overspentBudgets > 0) {
    insights.push({
      body: `${overspentBudgets} budget${overspentBudgets === 1 ? '' : 's'} are currently over limit.`,
      label: 'Budget pressure',
      tone: 'warning',
      title: 'Budget pressure detected',
    });
  }

  if (activeRecurringCount > 0) {
    insights.push({
      body: `$${monthlyRecurringTotal.toFixed(2)} is committed to active recurring payments each month.`,
      label: 'Recurring load',
      tone: 'neutral',
      title: 'Fixed monthly commitments',
    });
  }

  if (completedGoals > 0) {
    insights.push({
      body: `${completedGoals} goal${completedGoals === 1 ? '' : 's'} already completed.`,
      label: 'Goals',
      tone: 'positive',
      title: 'Goal momentum',
    });
  }

  return insights.slice(0, 4);
};

const buildForecastHighlights = ({
  activeHistoryMonths,
  averageMonthlyExpenses,
  averageMonthlyIncome,
  currentCashReserve,
  projectedMonthlyNet,
  recurringFloor,
  riskLevel,
  runwayMonths,
  overspentBudgets,
}) => {
  const highlights = [];

  highlights.push({
    body:
      projectedMonthlyNet >= 0
        ? `${formatMoneyValue(projectedMonthlyNet)} is projected to remain after monthly outflow.`
        : `${formatMoneyValue(Math.abs(projectedMonthlyNet))} is projected to leave the workspace each month.`,
    id: 'monthly-net',
    title: projectedMonthlyNet >= 0 ? 'Projected monthly net stays positive' : 'Projected monthly net turns negative',
    tone: projectedMonthlyNet >= 0 ? 'positive' : 'warning',
  });

  highlights.push({
    body:
      currentCashReserve > 0
        ? `${formatMoneyValue(currentCashReserve)} is currently available across active accounts.`
        : 'The workspace is not carrying a positive cash reserve right now.',
    id: 'cash-reserve',
    title: currentCashReserve > 0 ? 'Cash reserve is measurable' : 'Cash reserve needs rebuilding',
    tone: currentCashReserve > 0 ? 'neutral' : 'warning',
  });

  highlights.push({
    body:
      recurringFloor > 0
        ? `${formatMoneyValue(recurringFloor)} is already committed before variable spending begins.`
        : 'No recurring payment floor is recorded yet, which weakens forecast confidence.',
    id: 'recurring-floor',
    title: recurringFloor > 0 ? 'Recurring load sets the floor' : 'Recurring load is under-defined',
    tone: recurringFloor > 0 ? 'neutral' : 'warning',
  });

  if (overspentBudgets > 0) {
    highlights.push({
      body: `${overspentBudgets} budget${overspentBudgets === 1 ? '' : 's'} are already over limit, which increases forecast downside risk.`,
      id: 'budget-pressure',
      title: 'Budget pressure is already visible',
      tone: 'warning',
    });
  }

  if (runwayMonths !== null && projectedMonthlyNet < 0) {
    highlights.push({
      body: `${runwayMonths.toFixed(1)} month${runwayMonths === 1 ? '' : 's'} of runway remain if the projected gap does not close.`,
      id: 'runway',
      title: riskLevel === 'critical' ? 'Runway is short' : 'Runway is finite',
      tone: riskLevel === 'critical' ? 'warning' : 'neutral',
    });
  }

  if (activeHistoryMonths < 3) {
    highlights.push({
      body: 'Forecast quality will improve after a few more months of clean transaction history.',
      id: 'history-depth',
      title: 'History depth is still light',
      tone: 'neutral',
    });
  }

  if (averageMonthlyIncome === 0 && averageMonthlyExpenses === 0) {
    highlights.push({
      body: 'There is not enough historical movement yet to produce a reliable forward projection.',
      id: 'history-missing',
      title: 'Historical signal is still empty',
      tone: 'warning',
    });
  }

  return highlights.slice(0, 4);
};

const buildForecastActions = ({
  dueSoonGoalGap,
  dueSoonGoals,
  overspentBudgetAmount,
  overspentBudgets,
  projectedMonthlyNet,
  recurringFloor,
}) => {
  const actions = [];

  if (projectedMonthlyNet < 0) {
    actions.push({
      body: `Close the monthly gap by at least ${formatMoneyValue(Math.abs(projectedMonthlyNet))} to stop reserve erosion.`,
      id: 'close-gap',
      title: 'Reduce or offset the projected shortfall',
    });
  }

  if (recurringFloor > 0) {
    actions.push({
      body: `Review fixed subscriptions and bills first. ${formatMoneyValue(recurringFloor)} is committed before flexible spending starts.`,
      id: 'audit-fixed-costs',
      title: 'Audit recurring commitments',
    });
  }

  if (overspentBudgets > 0) {
    actions.push({
      body: `${formatMoneyValue(overspentBudgetAmount)} is already over budget in the current cycle. Rework the categories creating the pressure first.`,
      id: 'repair-budgets',
      title: 'Repair overspent categories',
    });
  }

  if (dueSoonGoals > 0 && dueSoonGoalGap > 0) {
    actions.push({
      body: `${formatMoneyValue(dueSoonGoalGap)} is still needed across goals due within the next 90 days. Convert that into scheduled transfers before the target window closes.`,
      id: 'protect-goals',
      title: 'Fund near-term goals deliberately',
    });
  }

  if (!actions.length) {
    actions.push({
      body: 'Keep adding clean monthly data and revisit the forecast after the next close. More history increases confidence and sharpens actions.',
      id: 'maintain-data',
      title: 'Keep the signal clean',
    });
  }

  return actions.slice(0, 3);
};

const formatMoneyValue = (value) => `$${toNumber(value).toFixed(2)}`;

const getReportsOverview = async (userId, query = {}) => {
  const fallbackRange = defaultReportRange();
  const startDate = query.start_date || fallbackRange.startDate;
  const endDate = query.end_date || fallbackRange.endDate;

  if (startDate > endDate) {
    throw new AppError('Start date must be before the end date.', 400);
  }

  const [
    summaryResult,
    categoryResult,
    merchantResult,
    trendResult,
    inputCountsResult,
    budgetResult,
    recurringResult,
    goalsResult,
  ] = await Promise.all([
    pool.query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
          COUNT(*)::INTEGER AS transaction_count
        FROM transactions
        WHERE
          user_id = $1
          AND transaction_date BETWEEN $2::date AND $3::date
          AND status <> 'excluded'
      `,
      [userId, startDate, endDate]
    ),
    pool.query(
      `
        WITH expense_totals AS (
          SELECT COALESCE(SUM(amount), 0) AS total
          FROM transactions
          WHERE
            user_id = $1
            AND type = 'expense'
            AND transaction_date BETWEEN $2::date AND $3::date
            AND status <> 'excluded'
        )
        SELECT
          c.name AS category,
          COALESCE(SUM(t.amount), 0) AS amount,
          CASE
            WHEN expense_totals.total > 0 THEN (COALESCE(SUM(t.amount), 0) / expense_totals.total) * 100
            ELSE 0
          END AS share
        FROM transactions t
        INNER JOIN categories c
          ON c.id = t.category_id
          AND c.user_id = t.user_id
        CROSS JOIN expense_totals
        WHERE
          t.user_id = $1
          AND t.type = 'expense'
          AND t.transaction_date BETWEEN $2::date AND $3::date
          AND t.status <> 'excluded'
        GROUP BY c.name, expense_totals.total
        ORDER BY amount DESC, c.name ASC
        LIMIT 5
      `,
      [userId, startDate, endDate]
    ),
    pool.query(
      `
        SELECT
          COALESCE(NULLIF(t.description, ''), c.name) AS merchant,
          COALESCE(SUM(t.amount), 0) AS amount,
          COUNT(*)::INTEGER AS count
        FROM transactions t
        INNER JOIN categories c
          ON c.id = t.category_id
          AND c.user_id = t.user_id
        WHERE
          t.user_id = $1
          AND t.type = 'expense'
          AND t.transaction_date BETWEEN $2::date AND $3::date
          AND t.status <> 'excluded'
        GROUP BY COALESCE(NULLIF(t.description, ''), c.name)
        ORDER BY amount DESC, merchant ASC
        LIMIT 5
      `,
      [userId, startDate, endDate]
    ),
    pool.query(
      `
        SELECT
          TO_CHAR(months.month_start, 'Mon') AS label,
          TO_CHAR(months.month_start, 'YYYY-MM') AS month_key,
          COALESCE(SUM(CASE WHEN t.type = 'income' AND t.status <> 'excluded' THEN t.amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.status <> 'excluded' THEN t.amount ELSE 0 END), 0) AS expenses
        FROM generate_series(
          date_trunc('month', $2::date),
          date_trunc('month', $3::date),
          INTERVAL '1 month'
        ) AS months(month_start)
        LEFT JOIN transactions t
          ON t.user_id = $1
          AND date_trunc('month', t.transaction_date) = months.month_start
        GROUP BY months.month_start
        ORDER BY months.month_start
      `,
      [userId, startDate, endDate]
    ),
    pool.query(
      `
        SELECT
          (SELECT COUNT(*)::INTEGER FROM accounts WHERE user_id = $1 AND status = 'active') AS active_accounts,
          (SELECT COUNT(*)::INTEGER FROM budgets WHERE user_id = $1) AS budgets,
          (SELECT COUNT(*)::INTEGER FROM goals WHERE user_id = $1) AS goals,
          (SELECT COUNT(*)::INTEGER FROM recurring_payments WHERE user_id = $1 AND status = 'active') AS recurring_payments
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT COUNT(*)::INTEGER AS overspent_count
        FROM (
          SELECT
            b.id,
            b.amount_limit,
            COALESCE(SUM(t.amount), 0) AS spent_amount
          FROM budgets b
          LEFT JOIN transactions t
            ON t.user_id = b.user_id
            AND t.category_id = b.category_id
            AND t.type = 'expense'
            AND t.status <> 'excluded'
            AND EXTRACT(MONTH FROM t.transaction_date)::int = b.month
            AND EXTRACT(YEAR FROM t.transaction_date)::int = b.year
          WHERE
            b.user_id = $1
            AND b.month = EXTRACT(MONTH FROM CURRENT_DATE)::int
            AND b.year = EXTRACT(YEAR FROM CURRENT_DATE)::int
          GROUP BY b.id, b.amount_limit
          HAVING COALESCE(SUM(t.amount), 0) > b.amount_limit
        ) overspent
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT
          COUNT(*)::INTEGER AS active_count,
          COALESCE(
            SUM(
              CASE billing_frequency
                WHEN 'weekly' THEN amount * 52.0 / 12.0
                WHEN 'biweekly' THEN amount * 26.0 / 12.0
                WHEN 'monthly' THEN amount
                WHEN 'quarterly' THEN amount / 3.0
                WHEN 'annual' THEN amount / 12.0
                ELSE amount
              END
            ),
            0
          ) AS monthly_total
        FROM recurring_payments
        WHERE user_id = $1 AND status = 'active'
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT COUNT(*)::INTEGER AS completed_count
        FROM goals
        WHERE user_id = $1 AND current_amount >= target_amount
      `,
      [userId]
    ),
  ]);

  const summaryRow = summaryResult.rows[0];
  const summary = {
    expenses: toNumber(summaryRow.expenses),
    income: toNumber(summaryRow.income),
    net: toNumber(summaryRow.income) - toNumber(summaryRow.expenses),
    savingsRate:
      toNumber(summaryRow.income) > 0
        ? ((toNumber(summaryRow.income) - toNumber(summaryRow.expenses)) / toNumber(summaryRow.income)) * 100
        : 0,
    transactionCount: Number(summaryRow.transaction_count) || 0,
  };

  const topCategories = categoryResult.rows.map((row) => ({
    amount: toNumber(row.amount),
    category: row.category,
    share: toNumber(row.share),
  }));
  const topMerchants = merchantResult.rows.map((row) => ({
    amount: toNumber(row.amount),
    count: Number(row.count) || 0,
    merchant: row.merchant,
  }));
  const trend = trendResult.rows.map((row) => ({
    expenses: toNumber(row.expenses),
    income: toNumber(row.income),
    label: row.label,
    monthKey: row.month_key,
  }));
  const inputCounts = inputCountsResult.rows[0];
  const supportingInputs = {
    activeAccounts: Number(inputCounts.active_accounts) || 0,
    budgets: Number(inputCounts.budgets) || 0,
    goals: Number(inputCounts.goals) || 0,
    recurringPayments: Number(inputCounts.recurring_payments) || 0,
  };
  const overspentBudgets = Number(budgetResult.rows[0]?.overspent_count) || 0;
  const activeRecurringCount = Number(recurringResult.rows[0]?.active_count) || 0;
  const monthlyRecurringTotal = toNumber(recurringResult.rows[0]?.monthly_total);
  const completedGoals = Number(goalsResult.rows[0]?.completed_count) || 0;

  return {
    dateRange: {
      endDate,
      startDate,
    },
    insights: buildInsightCards({
      activeRecurringCount,
      completedGoals,
      monthlyRecurringTotal,
      overspentBudgets,
      summary,
      topCategories,
      topMerchants,
    }),
    metadata: {
      activeRecurringCount,
      completedGoals,
      monthlyRecurringTotal,
      overspentBudgets,
    },
    summary,
    supportingInputs,
    topCategories,
    topMerchants,
    trend,
  };
};

const getForecast = async (userId, query = {}) => {
  const fallbackRange = defaultReportRange();
  const startDate = query.start_date || fallbackRange.startDate;
  const endDate = query.end_date || fallbackRange.endDate;
  const months = clampInteger(query.months, 1, 12, defaultForecastMonths);

  if (startDate > endDate) {
    throw new AppError('Start date must be before the end date.', 400);
  }

  const anchorMonth = startOfUtcMonth(endDate);
  const historyStartMonth = addUtcMonths(anchorMonth, -(historyWindowMonths - 1));
  const horizonEndMonth = addUtcMonths(anchorMonth, months - 1);

  const [historyResult, balanceResult, recurringResult, budgetResult, goalsResult] = await Promise.all([
    pool.query(
      `
        SELECT
          TO_CHAR(months.month_start, 'YYYY-MM') AS month_key,
          COALESCE(SUM(CASE WHEN t.type = 'income' AND t.status <> 'excluded' THEN t.amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.status <> 'excluded' THEN t.amount ELSE 0 END), 0) AS expenses,
          COUNT(t.id)::INTEGER AS transaction_count
        FROM generate_series(
          $2::date,
          $3::date,
          INTERVAL '1 month'
        ) AS months(month_start)
        LEFT JOIN transactions t
          ON t.user_id = $1
          AND date_trunc('month', t.transaction_date) = months.month_start
        GROUP BY months.month_start
        ORDER BY months.month_start
      `,
      [userId, historyStartMonth.toISOString().slice(0, 10), anchorMonth.toISOString().slice(0, 10)]
    ),
    pool.query(
      `
        SELECT
          COUNT(*)::INTEGER AS active_accounts,
          COALESCE(
            SUM(
              a.opening_balance +
              COALESCE(
                (
                  SELECT SUM(
                    CASE
                      WHEN t.status = 'recorded' AND t.type = 'income' THEN t.amount
                      WHEN t.status = 'recorded' AND t.type = 'expense' THEN -t.amount
                      ELSE 0
                    END
                  )
                  FROM transactions t
                  WHERE t.user_id = a.user_id AND t.account_id = a.id
                ),
                0
              )
            ),
            0
          ) AS current_cash_reserve
        FROM accounts a
        WHERE a.user_id = $1 AND a.status = 'active'
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT
          COUNT(*)::INTEGER AS active_count,
          COALESCE(
            SUM(
              CASE billing_frequency
                WHEN 'weekly' THEN amount * 52.0 / 12.0
                WHEN 'biweekly' THEN amount * 26.0 / 12.0
                WHEN 'monthly' THEN amount
                WHEN 'quarterly' THEN amount / 3.0
                WHEN 'annual' THEN amount / 12.0
                ELSE amount
              END
            ),
            0
          ) AS monthly_total
        FROM recurring_payments
        WHERE user_id = $1 AND status = 'active'
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE spent_amount > amount_limit)::INTEGER AS overspent_count,
          COALESCE(SUM(GREATEST(spent_amount - amount_limit, 0)), 0) AS overspent_amount
        FROM (
          SELECT
            b.id,
            b.amount_limit,
            COALESCE(SUM(t.amount), 0) AS spent_amount
          FROM budgets b
          LEFT JOIN transactions t
            ON t.user_id = b.user_id
            AND t.category_id = b.category_id
            AND t.type = 'expense'
            AND t.status <> 'excluded'
            AND EXTRACT(MONTH FROM t.transaction_date)::int = b.month
            AND EXTRACT(YEAR FROM t.transaction_date)::int = b.year
          WHERE
            b.user_id = $1
            AND b.month = EXTRACT(MONTH FROM CURRENT_DATE)::int
            AND b.year = EXTRACT(YEAR FROM CURRENT_DATE)::int
          GROUP BY b.id, b.amount_limit
        ) budget_pressure
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT
          COUNT(*) FILTER (
            WHERE
              current_amount < target_amount
              AND target_date IS NOT NULL
              AND target_date <= CURRENT_DATE + INTERVAL '90 days'
          )::INTEGER AS due_soon_count,
          COALESCE(
            SUM(
              CASE
                WHEN
                  current_amount < target_amount
                  AND target_date IS NOT NULL
                  AND target_date <= CURRENT_DATE + INTERVAL '90 days'
                THEN target_amount - current_amount
                ELSE 0
              END
            ),
            0
          ) AS due_soon_gap
        FROM goals
        WHERE user_id = $1
      `,
      [userId]
    ),
  ]);

  const history = toMonthSeries(historyResult.rows);
  const averageMonthlyIncome = weightedAverage(history, 'income');
  const averageMonthlyExpenses = weightedAverage(history, 'expenses');
  const incomeMomentum = calculateMomentum(history, 'income');
  const expenseMomentum = calculateMomentum(history, 'expenses');
  const recurringFloor = toNumber(recurringResult.rows[0]?.monthly_total);
  const activeRecurringCount = Number(recurringResult.rows[0]?.active_count) || 0;
  const currentCashReserve = toNumber(balanceResult.rows[0]?.current_cash_reserve);
  const activeAccounts = Number(balanceResult.rows[0]?.active_accounts) || 0;
  const overspentBudgets = Number(budgetResult.rows[0]?.overspent_count) || 0;
  const overspentBudgetAmount = toNumber(budgetResult.rows[0]?.overspent_amount);
  const dueSoonGoals = Number(goalsResult.rows[0]?.due_soon_count) || 0;
  const dueSoonGoalGap = toNumber(goalsResult.rows[0]?.due_soon_gap);
  const activeHistoryMonths = history.filter((month) => month.transactionCount > 0 || month.income > 0 || month.expenses > 0).length;

  const baseIncome = Math.max(0, averageMonthlyIncome);
  const baseExpenses = Math.max(recurringFloor, averageMonthlyExpenses);
  const incomeAdjustment = incomeMomentum * 0.18;
  const expenseAdjustment = expenseMomentum * 0.28;
  const budgetPressureCarry = overspentBudgets > 0 ? overspentBudgetAmount / Math.max(overspentBudgets, 1) * 0.18 : 0;
  const projectionSeries = [];

  let projectedEndingCash = currentCashReserve;

  for (let index = 0; index < months; index += 1) {
    const monthStart = addUtcMonths(anchorMonth, index);
    const projectedIncome = Math.max(0, baseIncome + incomeAdjustment * (index + 1));
    const projectedExpenses = Math.max(
      recurringFloor,
      baseExpenses + expenseAdjustment * (index + 1) + budgetPressureCarry
    );
    const projectedNet = projectedIncome - projectedExpenses;

    projectedEndingCash += projectedNet;

    projectionSeries.push({
      label: formatMonthLabel(monthStart),
      monthKey: formatMonthKey(monthStart),
      projectedEndingCash: Number(projectedEndingCash.toFixed(2)),
      projectedExpenses: Number(projectedExpenses.toFixed(2)),
      projectedIncome: Number(projectedIncome.toFixed(2)),
      projectedNet: Number(projectedNet.toFixed(2)),
    });
  }

  const projectedMonthlyNet = average(projectionSeries.map((month) => month.projectedNet));
  const runwayMonths =
    projectedMonthlyNet < 0 && currentCashReserve > 0
      ? Number((currentCashReserve / Math.abs(projectedMonthlyNet)).toFixed(1))
      : null;

  let riskLevel = 'stable';

  if (projectedMonthlyNet < 0 || overspentBudgets > 0 || dueSoonGoals > 0) {
    riskLevel = 'watch';
  }

  if (
    projectedMonthlyNet < 0 &&
    (currentCashReserve <= 0 || (runwayMonths !== null && runwayMonths <= 3))
  ) {
    riskLevel = 'critical';
  }

  const confidenceScore = Math.min(
    96,
    activeHistoryMonths * 12 +
      Math.min(activeAccounts, 3) * 10 +
      (activeRecurringCount > 0 ? 10 : 0)
  );
  const confidenceLabel =
    confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'medium' : 'low';

  return {
    generatedAt: new Date().toISOString(),
    highlights: buildForecastHighlights({
      activeHistoryMonths,
      averageMonthlyExpenses,
      averageMonthlyIncome,
      currentCashReserve,
      overspentBudgets,
      projectedMonthlyNet,
      recurringFloor,
      riskLevel,
      runwayMonths,
    }),
    actions: buildForecastActions({
      dueSoonGoalGap,
      dueSoonGoals,
      overspentBudgetAmount,
      overspentBudgets,
      projectedMonthlyNet,
      recurringFloor,
    }),
    historyWindow: {
      endMonth: formatMonthKey(anchorMonth),
      months: historyWindowMonths,
      startMonth: formatMonthKey(historyStartMonth),
    },
    horizon: {
      endMonth: formatMonthKey(horizonEndMonth),
      months,
      startMonth: formatMonthKey(anchorMonth),
    },
    assumptions: {
      activeHistoryMonths,
      averageMonthlyExpenses: Number(averageMonthlyExpenses.toFixed(2)),
      averageMonthlyIncome: Number(averageMonthlyIncome.toFixed(2)),
      currentCashReserve: Number(currentCashReserve.toFixed(2)),
      expenseMomentum: Number(expenseMomentum.toFixed(2)),
      incomeMomentum: Number(incomeMomentum.toFixed(2)),
      recurringFloor: Number(recurringFloor.toFixed(2)),
    },
    signals: {
      activeAccounts,
      activeRecurringCount,
      dueSoonGoalGap: Number(dueSoonGoalGap.toFixed(2)),
      dueSoonGoals,
      overspentBudgetAmount: Number(overspentBudgetAmount.toFixed(2)),
      overspentBudgets,
    },
    series: projectionSeries,
    summary: {
      confidenceLabel,
      confidenceScore,
      projectedEndingCash:
        projectionSeries[projectionSeries.length - 1]?.projectedEndingCash || Number(currentCashReserve.toFixed(2)),
      projectedMonthlyNet: Number(projectedMonthlyNet.toFixed(2)),
      recurringShareOfExpense:
        averageMonthlyExpenses > 0 ? Number(((recurringFloor / averageMonthlyExpenses) * 100).toFixed(1)) : 0,
      riskLevel,
      runwayMonths,
    },
  };
};

module.exports = {
  defaultReportRange,
  getForecast,
  getReportsOverview,
};
