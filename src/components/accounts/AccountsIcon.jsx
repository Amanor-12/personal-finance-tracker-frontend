function AccountsIcon({ type }) {
  const icons = {
    archive: (
      <>
        <path d="M3.4 5.4h9.2M4.4 5.4v6.2h7.2V5.4M5.4 3.6h5.2l.9 1.8H4.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
        <path d="M6.6 8.2h2.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      </>
    ),
    bank: (
      <>
        <path d="M8 3.2 12.5 5.5H3.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
        <path d="M4.4 6.6v4.4M6.8 6.6v4.4M9.2 6.6v4.4M11.6 6.6v4.4M3.7 12.2h8.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      </>
    ),
    cash: (
      <>
        <rect x="3.2" y="5" width="9.6" height="6" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.35" />
        <circle cx="8" cy="8" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.25" />
      </>
    ),
    close: <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.55" />,
    edit: (
      <>
        <path d="M4.2 10.8 4.8 8l5-5 2.2 2.2-5 5-2.8.6Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
        <path d="M8.9 3.9 11.1 6.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      </>
    ),
    plus: <path d="M8 3.8v8.4M3.8 8h8.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />,
    search: (
      <>
        <circle cx="7.1" cy="7.1" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.45" />
        <path d="m9.6 9.6 2.4 2.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.45" />
      </>
    ),
    star: (
      <path d="m8 3.3 1.4 2.9 3.1.4-2.2 2.2.5 3.1L8 10.4 5.2 12l.5-3.1-2.2-2.2 3.1-.4Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
    ),
    wallet: (
      <>
        <path d="M3.4 5.2h8.4a1.2 1.2 0 0 1 1.2 1.2v4.2a1.2 1.2 0 0 1-1.2 1.2H4.1a1.5 1.5 0 0 1-1.5-1.5V4.8a1.4 1.4 0 0 1 1.4-1.4h6.7" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.35" />
        <path d="M10.6 8.5h2.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="vault-icon" viewBox="0 0 16 16">
      {icons[type]}
    </svg>
  );
}

export default AccountsIcon;
