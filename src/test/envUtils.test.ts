import { describe, it, expect } from 'vitest';
import {
  resolveEnvVariables,
  getVariableLookupDetails,
  getEnvAutocompleteSuggestions,
  generateCodeSnippet,
  ScopeContext,
  DYNAMIC_SYSTEM_VARIABLES,
} from '../utils/envUtils';
import { EnvVariable, RestRequest } from '../types';

describe('Environment & Variable Resolution Suite', () => {
  describe('getVariableLookupDetails - Scope Precedence', () => {
    it('should prioritize Local/File variables over Project, Org, and Global', () => {
      const scopeCtx: ScopeContext = {
        localVariables: { host: 'local.api.com' },
        envVariables: [{ id: '1', key: 'host', value: 'project.api.com', enabled: true }],
        organizationVariables: [{ id: '2', key: 'host', value: 'org.api.com', enabled: true }],
        globalVariables: [{ id: '3', key: 'host', value: 'global.api.com', enabled: true }],
      };

      const result = getVariableLookupDetails('host', scopeCtx);
      expect(result).not.toBeNull();
      expect(result?.scope).toBe('local');
      expect(result?.value).toBe('local.api.com');
      expect(result?.overrides?.length).toBe(3);
    });

    it('should fall back to Project Env when Local is not set', () => {
      const scopeCtx: ScopeContext = {
        envVariables: [{ id: '1', key: 'apiKey', value: 'project_key_123', enabled: true }],
        globalVariables: [{ id: '2', key: 'apiKey', value: 'global_key_456', enabled: true }],
      };

      const result = getVariableLookupDetails('apiKey', scopeCtx);
      expect(result).not.toBeNull();
      expect(result?.scope).toBe('env');
      expect(result?.value).toBe('project_key_123');
    });

    it('should fall back to Org when Project and Local are not set', () => {
      const scopeCtx: ScopeContext = {
        organizationVariables: [{ id: '1', key: 'orgId', value: 'acme_corp', enabled: true }],
        globalVariables: [{ id: '2', key: 'orgId', value: 'default_org', enabled: true }],
      };

      const result = getVariableLookupDetails('orgId', scopeCtx);
      expect(result).not.toBeNull();
      expect(result?.scope).toBe('org');
      expect(result?.value).toBe('acme_corp');
    });

    it('should return system dynamic variable when user var is not defined', () => {
      const result = getVariableLookupDetails('$guid', {});
      expect(result).not.toBeNull();
      expect(result?.scope).toBe('system');
      expect(result?.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should return null for unknown variables', () => {
      const result = getVariableLookupDetails('nonExistentVar', {});
      expect(result).toBeNull();
    });
  });

  describe('resolveEnvVariables', () => {
    it('should resolve simple {{var}} template strings', () => {
      const scopeCtx: ScopeContext = {
        envVariables: [
          { id: '1', key: 'baseUrl', value: 'https://api.myapp.com', enabled: true },
          { id: '2', key: 'version', value: 'v2', enabled: true },
        ],
      };

      const result = resolveEnvVariables('{{baseUrl}}/{{version}}/users', scopeCtx);
      expect(result.resolved).toBe('https://api.myapp.com/v2/users');
      expect(result.missingVars).toHaveLength(0);
      expect(result.matchedVars).toHaveLength(2);
    });

    it('should handle nested variable expansions up to max depth', () => {
      const scopeCtx: ScopeContext = {
        envVariables: [
          { id: '1', key: 'domain', value: 'example.com', enabled: true },
          { id: '2', key: 'baseUrl', value: 'https://{{domain}}/api', enabled: true },
        ],
      };

      const result = resolveEnvVariables('{{baseUrl}}/items', scopeCtx);
      expect(result.resolved).toBe('https://example.com/api/items');
    });

    it('should track missing variables without throwing', () => {
      const scopeCtx: ScopeContext = {
        envVariables: [{ id: '1', key: 'foundVar', value: '123', enabled: true }],
      };

      const result = resolveEnvVariables('{{foundVar}} and {{missingVar}}', scopeCtx);
      expect(result.resolved).toBe('123 and {{missingVar}}');
      expect(result.missingVars).toEqual(['missingVar']);
    });

    it('should resolve dynamic system variables ($timestamp, $randomInt, $randomEmail)', () => {
      const result = resolveEnvVariables('Time: {{$timestamp}}, Email: {{$randomEmail}}, Int: {{$randomInt}}', {});
      expect(result.resolved).not.toContain('{{$timestamp}}');
      expect(result.resolved).not.toContain('{{$randomEmail}}');
      expect(result.resolved).toContain('@example.com');
    });
  });

  describe('DYNAMIC_SYSTEM_VARIABLES', () => {
    it('should verify all dynamic system variable generators produce valid outputs', () => {
      DYNAMIC_SYSTEM_VARIABLES.forEach((sysVar) => {
        const val = sysVar.getValue();
        expect(typeof val).toBe('string');
        expect(val.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getEnvAutocompleteSuggestions', () => {
    it('should trigger on {{ and filter matching variables', () => {
      const scopeCtx: ScopeContext = {
        envVariables: [
          { id: '1', key: 'authToken', value: 'secret', enabled: true },
          { id: '2', key: 'authorId', value: 'user_42', enabled: true },
          { id: '3', key: 'otherVar', value: 'xyz', enabled: true },
        ],
      };

      const input = 'GET https://api.com/items?auth={{auth';
      const result = getEnvAutocompleteSuggestions(input, input.length, scopeCtx);

      expect(result.show).toBe(true);
      expect(result.query).toBe('auth');
      expect(result.suggestions.some((s) => s.key === 'authToken')).toBe(true);
      expect(result.suggestions.some((s) => s.key === 'authorId')).toBe(true);
    });

    it('should not show suggestions if cursor is not inside {{', () => {
      const input = 'GET https://api.com/items';
      const result = getEnvAutocompleteSuggestions(input, input.length, {});
      expect(result.show).toBe(false);
    });
  });

  describe('generateCodeSnippet', () => {
    const sampleReq: RestRequest = {
      id: 'req_1',
      name: 'Create Item',
      method: 'POST',
      url: 'https://api.example.com/items',
      headers: [
        { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
        { id: 'h2', key: 'Authorization', value: 'Bearer token123', enabled: true },
      ],
      queryParams: [],
      body: { mode: 'json', rawText: '{"name":"Widget","price":25}' },
      auth: { type: 'bearer', bearerToken: 'token123' },
    };

    const resolvedUrl = 'https://api.example.com/items';
    const resolvedHeaders = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123',
    };
    const resolvedBody = '{"name":"Widget","price":25}';

    it('should generate valid cURL snippet', () => {
      const snippet = generateCodeSnippet(sampleReq, resolvedUrl, resolvedHeaders, resolvedBody, 'curl');
      expect(snippet).toContain('curl -X POST "https://api.example.com/items"');
      expect(snippet).toContain('-H "Content-Type: application/json"');
      expect(snippet).toContain('-d \'{"name":"Widget","price":25}\'');
    });

    it('should generate valid JavaScript (Fetch) snippet', () => {
      const snippet = generateCodeSnippet(sampleReq, resolvedUrl, resolvedHeaders, resolvedBody, 'javascript');
      expect(snippet).toContain('fetch("https://api.example.com/items"');
      expect(snippet).toContain('method: "POST"');
      expect(snippet).toContain('JSON.stringify(');
    });

    it('should generate valid Axios snippet', () => {
      const snippet = generateCodeSnippet(sampleReq, resolvedUrl, resolvedHeaders, resolvedBody, 'axios');
      expect(snippet).toContain("import axios from 'axios';");
      expect(snippet).toContain("method: 'post'");
      expect(snippet).toContain("url: 'https://api.example.com/items'");
    });

    it('should generate valid Python requests snippet', () => {
      const snippet = generateCodeSnippet(sampleReq, resolvedUrl, resolvedHeaders, resolvedBody, 'python');
      expect(snippet).toContain('import requests');
      expect(snippet).toContain('requests.request("POST", url');
    });

    it('should generate valid Node https snippet', () => {
      const snippet = generateCodeSnippet(sampleReq, resolvedUrl, resolvedHeaders, resolvedBody, 'node');
      expect(snippet).toContain("const https = require('https');");
      expect(snippet).toContain("method: 'POST'");
    });

    it('should generate valid Go net/http snippet', () => {
      const snippet = generateCodeSnippet(sampleReq, resolvedUrl, resolvedHeaders, resolvedBody, 'go');
      expect(snippet).toContain('package main');
      expect(snippet).toContain('http.NewRequest("POST"');
    });

    it('should generate valid Rust reqwest snippet', () => {
      const snippet = generateCodeSnippet(sampleReq, resolvedUrl, resolvedHeaders, resolvedBody, 'rust');
      expect(snippet).toContain('use reqwest;');
      expect(snippet).toContain('.post("https://api.example.com/items")');
    });
  });
});
