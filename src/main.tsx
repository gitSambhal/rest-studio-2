/**
 * RestStudio - Offline-First REST API Client & Workspace
 * Created by Suhail Akhtar (https://suhail.top)
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { initDesktopClipboardHandlers } from './utils/desktopClipboard.ts';

// Initialize Neutralino Native Desktop SDK if running inside the Neutralino
// container. The SDK script is loaded from /js/neutralino.js (see index.html);
// in the desktop app the framework's server prepends the NL_* globals to that
// response, so the globals appear only once the SDK has loaded — poll briefly
// for them, then init (opens the WebSocket to the native core).
async function initNeutralino() {
  for (let i = 0; i < 60; i++) {
    const w = window as any;
    if (w.Neutralino && (w.NL_PORT || w.NL_TOKEN)) {
      try {
        w.Neutralino.init();
        console.log('[RestStudio Neutralino] Neutralino Native OS SDK initialized');
      } catch (err) {
        console.warn('[RestStudio Neutralino] Initialization warning:', err);
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}
initNeutralino();

// Initialize desktop clipboard, copy/paste and text selection handlers
initDesktopClipboardHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);




