export const viewOptions = [
  {
    id: 'overview',
    label: 'Overview',
    eyebrow: 'Sprint 2 shell',
    description: 'A single-page dashboard with mock state, summaries, and a live activity feed.'
  },
  {
    id: 'transactions',
    label: 'Transactions',
    eyebrow: 'Controlled form',
    description: 'Add mock income and expenses with inline validation and instant list updates.'
  },
  {
    id: 'budgets',
    label: 'Budgets',
    eyebrow: 'Reusable planner',
    description: 'Adjust spending limits by category and watch the progress bars react immediately.'
  },
  {
    id: 'goals',
    label: 'Goals',
    eyebrow: 'Stateful progress',
    description: 'Track savings targets and simulate deposits without touching the backend yet.'
  }
];

export const categoryOptions = ['Housing', 'Food', 'Transport', 'Health', 'Savings', 'Salary', 'Freelance', 'Fun'];

export const initialTransactions = [
  {
    id: 1,
    type: 'income',
    description: 'Bi-weekly paycheck',
    category: 'Salary',
    amount: 2400,
    date: '2026-03-04'
  },
  {
    id: 2,
    type: 'expense',
    description: 'Apartment rent',
    category: 'Housing',
    amount: 1200,
    date: '2026-03-01'
  },
  {
    id: 3,
    type: 'expense',
    description: 'Groceries',
    category: 'Food',
    amount: 142.87,
    date: '2026-03-12'
  },
  {
    id: 4,
    type: 'expense',
    description: 'Transit pass',
    category: 'Transport',
    amount: 96,
    date: '2026-03-09'
  },
  {
    id: 5,
    type: 'income',
    description: 'Freelance design invoice',
    category: 'Freelance',
    amount: 380,
    date: '2026-03-18'
  }
];

export const initialBudgets = [
  { category: 'Housing', limit: 1300 },
  { category: 'Food', limit: 450 },
  { category: 'Transport', limit: 160 },
  { category: 'Health', limit: 120 },
  { category: 'Fun', limit: 180 },
  { category: 'Savings', limit: 700 }
];

export const initialGoals = [
  {
    id: 1,
    name: 'Emergency Fund',
    target: 5000,
    saved: 2750,
    deadline: '2026-08-31'
  },
  {
    id: 2,
    name: 'New Laptop',
    target: 1800,
    saved: 950,
    deadline: '2026-06-30'
  },
  {
    id: 3,
    name: 'Summer Trip',
    target: 1200,
    saved: 420,
    deadline: '2026-07-15'
  }
];

export const initialActivity = [
  {
    id: 1,
    message: 'Demo workspace loaded with sample March data.',
    timestamp: '2026-03-26T09:00:00.000Z'
  },
  {
    id: 2,
    message: 'Budget planner is ready for live review.',
    timestamp: '2026-03-26T09:04:00.000Z'
  }
];
