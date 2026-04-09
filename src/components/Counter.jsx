import './Counter.css';

function Counter({ goal, onSavingsChange, savings }) {
  const progress = Math.min((savings / goal) * 100, 100);

  return (
    <section className="savings-counter">
      <h2>Savings Counter</h2>
      <p>
        This component uses <code>useState</code> to update the total and{' '}
        <code>useEffect</code> in the main app to keep it in localStorage.
      </p>

      <div className="counter-meter">
        <strong>${savings}</strong>
        <div className="counter-progress">
          <div
            className="counter-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
        <small>{Math.round(progress)}% of your starter savings goal</small>
      </div>

      <div className="counter-actions">
        <button type="button" onClick={() => onSavingsChange((current) => current + 50)}>
          Add $50
        </button>
        <button
          className="counter-button-secondary"
          type="button"
          onClick={() => onSavingsChange((current) => Math.max(current - 25, 0))}
        >
          Remove $25
        </button>
        <button
          className="counter-button-ghost"
          type="button"
          onClick={() => onSavingsChange(250)}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default Counter;
