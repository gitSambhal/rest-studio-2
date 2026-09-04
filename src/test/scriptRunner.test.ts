import { describe, it, expect } from 'vitest';
import {
  getValueByJsonPath,
  runPreRequestScript,
  runPostRequestScript,
} from '../utils/scriptRunner';
import { ExecutionResponse, RestRequest } from '../types';

describe('Script Runner & Assertion Sandbox Suite', () => {
  describe('getValueByJsonPath', () => {
    it('should extract nested values using dot and array notation', () => {
      const data = {
        user: {
          profile: {
            name: 'Alice',
            roles: ['admin', 'editor'],
          },
        },
        items: [
          { id: 101, title: 'Item 1' },
          { id: 102, title: 'Item 2' },
        ],
      };

      expect(getValueByJsonPath(data, 'user.profile.name')).toBe('Alice');
      expect(getValueByJsonPath(data, 'user.profile.roles[0]')).toBe('admin');
      expect(getValueByJsonPath(data, 'items[1].title')).toBe('Item 2');
      expect(getValueByJsonPath(data, 'user.profile.missing')).toBeUndefined();
    });
  });

  describe('runPreRequestScript', () => {
    it('should run custom JS pre-request script and modify headers/variables', async () => {
      const request: RestRequest = {
        id: 'req_1',
        name: 'Pre Script Test',
        method: 'GET',
        url: 'https://api.example.com/data',
        headers: [],
        queryParams: [],
        body: { mode: 'none', rawText: '' },
        auth: { type: 'none', bearerToken: '' },
        preRequestScript: {
          type: 'custom',
          enabled: true,
          script: `
            pm.environment.set("custom_timestamp", "1712345678");
            pm.request.setHeader("X-Custom-Auth", "CustomValue123");
            pm.request.setUrl("https://api.example.com/v2/data");
          `,
        },
      };

      const result = await runPreRequestScript(request, {}, {}, 'https://api.example.com/data', '');

      expect(result.success).toBe(true);
      expect(result.newVariables['custom_timestamp']).toBe('1712345678');
      expect(result.modifiedHeaders?.['X-Custom-Auth']).toBe('CustomValue123');
      expect(result.modifiedUrl).toBe('https://api.example.com/v2/data');
    });

    it('should validate request and report error if required headers are missing', async () => {
      const request: RestRequest = {
        id: 'req_1',
        name: 'Validation Test',
        method: 'POST',
        url: 'https://api.example.com/login',
        headers: [],
        queryParams: [],
        body: { mode: 'none', rawText: '' },
        auth: { type: 'none', bearerToken: '' },
        preRequestScript: {
          type: 'validate_request',
          enabled: true,
          validationConfig: {
            requireValidUrl: true,
            requireHeaders: ['Content-Type'],
          },
        },
      };

      const result = await runPreRequestScript(request, {}, {}, 'https://api.example.com/login', '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Required header "Content-Type" is missing');
    });
  });

  describe('runPostRequestScript', () => {
    const mockResponse: ExecutionResponse = {
      status: 200,
      statusText: 'OK',
      duration: 120,
      size: 512,
      body: JSON.stringify({
        access_token: 'jwt_mock_token_456',
        user: { id: 42, role: 'admin' },
      }),
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'req_xyz_789',
      },
      timestamp: Date.now(),
      ok: true,
    };

    it('should extract variables from response body JSON and response headers', () => {
      const request: RestRequest = {
        id: 'req_1',
        name: 'Extractor Test',
        method: 'POST',
        url: 'https://api.example.com/auth',
        headers: [],
        queryParams: [],
        body: { mode: 'none', rawText: '' },
        auth: { type: 'none', bearerToken: '' },
        postRequestScript: {
          type: 'extract_variable',
          enabled: true,
          extractors: [
            {
              id: 'ext1',
              targetVarName: 'authToken',
              targetScope: 'env',
              source: 'body_json',
              sourcePath: 'access_token',
              enabled: true,
            },
            {
              id: 'ext2',
              targetVarName: 'requestId',
              targetScope: 'env',
              source: 'header',
              sourcePath: 'x-request-id',
              enabled: true,
            },
          ],
        },
      };

      const result = runPostRequestScript(request, mockResponse);

      expect(result.newVariables['authToken']).toBe('jwt_mock_token_456');
      expect(result.newVariables['requestId']).toBe('req_xyz_789');
    });

    it('should evaluate response assertions with validate_response', () => {
      const request: RestRequest = {
        id: 'req_1',
        name: 'Assertion Test',
        method: 'GET',
        url: 'https://api.example.com/status',
        headers: [],
        queryParams: [],
        body: { mode: 'none', rawText: '' },
        auth: { type: 'none', bearerToken: '' },
        postRequestScript: {
          type: 'validate_response',
          enabled: true,
          validationConfig: {
            expectedStatus: 200,
            maxDurationMs: 500,
            requiredJsonFields: ['access_token', 'user.role'],
          },
        },
      };

      const result = runPostRequestScript(request, mockResponse);
      expect(result.assertions).toHaveLength(4);
      expect(result.assertions?.every((a) => a.passed)).toBe(true);
    });

    it('should run custom JS post-request test assertions using pm.test and pm.expect', () => {
      const request: RestRequest = {
        id: 'req_1',
        name: 'Custom Test Suite',
        method: 'GET',
        url: 'https://api.example.com/user',
        headers: [],
        queryParams: [],
        body: { mode: 'none', rawText: '' },
        auth: { type: 'none', bearerToken: '' },
        postRequestScript: {
          type: 'custom',
          enabled: true,
          script: `
            pm.test("Status code is 200", function () {
              pm.expect(pm.response.status).to.equal(200);
            });

            pm.test("User is admin", function () {
              const jsonData = pm.response.json();
              pm.expect(jsonData.user.role).to.equal("admin");
            });

            pm.environment.set("saved_user_id", pm.response.json().user.id);
          `,
        },
      };

      const result = runPostRequestScript(request, mockResponse);
      expect(result.assertions).toHaveLength(2);
      expect(result.assertions?.[0].passed).toBe(true);
      expect(result.assertions?.[1].passed).toBe(true);
      expect(result.newVariables['saved_user_id']).toBe('42');
    });
  });
});
