import { ExecutionResponse } from '../types';

export interface HttpRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * True when running inside the Neutralino desktop app.
 */
export function isNeutralinoActive(): boolean {
  return typeof window !== 'undefined' && Boolean(
    (window as any).Neutralino &&
    ((window as any).NL_PORT || (window as any).NL_TOKEN || (window as any).NL_MODE || (window as any).__NL_PORT__)
  );
}

/**
 * Safely retrieve Neutralino SDK instance in desktop mode
 */
async function getNeutralino(): Promise<any> {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (w.Neutralino) return w.Neutralino;
  if (w.NL_PORT || w.NL_MODE || w.__NL_PORT__ || w.location.protocol === 'file:') {
    for (let i = 0; i < 10; i++) {
      if (w.Neutralino) return w.Neutralino;
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  return w.Neutralino || null;
}

/**
 * Execute HTTP requests via Neutralino Native OS Engine (curl config file execution)
 * Completely bypasses browser CORS & Private Network Access restrictions across Windows, Mac, and Linux!
 */
async function executeNeutralinoFetch(
  method: string,
  targetUrl: string,
  headers: Record<string, string>,
  body?: any
): Promise<ExecutionResponse | null> {
  const neu = await getNeutralino();
  const startTime = performance.now();

  if (neu && typeof neu.init === 'function') {
    try { neu.init(); } catch (_) {}
  }

  // 1. Execute via Neutralino OS execCommand using temp cURL config file (0 quote escaping issues, 0 CORS)
  if (neu && neu.os && typeof neu.os.execCommand === 'function') {
    const reqId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    let tempDir = '.';
    try {
      if (typeof neu.os.getEnv === 'function') {
        const envTemp = (await neu.os.getEnv('TEMP')) || (await neu.os.getEnv('TMP')) || (await neu.os.getEnv('TMPDIR'));
        if (envTemp && typeof envTemp === 'string') {
          tempDir = envTemp;
        }
      }
    } catch (_) {}

    const cleanTempDir = tempDir.replace(/\\/g, '/').replace(/\/+$/, '');
    const cfgPath = `${cleanTempDir}/rs_cfg_${reqId}.txt`;
    const bodyPath = `${cleanTempDir}/rs_body_${reqId}.txt`;

    let hasBody = false;
    let bodyStr = '';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && body !== undefined && body !== null) {
      hasBody = true;
      bodyStr = typeof body === 'object' ? JSON.stringify(body) : String(body);
    }

    let createdTempFiles = false;

    try {
      if (neu.filesystem && typeof neu.filesystem.writeFile === 'function') {
        if (hasBody) {
          await neu.filesystem.writeFile(bodyPath, bodyStr);
        }

        const cfgLines = [
          `url = "${targetUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`,
          `request = "${method.toUpperCase()}"`,
          `include`,
          `silent`,
          `show-error`,
          `max-time = 60`,
          `insecure`,
        ];

        if (headers && typeof headers === 'object') {
          Object.entries(headers).forEach(([k, v]) => {
            if (k && v !== undefined && v !== null) {
              const cleanK = String(k).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
              const cleanV = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
              cfgLines.push(`header = "${cleanK}: ${cleanV}"`);
            }
          });
        }

        if (hasBody) {
          cfgLines.push(`data-binary = "@${bodyPath}"`);
        }

        await neu.filesystem.writeFile(cfgPath, cfgLines.join('\n'));
        createdTempFiles = true;

        const isWin = (typeof window !== 'undefined' && (window.navigator?.platform || '').toLowerCase().includes('win')) ||
                      (window as any).NL_OS === 'Windows';
        const curlExe = isWin ? 'curl.exe' : 'curl';
        const curlCmd = `${curlExe} -s -S -K "${cfgPath}"`;

        console.log('[RestStudio Neutralino] Executing native cURL via config file:', curlCmd);
        const execResult = await neu.os.execCommand(curlCmd);

        if (execResult && typeof execResult.stdOut === 'string' && execResult.stdOut.trim()) {
          const rawOutput = execResult.stdOut;
          const duration = Math.round(performance.now() - startTime);

          const headerBodySplit = rawOutput.split(/\r?\n\r?\n/);
          const lastHeaderIdx = headerBodySplit.length > 1 ? headerBodySplit.length - 2 : 0;
          const rawHeaders = headerBodySplit[lastHeaderIdx] || headerBodySplit[0] || '';
          const responseBody = headerBodySplit.slice(lastHeaderIdx + 1).join('\r\n\r\n') || '';

          const statusMatch = rawHeaders.match(/HTTP\/\d(?:\.\d)?\s+(\d+)\s*(.*)/i);
          const status = statusMatch ? parseInt(statusMatch[1], 10) : 200;
          const statusText = statusMatch ? statusMatch[2].trim() : 'OK';

          const parsedHeaders: Record<string, string> = {};
          rawHeaders.split(/\r?\n/).forEach((line) => {
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
              const k = line.substring(0, colonIdx).trim().toLowerCase();
              const v = line.substring(colonIdx + 1).trim();
              parsedHeaders[k] = v;
            }
          });

          return {
            status,
            statusText,
            headers: parsedHeaders,
            body: responseBody,
            size: new Blob([responseBody]).size,
            duration,
            timestamp: Date.now(),
            ok: status >= 200 && status < 300,
            contentType: parsedHeaders['content-type'] || 'text/plain',
          };
        }
      }
    } catch (cfgErr) {
      console.warn('[RestStudio Neutralino] Temp file cURL config execution failed, attempting direct inline fallback:', cfgErr);
    } finally {
      if (createdTempFiles && neu.filesystem && typeof neu.filesystem.removeFile === 'function') {
        try { await neu.filesystem.removeFile(cfgPath); } catch (_) {}
        if (hasBody) {
          try { await neu.filesystem.removeFile(bodyPath); } catch (_) {}
        }
      }
    }

    // Direct inline cURL fallback
    try {
      let headerArgs = '';
      if (headers && typeof headers === 'object') {
        Object.entries(headers).forEach(([k, v]) => {
          if (k && v !== undefined && v !== null) {
            headerArgs += ` -H "${String(k).replace(/"/g, '\\"')}: ${String(v).replace(/"/g, '\\"')}"`;
          }
        });
      }

      const isWin = (typeof window !== 'undefined' && (window.navigator?.platform || '').toLowerCase().includes('win')) || (window as any).NL_OS === 'Windows';
      const curlExe = isWin ? 'curl.exe' : 'curl';
      const cleanUrl = targetUrl.replace(/"/g, '\\"');
      const inlineCmd = `${curlExe} -i -s -S -k -m 30 -X ${method.toUpperCase()}${headerArgs} "${cleanUrl}"`;

      console.log('[RestStudio Neutralino] Executing inline fallback cURL:', inlineCmd);
      const execResult = await neu.os.execCommand(inlineCmd);
      if (execResult && typeof execResult.stdOut === 'string' && execResult.stdOut.trim()) {
        const rawOutput = execResult.stdOut;
        const duration = Math.round(performance.now() - startTime);

        const headerBodySplit = rawOutput.split(/\r?\n\r?\n/);
        const lastHeaderIdx = headerBodySplit.length > 1 ? headerBodySplit.length - 2 : 0;
        const rawHeaders = headerBodySplit[lastHeaderIdx] || headerBodySplit[0] || '';
        const responseBody = headerBodySplit.slice(lastHeaderIdx + 1).join('\r\n\r\n') || '';

        const statusMatch = rawHeaders.match(/HTTP\/\d(?:\.\d)?\s+(\d+)\s*(.*)/i);
        const status = statusMatch ? parseInt(statusMatch[1], 10) : 200;
        const statusText = statusMatch ? statusMatch[2].trim() : 'OK';

        const parsedHeaders: Record<string, string> = {};
        rawHeaders.split(/\r?\n/).forEach((line) => {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const k = line.substring(0, colonIdx).trim().toLowerCase();
            const v = line.substring(colonIdx + 1).trim();
            parsedHeaders[k] = v;
          }
        });

        return {
          status,
          statusText,
          headers: parsedHeaders,
          body: responseBody,
          size: new Blob([responseBody]).size,
          duration,
          timestamp: Date.now(),
          ok: status >= 200 && status < 300,
          contentType: parsedHeaders['content-type'] || 'text/plain',
        };
      }
    } catch (inlineErr) {
      console.warn('[RestStudio Neutralino] Inline cURL fallback error:', inlineErr);
    }
  }

  // 2. Direct webview fetch inside Neutralino window
  try {
    const res = await fetch(targetUrl, {
      method: method.toUpperCase(),
      headers,
      body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && body ? (typeof body === 'object' ? JSON.stringify(body) : String(body)) : undefined,
    });
    const duration = Math.round(performance.now() - startTime);
    const text = await res.text();
    const resHeaders: Record<string, string> = {};
    if (res.headers && typeof res.headers.forEach === 'function') {
      res.headers.forEach((v: string, k: string) => { resHeaders[k] = v; });
    }
    return {
      status: res.status,
      statusText: res.statusText || 'OK',
      headers: resHeaders,
      body: text,
      size: new Blob([text]).size,
      duration,
      timestamp: Date.now(),
      ok: res.ok,
      contentType: res.headers?.get('content-type') || 'text/plain',
    };
  } catch (fErr) {
    console.warn('[RestStudio Neutralino] Neutralino webview fetch error:', fErr);
  }

  return null;
}

/**
 * Detect whether a URL targets the user's local network / local machine.
 * Covers loopback, RFC1918 private IPs, link-local, IPv6 loopback, .local (mDNS) and
 * single-label intranet hostnames.
 */
export function isLocalTargetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return true;

    // IPv4 literals
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      const parts = host.split('.').map(Number);
      if (parts.some((p) => p < 0 || p > 255)) return false;
      const [a, b] = parts;
      if (a === 127) return true;               // loopback
      if (a === 10) return true;                // 10.0.0.0/8
      if (a === 169 && b === 254) return true;  // 169.254.0.0/16 link-local
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
      if (a === 192 && b === 168) return true;  // 192.168.0.0/16
      return false;
    }

    // IPv6 loopback (compressed forms like 0:0:0:0:0:0:0:1)
    if (host === '0:0:0:0:0:0:0:1' || host === '::ffff:127.0.0.1') return true;

    // mDNS / local-network names
    if (host.endsWith('.local')) return true;

    // Single-label intranet hostnames (e.g. http://mypc:8080)
    if (!host.includes('.')) return true;

    return false;
  } catch {
    return false;
  }
}

export type LocalNetworkPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

/**
 * Chrome 145+ split the single LNA permission into `local-network` and
 * `loopback-network`, and the Site-settings UI shows them as two separate
 * entries: "Local Network" (LAN devices) and "Apps on device" (localhost /
 * loopback). Chrome 142-144 use the single legacy "Local network access"
 * entry. Returns the exact Site-settings entry the user must flip for a given
 * target, so guidance never points at the wrong toggle (the #1 cause of
 * "allowed but still blocked").
 */
export function getLnaPermissionLabel(targetUrl?: string): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const m = ua.match(/(?:Chrome|Edg|Chromium|HeadlessChrome)\/(\d+)/);
  const major = m ? parseInt(m[1], 10) : 0;
  if (major >= 145) {
    if (targetUrl && isLocalTargetUrl(targetUrl) && getTargetAddressSpace(targetUrl) === 'loopback') {
      return 'Apps on device (loopback access)';
    }
    return 'Local Network (local-network)';
  }
  return 'Local network access';
}

/**
 * Chrome's `targetAddressSpace` fetch option must EXACTLY match the target's
 * resolved IP address space or the request fails with a network error before
 * any Local Network Access check runs (and before any permission prompt can
 * appear). Loopback targets (localhost, 127.x, ::1) are in the `loopback`
 * space; everything else local (RFC1918, link-local, .local, single-label
 * intranet hosts) is in the `local` space.
 */
export function getTargetAddressSpace(url: string): 'loopback' | 'local' {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host === '::1' || host === '0.0.0.0' || host === '0:0:0:0:0:0:0:1' || host === '::ffff:127.0.0.1') {
      return 'loopback';
    }
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      const a = Number(host.split('.')[0]);
      return a === 127 ? 'loopback' : 'local';
    }
    // .local and single-label intranet hostnames are presumed to be on the LAN.
    return 'local';
  } catch {
    return 'local';
  }
}

/**
 * Chrome/Firefox only gate Local Network Access requests from PUBLIC (secure)
 * origins to local/loopback targets. When the app itself is served from a local
 * origin (localhost dev server, LAN IP) or over plain http, no Local Network
 * Access permission prompt will ever appear — those requests are plain CORS.
 * Returns true only when the browser can actually show the permission prompt.
 */
export function isLnaPromptApplicable(): boolean {
  if (typeof window === 'undefined' || !window.isSecureContext) return false;
  return !isLocalTargetUrl(window.location.origin);
}

/**
 * Query the browser's Local Network Access permission state for a given target.
 * Chrome 142+ / Firefox 147+ expose it via the Permissions API. Chrome 145 split
 * the single `local-network-access` permission into `loopback-network` and
 * `local-network`, so query the permission matching the target type first and
 * fall back to the legacy combined name on older browsers.
 */
export async function getLocalNetworkPermissionState(targetUrl?: string): Promise<LocalNetworkPermissionState> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions || typeof navigator.permissions.query !== 'function') {
      return 'unsupported';
    }
    let names: string[];
    if (targetUrl && isLocalTargetUrl(targetUrl)) {
      const space = getTargetAddressSpace(targetUrl);
      names = space === 'loopback'
        ? ['loopback-network', 'local-network-access', 'local-network']
        : ['local-network', 'local-network-access', 'loopback-network'];
    } else {
      names = ['local-network-access', 'local-network', 'loopback-network'];
    }
    for (const name of names) {
      try {
        const res = await (navigator.permissions as any).query({ name });
        if (res && res.state) {
          return res.state as LocalNetworkPermissionState;
        }
      } catch {
        // Unknown permission name on this browser version — try the next one.
      }
    }
    return 'unsupported';
  } catch {
    return 'unsupported';
  }
}

function buildLocalFetchError(
  targetUrl: string,
  permState: LocalNetworkPermissionState,
  details: string,
  duration: number
): ExecutionResponse {
  const denied = permState === 'denied';
  const unsupported = permState === 'unsupported';

  const statusText = denied
    ? 'Local Network Access Denied'
    : 'Local Request Blocked';

  const reason = denied
    ? 'The browser blocked access to your local network because the Local Network Access permission was not granted.'
    : unsupported
      ? 'The request to the local server failed. This browser does not support the Local Network Access permission prompt (Chrome 142+ / Firefox 147+).'
      : 'The local server did not respond with the CORS headers required for browser access, or it is not running.';

  const solution = denied
    ? `Re-enable access: click the lock icon in the browser address bar → Site settings → ${getLnaPermissionLabel(targetUrl)} → Allow, then retry. Chrome only asks for this permission once and will not prompt again after a denial — Site settings is the only way to restore it.`
    : unsupported
      ? 'Ensure the server is running and that it sends CORS headers (Access-Control-Allow-Origin: *). For the permission prompt experience, use Google Chrome 142+.'
      : 'Make sure the server is running and responds with CORS headers, e.g. Access-Control-Allow-Origin: * (and handle the OPTIONS preflight). Granting Local Network Access does not bypass CORS. Alternatively, use the RestStudio Desktop App for zero-config localhost access.';

  return {
    status: 0,
    statusText,
    headers: {},
    body: JSON.stringify(
      {
        error: `Failed to connect to ${targetUrl}`,
        reason,
        solution,
        details: details || 'Failed to fetch',
      },
      null,
      2
    ),
    size: 0,
    duration,
    timestamp: Date.now(),
    ok: false,
    error: statusText,
  };
}

/**
 * Direct Client Browser `fetch()` — public (non-local) targets.
 */
export async function executeDirectClientFetch(
  method: string,
  targetUrl: string,
  headers: Record<string, string>,
  body?: any
): Promise<ExecutionResponse> {
  const startTime = performance.now();

  const fetchOptions: any = {
    method: method.toUpperCase(),
    headers: { ...headers },
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && body !== undefined && body !== null) {
    fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
  }

  try {
    const res = await fetch(targetUrl, fetchOptions);
    const duration = Math.round(performance.now() - startTime);

    const text = await res.text();
    const size = new Blob([text]).size;

    const resHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      resHeaders[key] = val;
    });

    return {
      status: res.status,
      statusText: res.statusText || 'OK',
      headers: resHeaders,
      body: text,
      size,
      duration,
      timestamp: Date.now(),
      ok: res.ok,
      contentType: res.headers.get('content-type') || 'text/plain',
    };
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    return {
      status: 0,
      statusText: 'Network Error',
      headers: {},
      body: JSON.stringify(
        {
          error: `Failed to connect to ${targetUrl}`,
          reason: err?.message || 'Failed to fetch',
          solution: 'Check network connectivity, or retry through the server proxy if the API blocks CORS.',
          details: err?.message || 'Failed to fetch',
        },
        null,
        2
      ),
      size: 0,
      duration,
      timestamp: Date.now(),
      ok: false,
      error: err?.message || 'Connection Refused',
    };
  }
}

/**
 * Direct Client Browser `fetch()` for local-network targets.
 * Annotates the request with `targetAddressSpace: 'local'` so Chrome 142+ / Firefox 147+
 * exempt it from mixed-content blocking and trigger the Local Network Access permission
 * prompt — no proxy, agent, or extension required.
 */
export async function executeDirectLocalFetch(
  method: string,
  targetUrl: string,
  headers: Record<string, string>,
  body?: any
): Promise<ExecutionResponse> {
  const startTime = performance.now();

  // Must match the target's actual address space exactly — a mismatch is a
  // hard network error that aborts before the LNA permission check, so the
  // browser permission prompt would never appear (loopback targets need
  // 'loopback', LAN targets need 'local').
  const fetchOptions: any = {
    method: method.toUpperCase(),
    headers: { ...headers },
    targetAddressSpace: getTargetAddressSpace(targetUrl),
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && body !== undefined && body !== null) {
    fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
  }

  try {
    const res = await fetch(targetUrl, fetchOptions);
    const duration = Math.round(performance.now() - startTime);

    const text = await res.text();
    const size = new Blob([text]).size;

    const resHeaders: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      resHeaders[key] = val;
    });

    return {
      status: res.status,
      statusText: res.statusText || 'OK',
      headers: resHeaders,
      body: text,
      size,
      duration,
      timestamp: Date.now(),
      ok: res.ok,
      contentType: res.headers.get('content-type') || 'text/plain',
    };
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    const permState = await getLocalNetworkPermissionState(targetUrl);
    return buildLocalFetchError(targetUrl, permState, err?.message || 'Failed to fetch', duration);
  }
}

/**
 * Execute a request through the server-side /api/proxy (public URLs only —
 * local targets never reach this endpoint from the web app).
 */
async function executeServerProxyFetch(
  method: string,
  targetUrl: string,
  headers: Record<string, string>,
  body?: any
): Promise<ExecutionResponse | null> {
  try {
    const proxyRes = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, url: targetUrl, headers, body }),
    });

    const contentType = proxyRes.headers.get('content-type') || '';
    const responseText = await proxyRes.text();
    const isHtmlResponse = responseText.trim().toLowerCase().startsWith('<!doctype') || responseText.trim().toLowerCase().startsWith('<html') || contentType.includes('text/html');

    if (proxyRes.ok && !isHtmlResponse) {
      try {
        const responseData: ExecutionResponse = JSON.parse(responseText);
        if (responseData.status > 0) {
          return responseData;
        }
      } catch (_) {}
    }
  } catch (proxyErr) {
    console.warn('[RestStudio] Server proxy fetch error:', proxyErr);
  }

  return null;
}

/**
 * Main HTTP request executor for RestStudio.
 * - Desktop (Neutralino): native OS curl — no browser restrictions.
 * - Web app, local target: direct browser fetch with Local Network Access permission.
 * - Web app, public target: direct browser fetch, then /api/proxy fallback.
 */
export async function executeHttpRequest(options: HttpRequestOptions): Promise<ExecutionResponse> {
  const startTime = performance.now();
  const { method = 'GET', url, headers = {}, body } = options;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      status: 0,
      statusText: 'Bad Request',
      headers: {},
      body: JSON.stringify({ error: 'Valid URL parameter is required' }, null, 2),
      size: 0,
      duration: 0,
      timestamp: Date.now(),
      ok: false,
      error: 'Valid URL is required',
    };
  }

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

  // 1. Neutralino Native Desktop Container Check — desktop app executes locally with zero restrictions
  if (isNeutralinoActive()) {
    try {
      console.log('[RestStudio Neutralino] Executing via Neutralino Native Engine...');
      const neuRes = await executeNeutralinoFetch(method, targetUrl, headers, body);
      if (neuRes && neuRes.status > 0) {
        return neuRes;
      }
    } catch (nErr) {
      console.warn('[RestStudio Neutralino] Native execution error, falling back:', nErr);
    }
  }

  // 2. Web app: local target → direct browser fetch with Local Network Access permission
  if (isLocalTargetUrl(targetUrl)) {
    return await executeDirectLocalFetch(method, targetUrl, headers, body);
  }

  // 3. Web app: public target → direct fetch first, then server proxy fallback
  const directRes = await executeDirectClientFetch(method, targetUrl, headers, body);
  if (directRes.status > 0) {
    return directRes;
  }

  const proxyRes = await executeServerProxyFetch(method, targetUrl, headers, body);
  if (proxyRes) {
    return proxyRes;
  }

  return directRes;
}
