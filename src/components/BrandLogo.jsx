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
          <linearGradient id="brandLogoCore" x1="8" y1="10" x2="56" y2="54">
            <stop offset="0%" stopColor="#1a5276" />
            <stop offset="62%" stopColor="#1d7081" />
            <stop offset="100%" stopColor="#2ea890" />
          </linearGradient>
          <linearGradient id="brandLogoGold" x1="35" y1="12" x2="52" y2="40">
            <stop offset="0%" stopColor="#f6d285" />
            <stop offset="100%" stopColor="#efb24f" />
          </linearGradient>
          <linearGradient id="brandLogoStroke" x1="17" y1="18" x2="47" y2="46">
            <stop offset="0%" stopColor="#153a60" />
            <stop offset="100%" stopColor="#1d7081" />
          </linearGradient>
        </defs>

        <circle cx="32" cy="32" r="26" fill="#ffffff" />
        <circle cx="32" cy="32" r="24" fill="none" stroke="url(#brandLogoCore)" strokeWidth="6" />
        <circle cx="32" cy="32" r="16.5" fill="#ffffff" />
        <path
          d="M18.5 31.8c0-7.5 6-13.6 13.5-13.6 5.6 0 10.4 3 12.9 7.6H32.7v5.9h14.5c0 8.5-6.9 15.4-15.4 15.4-8.9 0-16.1-7.2-16.1-16.1Z"
          fill="none"
          stroke="url(#brandLogoStroke)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4.8"
        />
        <path d="M40 20.5h10.2a5.2 5.2 0 0 1 0 10.4H40.4Z" fill="url(#brandLogoGold)" />
        <rect x="21.5" y="22" width="8.4" height="8.4" rx="2.8" fill="#ffffff" stroke="#d9e8ea" strokeWidth="1.6" />
      </svg>

      <div className="brand-logo-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}

export default BrandLogo;
