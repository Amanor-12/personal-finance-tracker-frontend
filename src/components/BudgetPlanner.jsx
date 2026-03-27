import { useState } from 'react';
import { categoryOptions } from '../data/mockData';

const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD'
});

function BudgetPlanner({ budgets, spendingByCategory, onSaveBudget }) {
  const [formData, setFormData] = useState({
    category: 'Food',
    limit: ''
  });
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    const parsedLimit = Number(formData.limit);
    if (!parsedLimit || parsedLimit <= 0) {
      setError('Budget limit must be greater than zero.');
      return;
    }

    onSaveBudget({
      category: formData.category,
      limit: parsedLimit
    });

    setFormData((current) => ({
      ...current,
      limit: ''
    }));
    setError('');
  }

  return (
    <section className="panel panel-tall">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reusable component</p>
          <h3>Budget planner</h3>
        </div>
        <span className="panel-chip">Instant progress</span>
      </div>

      <form className="inline-form" onSubmit={handleSubmit}>
        <label>
          Category
          <select
            name="category"
            value={formData.category}
            onChange={(event) =>
              setFormData((current) => ({ ...current, category: event.target.value }))
            }
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label>
          Limit
          <input
            type="number"
            min="0"
            step="0.01"
            name="limit"
            value={formData.limit}
            onChange={(event) =>
              setFormData((current) => ({ ...current, limit: event.target.value }))
            }
            placeholder="450"
          />
        </label>

        <button type="submit" className="primary-button compact-button">
          Save budget
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="budget-list">
        {budgets.map((budget) => {
          const spent = spendingByCategory[budget.category] || 0;
          const percent = Math.min((spent / budget.limit) * 100, 100);
          const status = spent > budget.limit ? 'danger' : percent > 75 ? 'warning' : 'safe';

          return (
            <article key={budget.category} className="budget-row">
              <div className="budget-header">
                <strong>{budget.category}</strong>
                <span>
                  {currency.format(spent)} / {currency.format(budget.limit)}
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" data-status={status} style={{ width: `${percent}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default BudgetPlanner;
