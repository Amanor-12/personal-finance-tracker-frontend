import { Component } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppShellState from './AppShellState';
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
        <AppShellState
          body="The current screen could not finish rendering. Reload the app or move back to a safer page before continuing."
          eyebrow="Runtime error"
          note={this.state.error?.message ? `Technical detail: ${this.state.error.message}` : ''}
          primaryAction={{
            label: 'Reload app',
            onClick: () => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            },
          }}
          secondaryAction={{
            component: Link,
            label: 'Go to home',
            to: '/',
          }}
          title="Rivo hit an unexpected problem."
        />
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
