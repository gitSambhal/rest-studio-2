import { isLocalTargetUrl, getTargetAddressSpace, getLocalNetworkPermissionState, LocalNetworkPermissionState } from '../utils/httpExecutor';

/**
 * Forbidden headers in browser fetch per the Fetch standard.
 * Attempting to set these on a browser fetch() throws a TypeError or triggers immediate rejection.
 */
export const FORBIDDEN_BROWSER_HEADERS = new Set([
  'host',
  'connection',
  'cookie',
  'cookie2',
  'content-length',
  'origin',
  'referer',
  'keep-alive',
  'te',
  'trailer',
  'upgrade',
]);

/**
 * Filter out browser-restricted headers before passing to window.fetch()
 */
export function cleanHeadersForBrowserFetch(headers: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  if (headers && typeof headers === 'object') {
    Object.entries(headers).forEach(([k, v]) => {
      if (k && v !== undefined && v !== null) {
        if (!FORBIDDEN_BROWSER_HEADERS.has(k.toLowerCase().trim())) {
          cleaned[k] = String(v);
        }
      }
    });
  }
  return cleaned;
}

/**
 * LocalNetworkManager Service
 * Explicitly handles permissions, header preparation, and native prompt triggers
 * for local network and loopback (localhost) addresses.
 */
class LocalNetworkManagerService {
  /**
   * Check if permission for a target URL is granted
   */
  async checkPermission(url: string): Promise<LocalNetworkPermissionState> {
    if (!isLocalTargetUrl(url)) {
      return 'granted';
    }
    return await getLocalNetworkPermissionState(url);
  }

  /**
   * Request explicit browser permission for local network access
   */
  async requestPermission(url: string): Promise<boolean> {
    if (!isLocalTargetUrl(url)) return true;

    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.permissions &&
        typeof (navigator.permissions as any).request === 'function'
      ) {
        const space = getTargetAddressSpace(url);
        const permNames = space === 'loopback'
          ? ['loopback-network', 'local-network-access', 'local-network']
          : ['local-network', 'local-network-access', 'loopback-network'];

        for (const name of permNames) {
          try {
            const result = await (navigator.permissions as any).request({ name });
            if (result && result.state === 'granted') {
              return true;
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    const state = await this.checkPermission(url);
    return state === 'granted' || state === 'prompt';
  }

  /**
   * Ensure local network access is prepared and checked before executing a request
   */
  async ensureAccess(url: string): Promise<boolean> {
    const state = await this.checkPermission(url);
    if (state === 'granted') return true;
    return await this.requestPermission(url);
  }

  /**
   * Prepares the optimal RequestInit for a local/loopback request.
   * Sets targetAddressSpace ('loopback' or 'local') so Chrome 142+ / modern browsers
   * trigger the native Local Network Access permission prompt and exempt the request
   * from mixed-content blocking.
   */
  prepareLocalRequest(
    targetUrl: string,
    method: string,
    headers: Record<string, string>,
    bodyPayload?: any,
    signal?: AbortSignal
  ): { targetAddressSpace: 'loopback' | 'local'; fetchOptions: any } {
    const addressSpace = getTargetAddressSpace(targetUrl);
    const cleanedHeaders = cleanHeadersForBrowserFetch(headers);

    const fetchOptions: any = {
      method: method.toUpperCase(),
      headers: cleanedHeaders,
      targetAddressSpace: addressSpace,
      signal,
    };

    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) &&
      bodyPayload !== undefined &&
      bodyPayload !== null
    ) {
      fetchOptions.body = bodyPayload;
    }

    return { targetAddressSpace: addressSpace, fetchOptions };
  }
}

export const localNetworkManager = new LocalNetworkManagerService();
