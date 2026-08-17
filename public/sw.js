const CACHE_NAME = 'reststudio-v1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Local-network targets must never be intercepted: this SW's fetch handler
// re-issues requests as a plain `fetch(event.request)`, which drops the
// `targetAddressSpace` annotation the page set. Without it, Chrome's Local
// Network Access check never runs for localhost / LAN requests and the
// permission prompt never appears (it only worked after a hard refresh,
// which bypasses the service worker). These are API calls, not static
// assets — let them pass straight through to the network.
function isLocalTargetUrl(url) {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host === '0:0:0:0:0:0:0:1' || host === '::ffff:127.0.0.1') return true;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    const parts = host.split('.').map(Number);
    if (parts.some((p) => p < 0 || p > 255)) return false;
    const [a, b] = parts;
    if (a === 127 || a === 10) return true;                 // loopback, 10.0.0.0/8
    if (a === 169 && b === 254) return true;                // 169.254.0.0/16 link-local
    if (a === 172 && b >= 16 && b <= 31) return true;       // 172.16.0.0/12
    if (a === 192 && b === 168) return true;                // 192.168.0.0/16
    return false;
  }
  if (host.endsWith('.local')) return true;   // mDNS
  if (!host.includes('.')) return true;       // single-label intranet hostnames
  return false;
}

// 1. Install Event: Cache Core Static Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache initial assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Stale-while-revalidate for assets, Pass-through for API calls
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests, non-http/https schemes (like chrome-extension:), proxy API endpoints, and Vite dev/module assets
  if (
    event.request.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    isLocalTargetUrl(url) ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@') ||
    url.search.includes('v=') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts')
  ) {
    return;
  }

  // Handle HTML document navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy).catch(() => {});
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Stale-While-Revalidate for JS, CSS, SVG, Images
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Localhost Proxy Bridge Message Handler
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'EXECUTE_LOCALHOST_FETCH') {
    const { id, method, url, headers, body } = event.data.payload;
    const isLocalhostUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(url);
    const isPrivateIpUrl = /^https?:\/\/(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/i.test(url);

    try {
      const fetchOptions = {
        method: (method || 'GET').toUpperCase(),
        headers: { ...headers },
      };

      if (isLocalhostUrl) {
        fetchOptions.targetAddressSpace = 'local';
      } else if (isPrivateIpUrl) {
        fetchOptions.targetAddressSpace = 'private';
      }

      if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method)) {
        fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
      }

      const startTime = performance.now();
      const res = await fetch(url, fetchOptions);
      const endTime = performance.now();
      const text = await res.text();

      const resHeaders = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          success: true,
          id,
          response: {
            status: res.status,
            statusText: res.statusText || 'OK',
            headers: resHeaders,
            body: text,
            size: new Blob([text]).size,
            duration: Math.round(endTime - startTime),
            timestamp: Date.now(),
            ok: res.ok,
            contentType: res.headers.get('content-type') || 'text/plain',
          },
        });
      }
    } catch (err) {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          success: false,
          id,
          error: err.message || 'Service Worker Localhost fetch failed',
        });
      }
    }
  }
});

