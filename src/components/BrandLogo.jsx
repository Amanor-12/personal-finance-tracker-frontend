function BrandLogo({
  title = 'Fina Inc',
  subtitle = 'Private finance workspace',
  compact = false,
  className = '',
}) {
  return (
    <div className={`brand-logo${compact ? ' brand-logo-compact' : ''}${className ? ` ${className}` : ''}`}>
      <svg aria-hidden="true" className="brand-logo-mark" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="brandLogoCore" x1="10" y1="10" x2="54" y2="54">
            <stop offset="0%" stopColor="#5f7bff" />
            <stop offset="58%" stopColor="#6b55ff" />
            <stop offset="100%" stopColor="#8f4dff" />
          </linearGradient>
          <linearGradient id="brandLogoGold" x1="30" y1="8" x2="52" y2="52">
            <stop offset="0%" stopColor="#ffd76a" />
            <stop offset="100%" stopColor="#ff9f43" />
          </linearGradient>
        </defs>

        <circle cx="32" cy="32" r="26" fill="url(#brandLogoCore)" />
        <path
          d="M17 31.5c0-8.6 6.9-15.5 15.5-15.5 6.5 0 12 3.7 14.6 9.2H32.8v7.2h17.7c0 10.3-8.3 18.6-18.6 18.6-10.5 0-18.9-8.5-18.9-18.9Z"
          fill="none"
          opacity="0.92"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <path d="M35 27h17c3 0 5.5 2.5 5.5 5.5S55 38 52 38H39.8Z" fill="url(#brandLogoGold)" />
        <circle cx="24.5" cy="24.5" r="8.2" fill="#ffffff" opacity="0.92" />
      </svg>

      <div className="brand-logo-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}

export default BrandLogo;
