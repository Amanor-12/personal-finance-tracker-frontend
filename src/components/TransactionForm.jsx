import { useState } from 'react';
import { categoryOptions } from '../data/mockData';

const defaultForm = {
  type: 'expense',
  description: '',
  category: 'Food',
  amount: '',
  date: new Date().toISOString().slice(0, 10)
};

function TransactionForm({ onAddTransaction }) {
  const [formData, setFormData] = useState(defaultForm);
  const [error, setError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!formData.description.trim()) {
      setError('Please enter a short transaction description.');
      return;
    }

    const parsedAmount = Number(formData.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter an amount greater than zero.');
      return;
    }

    onAddTransaction({
      ...formData,
      description: formData.description.trim(),
      amount: parsedAmount
    });

    setFormData({
      ...defaultForm,
      type: formData.type,
      category: formData.category,
      date: formData.date
    });
    setError('');
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Form validation</p>
          <h3>Add transaction</h3>
        </div>
        <span className="panel-chip">Controlled inputs</span>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Type
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="span-2">
          Description
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Groceries, salary, transit pass..."
          />
        </label>

        <label>
          Category
          <select name="category" value={formData.category} onChange={handleChange}>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label>
          Amount
          <input
            type="number"
            min="0"
            step="0.01"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
          />
        </label>

        <label>
          Date
          <input type="date" name="date" value={formData.date} onChange={handleChange} />
        </label>

        <button type="submit" className="primary-button">
          Save transaction
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : <p className="form-hint">The list below updates instantly when you submit.</p>}
    </section>
  );
}

export default TransactionForm;
