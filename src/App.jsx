import { useEffect, useState } from 'react';
import ActivityFeed from './components/ActivityFeed';
import BudgetPlanner from './components/BudgetPlanner';
import GoalTracker from './components/GoalTracker';
import Sidebar from './components/Sidebar';
import SummaryCard from './components/SummaryCard';
import TopBar from './components/TopBar';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import {
  initialActivity,
  initialBudgets,
  initialGoals,
  initialTransactions,
  viewOptions
} from './data/mockData';

const storageKey = 'personal-finance-tracker-sprint-2';

const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD'
});

function getStoredState() {
  if (typeof window === 'undefined') {
    return null;
  }

  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    return null;
  }
}

function App() {
  const [storedState] = useState(() => getStoredState());

  const [activeView, setActiveView] = useState('overview');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [transactions, setTransactions] = useState(storedState?.transactions ?? initialTransactions);
  const [budgets, setBudgets] = useState(storedState?.budgets ?? initialBudgets);
  const [goals, setGoals] = useState(storedState?.goals ?? initialGoals);
  const [activity, setActivity] = useState(storedState?.activity ?? initialActivity);
  const [toastMessage, setToastMessage] = useState('');

  const activeViewConfig = viewOptions.find((view) => view.id === activeView) ?? viewOptions[0];

  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0);

  const summary = {
    income,
    expenses,
    balance: income - expenses
  };

  const spendingByCategory = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((totals, transaction) => {
      totals[transaction.category] = (totals[transaction.category] || 0) + transaction.amount;
      return totals;
    }, {});

  const onTrackCount = budgets.filter((budget) => {
    const spent = spendingByCategory[budget.category] || 0;
    return spent <= budget.limit;
  }).length;

  const budgetHealth = `${onTrackCount}/${budgets.length} categories on track`;

  useEffect(() => {
    document.title = `${activeViewConfig.label} | Personal Finance Tracker`;
  }, [activeViewConfig.label]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        transactions,
        budgets,
        goals,
        activity
      })
    );
  }, [transactions, budgets, goals, activity]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('');
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  function recordActivity(message) {
    setActivity((current) => [
      {
        id: Date.now(),
        message,
        timestamp: new Date().toISOString()
      },
      ...current.slice(0, 7)
    ]);
  }

  function handleAddTransaction(transaction) {
    const nextTransaction = {
      ...transaction,
      id: Date.now()
    };

    setTransactions((current) => [nextTransaction, ...current]);
    setToastMessage(`${transaction.type === 'expense' ? 'Expense' : 'Income'} saved successfully.`);
    recordActivity(`${transaction.description} added to ${transaction.category}.`);
    setActiveView('transactions');
  }

  function handleSaveBudget(budgetUpdate) {
    setBudgets((current) => {
      const existingBudget = current.find((budget) => budget.category === budgetUpdate.category);

      if (existingBudget) {
        return current.map((budget) =>
          budget.category === budgetUpdate.category ? budgetUpdate : budget
        );
      }

      return [...current, budgetUpdate];
    });

    setToastMessage(`Budget saved for ${budgetUpdate.category}.`);
    recordActivity(`${budgetUpdate.category} budget updated to ${currency.format(budgetUpdate.limit)}.`);
    setActiveView('budgets');
  }

  function handleContribute(goalId, amount) {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) {
      return;
    }

    setGoals((current) =>
      current.map((item) =>
        item.id === goalId
          ? {
              ...item,
              saved: Math.min(item.saved + amount, item.target)
            }
          : item
      )
    );

    setToastMessage(`Added ${currency.format(amount)} to ${goal.name}.`);
    recordActivity(`${currency.format(amount)} moved into ${goal.name}.`);
    setActiveView('goals');
  }

  const nextGoal = goals
    .map((goal) => ({
      ...goal,
      remaining: goal.target - goal.saved
    }))
    .sort((left, right) => left.remaining - right.remaining)[0];

  return (
    <div className="app-shell">
      <Sidebar views={viewOptions} activeView={activeView} onSelectView={setActiveView} />

      <main className="main-shell">
        <TopBar activeView={activeViewConfig} />

        <section className="summary-grid">
          <SummaryCard
            label="Current balance"
            value={currency.format(summary.balance)}
            helper="Income minus expenses from mock March data"
            tone="highlight"
          />
          <SummaryCard
            label="Income logged"
            value={currency.format(summary.income)}
            helper="Updated instantly when you add income"
            tone="safe"
          />
          <SummaryCard
            label="Expenses logged"
            value={currency.format(summary.expenses)}
            helper="Categories roll into budget tracking"
            tone="warning"
          />
          <SummaryCard
            label="Budget health"
            value={budgetHealth}
            helper={nextGoal ? `${nextGoal.name} is the next goal to finish.` : 'No goals configured yet.'}
          />
        </section>

        <section className="workspace-grid">
          <div className="workspace-main">
            {(activeView === 'overview' || activeView === 'transactions') && (
              <TransactionForm onAddTransaction={handleAddTransaction} />
            )}

            {(activeView === 'overview' || activeView === 'transactions') && (
              <TransactionList
                transactions={transactions}
                filter={transactionFilter}
                onFilterChange={setTransactionFilter}
              />
            )}

            {(activeView === 'overview' || activeView === 'budgets') && (
              <BudgetPlanner
                budgets={budgets}
                spendingByCategory={spendingByCategory}
                onSaveBudget={handleSaveBudget}
              />
            )}

            {(activeView === 'overview' || activeView === 'goals') && (
              <GoalTracker goals={goals} onContribute={handleContribute} />
            )}
          </div>

          <div className="workspace-side">
            <ActivityFeed activity={activity} />

            <section className="panel callout-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Demo talking points</p>
                  <h3>What to show in review</h3>
                </div>
              </div>

              <ul className="callout-list">
                <li>Explain that `App.jsx` owns the shared state and passes props to child components.</li>
                <li>Show a controlled input changing local form state before it updates the dashboard state.</li>
                <li>Point out the `useEffect` hooks for document title, local storage, and timed toast cleanup.</li>
                <li>Remind the instructor this Sprint 2 shell uses mock UI, so the backend can stay separate for now.</li>
              </ul>
            </section>
          </div>
        </section>
      </main>

      {toastMessage ? <div className="toast">{toastMessage}</div> : null}
    </div>
  );
}

export default App;
