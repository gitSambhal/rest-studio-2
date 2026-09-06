import { describe, it, expect } from 'vitest';
import {
  localNetworkManager,
  cleanHeadersForBrowserFetch,
  FORBIDDEN_BROWSER_HEADERS,
} from '../services/LocalNetworkManager';

describe('LocalNetworkManager & Browser Fetch Security Suite', () => {
  it('should strip forbidden browser fetch headers while keeping valid ones', () => {
    const rawHeaders = {
      'Host': 'localhost:3000',
      'Connection': 'keep-alive',
      'Cookie': 'sessionId=xyz123',
      'Content-Length': '42',
      'Origin': 'https://example.com',
      'Referer': 'https://example.com/app',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token-123',
      'X-Custom-Header': 'CustomValue',
    };

    const cleaned = cleanHeadersForBrowserFetch(rawHeaders);

    // Forbidden headers must be removed
    expect(cleaned['Host']).toBeUndefined();
    expect(cleaned['Connection']).toBeUndefined();
    expect(cleaned['Cookie']).toBeUndefined();
    expect(cleaned['Content-Length']).toBeUndefined();
    expect(cleaned['Origin']).toBeUndefined();
    expect(cleaned['Referer']).toBeUndefined();

    // Standard and custom headers must be preserved
    expect(cleaned['Accept']).toBe('application/json');
    expect(cleaned['Content-Type']).toBe('application/json');
    expect(cleaned['Authorization']).toBe('Bearer test-token-123');
    expect(cleaned['X-Custom-Header']).toBe('CustomValue');
  });

  it('should correctly configure loopback targetAddressSpace for localhost URLs', () => {
    const urls = [
      'http://localhost:3000/api/users',
      'http://127.0.0.1:8080/health',
      'http://[::1]:5000/v1/data',
    ];

    for (const url of urls) {
      const prepared = localNetworkManager.prepareLocalRequest(
        url,
        'GET',
        { 'Accept': 'application/json' }
      );

      expect(prepared.targetAddressSpace).toBe('loopback');
      expect(prepared.fetchOptions.targetAddressSpace).toBe('loopback');
      expect(prepared.fetchOptions.method).toBe('GET');
      expect(prepared.fetchOptions.headers['Accept']).toBe('application/json');
    }
  });

  it('should correctly configure local targetAddressSpace for private LAN IP URLs', () => {
    const urls = [
      'http://192.168.1.50:3000/api',
      'http://10.0.0.15:8000/status',
      'http://172.16.0.10:4000/test',
    ];

    for (const url of urls) {
      const prepared = localNetworkManager.prepareLocalRequest(
        url,
        'POST',
        { 'Content-Type': 'application/json' },
        JSON.stringify({ test: true })
      );

      expect(prepared.targetAddressSpace).toBe('local');
      expect(prepared.fetchOptions.targetAddressSpace).toBe('local');
      expect(prepared.fetchOptions.method).toBe('POST');
      expect(prepared.fetchOptions.body).toBe(JSON.stringify({ test: true }));
    }
  });

  it('should grant access immediately for non-local public URLs', async () => {
    const publicUrl = 'https://httpbin.org/get';
    const state = await localNetworkManager.checkPermission(publicUrl);
    expect(state).toBe('granted');

    const hasAccess = await localNetworkManager.ensureAccess(publicUrl);
    expect(hasAccess).toBe(true);
  });

  it('should ensure port numbers like :3000 are not stripped or confused with path parameters', () => {
    const rawUrl = 'http://localhost:3000/api/users/:userId';
    
    // Test the regex logic used for path param extraction
    let pathOnly = rawUrl;
    const schemeMatch = pathOnly.match(/^[a-zA-Z]+:\/\/[^/]*(\/.*)?$/);
    if (schemeMatch) {
      pathOnly = schemeMatch[1] || '';
    }

    expect(pathOnly).toBe('/api/users/:userId');

    const colonMatches: string[] = pathOnly.match(/:([a-zA-Z_][a-zA-Z0-9_-]*)/g) || [];
    const keys = colonMatches.map((m) => m.substring(1));

    expect(keys).toContain('userId');
    expect(keys).not.toContain('3000');

    // Test resolving path params on a URL with a port number
    const urlObj = new URL(rawUrl);
    expect(urlObj.port).toBe('3000');
    expect(urlObj.hostname).toBe('localhost');

    let path = urlObj.pathname;
    path = path.replace(new RegExp(':userId\\b', 'g'), '42');
    urlObj.pathname = path;

    expect(urlObj.toString()).toBe('http://localhost:3000/api/users/42');
  });
});
