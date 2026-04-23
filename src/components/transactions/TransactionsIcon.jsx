function TransactionsIcon({ type }) {
  const icons = {
    account: (
      <>
        <rect x="3" y="4.4" width="10" height="7.2" rx="1.7" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="M4.3 7h7.4M5.5 9.5h2.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    arrowDown: (
      <path d="M8 3.6v8.8M4.9 9.2 8 12.4l3.1-3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.55" />
    ),
    arrowUp: (
      <path d="M8 12.4V3.6M4.9 6.8 8 3.6l3.1 3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.55" />
    ),
    calendar: (
      <>
        <rect x="3.2" y="4.2" width="9.6" height="8.4" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="M5.5 3.3v2M10.5 3.3v2M3.8 6.8h8.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    close: <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.55" />,
    delete: (
      <>
        <path d="M4.7 5.5h6.6M6.2 5.5V4.2h3.6v1.3M5.6 6.6l.4 5.2h4l.4-5.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" />
        <path d="M7.4 7.7v2.8M8.6 7.7v2.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" />
      </>
    ),
    edit: (
      <>
        <path d="M4.1 10.9 4.7 8l5-5 2.3 2.3-5 5-2.9.6Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" />
        <path d="M8.9 3.8 11.2 6.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      </>
    ),
    filter: (
      <path d="M3.5 4.7h9M5.2 8h5.6M6.8 11.3h2.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.55" />
    ),
    ledger: (
      <>
        <path d="M4.3 4.8h7.4M4.3 8h7.4M4.3 11.2h4.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
        <circle cx="2.9" cy="4.8" r=".55" fill="currentColor" />
        <circle cx="2.9" cy="8" r=".55" fill="currentColor" />
        <circle cx="2.9" cy="11.2" r=".55" fill="currentColor" />
      </>
    ),
    plus: <path d="M8 3.8v8.4M3.8 8h8.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />,
    search: (
      <>
        <circle cx="7.1" cy="7.1" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="m9.6 9.6 2.4 2.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    shield: (
      <path d="M8 3.2 12 4.6v3.1c0 2.5-1.5 4.2-4 5.1-2.5-.9-4-2.6-4-5.1V4.6L8 3.2Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.45" />
    ),
  };

  return (
    <svg aria-hidden="true" className="ledger-icon" viewBox="0 0 16 16">
      {icons[type]}
    </svg>
  );
}

export default TransactionsIcon;
