import { describe, it, expect } from 'vitest';
import {
  inferJsonSchema,
  computeSchemaStats,
  generateDraft7JsonSchema,
  generateTypeScriptTypes,
} from '../utils/jsonSchemaGenerator';

describe('JSON Schema & TypeScript Generator Suite', () => {
  const samplePayload = {
    id: 'e4d909c2-9bad-4b2e-b6fe-208b0709b1f7',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    age: 28,
    active: true,
    website: 'https://example.com',
    createdAt: '2026-03-15T10:30:00Z',
    roles: ['admin', 'developer'],
    address: {
      street: '123 Tech Lane',
      city: 'San Francisco',
      zipCode: 94107,
    },
    meta: null,
  };

  it('should deeply infer JSON schema node hierarchy with types and formats', () => {
    const root = inferJsonSchema(samplePayload);

    expect(root.type).toBe('object');
    expect(root.properties?.['id'].type).toBe('string');
    expect(root.properties?.['id'].format).toBe('uuid');

    expect(root.properties?.['email'].type).toBe('string');
    expect(root.properties?.['email'].format).toBe('email');

    expect(root.properties?.['website'].type).toBe('string');
    expect(root.properties?.['website'].format).toBe('uri');

    expect(root.properties?.['createdAt'].type).toBe('string');
    expect(root.properties?.['createdAt'].format).toBe('date-time');

    expect(root.properties?.['age'].type).toBe('integer');
    expect(root.properties?.['active'].type).toBe('boolean');
    expect(root.properties?.['meta'].nullable).toBe(true);

    expect(root.properties?.['roles'].type).toBe('array');
    expect(root.properties?.['address'].type).toBe('object');
    expect(root.properties?.['address'].properties?.['city'].sampleValue).toBe('San Francisco');
  });

  it('should compute schema stats accurately', () => {
    const root = inferJsonSchema(samplePayload);
    const stats = computeSchemaStats(root);

    expect(stats.rootType).toBe('object');
    expect(stats.hasObjects).toBe(true);
    expect(stats.hasArrays).toBe(true);
    expect(stats.totalFields).toBeGreaterThan(8);
    expect(stats.maxDepth).toBeGreaterThanOrEqual(3);
  });

  it('should generate valid Draft-07 JSON Schema definition', () => {
    const root = inferJsonSchema(samplePayload);
    const jsonSchema = generateDraft7JsonSchema(root, 'UserResponse');

    expect(jsonSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(jsonSchema.title).toBe('UserResponse');
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.properties.email.format).toBe('email');
    expect(jsonSchema.properties.address.type).toBe('object');
  });

  it('should generate clean TypeScript interfaces with correct types and nested interfaces', () => {
    const root = inferJsonSchema(samplePayload);
    const tsCode = generateTypeScriptTypes(root, 'UserResponse');

    expect(tsCode).toContain('export interface UserResponse {');
    expect(tsCode).toContain('id: string;');
    expect(tsCode).toContain('email: string;');
    expect(tsCode).toContain('age: number;');
    expect(tsCode).toContain('active: boolean;');
    expect(tsCode).toContain('roles: string[];');
    expect(tsCode).toContain('export interface UserResponseAddress {');
  });
});
