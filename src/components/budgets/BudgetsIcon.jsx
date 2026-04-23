function BudgetsIcon({ type }) {
  const icons = {
    alert: (
      <>
        <path d="m8 3.3 5.2 9H2.8Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
        <path d="M8 6.6v2.4M8 11.1h.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4.1" width="10" height="8.7" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.35" />
        <path d="M5.6 3.1v2M10.4 3.1v2M3.4 6.8h9.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      </>
    ),
    chevronLeft: <path d="m9.8 4.6-3.1 3.4 3.1 3.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.55" />,
    chevronRight: <path d="m6.2 4.6 3.1 3.4-3.1 3.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.55" />,
    close: (
      <>
        <path d="m5.1 5.1 5.8 5.8M10.9 5.1l-5.8 5.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.55" />
      </>
    ),
    edit: (
      <>
        <path d="m5.2 10.8 4.7-4.7 1.3 1.3-4.7 4.7-2 .7Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" />
        <path d="m9.2 5.5.8-.8a1 1 0 0 1 1.4 0l.4.4a1 1 0 0 1 0 1.4l-.8.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" />
      </>
    ),
    plus: <path d="M8 3.7v8.6M3.7 8h8.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />,
    search: (
      <>
        <circle cx="7.1" cy="7.1" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="m9.5 9.5 2.5 2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    target: (
      <>
        <circle cx="8" cy="8" r="4.7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="8" r=".8" fill="currentColor" />
      </>
    ),
    trash: (
      <>
        <path d="M4.8 5.3h6.4M6.3 5.3V4.2h3.4v1.1M5.6 6.3v4.4M8 6.3v4.4M10.4 6.3v4.4M4.7 5.3l.5 6a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9l.5-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="ref-action-svg" viewBox="0 0 16 16">
      {icons[type]}
    </svg>
  );
}

export default BudgetsIcon;
