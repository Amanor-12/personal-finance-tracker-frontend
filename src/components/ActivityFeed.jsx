import { useState } from 'react';
import './ActivityFeed.css';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'bill', label: 'Bills' },
  { id: 'savings', label: 'Savings' },
  { id: 'spending', label: 'Spending' },
];

function ActivityFeed({ items }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const visibleItems =
    activeFilter === 'all'
      ? items
      : items.filter((item) => item.type === activeFilter);

  return (
    <section className="activity-feed">
      <div className="panel-heading">
        <div>
          <h2>Recent Activity</h2>
          <p>
            Small dashboard feature added after login so the auth flow leads to a real workspace.
          </p>
        </div>
      </div>

      <div className="activity-filters">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={filter.id === activeFilter ? 'filter-button is-active' : 'filter-button'}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <ul className="activity-list">
        {visibleItems.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.note}</p>
            </div>

            <div className="activity-meta">
              <span className={`activity-tag activity-tag-${item.type}`}>{item.tag}</span>
              <strong
                className={
                  item.amount.startsWith('-')
                    ? 'activity-amount is-expense'
                    : 'activity-amount'
                }
              >
                {item.amount}
              </strong>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ActivityFeed;
