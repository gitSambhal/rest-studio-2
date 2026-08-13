const http = require('http');
const https = require('https');

const PORT = 28108;
const HOST = '127.0.0.1';

const server = http.createServer((req, res) => {
  // Full CORS and Chrome Private Network Access (PNA) Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'RestStudio Desktop Localhost Proxy Agent',
      version: '1.0.0',
      port: PORT,
      host: HOST,
      time: new Date().toISOString()
    }));
    return;
  }

  // Proxy Execution endpoint
  if (req.url === '/proxy' && req.method === 'POST') {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(bodyData || '{}');
        const { method = 'GET', url, headers = {}, body } = payload;

        if (!url || typeof url !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Valid target URL is required' }));
          return;
        }

        let targetUrl = url.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = 'http://' + targetUrl;
        }

        const parsedUrl = new URL(targetUrl);
        const transport = parsedUrl.protocol === 'https:' ? https : http;
        const startTime = Date.now();

        const cleanedHeaders = {};
        Object.keys(headers || {}).forEach(k => {
          const l = k.toLowerCase();
          if (l !== 'host' && l !== 'content-length' && l !== 'connection') {
            cleanedHeaders[k] = String(headers[k]);
          }
        });

        cleanedHeaders['User-Agent'] = 'RestStudio-Desktop-Proxy/1.0';

        const reqOptions = {
          hostname: parsedUrl.hostname === 'localhost' ? '127.0.0.1' : parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: method.toUpperCase(),
          headers: cleanedHeaders,
          rejectUnauthorized: false
        };

        const proxyReq = transport.request(reqOptions, (proxyRes) => {
          let resData = '';
          proxyRes.on('data', chunk => { resData += chunk; });
          proxyRes.on('end', () => {
            const duration = Date.now() - startTime;
            const resHeaders = {};
            Object.keys(proxyRes.headers).forEach(k => {
              resHeaders[k] = Array.isArray(proxyRes.headers[k]) ? proxyRes.headers[k].join(', ') : proxyRes.headers[k];
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: proxyRes.statusCode,
              statusText: proxyRes.statusMessage || 'OK',
              headers: resHeaders,
              body: resData,
              size: Buffer.byteLength(resData, 'utf8'),
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
            body: JSON.stringify({ error: `Failed to connect to ${targetUrl}`, details: err.message }),
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
  res.end(JSON.stringify({ error: 'Endpoint Not Found. Use /health or POST /proxy' }));
});

server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(` RestStudio Desktop Localhost Proxy Agent is ACTIVE!`);
  console.log(` Listening on: http://${HOST}:${PORT}`);
  console.log(` Health check: http://${HOST}:${PORT}/health`);
  console.log(` Connects Netlify web app -> Localhost APIs & CORS`);
  console.log(`======================================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[RestStudio Proxy] Port ${PORT} is already in use and listening!`);
  } else {
    console.error(`[RestStudio Proxy] Server error:`, err);
  }
});
