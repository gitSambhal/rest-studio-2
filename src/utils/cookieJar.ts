import { CookieItem } from '../types';

const COOKIE_STORAGE_KEY = 'reststudio_cookie_jar';
const COOKIE_JAR_ENABLED_KEY = 'reststudio_cookie_jar_enabled';

/**
 * Check whether Automatic Cookie Jar is active.
 */
export function isCookieJarEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(COOKIE_JAR_ENABLED_KEY);
    return val !== 'false';
  } catch {
    return true;
  }
}

/**
 * Toggle or set Automatic Cookie Jar active state.
 */
export function setCookieJarEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOKIE_JAR_ENABLED_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('reststudio_cookies_updated'));
  } catch (err) {
    console.warn('[CookieJar] Failed to save cookie jar enabled state:', err);
  }
}

/**
 * Safely retrieve all saved cookies from localStorage.
 */
export function getAllCookies(): CookieItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.warn('[CookieJar] Failed to parse saved cookies:', err);
    return [];
  }
}

/**
 * Persist cookies array to localStorage and notify listeners.
 */
export function saveCookies(cookies: CookieItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(cookies));
    window.dispatchEvent(new CustomEvent('reststudio_cookies_updated'));
  } catch (err) {
    console.warn('[CookieJar] Failed to save cookies:', err);
  }
}

/**
 * Parse an individual Set-Cookie header directive.
 */
export function parseSingleCookie(directive: string, defaultDomain: string, defaultPath: string): CookieItem | null {
  const parts = directive.split(';').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const [firstPart, ...attrParts] = parts;
  const equalsIdx = firstPart.indexOf('=');
  if (equalsIdx <= 0) return null;

  const name = firstPart.substring(0, equalsIdx).trim();
  const value = firstPart.substring(equalsIdx + 1).trim();

  let domain = defaultDomain.toLowerCase();
  let path = defaultPath || '/';
  let expires: string | undefined;
  let httpOnly = false;
  let secure = false;
  let sameSite: string | undefined;

  for (const attr of attrParts) {
    const attrEquals = attr.indexOf('=');
    const attrName = (attrEquals > 0 ? attr.substring(0, attrEquals) : attr).trim().toLowerCase();
    const attrVal = attrEquals > 0 ? attr.substring(attrEquals + 1).trim() : '';

    if (attrName === 'domain' && attrVal) {
      domain = attrVal.replace(/^\./, '').toLowerCase();
    } else if (attrName === 'path' && attrVal) {
      path = attrVal;
    } else if (attrName === 'expires' && attrVal) {
      expires = attrVal;
    } else if (attrName === 'max-age' && attrVal) {
      const maxAgeSec = parseInt(attrVal, 10);
      if (!isNaN(maxAgeSec)) {
        expires = new Date(Date.now() + maxAgeSec * 1000).toUTCString();
      }
    } else if (attrName === 'httponly') {
      httpOnly = true;
    } else if (attrName === 'secure') {
      secure = true;
    } else if (attrName === 'samesite') {
      sameSite = attrVal || 'Lax';
    }
  }

  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  return {
    id: `ck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    value,
    domain,
    path,
    expires,
    httpOnly,
    secure,
    sameSite,
    createdAt: Date.now(),
  };
}

/**
 * Split potential multi-line or comma-separated Set-Cookie strings.
 * Note: Dates in Expires like "Wed, 21 Oct 2026" contain commas, so we split safely.
 */
export function splitSetCookieHeaders(headerValue: string): string[] {
  if (!headerValue) return [];
  // If separated by newlines
  if (headerValue.includes('\n')) {
    return headerValue.split('\n').map((s) => s.trim()).filter(Boolean);
  }

  // Regex split on commas that are not inside Expires dates
  // Matches commas followed by [name]=[val]
  const directives: string[] = [];
  const parts = headerValue.split(/,\s*(?=[a-zA-Z0-9_-]+=)/g);
  for (const p of parts) {
    if (p.trim()) directives.push(p.trim());
  }
  return directives;
}

/**
 * Parse and save cookies received from an HTTP response header into the jar.
 */
export function saveCookiesFromHeaders(requestUrl: string, headers: Record<string, string>): CookieItem[] {
  if (!isCookieJarEnabled()) return [];
  if (!requestUrl || !headers) return [];

  let defaultDomain = 'localhost';
  let defaultPath = '/';
  try {
    const parsedUrl = new URL(requestUrl.startsWith('http') ? requestUrl : `http://${requestUrl}`);
    defaultDomain = parsedUrl.hostname.toLowerCase();
    defaultPath = parsedUrl.pathname || '/';
  } catch (_) {}

  // Find set-cookie header (case-insensitive)
  const setCookieKey = Object.keys(headers).find((k) => k.toLowerCase() === 'set-cookie');
  if (!setCookieKey) return [];

  const rawVal = headers[setCookieKey];
  if (!rawVal || typeof rawVal !== 'string') return [];

  const directives = splitSetCookieHeaders(rawVal);
  if (directives.length === 0) return [];

  const currentCookies = getAllCookies();
  const addedOrUpdated: CookieItem[] = [];

  for (const dir of directives) {
    const parsed = parseSingleCookie(dir, defaultDomain, defaultPath);
    if (!parsed) continue;

    // Check if expired / max-age=0 deletion
    const isExplicitlyExpired =
      parsed.expires && !isNaN(Date.parse(parsed.expires)) && Date.parse(parsed.expires) <= Date.now();

    const existingIdx = currentCookies.findIndex(
      (c) => c.domain === parsed.domain && c.path === parsed.path && c.name === parsed.name
    );

    if (isExplicitlyExpired) {
      if (existingIdx >= 0) {
        currentCookies.splice(existingIdx, 1);
      }
    } else {
      if (existingIdx >= 0) {
        // Update existing cookie
        currentCookies[existingIdx] = {
          ...currentCookies[existingIdx],
          value: parsed.value,
          expires: parsed.expires,
          httpOnly: parsed.httpOnly,
          secure: parsed.secure,
          sameSite: parsed.sameSite,
        };
        addedOrUpdated.push(currentCookies[existingIdx]);
      } else {
        currentCookies.push(parsed);
        addedOrUpdated.push(parsed);
      }
    }
  }

  saveCookies(currentCookies);
  return addedOrUpdated;
}

/**
 * Generate formatted Cookie header value (`name=value; name2=value2`) matching the request URL.
 */
export function getCookieHeaderForUrl(requestUrl: string): string {
  if (!isCookieJarEnabled()) return '';
  if (!requestUrl) return '';
  let reqHost = '';
  let reqPath = '/';

  try {
    const parsed = new URL(requestUrl.startsWith('http') ? requestUrl : `http://${requestUrl}`);
    reqHost = parsed.hostname.toLowerCase();
    reqPath = parsed.pathname || '/';
  } catch {
    return '';
  }

  const now = Date.now();
  const all = getAllCookies();

  const matched = all.filter((cookie) => {
    // Check expiry
    if (cookie.expires) {
      const exp = Date.parse(cookie.expires);
      if (!isNaN(exp) && exp < now) return false;
    }

    // Match domain: exact or subdomain
    const cDomain = cookie.domain.toLowerCase();
    const domainMatches = reqHost === cDomain || reqHost.endsWith('.' + cDomain);
    if (!domainMatches) return false;

    // Match path: request path starts with cookie path
    const cPath = cookie.path || '/';
    if (!reqPath.startsWith(cPath)) return false;

    return true;
  });

  return matched.map((c) => `${c.name}=${c.value}`).join('; ');
}

/**
 * Add or update a cookie manually.
 */
export function addOrUpdateCookie(cookie: Omit<CookieItem, 'id' | 'createdAt'> & { id?: string }): CookieItem {
  const all = getAllCookies();
  const id = cookie.id || `ck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: CookieItem = {
    id,
    name: cookie.name.trim(),
    value: cookie.value,
    domain: (cookie.domain || 'localhost').trim().toLowerCase(),
    path: cookie.path?.trim() || '/',
    expires: cookie.expires,
    httpOnly: Boolean(cookie.httpOnly),
    secure: Boolean(cookie.secure),
    sameSite: cookie.sameSite || 'Lax',
    createdAt: Date.now(),
  };

  const existingIdx = all.findIndex((c) => c.id === id || (c.domain === item.domain && c.path === item.path && c.name === item.name));
  if (existingIdx >= 0) {
    all[existingIdx] = item;
  } else {
    all.push(item);
  }

  saveCookies(all);
  return item;
}

/**
 * Delete a specific cookie by ID.
 */
export function deleteCookie(id: string): void {
  const all = getAllCookies().filter((c) => c.id !== id);
  saveCookies(all);
}

/**
 * Clear all cookies for a specific domain.
 */
export function clearCookiesForDomain(domain: string): void {
  const target = domain.toLowerCase();
  const all = getAllCookies().filter((c) => c.domain.toLowerCase() !== target);
  saveCookies(all);
}

/**
 * Clear all cookies in the jar.
 */
export function clearAllCookies(): void {
  saveCookies([]);
}
