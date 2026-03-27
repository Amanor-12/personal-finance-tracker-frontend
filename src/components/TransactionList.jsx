const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD'
});

function TransactionList({ transactions, filter, onFilterChange }) {
  const filteredTransactions =
    filter === 'all' ? transactions : transactions.filter((transaction) => transaction.type === filter);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Live state</p>
          <h3>Recent transactions</h3>
        </div>

        <div className="segmented-control" aria-label="Transaction filters">
          {['all', 'expense', 'income'].map((value) => (
            <button
              key={value}
              type="button"
              className="segment"
              data-active={value === filter}
              onClick={() => onFilterChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="table-list">
        {filteredTransactions.map((transaction) => (
          <article key={transaction.id} className="table-row">
            <div>
              <strong>{transaction.description}</strong>
              <p>
                {transaction.category} · {transaction.date}
              </p>
            </div>
            <div className="transaction-amount" data-type={transaction.type}>
              {transaction.type === 'expense' ? '-' : '+'}
              {currency.format(transaction.amount)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default TransactionList;
