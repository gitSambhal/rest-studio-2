import express from 'express';
import path from 'path';
import axios from 'axios';
import http from 'http';
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

  // Return JS stub for Neutralino client library in web browser preview mode to prevent HTML 404 syntax error
  app.get(['/js/neutralino.js', '/dist/js/neutralino.js'], (req, res) => {
    res.type('application/javascript').send('/* Neutralino JS stub for web browser preview */');
  });

  // REST Request Proxy Endpoint - Proxies public external APIs server-side (CORS relief)
  app.post(['/api/proxy', '/proxy'], async (req, res) => {
    const { method = 'GET', url, headers = {}, body, formDataItems, binaryFile } = req.body;

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

    // Local addresses cannot be proxied server-side: the server can never reach the
    // user's localhost / LAN. The web app handles these via direct browser fetch with
    // the Local Network Access permission (Chrome 142+ / Firefox 147+).
    const isLocalAddress = /^(http|https):\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|.*\.local)(:|\/|$)/i.test(targetUrl);
    if (isLocalAddress) {
      res.status(400).json({
        status: 400,
        statusText: 'Local Target Not Supported',
        headers: {},
        body: JSON.stringify({
          error: 'Local addresses cannot be proxied through the server. The web app connects to localhost / LAN APIs directly from your browser via the Local Network Access permission (Chrome 142+ / Firefox 147+).',
          targetUrl,
        }, null, 2),
        size: 0,
        duration: 0,
        timestamp: Date.now(),
        ok: false,
        error: 'Local targets must be fetched directly from the browser',
      });
      return;
    }

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

      let requestData: any = body !== undefined && body !== null ? body : undefined;

      if (formDataItems && Array.isArray(formDataItems) && formDataItems.length > 0) {
        const fd = new FormData();
        for (const item of formDataItems) {
          if (!item.enabled || !item.key) continue;
          if (item.type === 'file' && item.fileData) {
            const base64Data = item.fileData.includes(',') ? item.fileData.split(',')[1] : item.fileData;
            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer], { type: item.fileType || 'application/octet-stream' });
            fd.append(item.key, blob, item.fileName || 'file.bin');
          } else {
            fd.append(item.key, item.value ?? '');
          }
        }
        requestData = fd;
        // Let FormData / Axios set the multipart boundary header
        delete cleanedHeaders['content-type'];
        delete cleanedHeaders['Content-Type'];
      } else if (binaryFile && binaryFile.fileData) {
        const base64Data = binaryFile.fileData.includes(',')
          ? binaryFile.fileData.split(',')[1]
          : binaryFile.fileData;
        requestData = Buffer.from(base64Data, 'base64');
        if (!cleanedHeaders['content-type'] && !cleanedHeaders['Content-Type']) {
          cleanedHeaders['content-type'] = binaryFile.fileType || 'application/octet-stream';
        }
      }

      const axiosResponse = await axios({
        method: method.toUpperCase(),
        url: targetUrl,
        headers: cleanedHeaders,
        data: requestData,
        validateStatus: () => true, // Don't throw on non-2xx status codes
        responseType: 'arraybuffer',
        timeout: 25000,
        maxRedirects: 10,
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      // Extract response headers
      const resHeaders: Record<string, string> = {};
      if (axiosResponse.headers) {
        Object.entries(axiosResponse.headers).forEach(([k, v]) => {
          if (v !== undefined) {
            if (k.toLowerCase() === 'set-cookie' && Array.isArray(v)) {
              resHeaders[k] = v.join('\n');
            } else {
              resHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v);
            }
          }
        });
      }

      const buffer = Buffer.from(axiosResponse.data);
      const contentType = resHeaders['content-type'] || 'text/plain';
      const isBinary = /^(image\/|audio\/|video\/|application\/pdf|application\/octet-stream|application\/zip)/i.test(contentType);
      const responseText = isBinary ? `[Binary data: ${contentType}, ${buffer.length} bytes]` : buffer.toString('utf8');
      const base64Body = buffer.toString('base64');

      res.json({
        status: axiosResponse.status,
        statusText: axiosResponse.statusText || 'OK',
        headers: resHeaders,
        body: responseText,
        base64Body,
        size: buffer.length,
        duration,
        timestamp: Date.now(),
        ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
        contentType,
      });
    } catch (err: any) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      res.status(502).json({
        status: 0,
        statusText: 'Network Error / Proxy Error',
        headers: {},
        body: JSON.stringify(
          {
            error: 'Failed to connect to target server via Axios proxy',
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

  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`RestStudio Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
