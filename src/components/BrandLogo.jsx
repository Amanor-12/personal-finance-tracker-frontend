function BrandLogo({
  title = 'Rivo',
  subtitle = 'Private finance workspace',
  compact = false,
  className = '',
  tone = 'dark',
  markOnly = false,
}) {
  return (
    <div
      className={`brand-logo brand-logo-${tone}${compact ? ' brand-logo-compact' : ''}${markOnly ? ' brand-logo-mark-only' : ''}${className ? ` ${className}` : ''}`}
    >
      <svg aria-hidden="true" className="brand-logo-mark" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="rivoMarkField" x1="10" y1="8" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#12193b" />
            <stop offset="58%" stopColor="#0f1737" />
            <stop offset="100%" stopColor="#1e2857" />
          </linearGradient>
          <linearGradient id="rivoMarkGlow" x1="15" y1="15" x2="47" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="6" y="6" width="52" height="52" rx="15" fill="url(#rivoMarkField)" />
        <path
          d="M22.5 14C17.8 14 14 17.8 14 22.5V41.5C14 46.2 17.8 50 22.5 50H39.8C44.3 50 48 46.3 48 41.8V37.4C48 35.8 46.7 34.5 45.1 34.5C43.5 34.5 42.2 35.8 42.2 37.4V40.4C42.2 42.3 40.7 43.8 38.8 43.8H23.7C21.8 43.8 20.3 42.3 20.3 40.4V23.6C20.3 21.7 21.8 20.2 23.7 20.2H29.4C31 20.2 32.3 18.9 32.3 17.3C32.3 15.7 31 14.4 29.4 14.4H22.5Z"
          fill="#f6f1e7"
        />
        <rect x="34.7" y="15.8" width="8.2" height="18.6" rx="4.1" fill="#f6f1e7" />
        <circle cx="47.4" cy="17.3" r="4.1" fill="#76e1d0" />
        <path
          d="M18.5 14.5h20.6c6 0 10.9 4.9 10.9 10.9v20.1"
          fill="none"
          opacity="0.48"
          stroke="url(#rivoMarkGlow)"
          strokeLinecap="round"
          strokeWidth="1.2"
        />
        <rect x="6.7" y="6.7" width="50.6" height="50.6" rx="14.3" fill="none" opacity="0.08" stroke="#ffffff" strokeWidth="1.1" />
      </svg>

      {markOnly ? null : (
        <div className="brand-logo-copy">
          <strong>{title}</strong>
          {!compact && subtitle ? <span>{subtitle}</span> : null}
        </div>
      )}
    </div>
  );
}

export default BrandLogo;
