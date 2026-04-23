import { Link } from 'react-router-dom';

export const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  style: 'currency',
});

export const formatMoney = (value) => currencyFormatter.format(Number(value) || 0);

export function PremiumHero({ actions = null, body, eyebrow, meta = [], title, variant = 'blue', visual = null }) {
  return (
    <section className={`premium-hero premium-hero-${variant}`}>
      <div className="premium-hero-copy">
        <span className="premium-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        {meta.length ? (
          <div className="premium-hero-meta">
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
        {actions ? <div className="premium-action-row">{actions}</div> : null}
      </div>
      <div className="premium-hero-visual" aria-hidden="true">
        {visual}
      </div>
    </section>
  );
}

export function PremiumMetric({ label, tone = 'neutral', value, helper }) {
  return (
    <article className={`premium-metric premium-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

export function PremiumMetrics({ children }) {
  return <section className="premium-metric-grid">{children}</section>;
}

export function PremiumPanel({ actions = null, children, eyebrow, title }) {
  return (
    <section className="ref-panel premium-panel">
      {(eyebrow || title || actions) ? (
        <div className="premium-panel-head">
          <div>
            {eyebrow ? <span className="premium-eyebrow premium-eyebrow-soft">{eyebrow}</span> : null}
            {title ? <h3>{title}</h3> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PremiumEmpty({ actionLabel, body, icon = null, onAction, title, to }) {
  const action = to ? (
    <Link className="premium-primary-action" to={to}>
      {actionLabel}
    </Link>
  ) : actionLabel ? (
    <button className="premium-primary-action" type="button" onClick={onAction}>
      {actionLabel}
    </button>
  ) : null;

  return (
    <div className="premium-empty">
      {icon ? <div className="premium-empty-icon">{icon}</div> : null}
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function PremiumSkeleton({ count = 4 }) {
  return (
    <div className="premium-skeleton-list" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function PremiumButton({ children, onClick, tone = 'primary', type = 'button', disabled = false }) {
  return (
    <button className={`premium-${tone}-action`} disabled={disabled} type={type} onClick={onClick}>
      {children}
    </button>
  );
}
