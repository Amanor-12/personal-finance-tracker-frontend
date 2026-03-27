import { useState } from 'react';

const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD'
});

function GoalTracker({ goals, onContribute }) {
  const [goalId, setGoalId] = useState(String(goals[0]?.id ?? ''));
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Contribution must be greater than zero.');
      return;
    }

    onContribute(Number(goalId), parsedAmount);
    setAmount('');
    setError('');
  }

  return (
    <section className="panel panel-tall">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">State updates</p>
          <h3>Savings goals</h3>
        </div>
        <span className="panel-chip">Mock deposits</span>
      </div>

      <form className="inline-form" onSubmit={handleSubmit}>
        <label>
          Goal
          <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Deposit
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="150"
          />
        </label>

        <button type="submit" className="primary-button compact-button">
          Add funds
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="goal-grid">
        {goals.map((goal) => {
          const percent = Math.min((goal.saved / goal.target) * 100, 100);

          return (
            <article key={goal.id} className="goal-card">
              <div className="goal-copy">
                <p className="eyebrow">Target</p>
                <h4>{goal.name}</h4>
                <span>Deadline: {goal.deadline}</span>
              </div>

              <div>
                <div className="progress-track">
                  <div className="progress-fill" data-status="highlight" style={{ width: `${percent}%` }} />
                </div>
                <p className="goal-amount">
                  {currency.format(goal.saved)} of {currency.format(goal.target)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default GoalTracker;
