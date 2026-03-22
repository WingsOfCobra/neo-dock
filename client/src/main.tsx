import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './assets/styles/globals.css';
import { registerServiceWorker } from './sw-register';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register service worker for offline support (production only)
registerServiceWorker();
