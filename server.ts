import express from 'express';
import path from 'path';
import axios from 'axios';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global CORS Middleware to ensure zero CORS restrictions on proxy API
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Track connected Desktop App instances over WebSocket relay
  const connectedDesktopApps = new Map<string, WebSocket>();
  const pendingRelayRequests = new Map<string, (resData: any) => void>();

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'RestStudio API Proxy' });
  });

  // Desktop App Relay Connection Status
  app.get('/api/relay/status', (req, res) => {
    const isConnected = connectedDesktopApps.size > 0;
    res.json({
      active: isConnected,
      connectedCount: connectedDesktopApps.size,
      message: isConnected ? 'RestStudio Desktop App Connected' : 'Desktop App Disconnected',
    });
  });

  // Return JS stub for Neutralino client library in web browser preview mode to prevent HTML 404 syntax error
  app.get(['/js/neutralino.js', '/dist/js/neutralino.js'], (req, res) => {
    res.type('application/javascript').send('/* Neutralino JS stub for web browser preview */');
  });

  // REST Request Proxy Endpoint - Relays local requests to connected Desktop App, or proxies external APIs
  app.post(['/api/proxy', '/proxy'], async (req, res) => {
    const { method = 'GET', url, headers = {}, body } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Valid URL parameter is required' });
      return;
    }

    // Ensure URL has protocol
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (targetUrl.startsWith('/')) {
        targetUrl = 'http://127.0.0.1:3000' + targetUrl;
      } else if (
        targetUrl.startsWith('localhost') ||
        targetUrl.startsWith('127.0.0.1') ||
        targetUrl.startsWith('0.0.0.0')
      ) {
        targetUrl = 'http://' + targetUrl;
      } else {
        targetUrl = 'https://' + targetUrl;
      }
    }

    // Standardize localhost or 0.0.0.0 to 127.0.0.1
    const isLocalAddress = /^(http|https):\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|.*\.local)(:|\/|$)/i.test(targetUrl);

    targetUrl = targetUrl
      .replace(/^http:\/\/localhost(?=[:\/]|$)/i, 'http://127.0.0.1')
      .replace(/^http:\/\/0\.0\.0\.0(?=[:\/]|$)/i, 'http://127.0.0.1');

    // Prevent recursive proxy loops
    if (targetUrl.includes('/api/proxy')) {
      res.status(400).json({
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        body: JSON.stringify({ error: 'Cannot proxy request recursively to /api/proxy' }, null, 2),
        size: 0,
        duration: 0,
        timestamp: Date.now(),
        ok: false,
        error: 'Recursive proxy call prohibited',
      });
      return;
    }

    const startTime = performance.now();

    // 1. If targeting localhost / local IP AND a Desktop App is connected via WebSocket, relay to Desktop App!
    if (isLocalAddress && connectedDesktopApps.size > 0) {
      const desktopWs = Array.from(connectedDesktopApps.values()).pop();
      if (desktopWs && desktopWs.readyState === WebSocket.OPEN) {
        const reqId = `relay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        try {
          const relayResult = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              pendingRelayRequests.delete(reqId);
              resolve({
                status: 504,
                statusText: 'Gateway Timeout',
                headers: {},
                body: JSON.stringify({ error: 'Desktop App did not respond within 30 seconds' }),
                size: 0,
                duration: 30000,
                timestamp: Date.now(),
                ok: false,
                error: 'Desktop App timeout',
              });
            }, 30000);

            pendingRelayRequests.set(reqId, (responseData: any) => {
              clearTimeout(timeout);
              resolve(responseData);
            });

            desktopWs.send(
              JSON.stringify({
                type: 'relay_request',
                id: reqId,
                method,
                url: targetUrl,
                headers,
                body,
              })
            );
          });

          res.json(relayResult);
          return;
        } catch (relayErr: any) {
          console.warn('[RestStudio Relay] Desktop Relay failed:', relayErr?.message);
        }
      }
    }

    // 2. Direct Axios proxy attempt
    try {
      // Clean up headers to prevent host/content-length conflicts
      const cleanedHeaders: Record<string, string> = {
        'User-Agent': 'RestStudio-REST-Client/1.0 (CORS-Bypass-Axios)',
      };

      if (headers && typeof headers === 'object') {
        Object.entries(headers).forEach(([k, v]) => {
          const lowerKey = k.toLowerCase();
          if (lowerKey !== 'host' && lowerKey !== 'content-length' && lowerKey !== 'connection') {
            cleanedHeaders[k] = String(v);
          }
        });
      }

      const axiosResponse = await axios({
        method: method.toUpperCase(),
        url: targetUrl,
        headers: cleanedHeaders,
        data: body !== undefined && body !== null ? body : undefined,
        validateStatus: () => true, // Don't throw on non-2xx status codes
        responseType: 'text',
        timeout: 25000,
        maxRedirects: 10,
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      const responseText = typeof axiosResponse.data === 'string' 
        ? axiosResponse.data 
        : JSON.stringify(axiosResponse.data);

      const responseSize = Buffer.byteLength(responseText, 'utf8');

      // Extract response headers
      const resHeaders: Record<string, string> = {};
      if (axiosResponse.headers) {
        Object.entries(axiosResponse.headers).forEach(([k, v]) => {
          if (v !== undefined) {
            resHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v);
          }
        });
      }

      res.json({
        status: axiosResponse.status,
        statusText: axiosResponse.statusText || 'OK',
        headers: resHeaders,
        body: responseText,
        size: responseSize,
        duration,
        timestamp: Date.now(),
        ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
        contentType: resHeaders['content-type'] || 'text/plain',
      });
    } catch (err: any) {
      // If local address and Axios failed (because server is on Cloud Run and target is localhost on user PC)
      if (isLocalAddress) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        res.status(503).json({
          status: 503,
          statusText: 'Desktop App Disconnected',
          headers: {},
          body: JSON.stringify(
            {
              error: 'To connect to localhost / local APIs from this web app, please launch the RestStudio Desktop Application on your computer.',
              targetUrl,
              message: 'The Desktop App automatically connects over a secure relay tunnel with zero configuration.',
            },
            null,
            2
          ),
          size: 0,
          duration,
          timestamp: Date.now(),
          ok: false,
          error: 'RestStudio Desktop App not running on local computer',
        });
        return;
      }

      // Fallback server-side attempt using public CORS proxy (corsproxy.io / allorigins.win)
      try {
        console.log('[RestStudio Proxy] Direct Axios failed. Attempting corsproxy.io fallback...');
        const fallbackUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const fallbackRes = await axios({
          method: method.toUpperCase(),
          url: fallbackUrl,
          data: body !== undefined && body !== null ? body : undefined,
          validateStatus: () => true,
          responseType: 'text',
          timeout: 15000,
        });

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        const responseText = typeof fallbackRes.data === 'string' ? fallbackRes.data : JSON.stringify(fallbackRes.data);

        return res.json({
          status: fallbackRes.status,
          statusText: fallbackRes.statusText || 'OK',
          headers: {},
          body: responseText,
          size: Buffer.byteLength(responseText, 'utf8'),
          duration,
          timestamp: Date.now(),
          ok: fallbackRes.status >= 200 && fallbackRes.status < 300,
          contentType: 'text/plain',
        });
      } catch (fallbackErr) {
        console.warn('[RestStudio Proxy] Corsproxy.io fallback failed:', fallbackErr);
      }

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      res.status(502).json({
        status: 0,
        statusText: 'Network Error / Proxy Error',
        headers: {},
        body: JSON.stringify(
          {
            error: 'Failed to connect to target server via Axios proxy or Public CORS Proxy',
            details: err.message || String(err),
            targetUrl,
          },
          null,
          2
        ),
        size: 0,
        duration,
        timestamp: Date.now(),
        ok: false,
        error: err.message || 'Connection Refused or invalid hostname',
      });
    }
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Create primary HTTP server for Express and WebSocket Relay
  const server = http.createServer(app);

  // Mount WebSocket Relay Server for Desktop App Connections
  const wss = new WebSocketServer({ server, path: '/api/relay/ws' });

  wss.on('connection', (ws, req) => {
    const clientId = `desktop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    connectedDesktopApps.set(clientId, ws);
    console.log(`[RestStudio Relay] Desktop App connected: ${clientId} from ${req.socket.remoteAddress}`);

    ws.send(JSON.stringify({ type: 'connected', clientId, version: '1.0.0' }));

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }

        if (payload.type === 'relay_response' && payload.id) {
          const callback = pendingRelayRequests.get(payload.id);
          if (callback) {
            pendingRelayRequests.delete(payload.id);
            callback(payload);
          }
        }
      } catch (err: any) {
        console.warn('[RestStudio Relay] Invalid message received on WS:', err?.message);
      }
    });

    ws.on('close', () => {
      connectedDesktopApps.delete(clientId);
      console.log(`[RestStudio Relay] Desktop App disconnected: ${clientId}`);
    });

    ws.on('error', (err) => {
      connectedDesktopApps.delete(clientId);
      console.warn(`[RestStudio Relay] Desktop App WS error (${clientId}):`, err.message);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`RestStudio Server & WebSocket Relay active on http://0.0.0.0:${PORT} (ws://0.0.0.0:${PORT}/api/relay/ws)`);
  });
}

startServer();

