function BrandLogo({
  title = 'Ledgr',
  subtitle = 'Private finance workspace',
  compact = false,
  className = '',
  tone = 'dark',
}) {
  return (
    <div
      className={`brand-logo brand-logo-${tone}${compact ? ' brand-logo-compact' : ''}${className ? ` ${className}` : ''}`}
    >
      <svg aria-hidden="true" className="brand-logo-mark" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="ledgrLogoField" x1="10" y1="8" x2="54" y2="56">
            <stop offset="0%" stopColor="#1982ff" />
            <stop offset="55%" stopColor="#12a0db" />
            <stop offset="100%" stopColor="#7ccf5e" />
          </linearGradient>
          <linearGradient id="ledgrLogoCheck" x1="18" y1="44" x2="50" y2="18">
            <stop offset="0%" stopColor="#0e77af" />
            <stop offset="100%" stopColor="#afe26e" />
          </linearGradient>
        </defs>

        <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#ledgrLogoField)" />
        <rect x="15.4" y="39.2" width="6.2" height="15.6" rx="1.2" fill="#0d1623" />
        <rect x="24.6" y="28.6" width="6.8" height="26.2" rx="1.2" fill="#0d1623" />
        <rect x="35.2" y="19.6" width="7" height="35.2" rx="1.2" fill="#0d1623" />
        <path
          d="M20.4 40.4 31.2 40.4 41.8 30.2 53.8 19.4 53.8 15.4 19.8 15.4 15.4 19.8 15.4 45.4Z"
          fill="none"
          opacity="0.14"
          stroke="#ffffff"
          strokeWidth="2.2"
        />
        <path d="M18.2 48.6 27.4 43.2 33.8 49.8 58 24.6 54.8 35.4 34.2 57.4 26.8 49.6 15.2 53.8Z" fill="#0d1623" />
        <path d="M23.6 42 31 49.4 54.4 24.8 58 24.2 33.6 56.2 26.6 48.6 18.4 48.8Z" fill="url(#ledgrLogoCheck)" />
      </svg>

      <div className="brand-logo-copy">
        <strong>{title}</strong>
        {!compact && subtitle ? <span>{subtitle}</span> : null}
      </div>
    </div>
  );
}

export default BrandLogo;
