import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { initDesktopClipboardHandlers } from './utils/desktopClipboard.ts';

// Initialize Neutralino Native Desktop SDK if running inside Neutralino container
if (typeof window !== 'undefined' && (window as any).Neutralino) {
  try {
    const NL = (window as any).Neutralino;
    NL.init();
    console.log('[RestStudio Neutralino] Neutralino Native OS SDK initialized');

    // Handle window close event gracefully with explicit exit call
    if (NL.events) {
      NL.events.on('windowClose', () => {
        console.log('[RestStudio Neutralino] Window closing gracefully...');
        try {
          if (NL.app?.exit) {
            NL.app.exit(0);
          }
        } catch {
          // Graceful fallback
        }
      });
    }

    window.addEventListener('beforeunload', () => {
      try {
        if (NL.app?.exit) {
          NL.app.exit(0);
        }
      } catch {
        // Ignore unload errors during exit
      }
    });
  } catch (err) {
    console.warn('[RestStudio Neutralino] Initialization warning:', err);
  }
}

// Initialize desktop clipboard, copy/paste and text selection handlers
initDesktopClipboardHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


