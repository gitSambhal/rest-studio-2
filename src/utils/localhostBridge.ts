/**
 * Localhost Proxy Bridge & Desktop App Cloud Relay
 * Enables seamless execution against localhost / 127.0.0.1 APIs on the user's computer
 * when using the Web Application on remote servers (Cloud Run / Netlify / Vercel).
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

let relayWs: WebSocket | null = null;

/**
 * Initialize Desktop App Relay Client.
 * Automatically connects the RestStudio Desktop Application on the user's computer
 * via an encrypted outbound WebSocket connection to the Cloud Relay server.
 * Zero CLI commands or manual terminal commands needed!
 */
export function initDesktopRelayClient(): void {
  if (typeof window === 'undefined') return;

  // Determine WebSocket URL for Cloud Relay
  let wsUrl = '';
  if (window.location.protocol.startsWith('http')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}/api/relay/ws`;
  } else {
    // Default fallback Cloud Relay URL when running from file:// protocol
    wsUrl = 'wss://ais-dev-p7q3teh2lcfdzgil5j7yhw-236658229502.asia-southeast1.run.app/api/relay/ws';
  }

  function connect() {
    if (relayWs && (relayWs.readyState === WebSocket.OPEN || relayWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      console.log('[Desktop Relay] Connecting Desktop App to Cloud Relay Server:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        relayWs = ws;
        console.log('[Desktop Relay] Connected to Cloud Relay Server!');
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
            const { id, method = 'GET', url, headers = {}, body } = data;
            const startTime = Date.now();

            try {
              // Execute request locally on the user's computer
              const fetchOpts: RequestInit = {
                method: method.toUpperCase(),
                headers: { ...headers },
              };

              if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && body !== undefined && body !== null) {
                fetchOpts.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
              }

              const res = await fetch(url, fetchOpts);
              const resText = await res.text();
              const duration = Date.now() - startTime;

              const resHeaders: Record<string, string> = {};
              res.headers.forEach((value, key) => {
                resHeaders[key] = value;
              });

              ws.send(
                JSON.stringify({
                  type: 'relay_response',
                  id,
                  status: res.status,
                  statusText: res.statusText || 'OK',
                  headers: resHeaders,
                  body: resText,
                  size: new Blob([resText]).size,
                  duration,
                  timestamp: Date.now(),
                  ok: res.ok,
                  contentType: res.headers.get('content-type') || 'text/plain',
                })
              );
            } catch (err: any) {
              const duration = Date.now() - startTime;
              ws.send(
                JSON.stringify({
                  type: 'relay_response',
                  id,
                  status: 0,
                  statusText: 'Local Network Error',
                  headers: {},
                  body: JSON.stringify({
                    error: err?.message || 'Failed to connect to local endpoint on desktop',
                    url,
                  }),
                  size: 0,
                  duration,
                  timestamp: Date.now(),
                  ok: false,
                  error: err?.message || 'Local connection error',
                })
              );
            }
          }
        } catch (err: any) {
          console.warn('[Desktop Relay] Error handling relay message:', err?.message);
        }
      };

      ws.onclose = () => {
        relayWs = null;
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        relayWs = null;
      };
    } catch (err: any) {
      console.warn('[Desktop Relay] WebSocket connection error:', err?.message);
      setTimeout(connect, 5000);
    }
  }

  connect();
}

/**
 * Check if Desktop App is connected to the Cloud Server via WebSocket Relay
 */
export async function checkDesktopProxyHealth(): Promise<DesktopProxyHealth> {
  const now = Date.now();
  if (now - lastHealthCheck < 2500 && cachedProxyHealth.active) {
    return cachedProxyHealth;
  }

  // 1. Direct native desktop execution mode
  const isNativeApp = typeof window !== 'undefined' && Boolean(
    (window as any).Neutralino ||
    (window as any).NL_PORT ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_INTERNALS__ ||
    window.location.protocol === 'file:'
  );

  if (isNativeApp) {
    cachedProxyHealth = {
      active: true,
      port: 3000,
      message: 'Native Desktop OS Mode Active',
    };
    lastHealthCheck = now;
    return cachedProxyHealth;
  }

  // 2. Query Cloud Server for active Desktop App WebSocket Relay
  try {
    const res = await fetch('/api/relay/status');
    if (res.ok) {
      const data = await res.json();
      if (data && data.active) {
        cachedProxyHealth = {
          active: true,
          port: 3000,
          message: 'Desktop App Connected (Cloud Relay)',
        };
        lastHealthCheck = now;
        return cachedProxyHealth;
      }
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
 * Execute HTTP Request via Web Server Proxy / Cloud Relay
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
  initDesktopRelayClient();
  return true;
}
