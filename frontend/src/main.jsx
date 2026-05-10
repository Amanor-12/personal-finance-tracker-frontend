import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { installGlobalErrorHandlers } from './utils/observability';
import { scheduleSentryInitialization } from './utils/sentry';

installGlobalErrorHandlers();
scheduleSentryInitialization();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
