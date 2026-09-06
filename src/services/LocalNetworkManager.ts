import { isLocalTargetUrl, getTargetAddressSpace, getLocalNetworkPermissionState, LocalNetworkPermissionState } from '../utils/httpExecutor';

/**
 * LocalNetworkManager Service
 * Explicitly handles permissions and prompting for local network and loopback addresses.
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
      // 1. Try modern Permissions API request if available
      if (typeof navigator !== 'undefined' && navigator.permissions && typeof (navigator.permissions as any).request === 'function') {
        const result = await (navigator.permissions as any).request({ name: 'local-network-access' });
        if (result && result.state === 'granted') {
          return true;
        }
      }
    } catch (_) {}

    // 2. Fallback: Trigger a preflight HEAD/OPTIONS fetch with targetAddressSpace to force the browser prompt
    try {
      const addressSpace = getTargetAddressSpace(url);
      await fetch(url, {
        method: 'HEAD',
        targetAddressSpace: addressSpace,
        privateNetworkRequestPolicy: 'allow-with-permission-prompt',
        cache: 'no-store',
      } as any);
      return true;
    } catch (err) {
      // Even if the fetch fails (due to CORS or offline server), the browser permission dialog will have been triggered/resolved.
      const state = await getLocalNetworkPermissionState(url);
      return state === 'granted' || state === 'prompt';
    }
  }

  /**
   * Ensure local network access is permitted before executing a request
   */
  async ensureAccess(url: string): Promise<boolean> {
    const state = await this.checkPermission(url);
    if (state === 'granted') return true;
    return await this.requestPermission(url);
  }
}

export const localNetworkManager = new LocalNetworkManagerService();
