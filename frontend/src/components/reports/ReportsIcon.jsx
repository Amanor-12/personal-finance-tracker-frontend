function ReportsIcon({ type }) {
  const icons = {
    alert: (
      <>
        <path d="m8 3.3 5.2 9H2.8Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
        <path d="M8 6.6v2.4M8 11.1h.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    chart: (
      <>
        <path d="M3.3 12.2h9.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
        <path d="M4.5 10.6V8.4M7.1 10.6V5.3M9.8 10.6V6.8M12.4 10.6V3.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    filter: (
      <>
        <path d="M3.4 4.6h9.2M4.9 8h6.2M6.6 11.4h2.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    search: (
      <>
        <circle cx="7.1" cy="7.1" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="m9.5 9.5 2.5 2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="ref-action-svg" viewBox="0 0 16 16">
      {icons[type]}
    </svg>
  );
}

export default ReportsIcon;
