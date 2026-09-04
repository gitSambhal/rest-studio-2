import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseSingleCookie,
  splitSetCookieHeaders,
  saveCookiesFromHeaders,
  getCookieHeaderForUrl,
  addOrUpdateCookie,
  deleteCookie,
  clearCookiesForDomain,
  clearAllCookies,
  getAllCookies,
  setCookieJarEnabled,
} from '../utils/cookieJar';

describe('Automatic Cookie Jar Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    setCookieJarEnabled(true);
  });

  describe('parseSingleCookie', () => {
    it('should parse basic key-value cookie directive', () => {
      const parsed = parseSingleCookie('session_id=abc12345; Path=/; Secure; HttpOnly', 'api.example.com', '/');
      expect(parsed).not.toBeNull();
      expect(parsed?.name).toBe('session_id');
      expect(parsed?.value).toBe('abc12345');
      expect(parsed?.domain).toBe('api.example.com');
      expect(parsed?.path).toBe('/');
      expect(parsed?.secure).toBe(true);
      expect(parsed?.httpOnly).toBe(true);
    });

    it('should parse custom domain, expires, and SameSite', () => {
      const parsed = parseSingleCookie(
        'csrf_token=xyz987; Domain=.example.com; Path=/api; SameSite=Strict; Max-Age=3600',
        'sub.example.com',
        '/api'
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.name).toBe('csrf_token');
      expect(parsed?.domain).toBe('example.com');
      expect(parsed?.path).toBe('/api');
      expect(parsed?.sameSite).toBe('Strict');
      expect(parsed?.expires).toBeDefined();
    });

    it('should return null for invalid directives without equals', () => {
      expect(parseSingleCookie('invalid-directive', 'localhost', '/')).toBeNull();
    });
  });

  describe('splitSetCookieHeaders', () => {
    it('should safely split multi-cookie header values while preserving date commas', () => {
      const multiHeader = 'cookie1=val1; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/, cookie2=val2; Path=/';
      const parts = splitSetCookieHeaders(multiHeader);
      expect(parts).toHaveLength(2);
      expect(parts[0]).toContain('cookie1=val1');
      expect(parts[1]).toContain('cookie2=val2');
    });
  });

  describe('saveCookiesFromHeaders & getCookieHeaderForUrl', () => {
    it('should store cookies from Set-Cookie header and retrieve them for matching requests', () => {
      const requestUrl = 'https://api.myapp.com/v1/auth/login';
      const responseHeaders = {
        'Set-Cookie': 'auth_token=jwt_sample_secret; Domain=api.myapp.com; Path=/',
      };

      const saved = saveCookiesFromHeaders(requestUrl, responseHeaders);
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('auth_token');

      // Matching URL should yield Cookie header
      const cookieHeader = getCookieHeaderForUrl('https://api.myapp.com/v1/users');
      expect(cookieHeader).toBe('auth_token=jwt_sample_secret');

      // Non-matching domain should return empty
      const otherHeader = getCookieHeaderForUrl('https://otherdomain.com/v1/users');
      expect(otherHeader).toBe('');
    });

    it('should remove cookie if expired date or max-age=0 is passed', () => {
      addOrUpdateCookie({
        name: 'temp_session',
        value: 'active',
        domain: 'myapp.com',
        path: '/',
      });

      expect(getAllCookies().some((c) => c.name === 'temp_session')).toBe(true);

      // Server sends expired date to remove cookie
      saveCookiesFromHeaders('https://myapp.com/logout', {
        'Set-Cookie': 'temp_session=deleted; Domain=myapp.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      });

      expect(getAllCookies().some((c) => c.name === 'temp_session')).toBe(false);
    });
  });

  describe('Cookie Management API', () => {
    it('should add, update, delete, and clear cookies', () => {
      const c1 = addOrUpdateCookie({
        name: 'tokenA',
        value: '111',
        domain: 'domain-a.com',
        path: '/',
      });

      const c2 = addOrUpdateCookie({
        name: 'tokenB',
        value: '222',
        domain: 'domain-b.com',
        path: '/',
      });

      expect(getAllCookies()).toHaveLength(2);

      // Update c1 value
      addOrUpdateCookie({
        id: c1.id,
        name: 'tokenA',
        value: 'updated_111',
        domain: 'domain-a.com',
        path: '/',
      });
      expect(getAllCookies().find((c) => c.id === c1.id)?.value).toBe('updated_111');

      // Delete c1
      deleteCookie(c1.id);
      expect(getAllCookies()).toHaveLength(1);

      // Clear domain-b
      clearCookiesForDomain('domain-b.com');
      expect(getAllCookies()).toHaveLength(0);

      // Clear all
      addOrUpdateCookie({ name: 'c3', value: '333', domain: 'example.com', path: '/' });
      clearAllCookies();
      expect(getAllCookies()).toHaveLength(0);
    });
  });
});
