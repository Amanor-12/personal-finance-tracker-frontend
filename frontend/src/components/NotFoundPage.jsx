import { Link } from 'react-router-dom';
import AppShellState from './AppShellState';

function NotFoundPage({ currentUser }) {
  return (
    <AppShellState
      eyebrow="Page not found"
      title="This route is not part of your workspace."
      body={
        currentUser
          ? 'The page you tried to open does not exist, may have moved, or is not enabled for this workspace.'
          : 'The page you tried to open does not exist or has moved. Start from the public shell and re-enter from a known path.'
      }
      primaryAction={{
        component: Link,
        label: currentUser ? 'Go to dashboard' : 'Go to home',
        to: currentUser ? '/dashboard' : '/',
      }}
      secondaryAction={{
        component: Link,
        label: currentUser ? 'Open help center' : 'See pricing',
        to: currentUser ? '/help' : '/pricing',
      }}
      note={currentUser ? 'If this was linked from inside the app, that route needs cleanup.' : ''}
    />
  );
}

export default NotFoundPage;
