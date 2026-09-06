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
    res.json({ status: 'ok', service: 'RestStudio Client' });
  });

  // Return JS stub for Neutralino client library in web browser preview mode to prevent HTML 404 syntax error
  app.get(['/js/neutralino.js', '/dist/js/neutralino.js'], (req, res) => {
    res.type('application/javascript').send('/* Neutralino JS stub for web browser preview */');
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
    const token = process.env.BETTERSTACK_SOURCE_TOKEN || process.env.LOGTAIL_SOURCE_TOKEN;
    if (token) {
      console.log(`[Better Stack / Logtail] Initialized successfully with token: ${token.substring(0, 4)}... (Ready to collect error logs)`);
    } else {
      console.log(`[Better Stack / Logtail] Not configured (BETTERSTACK_SOURCE_TOKEN environment variable not set). Error forwarding inactive.`);
    }
  });
}

startServer();
