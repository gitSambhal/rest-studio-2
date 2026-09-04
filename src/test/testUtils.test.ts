import { describe, it, expect } from 'vitest';
import { evaluateAssertions } from '../utils/testUtils';
import { ExecutionResponse, TestAssertion } from '../types';

describe('Test Assertions Evaluator Suite', () => {
  const baseResponse: ExecutionResponse = {
    status: 200,
    statusText: 'OK',
    duration: 150,
    size: 256,
    body: JSON.stringify({ success: true, count: 5, message: 'All items loaded' }),
    headers: { 'content-type': 'application/json' },
    timestamp: Date.now(),
    ok: true,
  };

  it('should evaluate passing assertions accurately', () => {
    const assertions: TestAssertion[] = [
      { id: '1', type: 'status_code', targetValue: '200', enabled: true },
      { id: '2', type: 'max_time', targetValue: '300', enabled: true },
      { id: '3', type: 'body_contains', targetValue: 'All items loaded', enabled: true },
      { id: '4', type: 'json_property', targetValue: 'success', enabled: true },
    ];

    const result = evaluateAssertions(assertions, baseResponse);
    expect(result.allPassed).toBe(true);
    expect(result.assertions.every((a) => a.passed)).toBe(true);
  });

  it('should detect failing assertions with informative messages', () => {
    const assertions: TestAssertion[] = [
      { id: '1', type: 'status_code', targetValue: '201', enabled: true },
      { id: '2', type: 'max_time', targetValue: '100', enabled: true },
      { id: '3', type: 'body_contains', targetValue: 'Missing Text', enabled: true },
      { id: '4', type: 'json_property', targetValue: 'non_existent_key', enabled: true },
    ];

    const result = evaluateAssertions(assertions, baseResponse);
    expect(result.allPassed).toBe(false);
    expect(result.assertions.every((a) => a.passed === false)).toBe(true);
    expect(result.assertions[0].message).toContain('Expected status 201, received 200');
    expect(result.assertions[1].message).toContain('exceeded limit 100ms');
  });

  it('should treat disabled assertions as passed', () => {
    const assertions: TestAssertion[] = [
      { id: '1', type: 'status_code', targetValue: '500', enabled: false },
    ];

    const result = evaluateAssertions(assertions, baseResponse);
    expect(result.allPassed).toBe(true);
    expect(result.assertions[0].passed).toBe(true);
    expect(result.assertions[0].message).toBe('Disabled');
  });

  it('should handle non-JSON responses gracefully for json_property assertions', () => {
    const htmlResponse: ExecutionResponse = {
      ...baseResponse,
      body: '<html><body>Hello</body></html>',
    };

    const assertions: TestAssertion[] = [
      { id: '1', type: 'json_property', targetValue: 'token', enabled: true },
    ];

    const result = evaluateAssertions(assertions, htmlResponse);
    expect(result.allPassed).toBe(false);
    expect(result.assertions[0].message).toBe('Response body is not valid JSON');
  });
});
