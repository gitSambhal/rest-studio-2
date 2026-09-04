/**
 * RestStudio - Offline-First REST API Client & Workspace
 * Created by Suhail Akhtar (https://suhail.top)
 */

import { RestRequest } from '../types';

export type CodeSnippetLanguage = 'curl' | 'fetch' | 'axios' | 'python' | 'nodejs' | 'go' | 'rust';

/**
 * Generates code snippets in various languages for a given RestRequest.
 */
export function generateCodeSnippet(language: CodeSnippetLanguage, request: RestRequest): string {
  const method = request.method || 'GET';
  let url = request.url || 'https://api.example.com';

  // Append enabled query parameters if present
  const activeParams = (request.queryParams || []).filter((p) => p.enabled && p.key);
  if (activeParams.length > 0) {
    const queryString = activeParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    url += (url.includes('?') ? '&' : '?') + queryString;
  }

  const activeHeaders = (request.headers || []).filter((h) => h.enabled && h.key);
  const bodyText = request.body?.rawText || '';

  switch (language) {
    case 'curl': {
      let snippet = `curl -X ${method} "${url}"`;
      activeHeaders.forEach((h) => {
        snippet += ` \\\n  -H "${h.key}: ${h.value}"`;
      });
      if (request.auth?.type === 'bearer' && request.auth.bearerToken) {
        snippet += ` \\\n  -H "Authorization: Bearer ${request.auth.bearerToken}"`;
      }
      if (['POST', 'PUT', 'PATCH'].includes(method) && bodyText) {
        snippet += ` \\\n  -d '${bodyText.replace(/'/g, "'\\''")}'`;
      }
      return snippet;
    }

    case 'fetch': {
      const headersObj: Record<string, string> = {};
      activeHeaders.forEach((h) => {
        headersObj[h.key] = h.value;
      });
      if (request.auth?.type === 'bearer' && request.auth.bearerToken) {
        headersObj['Authorization'] = `Bearer ${request.auth.bearerToken}`;
      }

      let optionsStr = `{\n  method: "${method}",\n`;
      if (Object.keys(headersObj).length > 0) {
        optionsStr += `  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')},\n`;
      }
      if (['POST', 'PUT', 'PATCH'].includes(method) && bodyText) {
        optionsStr += `  body: JSON.stringify(${bodyText.trim() ? bodyText : '{}'}),\n`;
      }
      optionsStr += `}`;

      return `fetch("${url}", ${optionsStr})\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
    }

    case 'axios': {
      const headersObj: Record<string, string> = {};
      activeHeaders.forEach((h) => {
        headersObj[h.key] = h.value;
      });
      if (request.auth?.type === 'bearer' && request.auth.bearerToken) {
        headersObj['Authorization'] = `Bearer ${request.auth.bearerToken}`;
      }

      let snippet = `import axios from 'axios';\n\naxios({\n  method: '${method.toLowerCase()}',\n  url: '${url}',\n`;
      if (Object.keys(headersObj).length > 0) {
        snippet += `  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')},\n`;
      }
      if (['POST', 'PUT', 'PATCH'].includes(method) && bodyText) {
        snippet += `  data: ${bodyText.trim() ? bodyText : '{}'},\n`;
      }
      snippet += `})\n  .then(response => console.log(response.data))\n  .catch(error => console.error(error));`;
      return snippet;
    }

    case 'python': {
      let snippet = `import requests\n\nurl = "${url}"\n`;
      if (activeHeaders.length > 0 || request.auth?.type === 'bearer') {
        snippet += `headers = {\n`;
        activeHeaders.forEach((h) => {
          snippet += `    "${h.key}": "${h.value}",\n`;
        });
        if (request.auth?.type === 'bearer' && request.auth.bearerToken) {
          snippet += `    "Authorization": "Bearer ${request.auth.bearerToken}",\n`;
        }
        snippet += `}\n`;
      } else {
        snippet += `headers = {}\n`;
      }

      if (['POST', 'PUT', 'PATCH'].includes(method) && bodyText) {
        snippet += `payload = ${bodyText.trim() ? bodyText : '{}'}\n`;
        snippet += `response = requests.${method.toLowerCase()}(url, json=payload, headers=headers)\n`;
      } else {
        snippet += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
      }
      snippet += `print(response.json())`;
      return snippet;
    }

    case 'nodejs': {
      return `const axios = require('axios');\n\nasync function makeRequest() {\n  try {\n    const response = await axios.${method.toLowerCase()}("${url}"${
        ['POST', 'PUT', 'PATCH'].includes(method) && bodyText ? `, ${bodyText}` : ''
      });\n    console.log(response.data);\n  } catch (error) {\n    console.error(error);\n  }\n}\n\nmakeRequest();`;
    }

    case 'go': {
      return `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n\t"io"\n)\n\nfunc main() {\n\treq, err := http.NewRequest("${method}", "${url}", nil)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tclient := &http.Client{}\n\tresp, err := client.Do(req)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer resp.Body.Close()\n\tbody, _ := io.ReadAll(resp.Body)\n\tfmt.Println(string(body))\n}`;
    }

    case 'rust': {
      return `use reqwest::Client;\n\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std.error::Error>> {\n    let client = Client::new();\n    let res = client.${method.toLowerCase()}("${url}")\n        .send()\n        .await?\n        .text()\n        .await?;\n    println!("{}", res);\n    Ok(())\n}`;
    }

    default:
      return `curl -X ${method} "${url}"`;
  }
}
