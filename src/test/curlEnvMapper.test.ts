import { describe, it, expect } from 'vitest';
import { detectEnvMappings, applyEnvMappings } from '../utils/curlEnvMapper';
import { RestRequest } from '../types';

describe('cURL Environment Mapper Suite', () => {
  it('should detect baseUrl, bearer token, and header API keys in a request', () => {
    const request: RestRequest = {
      id: 'req_1',
      name: 'Get User List',
      method: 'GET',
      url: 'https://api.acme.corp/v1/users',
      headers: [
        { id: 'h1', key: 'X-API-Key', value: 'secret_live_key_999', enabled: true },
        { id: 'h2', key: 'X-Client-ID', value: 'client_app_123', enabled: true },
      ],
      queryParams: [],
      body: { mode: 'none', rawText: '' },
      auth: { type: 'bearer', bearerToken: 'bearer_token_xyz' },
    };

    const suggestions = detectEnvMappings(request);

    expect(suggestions.some((s) => s.variableName === 'baseUrl' && s.originalValue === 'https://api.acme.corp')).toBe(true);
    expect(suggestions.some((s) => s.variableName === 'authToken' && s.originalValue === 'bearer_token_xyz')).toBe(true);
    expect(suggestions.some((s) => s.variableName === 'apiKey' && s.originalValue === 'secret_live_key_999')).toBe(true);
    expect(suggestions.some((s) => s.variableName === 'clientId' && s.originalValue === 'client_app_123')).toBe(true);
  });

  it('should apply environment mappings by replacing literal values with {{varName}} placeholders', () => {
    const request: RestRequest = {
      id: 'req_1',
      name: 'Create Invoice',
      method: 'POST',
      url: 'https://api.payment.com/v1/invoices',
      headers: [
        { id: 'h1', key: 'Authorization', value: 'Bearer sk_live_secret123', enabled: true },
      ],
      queryParams: [],
      body: {
        mode: 'json',
        rawText: '{"client_url":"https://api.payment.com/webhook","token":"sk_live_secret123"}',
      },
      auth: { type: 'bearer', bearerToken: 'sk_live_secret123' },
    };

    const suggestions = detectEnvMappings(request);
    const { request: updatedReq, createdVariables } = applyEnvMappings(request, suggestions);

    expect(updatedReq.url).toBe('{{baseUrl}}/v1/invoices');
    expect(updatedReq.auth.bearerToken).toBe('{{authToken}}');
    expect(updatedReq.headers[0].value).toBe('Bearer {{authToken}}');
    expect(updatedReq.body.rawText).toContain('{{baseUrl}}');
    expect(updatedReq.body.rawText).toContain('{{authToken}}');

    expect(createdVariables.some((v) => v.key === 'baseUrl' && v.value === 'https://api.payment.com')).toBe(true);
    expect(createdVariables.some((v) => v.key === 'authToken' && v.value === 'sk_live_secret123' && v.secret)).toBe(true);
  });
});
