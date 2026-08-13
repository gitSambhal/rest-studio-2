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

let relayWs: WebSocket | null = null;

/**
 * Initialize Desktop App Relay Client when running inside native Desktop container.
 * Opens an outbound WebSocket connection to the Cloud Relay server so web sessions can execute local requests.
 */
export function initDesktopRelayClient(): void {
  if (typeof window === 'undefined') return;
  if (!isNativeDesktopApp()) {
    return; // No relay client needed in standard web browser
  }

  console.log('[RestStudio Desktop] Native Desktop OS mode active. Direct OS execution enabled.');

  let wsUrl = '';
  if (window.location.protocol.startsWith('http')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}/api/relay/ws`;
  } else {
    const host = window.location.host || 'ais-dev-p7q3teh2lcfdzgil5j7yhw-236658229502.asia-southeast1.run.app';
    wsUrl = `wss://${host}/api/relay/ws`;
  }

  function connectRelay() {
    if (relayWs && (relayWs.readyState === WebSocket.OPEN || relayWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[RestStudio Desktop Relay] Connected to Cloud Relay Server!');
        try {
          ws.send(JSON.stringify({ type: 'register_desktop', platform: navigator.platform }));
        } catch (_) {}
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }

          if (data.type === 'relay_request' && data.id && data.url) {
            console.log(`[RestStudio Desktop Relay] Executing local request: ${data.method} ${data.url}`);
            
            let localResponse: any = null;
            try {
              const startTime = performance.now();
              const res = await fetch(data.url, {
                method: data.method,
                headers: data.headers,
                body: data.body ? (typeof data.body === 'string' ? data.body : JSON.stringify(data.body)) : undefined,
              });
              const text = await res.text();
              const duration = Math.round(performance.now() - startTime);
              const resHeaders: Record<string, string> = {};
              res.headers.forEach((v, k) => { resHeaders[k] = v; });

              localResponse = {
                status: res.status,
                statusText: res.statusText || 'OK',
                headers: resHeaders,
                body: text,
                size: new Blob([text]).size,
                duration,
                timestamp: Date.now(),
                ok: res.ok,
                contentType: res.headers.get('content-type') || 'text/plain',
              };
            } catch (fetchErr: any) {
              localResponse = {
                status: 0,
                statusText: 'Local Network Error',
                headers: {},
                body: JSON.stringify({ error: fetchErr.message || 'Failed to fetch local endpoint' }),
                size: 0,
                duration: 0,
                timestamp: Date.now(),
                ok: false,
                error: fetchErr.message,
              };
            }

            ws.send(
              JSON.stringify({
                type: 'relay_response',
                id: data.id,
                ...localResponse,
              })
            );
          }
        } catch (err: any) {
          console.warn('[RestStudio Desktop Relay] Error processing relay message:', err?.message);
        }
      };

      ws.onclose = () => {
        relayWs = null;
        setTimeout(connectRelay, 5000);
      };

      ws.onerror = () => {
        try { ws.close(); } catch (_) {}
      };

      relayWs = ws;
    } catch (_) {
      setTimeout(connectRelay, 5000);
    }
  }

  connectRelay();
}

/**
 * Check if Desktop App is connected or running natively
 */
export async function checkDesktopProxyHealth(): Promise<DesktopProxyHealth> {
  const now = Date.now();
  if (now - lastHealthCheck < 1500) {
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

  // 2. Query Relay Status endpoint to check if a Desktop App agent is connected
  try {
    const res = await fetch('/api/relay/status', { method: 'GET', cache: 'no-store' }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.active === true) {
        cachedProxyHealth = {
          active: true,
          port: 3000,
          message: 'RestStudio Desktop Agent Connected',
        };
        lastHealthCheck = now;
        return cachedProxyHealth;
      }
    }
  } catch (_) {}

  cachedProxyHealth = {
    active: false,
    port: 3000,
    message: 'Desktop App Disconnected',
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
