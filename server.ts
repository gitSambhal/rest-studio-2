import express from 'express';
import path from 'path';
import axios from 'axios';
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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'RestStudio API Proxy' });
  });

  // Relay Agent Management
  const activeRelayAgents = new Map<string, any>();
  const pendingRelayRequests = new Map<string, (res: any) => void>();

  // Relay status endpoint
  app.get('/api/relay/status', (req, res) => {
    const isConnected = activeRelayAgents.size > 0;
    res.json({
      active: isConnected,
      connectedAgentsCount: activeRelayAgents.size,
      message: isConnected ? 'Desktop Proxy Agent Connected (Relay Bridge)' : 'No Desktop Proxy Agent Connected to Relay',
      port: 28108
    });
  });

  // Relay execute endpoint for Web App
  app.post('/api/relay/execute', async (req, res) => {
    if (activeRelayAgents.size === 0) {
      res.status(503).json({
        status: 0,
        statusText: 'Desktop Proxy Offline',
        headers: {},
        body: JSON.stringify({
          error: 'No Desktop Proxy Agent connected to Relay Server.',
          solution: 'Launch RestStudio Desktop App on your computer or run node scripts/proxy.js to connect your local environment.'
        }, null, 2),
        size: 0,
        duration: 0,
        timestamp: Date.now(),
        ok: false,
        error: 'No Desktop Proxy Agent connected'
      });
      return;
    }

    const { method = 'GET', url, headers = {}, body, agentId = 'default' } = req.body;
    let agentWs = activeRelayAgents.get(agentId) || Array.from(activeRelayAgents.values())[0];

    if (!agentWs || agentWs.readyState !== 1) { // 1 = OPEN
      res.status(503).json({
        status: 0,
        statusText: 'Agent Connection Closed',
        headers: {},
        body: JSON.stringify({ error: 'Selected Desktop Proxy Agent connection is not active' }, null, 2),
        size: 0,
        duration: 0,
        timestamp: Date.now(),
        ok: false,
        error: 'Desktop Proxy Agent disconnected'
      });
      return;
    }

    const reqId = `rel_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timeout = setTimeout(() => {
      pendingRelayRequests.delete(reqId);
      if (!res.headersSent) {
        res.status(504).json({
          status: 0,
          statusText: 'Gateway Timeout',
          headers: {},
          body: JSON.stringify({ error: 'Relay request to Desktop Agent timed out after 30 seconds' }, null, 2),
          size: 0,
          duration: 30000,
          timestamp: Date.now(),
          ok: false,
          error: 'Desktop Agent timeout'
        });
      }
    }, 30000);

    pendingRelayRequests.set(reqId, (result) => {
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.json(result);
      }
    });

    try {
      agentWs.send(JSON.stringify({
        type: 'relay_request',
        id: reqId,
        method,
        url,
        headers,
        body
      }));
    } catch (err: any) {
      clearTimeout(timeout);
      pendingRelayRequests.delete(reqId);
      res.status(500).json({ error: `Failed to send request to Desktop Agent: ${err.message}` });
    }
  });

  // Return JS stub for Neutralino client library in web browser preview mode to prevent HTML 404 syntax error
  app.get(['/js/neutralino.js', '/dist/js/neutralino.js'], (req, res) => {
    res.type('application/javascript').send('/* Neutralino JS stub for web browser preview */');
  });

  // REST Request Proxy Endpoint - Uses Axios on server to bypass Browser CORS for ALL external APIs
  app.post('/api/proxy', async (req, res) => {
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

    // Convert localhost or 0.0.0.0 to 127.0.0.1 to avoid Node 18+ IPv6 (::1) lookup connection refused errors
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

  // Start secondary Desktop Localhost Proxy Agent on 127.0.0.1:28108 if available
  try {
    const http = await import('http');
    const { WebSocketServer } = await import('ws');
    const proxyServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }

      if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          status: 'ok',
          service: 'RestStudio Desktop Localhost Proxy Agent',
          version: '1.0.0',
          port: 28108
        }));
      }

      // Delegate /proxy requests to main app Express router
      app(req as any, res as any);
    });

    // Attach WebSocket Server for HTTPS web app connection
    const wss = new WebSocketServer({ server: proxyServer });
    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        try {
          const payload = JSON.parse(message.toString());
          if (payload.type === 'ping' || payload.action === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', status: 'ok', port: 28108 }));
            return;
          }
        } catch (_) {}
      });
    });

    proxyServer.listen(28108, '127.0.0.1', () => {
      console.log('RestStudio Desktop Proxy Agent active on http://127.0.0.1:28108 & ws://127.0.0.1:28108');
    });

    proxyServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log('[RestStudio] Proxy agent port 28108 is already bound and active.');
      } else {
        console.warn('[RestStudio] Proxy agent port 28108 warning:', err.message);
      }
    });
  } catch (err: any) {
    console.warn('[RestStudio] Could not initialize 28108 listener:', err?.message);
  }

  const mainServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`RestStudio server running on http://localhost:${PORT}`);
  });

  // Attach Relay WebSocket Server on main app port for Desktop Agent remote tunnel
  try {
    const { WebSocketServer } = await import('ws');
    const relayWss = new WebSocketServer({ server: mainServer, path: '/api/relay/ws' });

    relayWss.on('connection', (ws) => {
      let agentId = 'default';
      console.log('[RestStudio Relay] Desktop Agent WebSocket connected');

      ws.on('message', (message) => {
        try {
          const payload = JSON.parse(message.toString());

          if (payload.type === 'register') {
            if (payload.agentId) agentId = payload.agentId;
            activeRelayAgents.set(agentId, ws);
            ws.send(JSON.stringify({ type: 'registered', agentId, status: 'ok' }));
            console.log(`[RestStudio Relay] Desktop Agent '${agentId}' registered successfully`);
            return;
          }

          if (payload.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', status: 'ok' }));
            return;
          }

          if (payload.type === 'relay_response' && payload.id) {
            const cb = pendingRelayRequests.get(payload.id);
            if (cb) {
              pendingRelayRequests.delete(payload.id);
              cb(payload);
            }
          }
        } catch (err: any) {
          console.warn('[RestStudio Relay] Message parse error:', err.message);
        }
      });

      // Default register on connection
      activeRelayAgents.set(agentId, ws);

      ws.on('close', () => {
        console.log(`[RestStudio Relay] Desktop Agent '${agentId}' disconnected`);
        if (activeRelayAgents.get(agentId) === ws) {
          activeRelayAgents.delete(agentId);
        }
      });

      ws.on('error', (err) => {
        console.warn(`[RestStudio Relay] Desktop Agent '${agentId}' error:`, err.message);
      });
    });
  } catch (err: any) {
    console.warn('[RestStudio Relay] Could not initialize Relay WSS on main server:', err.message);
  }
}

startServer();
