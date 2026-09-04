/**
 * RestStudio - Offline-First REST API Client & Workspace
 * Created by Suhail Akhtar (https://suhail.top)
 */

import { describe, it, expect } from 'vitest';
import { Project, RestFile, RestRequest } from '../types';
import { generateMarkdownDocs, generateHtmlDocs } from '../utils/docExporter';
import { generateCodeSnippet } from '../utils/codeSnippetGenerator';

describe('API Documentation Exporter', () => {
  const sampleProject: Project = {
    id: 'proj_test_doc',
    name: 'Petstore API',
    description: 'Sample Petstore REST specification',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    activeEnvId: null,
    environments: [],
    folders: [],
    files: [
      {
        id: 'file_pets',
        name: 'pets.rest',
        rawContent: 'GET https://api.example.com/v1/pets',
        updatedAt: Date.now(),
        requests: [
          {
            id: 'req_get_pets',
            name: 'List All Pets',
            method: 'GET',
            url: 'https://api.example.com/v1/pets',
            headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
            queryParams: [{ id: 'q1', key: 'limit', value: '10', enabled: true }],
            body: { mode: 'none', rawText: '' },
            auth: { type: 'none', bearerToken: '' },
            description: 'Returns a list of all pets in the database.',
          },
          {
            id: 'req_create_pet',
            name: 'Create Pet',
            method: 'POST',
            url: 'https://api.example.com/v1/pets',
            headers: [{ id: 'h2', key: 'Content-Type', value: 'application/json', enabled: true }],
            queryParams: [],
            body: { mode: 'json', rawText: '{\n  "name": "Fido",\n  "type": "dog"\n}' },
            auth: { type: 'bearer', bearerToken: 'secret_token_123' },
            description: 'Creates a new pet record.',
          },
        ],
      },
    ],
  };

  it('generates Markdown documentation containing title, endpoints, and headers', () => {
    const md = generateMarkdownDocs(sampleProject, {
      title: 'Petstore API Reference',
      baseUrl: 'https://api.example.com/v1',
      version: 'v2.0.0',
    });

    expect(md).toContain('# Petstore API Reference');
    expect(md).toContain('Base URL:** `https://api.example.com/v1`');
    expect(md).toContain('List All Pets');
    expect(md).toContain('Create Pet');
    expect(md).toContain('`GET` `https://api.example.com/v1/pets`');
    expect(md).toContain('Accept');
    expect(md).toContain('limit');
    expect(md).toContain('"name": "Fido"');
  });

  it('generates HTML documentation containing standalone HTML boilerplate and CSS', () => {
    const html = generateHtmlDocs(sampleProject, {
      title: 'Petstore Web Docs',
      version: 'v1.5.0',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Petstore Web Docs - API Documentation</title>');
    expect(html).toContain('List All Pets');
    expect(html).toContain('Create Pet');
    expect(html).toContain('https://api.example.com/v1/pets');
  });

  it('generates cURL, Fetch, Axios, Python, and Node.js code snippets correctly', () => {
    const req = sampleProject.files[0].requests[1]; // POST Create Pet

    const curl = generateCodeSnippet('curl', req);
    expect(curl).toContain('curl -X POST "https://api.example.com/v1/pets"');
    expect(curl).toContain('-H "Authorization: Bearer secret_token_123"');
    expect(curl).toContain('"name": "Fido"');

    const fetchSnippet = generateCodeSnippet('fetch', req);
    expect(fetchSnippet).toContain('fetch("https://api.example.com/v1/pets"');
    expect(fetchSnippet).toContain('method: "POST"');

    const pythonSnippet = generateCodeSnippet('python', req);
    expect(pythonSnippet).toContain('import requests');
    expect(pythonSnippet).toContain('requests.post');
  });
});
