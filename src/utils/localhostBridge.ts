/**
 * Localhost Proxy Bridge & Desktop Proxy Agent
 * Enables direct client execution to localhost / 127.0.0.1 and CORS-restricted APIs from both:
 * 1. Desktop Mode (Neutralino / Tauri native OS execution)
 * 2. Netlify Web Deployment (via Desktop Proxy Agent running on http://127.0.0.1:28108)
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

export const DEFAULT_DESKTOP_PROXY_PORT = 28108;

let swRegistration: ServiceWorkerRegistration | null = null;
let cachedProxyHealth: DesktopProxyHealth = { active: false, port: DEFAULT_DESKTOP_PROXY_PORT };
let lastHealthCheck = 0;

let activeWsSocket: WebSocket | null = null;
let pendingWsCallbacks = new Map<string, (res: any) => void>();

/**
 * Connect to Desktop Proxy Agent WebSocket Server on ws://127.0.0.1:28108
 * Crucial for Web Deployments (HTTPS -> ws://127.0.0.1) to bypass browser Mixed Content restrictions!
 */
export async function connectDesktopProxyWebSocket(port: number = DEFAULT_DESKTOP_PROXY_PORT): Promise<WebSocket | null> {
  if (typeof window === 'undefined' || !('WebSocket' in window)) return null;

  if (activeWsSocket && activeWsSocket.readyState === WebSocket.OPEN) {
    return activeWsSocket;
  }

  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);

      const timer = setTimeout(() => {
        try { ws.close(); } catch (_) {}
        resolve(null);
      }, 1200);

      ws.onopen = () => {
        clearTimeout(timer);
        activeWsSocket = ws;
        cachedProxyHealth = {
          active: true,
          version: '1.0.0',
          port,
          message: 'Desktop Proxy Agent Connected (WebSocket)',
        };
        lastHealthCheck = Date.now();

        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (_) {}

        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'proxy_response' && data.id && pendingWsCallbacks.has(data.id)) {
            const cb = pendingWsCallbacks.get(data.id);
            pendingWsCallbacks.delete(data.id);
            if (cb) cb(data);
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        clearTimeout(timer);
        if (activeWsSocket === ws) activeWsSocket = null;
        resolve(null);
      };

      ws.onclose = () => {
        if (activeWsSocket === ws) activeWsSocket = null;
      };
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Check if RestStudio Desktop Proxy Agent is running locally on http/ws://127.0.0.1:28108
 */
export async function checkDesktopProxyHealth(port: number = DEFAULT_DESKTOP_PROXY_PORT): Promise<DesktopProxyHealth> {
  const now = Date.now();
  if (now - lastHealthCheck < 2000 && cachedProxyHealth.active) {
    return cachedProxyHealth;
  }

  // 1. Try WebSocket connection (Bypasses HTTPS Mixed Content in Web Browsers!)
  const ws = await connectDesktopProxyWebSocket(port);
  if (ws) {
    cachedProxyHealth = {
      active: true,
      version: '1.0.0',
      port,
      message: 'Desktop Proxy Agent Connected (WebSocket)',
    };
    lastHealthCheck = now;
    return cachedProxyHealth;
  }

  // 2. Try HTTP fetch fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      cachedProxyHealth = {
        active: true,
        version: data.version || '1.0.0',
        port,
        message: 'Desktop Proxy Agent Connected (HTTP)',
      };
      lastHealthCheck = now;
      return cachedProxyHealth;
    }
  } catch (_) {}

  cachedProxyHealth = {
    active: false,
    port,
    message: 'Desktop Proxy Agent Offline',
  };
  lastHealthCheck = now;
  return cachedProxyHealth;
}

/**
 * Execute HTTP Request via Desktop Proxy Agent on ws:// or http://127.0.0.1:28108
 * Used when web application is running on Netlify to bypass CORS and access localhost directly
 */
export async function fetchViaDesktopProxy(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: any,
  port: number = DEFAULT_DESKTOP_PROXY_PORT
): Promise<BridgeFetchResult> {
  // 1. Try WebSocket execution first (Works on HTTPS Web Deployments!)
  const ws = await connectDesktopProxyWebSocket(port);
  if (ws && ws.readyState === WebSocket.OPEN) {
    return new Promise((resolve) => {
      const reqId = `ws_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const timeout = setTimeout(() => {
        pendingWsCallbacks.delete(reqId);
        resolve({
          success: false,
          error: 'WebSocket Desktop Proxy request timed out after 30s',
        });
      }, 30000);

      pendingWsCallbacks.set(reqId, (data: any) => {
        clearTimeout(timeout);
        if (data && data.status !== undefined) {
          resolve({
            success: true,
            response: {
              status: data.status,
              statusText: data.statusText || 'OK',
              headers: data.headers || {},
              body: data.body || '',
              size: data.size || 0,
              duration: data.duration || 0,
              timestamp: data.timestamp || Date.now(),
              ok: data.ok || (data.status >= 200 && data.status < 300),
              contentType: data.contentType || 'text/plain',
            },
          });
        } else {
          resolve({
            success: false,
            error: data.error || 'Desktop Proxy WebSocket error',
          });
        }
      });

      try {
        ws.send(
          JSON.stringify({
            type: 'proxy',
            id: reqId,
            method,
            url,
            headers,
            body,
          })
        );
      } catch (err: any) {
        clearTimeout(timeout);
        pendingWsCallbacks.delete(reqId);
        resolve({
          success: false,
          error: `Failed to send WebSocket message: ${err.message}`,
        });
      }
    });
  }

  // 2. HTTP Fetch Fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`http://127.0.0.1:${port}/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method,
        url,
        headers,
        body,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        response: data,
      };
    } else {
      const text = await res.text();
      return {
        success: false,
        error: `Desktop Proxy returned HTTP ${res.status}: ${text}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to communicate with Desktop Proxy Agent',
    };
  }
}

/**
 * Automatically launches the Desktop Proxy HTTP Listener when running inside Neutralino App
 */
export async function startDesktopProxyInNeutralino(port: number = DEFAULT_DESKTOP_PROXY_PORT): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  const neu = w.Neutralino;

  if (!neu || !neu.os || typeof neu.os.execCommand !== 'function') {
    return false;
  }

  try {
    // Check if proxy server is already running on port
    const health = await checkDesktopProxyHealth(port);
    if (health.active) {
      console.log(`[DesktopProxy] Local Desktop Proxy is already active on port ${port}`);
      return true;
    }

    // Launch lightweight background proxy server using Node
    const isWin = (navigator.platform || '').toLowerCase().includes('win') || w.NL_OS === 'Windows';
    const nodeCmd = isWin ? 'node.exe' : 'node';

    const inlineScript = `
const http = require('http');
const https = require('https');

const PORT = ${port};
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'RestStudio Desktop Proxy Agent', version: '1.0.0', port: PORT }));
    return;
  }

  if (req.url === '/proxy' && req.method === 'POST') {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(bodyData || '{}');
        const { method = 'GET', url, headers = {}, body } = payload;
        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Valid URL is required' }));
          return;
        }

        const parsedUrl = new URL(url);
        const transport = parsedUrl.protocol === 'https:' ? https : http;
        const startTime = Date.now();

        const reqOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: method.toUpperCase(),
          headers: { ...headers },
          rejectUnauthorized: false
        };

        const proxyReq = transport.request(reqOptions, (proxyRes) => {
          let resData = '';
          proxyRes.on('data', chunk => { resData += chunk; });
          proxyRes.on('end', () => {
            const duration = Date.now() - startTime;
            const resHeaders = {};
            Object.keys(proxyRes.headers).forEach(k => { resHeaders[k] = proxyRes.headers[k]; });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: proxyRes.statusCode,
              statusText: proxyRes.statusMessage || 'OK',
              headers: resHeaders,
              body: resData,
              size: Buffer.byteLength(resData),
              duration,
              timestamp: Date.now(),
              ok: proxyRes.statusCode >= 200 && proxyRes.statusCode < 300,
              contentType: proxyRes.headers['content-type'] || 'text/plain'
            }));
          });
        });

        proxyReq.on('error', (err) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 0,
            statusText: 'Network Error',
            headers: {},
            body: JSON.stringify({ error: 'Failed to connect to target', details: err.message, url }),
            size: 0,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
            ok: false,
            error: err.message
          }));
        });

        if (body !== undefined && body !== null) {
          proxyReq.write(typeof body === 'object' ? JSON.stringify(body) : String(body));
        }
        proxyReq.end();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('RestStudio Desktop Proxy Agent running on http://127.0.0.1:' + PORT);
});
`.replace(/\n/g, ' ');

    const command = `${nodeCmd} -e "${inlineScript.replace(/"/g, '\\"')}"`;
    console.log('[DesktopProxy] Spawning background Desktop Proxy Agent server in Neutralino...');
    neu.os.execCommand(command, { background: true });

    // Wait 500ms and verify health
    await new Promise((r) => setTimeout(r, 500));
    const h = await checkDesktopProxyHealth(port);
    return h.active;
  } catch (err) {
    console.warn('[DesktopProxy] Failed to start local proxy in Neutralino:', err);
    return false;
  }
}

// Initialize Service Worker for Localhost Proxy Bridge
export async function initLocalhostBridgeServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    console.log('[LocalhostBridge] Service Worker registered successfully.');
    return true;
  } catch (err) {
    console.warn('[LocalhostBridge] SW registration error:', err);
    return false;
  }
}

// Execute fetch via Service Worker Bridge
export function fetchViaServiceWorkerBridge(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: any
): Promise<BridgeFetchResult> {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      resolve({ success: false, error: 'Service Worker controller not active' });
      return;
    }

    const channel = new MessageChannel();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Service Worker Localhost fetch timed out' });
    }, 12000);

    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      if (event.data && event.data.success) {
        resolve({ success: true, response: event.data.response });
      } else {
        resolve({ success: false, error: event.data?.error || 'SW fetch error' });
      }
    };

    navigator.serviceWorker.controller.postMessage(
      {
        type: 'EXECUTE_LOCALHOST_FETCH',
        payload: { id: requestId, method, url, headers, body },
      },
      [channel.port2]
    );
  });
}

// Request Local Network Permission from Chrome / Edge
export async function requestLocalNetworkPermission(targetUrl: string = 'http://127.0.0.1:3000/'): Promise<{
  granted: boolean;
  message: string;
}> {
  try {
    const fetchOpts: any = {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      },
      targetAddressSpace: 'local',
    };

    await fetch(targetUrl, fetchOpts);
    return {
      granted: true,
      message: 'Local Network Access permission granted by browser!',
    };
  } catch (err: any) {
    return {
      granted: false,
      message: err?.message || 'Permission request failed or requires manual site settings adjustment.',
    };
  }
}

// Helper to generate local proxy curl snippet for node/express or ngrok
export function getLocalProxySnippets(targetPort: number = 3000) {
  return {
    ngrok: `npx ngrok http ${targetPort}`,
    localCorsProxy: `npx local-cors-proxy --proxyUrl http://localhost:${targetPort} --port 8010`,
    nodeSnippet: `// 1-Line Node CORS Proxy server:
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use('/', createProxyMiddleware({ target: 'http://localhost:${targetPort}', changeOrigin: true }));
app.listen(8010, () => console.log('Local Proxy running on http://localhost:8010'));`,
  };
}

