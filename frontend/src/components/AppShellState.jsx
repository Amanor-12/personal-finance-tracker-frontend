import BrandLogo from './BrandLogo';

function AppShellStateAction({ action, variant = 'primary' }) {
  if (!action) {
    return null;
  }

  const className = variant === 'primary' ? 'app-shell-primary' : 'app-shell-secondary';

  if (action.to) {
    const LinkComponent = action.component;
    return (
      <LinkComponent className={className} to={action.to}>
        {action.label}
      </LinkComponent>
    );
  }

  return (
    <button className={className} type="button" onClick={action.onClick}>
      {action.label}
    </button>
  );
}

function AppShellState({
  body,
  eyebrow,
  loading = false,
  note = '',
  primaryAction = null,
  secondaryAction = null,
  title,
}) {
  return (
    <main className={`app-shell-state${loading ? ' is-loading' : ''}`}>
      <section className="app-shell-card" role="alert" aria-live={loading ? 'polite' : 'assertive'}>
        <div className="app-shell-brand">
          <BrandLogo compact subtitle="" title="Rivo" tone="dark" />
        </div>
        <span className="app-shell-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{body}</p>

        {loading ? (
          <div className="app-shell-loading" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : null}

        {(primaryAction || secondaryAction) ? (
          <div className="app-shell-actions">
            <AppShellStateAction action={primaryAction} variant="primary" />
            <AppShellStateAction action={secondaryAction} variant="secondary" />
          </div>
        ) : null}

        {note ? <p className="app-shell-note">{note}</p> : null}
      </section>
    </main>
  );
}

export default AppShellState;
