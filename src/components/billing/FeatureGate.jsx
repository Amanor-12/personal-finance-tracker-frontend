import { Link } from 'react-router-dom';

export function FeatureGate({ eyebrow, features = [], helper, title }) {
  return (
    <section className="feature-gate-shell">
      <div className="feature-gate-copy">
        <span className="feature-gate-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{helper}</p>
        <div className="feature-gate-actions">
          <Link className="feature-gate-primary" to="/pricing">
            Upgrade to Pro
          </Link>
          <Link className="feature-gate-secondary" to="/billing">
            View billing
          </Link>
        </div>
      </div>

      <div className="feature-gate-benefits">
        <span>Unlocks</span>
        <ul>
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ResourceLimitCard({ body, limit, resourceLabel, usage }) {
  return (
    <article className="resource-limit-card">
      <div>
        <span>Free tier limit</span>
        <strong>
          {usage}/{limit} {resourceLabel}
        </strong>
        <p>{body}</p>
      </div>
      <Link className="resource-limit-action" to="/pricing">
        Unlock more
      </Link>
    </article>
  );
}
