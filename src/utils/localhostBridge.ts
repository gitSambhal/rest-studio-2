/**
 * Localhost Proxy Bridge & Desktop App Helper
 * Enables execution against localhost / 127.0.0.1 APIs on the user's computer
 * when using the Web Application or Desktop App.
 */

export interface BridgeFetchResult {
  success: boolean;
  response?: any;
  error?: string;
}

export interface DesktopProxyHealth {
  active: boolean;
  version?: string;
  port: number;
  message?: string;
}

export const DEFAULT_DESKTOP_PROXY_PORT = 3000;

let cachedProxyHealth: DesktopProxyHealth = { active: false, port: DEFAULT_DESKTOP_PROXY_PORT };
let lastHealthCheck = 0;

/**
 * Check if running inside native desktop container (Neutralino, Tauri, Electron, file:// protocol)
 */
export function isNativeDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(
    (w.Neutralino && (w.NL_PORT || w.NL_TOKEN || w.NL_MODE || w.__NL_PORT__)) ||
    w.__TAURI__ ||
    w.__TAURI_INTERNALS__ ||
    (w.location?.protocol === 'file:' && w.NL_PORT)
  );
}

/**
 * Initialize Desktop App Relay Client stub (no background WebSocket loops).
 */
export function initDesktopRelayClient(): void {
  if (isNativeDesktopApp()) {
    console.log('[RestStudio Desktop] Native Desktop OS mode active. Direct OS execution enabled.');
  }
}

/**
 * Check if Desktop App is connected or running natively
 */
export async function checkDesktopProxyHealth(): Promise<DesktopProxyHealth> {
  const now = Date.now();
  if (now - lastHealthCheck < 2500 && cachedProxyHealth.active) {
    return cachedProxyHealth;
  }

  // 1. Direct native desktop execution mode
  if (isNativeDesktopApp()) {
    cachedProxyHealth = {
      active: true,
      port: 3000,
      message: 'Native Desktop OS Mode Active',
    };
    lastHealthCheck = now;
    return cachedProxyHealth;
  }

  // 2. Query Cloud Server for status
  try {
    const res = await fetch('/api/health', { method: 'GET' }).catch(() => null);
    if (res && res.ok) {
      cachedProxyHealth = {
        active: true,
        port: 3000,
        message: 'RestStudio Server Ready',
      };
      lastHealthCheck = now;
      return cachedProxyHealth;
    }
  } catch (_) {}

  cachedProxyHealth = {
    active: false,
    port: 3000,
    message: 'Desktop App Offline',
  };
  lastHealthCheck = now;
  return cachedProxyHealth;
}

/**
 * Execute HTTP Request via Web Server Proxy
 */
export async function fetchViaDesktopProxy(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: any
): Promise<BridgeFetchResult> {
  try {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, url, headers, body }),
    });

    if (res.ok) {
      const responseData = await res.json();
      if (responseData && typeof responseData.status === 'number') {
        return {
          success: true,
          response: responseData,
        };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        response: errData,
        error: errData.error || `HTTP ${res.status}: Proxy Request Failed`,
      };
    }
  } catch (err: any) {
    console.warn('[LocalhostBridge] Proxy fetch error:', err?.message);
  }

  return {
    success: false,
    error: 'RestStudio Desktop App is not running. Please launch the Desktop App on your computer to test local APIs.',
  };
}

// Helper stub for compatibility
export async function startDesktopProxyInNeutralino(): Promise<boolean> {
  return true;
}
