import { describe, it, expect } from 'vitest';
import {
  parseRestFileContent,
  generateRestFileContent,
  parseCurlCommand,
  parsePostmanCollection,
  parseInsomniaCollection,
  parseOpenApiSpec,
  detectAndParsePaste,
} from '../utils/restParser';
import { RestRequest } from '../types';

describe('REST Parser & Serializer Suite', () => {
  describe('parseRestFileContent', () => {
    it('should parse single GET request with headers and query parameters', () => {
      const restContent = `
@baseUrl = https://api.example.com
@apiKey = secret123

### Get All Users
GET {{baseUrl}}/users?page=1&limit=20 HTTP/1.1
Accept: application/json
Authorization: Bearer my-token
`;

      const result = parseRestFileContent(restContent, 'users.rest');

      expect(result.fileVariables).toEqual({
        baseUrl: 'https://api.example.com',
        apiKey: 'secret123',
      });

      expect(result.requests).toHaveLength(1);
      const req = result.requests[0];
      expect(req.name).toBe('Get All Users');
      expect(req.method).toBe('GET');
      expect(req.url).toBe('{{baseUrl}}/users');
      expect(req.queryParams).toHaveLength(2);
      expect(req.queryParams[0].key).toBe('page');
      expect(req.queryParams[0].value).toBe('1');
      expect(req.queryParams[1].key).toBe('limit');
      expect(req.queryParams[1].value).toBe('20');
      expect(req.headers.some((h) => h.key === 'Accept' && h.value === 'application/json')).toBe(true);
      expect(req.auth.type).toBe('bearer');
      expect(req.auth.bearerToken).toBe('my-token');
    });

    it('should parse multiple requests separated by ### with JSON bodies', () => {
      const restContent = `
### Create User
POST https://api.example.com/users
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "active": true
}

### Delete User
DELETE https://api.example.com/users/42
`;

      const result = parseRestFileContent(restContent, 'multi.rest');

      expect(result.requests).toHaveLength(2);
      const postReq = result.requests[0];
      expect(postReq.name).toBe('Create User');
      expect(postReq.method).toBe('POST');
      expect(postReq.body.mode).toBe('json');
      expect(JSON.parse(postReq.body.rawText)).toEqual({
        name: 'Jane Doe',
        email: 'jane@example.com',
        active: true,
      });

      const delReq = result.requests[1];
      expect(delReq.name).toBe('Delete User');
      expect(delReq.method).toBe('DELETE');
      expect(delReq.url).toBe('https://api.example.com/users/42');
    });
  });

  describe('generateRestFileContent', () => {
    it('should serialize RestRequest array into standard .rest syntax', () => {
      const requests: RestRequest[] = [
        {
          id: 'req_1',
          name: 'Fetch Products',
          method: 'GET',
          url: 'https://api.store.com/products',
          headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
          queryParams: [{ id: 'q1', key: 'category', value: 'electronics', enabled: true }],
          body: { mode: 'none', rawText: '' },
          auth: { type: 'none', bearerToken: '' },
        },
        {
          id: 'req_2',
          name: 'Add Product',
          method: 'POST',
          url: 'https://api.store.com/products',
          headers: [{ id: 'h2', key: 'Content-Type', value: 'application/json', enabled: true }],
          queryParams: [],
          body: { mode: 'json', rawText: '{"title":"Laptop","price":999}' },
          auth: { type: 'bearer', bearerToken: 'admin_secret' },
        },
      ];

      const fileVars = { baseUrl: 'https://api.store.com' };
      const serialized = generateRestFileContent(requests, fileVars);

      expect(serialized).toContain('@baseUrl = https://api.store.com');
      expect(serialized).toContain('### Fetch Products');
      expect(serialized).toContain('GET https://api.store.com/products?category=electronics');
      expect(serialized).toContain('Accept: application/json');
      expect(serialized).toContain('### Add Product');
      expect(serialized).toContain('POST https://api.store.com/products');
      expect(serialized).toContain('Authorization: Bearer admin_secret');
      expect(serialized).toContain('{"title":"Laptop","price":999}');
    });
  });

  describe('parseCurlCommand', () => {
    it('should parse standard cURL command with -X, -H, and -d flags', () => {
      const curl = `curl -X POST "https://api.example.com/v1/auth/login" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer sample_jwt_token" \\
        -d '{"email":"user@test.com","password":"secretpassword"}'`;

      const parsed = parseCurlCommand(curl);
      expect(parsed).not.toBeNull();
      expect(parsed?.method).toBe('POST');
      expect(parsed?.url).toBe('https://api.example.com/v1/auth/login');
      expect(parsed?.auth.type).toBe('bearer');
      expect(parsed?.auth.bearerToken).toBe('sample_jwt_token');
      expect(parsed?.body.mode).toBe('json');
      expect(JSON.parse(parsed?.body.rawText || '{}')).toEqual({
        email: 'user@test.com',
        password: 'secretpassword',
      });
    });

    it('should handle basic auth from -u flag', () => {
      const curl = `curl -u "admin:secretpass" https://api.example.com/dashboard`;
      const parsed = parseCurlCommand(curl);
      expect(parsed).not.toBeNull();
      expect(parsed?.method).toBe('GET');
      expect(parsed?.url).toBe('https://api.example.com/dashboard');
      const authHeader = parsed?.headers.find((h) => h.key.toLowerCase() === 'authorization');
      expect(authHeader).toBeDefined();
      expect(authHeader?.value).toContain('Basic ');
    });
  });

  describe('parsePostmanCollection', () => {
    it('should parse Postman v2.1 collection structure into RestFile and folders', () => {
      const postmanJson = {
        info: {
          name: 'E-Commerce API',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'Authentication',
            item: [
              {
                name: 'Login',
                request: {
                  method: 'POST',
                  header: [{ key: 'Content-Type', value: 'application/json' }],
                  url: {
                    raw: 'https://api.store.com/auth/login',
                    protocol: 'https',
                    host: ['api', 'store', 'com'],
                    path: ['auth', 'login'],
                  },
                  body: {
                    mode: 'raw',
                    raw: '{"username":"admin","password":"password"}',
                  },
                },
              },
            ],
          },
          {
            name: 'Health Check',
            request: {
              method: 'GET',
              url: 'https://api.store.com/health',
            },
          },
        ],
      };

      const result = parsePostmanCollection(postmanJson);
      expect(result.error).toBeUndefined();
      expect(result.files.length).toBeGreaterThanOrEqual(1);

      const allReqs = result.files.flatMap((f) => f.requests);
      expect(allReqs.some((r) => r.name === 'Login' && r.method === 'POST')).toBe(true);
      expect(allReqs.some((r) => r.name === 'Health Check' && r.method === 'GET')).toBe(true);
    });
  });

  describe('parseInsomniaCollection', () => {
    it('should parse Insomnia v4 export collection format', () => {
      const insomniaJson = {
        _type: 'export',
        __export_format: 4,
        resources: [
          {
            _id: 'wrk_1',
            _type: 'workspace',
            name: 'Insomnia Test Workspace',
          },
          {
            _id: 'req_1',
            _type: 'request',
            name: 'Get User Profile',
            method: 'GET',
            url: 'https://api.example.com/me',
            headers: [{ name: 'Authorization', value: 'Bearer token_123' }],
          },
          {
            _id: 'req_2',
            _type: 'request',
            name: 'Update Settings',
            method: 'PUT',
            url: 'https://api.example.com/settings',
            body: {
              mimeType: 'application/json',
              text: '{"notifications":true}',
            },
          },
        ],
      };

      const result = parseInsomniaCollection(insomniaJson);
      expect(result.error).toBeUndefined();
      expect(result.files.length).toBeGreaterThan(0);
      const allReqs = result.files.flatMap((f) => f.requests);
      expect(allReqs.length).toBe(2);
      expect(allReqs[0].name).toBe('Get User Profile');
      expect(allReqs[1].name).toBe('Update Settings');
      expect(allReqs[1].method).toBe('PUT');
    });
  });

  describe('parseOpenApiSpec', () => {
    it('should parse OpenAPI 3.0 JSON specification', () => {
      const openApiJson = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Petstore Demo', version: '1.0.0' },
        servers: [{ url: 'https://petstore.example.com/v1' }],
        paths: {
          '/pets': {
            get: {
              tags: ['Pets'],
              summary: 'List all pets',
              operationId: 'listPets',
              parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
              ],
            },
            post: {
              tags: ['Pets'],
              summary: 'Create a pet',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: { name: { type: 'string' }, tag: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const result = parseOpenApiSpec(openApiJson);
      expect(result.error).toBeUndefined();
      expect(result.files.length).toBe(1);
      expect(result.files[0].name).toBe('pets.rest');
      expect(result.files[0].requests).toHaveLength(2);
      expect(result.files[0].requests[0].method).toBe('GET');
      expect(result.files[0].requests[0].url).toContain('https://petstore.example.com/v1/pets');
      expect(result.files[0].requests[1].method).toBe('POST');
    });
  });

  describe('detectAndParsePaste', () => {
    it('should automatically detect cURL snippets', () => {
      const snippet = 'curl -X GET "https://api.github.com/users/octocat"';
      const result = detectAndParsePaste(snippet);
      expect(result.type).toBe('curl');
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].url).toBe('https://api.github.com/users/octocat');
    });

    it('should automatically detect REST file snippets', () => {
      const snippet = `### Test Endpoint\nGET https://api.example.com/test\nAccept: application/json`;
      const result = detectAndParsePaste(snippet);
      expect(result.type).toBe('rest_file');
      expect(result.requests).toHaveLength(1);
    });

    it('should detect direct URLs', () => {
      const snippet = 'https://jsonplaceholder.typicode.com/todos/1';
      const result = detectAndParsePaste(snippet);
      expect(result.type).toBe('url');
      expect(result.requests[0].url).toBe(snippet);
    });
  });
});
