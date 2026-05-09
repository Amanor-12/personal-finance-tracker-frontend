import { Component } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { captureFrontendError } from '../utils/observability';

class AppErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Rivo app error boundary caught a runtime failure.', error, errorInfo);
    captureFrontendError(error, {
      componentName: 'AppErrorBoundary',
      metadata: {
        componentStack: errorInfo?.componentStack || '',
      },
      routePath: this.props.resetKey,
      severity: 'fatal',
    });
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        error: null,
        hasError: false,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell-state">
          <section className="app-shell-card" role="alert" aria-live="assertive">
            <span className="app-shell-eyebrow">Runtime error</span>
            <h1>Rivo hit an unexpected problem.</h1>
            <p>
              The current screen could not finish rendering. Reload the app or move back to a safer page
              before continuing.
            </p>
            <div className="app-shell-actions">
              <button
                className="app-shell-primary"
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
              >
                Reload app
              </button>
              <Link className="app-shell-secondary" to="/">
                Go to home
              </Link>
            </div>
            {this.state.error?.message ? (
              <p className="app-shell-note">Technical detail: {this.state.error.message}</p>
            ) : null}
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function AppErrorBoundary({ children }) {
  const location = useLocation();

  return <AppErrorBoundaryInner resetKey={location.pathname}>{children}</AppErrorBoundaryInner>;
}

export default AppErrorBoundary;
