import { useEffect, useState } from 'react';

function Counter() {
  const [savings, setSavings] = useState(() => {
    if (typeof window === 'undefined') {
      return 250;
    }

    const savedAmount = window.localStorage.getItem('finance-savings');
    return savedAmount ? Number(savedAmount) : 250;
  });

  const goal = 1000;
  const progress = Math.min((savings / goal) * 100, 100);

  useEffect(() => {
    window.localStorage.setItem('finance-savings', String(savings));
  }, [savings]);

  return (
    <section>
      <h2>Savings Counter</h2>
      <p>
        This component uses <code>useState</code> to update the total and{' '}
        <code>useEffect</code> to store it in localStorage.
      </p>

      <div
        style={{
          margin: '1rem 0',
          padding: '1rem',
          borderRadius: '18px',
          background: '#f4f1ea',
        }}
      >
        <strong style={{ fontSize: '2rem', color: '#102542' }}>${savings}</strong>
        <div
          style={{
            marginTop: '0.85rem',
            width: '100%',
            height: '10px',
            borderRadius: '999px',
            background: '#ddd7cb',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #2e7d6b, #f7c948)',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setSavings((current) => current + 50)}>
          Add $50
        </button>
        <button
          type="button"
          onClick={() => setSavings((current) => Math.max(current - 25, 0))}
        >
          Remove $25
        </button>
        <button type="button" onClick={() => setSavings(250)}>
          Reset
        </button>
      </div>
    </section>
  );
}

export default Counter;
