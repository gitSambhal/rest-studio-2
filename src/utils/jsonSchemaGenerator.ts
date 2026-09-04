/**
 * Utility for automatically analyzing JSON API response bodies,
 * inferring structural schemas, formats, sample values, and generating
 * standard JSON Schema (Draft-07) and TypeScript interface definitions.
 */

export type SchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'null' | 'object' | 'array' | 'any';

export interface SchemaNode {
  key?: string;
  path: string;
  type: SchemaType;
  format?: 'date-time' | 'date' | 'time' | 'email' | 'uri' | 'uuid' | 'ipv4' | 'ipv6' | 'hostname';
  nullable?: boolean;
  required?: boolean;
  description?: string;
  sampleValue?: any;
  enum?: (string | number | boolean)[];
  
  // Object specific
  properties?: Record<string, SchemaNode>;
  requiredProperties?: string[];
  propertyCount?: number;
  
  // Array specific
  items?: SchemaNode;
  itemCount?: number;
  
  // Primitives
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

export interface SchemaStats {
  rootType: SchemaType;
  totalFields: number;
  maxDepth: number;
  typeCounts: Record<SchemaType, number>;
  hasArrays: boolean;
  hasObjects: boolean;
}

/**
 * Format detector heuristics for string values
 */
function detectStringFormat(val: string): SchemaNode['format'] | undefined {
  if (!val || typeof val !== 'string') return undefined;

  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)) {
    return 'uuid';
  }

  // Email
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
    return 'email';
  }

  // ISO Date-Time
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(val)) {
    return 'date-time';
  }

  // Date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return 'date';
  }

  // Time HH:MM:SS
  if (/^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(val)) {
    return 'time';
  }

  // URI / URL
  if (/^(https?|ftp|wss?|file):\/\/[^\s/$.?#].[^\s]*$/i.test(val)) {
    return 'uri';
  }

  // IPv4
  if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(val)) {
    return 'ipv4';
  }

  return undefined;
}

/**
 * Determines primary JSON data type of a value
 */
function getTypeOf(val: any): SchemaType {
  if (val === null) return 'null';
  if (val === undefined) return 'any';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? 'integer' : 'number';
  }
  if (typeof val === 'string') return 'string';
  if (typeof val === 'object') return 'object';
  return 'any';
}

/**
 * Deeply analyzes any JSON value and creates a rich SchemaNode hierarchy
 */
export function inferJsonSchema(value: any, key?: string, path: string = '$'): SchemaNode {
  const type = getTypeOf(value);

  const node: SchemaNode = {
    key,
    path,
    type,
    required: true,
    sampleValue: value,
  };

  if (type === 'string') {
    node.format = detectStringFormat(value);
    node.minLength = value.length;
    node.maxLength = value.length;
    return node;
  }

  if (type === 'number' || type === 'integer') {
    node.minimum = value;
    node.maximum = value;
    return node;
  }

  if (type === 'boolean' || type === 'null' || type === 'any') {
    if (type === 'null') {
      node.nullable = true;
    }
    return node;
  }

  if (type === 'array') {
    const arr = value as any[];
    node.itemCount = arr.length;

    if (arr.length === 0) {
      node.items = {
        key: '[item]',
        path: `${path}[]`,
        type: 'any',
        description: 'Empty array (no sample items)',
      };
      return node;
    }

    // If array items are objects, merge schema across all array items to discover all fields & required fields
    const isObjectArray = arr.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item));

    if (isObjectArray) {
      const mergedProperties: Record<string, SchemaNode> = {};
      const keyOccurrenceCount: Record<string, number> = {};

      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const itemKeys = Object.keys(item);
        for (const k of itemKeys) {
          keyOccurrenceCount[k] = (keyOccurrenceCount[k] || 0) + 1;
          const childVal = item[k];
          const childPath = `${path}[].${k}`;

          if (!mergedProperties[k]) {
            mergedProperties[k] = inferJsonSchema(childVal, k, childPath);
          } else {
            // Update child node if current item has richer/non-null value
            const existing = mergedProperties[k];
            if (existing.type === 'null' && childVal !== null) {
              mergedProperties[k] = inferJsonSchema(childVal, k, childPath);
              mergedProperties[k].nullable = true;
            } else if (childVal === null) {
              existing.nullable = true;
            }
          }
        }
      }

      // Mark required properties (present in 100% of non-empty array samples)
      const requiredProps: string[] = [];
      Object.keys(mergedProperties).forEach((k) => {
        const isReq = keyOccurrenceCount[k] === arr.length;
        mergedProperties[k].required = isReq;
        if (isReq) requiredProps.push(k);
      });

      node.items = {
        key: '[item]',
        path: `${path}[]`,
        type: 'object',
        properties: mergedProperties,
        requiredProperties: requiredProps,
        propertyCount: Object.keys(mergedProperties).length,
        sampleValue: arr[0],
      };
    } else {
      // Primitive or heterogeneous items
      node.items = inferJsonSchema(arr[0], '[item]', `${path}[]`);
    }

    return node;
  }

  if (type === 'object') {
    const obj = value as Record<string, any>;
    const keys = Object.keys(obj);
    const properties: Record<string, SchemaNode> = {};
    const requiredProps: string[] = [];

    for (const k of keys) {
      const childVal = obj[k];
      const childPath = path === '$' ? k : `${path}.${k}`;
      const childNode = inferJsonSchema(childVal, k, childPath);
      properties[k] = childNode;
      if (childVal !== undefined && childVal !== null) {
        requiredProps.push(k);
      }
    }

    node.properties = properties;
    node.requiredProperties = requiredProps;
    node.propertyCount = keys.length;
    return node;
  }

  return node;
}

/**
 * Computes aggregate summary statistics for a schema tree
 */
export function computeSchemaStats(root: SchemaNode): SchemaStats {
  const typeCounts: Record<SchemaType, number> = {
    string: 0,
    number: 0,
    integer: 0,
    boolean: 0,
    null: 0,
    object: 0,
    array: 0,
    any: 0,
  };

  let totalFields = 0;
  let maxDepth = 1;

  function traverse(node: SchemaNode, depth: number) {
    totalFields++;
    if (depth > maxDepth) maxDepth = depth;
    const t = Array.isArray(node.type) ? node.type[0] : node.type;
    if (typeCounts[t] !== undefined) {
      typeCounts[t]++;
    }

    if (node.properties) {
      Object.values(node.properties).forEach((child) => traverse(child, depth + 1));
    }
    if (node.items) {
      traverse(node.items, depth + 1);
    }
  }

  traverse(root, 1);

  return {
    rootType: root.type,
    totalFields,
    maxDepth,
    typeCounts,
    hasArrays: (typeCounts.array || 0) > 0,
    hasObjects: (typeCounts.object || 0) > 0,
  };
}

/**
 * Converts SchemaNode tree into standard Draft-07 JSON Schema object
 */
export function generateDraft7JsonSchema(root: SchemaNode, title: string = 'ApiResponseSchema'): any {
  function nodeToSchema(node: SchemaNode): any {
    const schema: any = {};

    if (node.type === 'null') {
      schema.type = 'null';
    } else if (node.nullable) {
      schema.type = [node.type, 'null'];
    } else {
      schema.type = node.type;
    }

    if (node.format) {
      schema.format = node.format;
    }

    if (node.description) {
      schema.description = node.description;
    }

    if (node.sampleValue !== undefined && node.type !== 'object' && node.type !== 'array') {
      schema.examples = [node.sampleValue];
    }

    if (node.type === 'object') {
      schema.properties = {};
      if (node.properties) {
        Object.entries(node.properties).forEach(([k, child]) => {
          schema.properties[k] = nodeToSchema(child);
        });
      }
      if (node.requiredProperties && node.requiredProperties.length > 0) {
        schema.required = node.requiredProperties;
      }
      schema.additionalProperties = true;
    } else if (node.type === 'array') {
      if (node.items) {
        schema.items = nodeToSchema(node.items);
      } else {
        schema.items = {};
      }
    }

    return schema;
  }

  const baseSchema = nodeToSchema(root);
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title,
    ...baseSchema,
  };
}

/**
 * Generates exportable, clean TypeScript interfaces/types from the schema tree
 */
export function generateTypeScriptTypes(root: SchemaNode, rootTypeName: string = 'ApiResponse'): string {
  const generatedInterfaces: string[] = [];
  const visitedTypeNames = new Set<string>();

  function capitalize(str: string): string {
    if (!str) return 'Item';
    const clean = str.replace(/[^a-zA-Z0-9_]/g, '');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  function resolveTsType(node: SchemaNode, parentName: string, propKey?: string): string {
    if (node.type === 'string') {
      return node.nullable ? 'string | null' : 'string';
    }
    if (node.type === 'number' || node.type === 'integer') {
      return node.nullable ? 'number | null' : 'number';
    }
    if (node.type === 'boolean') {
      return node.nullable ? 'boolean | null' : 'boolean';
    }
    if (node.type === 'null') {
      return 'null';
    }
    if (node.type === 'any') {
      return 'any';
    }

    if (node.type === 'array') {
      if (!node.items) return 'any[]';
      const itemTypeName = propKey ? `${parentName}${capitalize(propKey)}Item` : `${parentName}Item`;
      const itemType = resolveTsType(node.items, itemTypeName);
      return `${itemType}[]`;
    }

    if (node.type === 'object') {
      const interfaceName = propKey ? `${parentName}${capitalize(propKey)}` : parentName;

      // Avoid infinite duplicate interface collisions
      let uniqueName = interfaceName;
      let counter = 2;
      while (visitedTypeNames.has(uniqueName)) {
        uniqueName = `${interfaceName}_${counter++}`;
      }
      visitedTypeNames.add(uniqueName);

      const props = node.properties || {};
      const propLines: string[] = [];

      Object.entries(props).forEach(([k, child]) => {
        const isOptional = child.required === false || (node.requiredProperties && !node.requiredProperties.includes(k));
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
        const childType = resolveTsType(child, uniqueName, k);
        const comment = child.format ? ` // format: ${child.format}` : '';
        propLines.push(`  ${safeKey}${isOptional ? '?' : ''}: ${childType};${comment}`);
      });

      const interfaceCode = `export interface ${uniqueName} {\n${propLines.join('\n')}\n}`;
      generatedInterfaces.push(interfaceCode);
      return uniqueName;
    }

    return 'any';
  }

  const mainType = resolveTsType(root, rootTypeName);

  if (root.type !== 'object') {
    generatedInterfaces.unshift(`export type ${rootTypeName} = ${mainType};`);
  }

  return `/**\n * Auto-generated TypeScript types for API response\n * Generated by RestStudio\n */\n\n` + generatedInterfaces.join('\n\n');
}
