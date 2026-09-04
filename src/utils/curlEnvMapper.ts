import { RestRequest, EnvVariable, KeyValuePair } from '../types';

export interface EnvMappingSuggestion {
  id: string;
  variableName: string;
  originalValue: string;
  category: 'baseUrl' | 'auth' | 'header' | 'body';
  description: string;
  enabled: boolean;
}

/**
 * Detects values in a parsed RestRequest that can be converted into reusable environment variables.
 */
export function detectEnvMappings(request: RestRequest): EnvMappingSuggestion[] {
  const suggestions: EnvMappingSuggestion[] = [];

  // 1. Detect Base URL from URL
  if (request.url) {
    try {
      const parsedUrl = new URL(request.url);
      const origin = parsedUrl.origin;
      if (origin && origin !== 'null' && !origin.includes('{{')) {
        suggestions.push({
          id: 'map_base_url',
          variableName: 'baseUrl',
          originalValue: origin,
          category: 'baseUrl',
          description: `Map hostname (${origin}) to {{baseUrl}}`,
          enabled: true,
        });
      }
    } catch {
      // If not standard URL (or uses custom port), check regex
      const match = request.url.match(/^(https?:\/\/[^/]+)/i);
      if (match && !match[1].includes('{{')) {
        suggestions.push({
          id: 'map_base_url',
          variableName: 'baseUrl',
          originalValue: match[1],
          category: 'baseUrl',
          description: `Map host (${match[1]}) to {{baseUrl}}`,
          enabled: true,
        });
      }
    }
  }

  // 2. Detect Auth Bearer Token in Headers or Auth
  if (request.auth?.bearerToken && !request.auth.bearerToken.includes('{{')) {
    suggestions.push({
      id: 'map_bearer_token',
      variableName: 'authToken',
      originalValue: request.auth.bearerToken,
      category: 'auth',
      description: 'Map Bearer Token to {{authToken}}',
      enabled: true,
    });
  }

  (request.headers || []).forEach((h) => {
    const key = h.key.toLowerCase();
    const val = h.value.trim();

    if (!val || val.includes('{{')) return;

    if (key === 'authorization') {
      if (/^bearer\s+/i.test(val)) {
        const token = val.replace(/^bearer\s+/i, '').trim();
        if (token && !suggestions.some((s) => s.variableName === 'authToken')) {
          suggestions.push({
            id: 'map_auth_header',
            variableName: 'authToken',
            originalValue: token,
            category: 'auth',
            description: 'Map Authorization Bearer token to {{authToken}}',
            enabled: true,
          });
        }
      }
    } else if (['x-api-key', 'api-key', 'apikey', 'x-apikey'].includes(key)) {
      if (!suggestions.some((s) => s.variableName === 'apiKey')) {
        suggestions.push({
          id: `map_header_${h.id}`,
          variableName: 'apiKey',
          originalValue: val,
          category: 'header',
          description: `Map ${h.key} value to {{apiKey}}`,
          enabled: true,
        });
      }
    } else if (['x-client-id', 'client-id', 'client_id'].includes(key)) {
      suggestions.push({
        id: `map_header_${h.id}`,
        variableName: 'clientId',
        originalValue: val,
        category: 'header',
        description: `Map ${h.key} to {{clientId}}`,
        enabled: true,
      });
    }
  });

  return suggestions;
}

/**
 * Applies the selected environment mappings to the request, replacing literal values
 * with {{variableName}}, and returns the updated request along with the created EnvVariable items.
 */
export function applyEnvMappings(
  request: RestRequest,
  mappings: EnvMappingSuggestion[]
): {
  request: RestRequest;
  createdVariables: EnvVariable[];
} {
  const activeMappings = mappings.filter((m) => m.enabled && m.originalValue.trim());
  if (activeMappings.length === 0) {
    return { request, createdVariables: [] };
  }

  const updatedReq: RestRequest = JSON.parse(JSON.stringify(request));
  const createdVariables: EnvVariable[] = [];

  activeMappings.forEach((mapping) => {
    const placeholder = `{{${mapping.variableName}}}`;

    // 1. Replace in URL
    if (updatedReq.url.includes(mapping.originalValue)) {
      updatedReq.url = updatedReq.url.split(mapping.originalValue).join(placeholder);
    }

    // 2. Replace in Headers
    updatedReq.headers = updatedReq.headers.map((h) => {
      if (h.value.includes(mapping.originalValue)) {
        return { ...h, value: h.value.split(mapping.originalValue).join(placeholder) };
      }
      return h;
    });

    // 3. Replace in Auth
    if (updatedReq.auth?.bearerToken && updatedReq.auth.bearerToken.includes(mapping.originalValue)) {
      updatedReq.auth.bearerToken = updatedReq.auth.bearerToken.split(mapping.originalValue).join(placeholder);
    }

    // 4. Replace in Body rawText
    if (updatedReq.body?.rawText && updatedReq.body.rawText.includes(mapping.originalValue)) {
      updatedReq.body.rawText = updatedReq.body.rawText.split(mapping.originalValue).join(placeholder);
    }

    createdVariables.push({
      id: 'var_' + Math.random().toString(36).substring(2, 9),
      key: mapping.variableName,
      value: mapping.originalValue,
      secret: mapping.variableName.toLowerCase().includes('token') || mapping.variableName.toLowerCase().includes('key'),
      enabled: true,
      description: `Auto-extracted from cURL (${mapping.category})`,
    });
  });

  return { request: updatedReq, createdVariables };
}
