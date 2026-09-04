import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAuthHeader,
  countWorkspaceEntities,
  mergeSyncPayloads,
  getDeletedSnapshotIds,
  deleteSnapshotRevision,
  clearDeletedSnapshotIds,
  SyncPayload,
} from '../services/githubSyncService';
import { Organization } from '../types';

describe('GitHub Sync Service Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getAuthHeader', () => {
    it('should format token with Bearer prefix if missing', () => {
      expect(getAuthHeader('ghp_test12345')).toBe('Bearer ghp_test12345');
      expect(getAuthHeader('Bearer ghp_test12345')).toBe('Bearer ghp_test12345');
      expect(getAuthHeader('token ghp_test12345')).toBe('token ghp_test12345');
      expect(getAuthHeader('')).toBe('');
    });
  });

  describe('countWorkspaceEntities', () => {
    it('should count total orgs, projects, files, and requests accurately', () => {
      const mockOrgs: Organization[] = [
        {
          id: 'org1',
          name: 'My Org',
          updatedAt: Date.now(),
          variables: [],
          projects: [
            {
              id: 'proj1',
              name: 'Project 1',
              description: 'Project description',
              createdAt: Date.now(),
              activeEnvId: null,
              folders: [],
              files: [
                {
                  id: 'f1',
                  name: 'api.rest',
                  rawContent: '',
                  requests: [
                    { id: 'r1', name: 'Req 1', method: 'GET', url: '/1', headers: [], queryParams: [], body: { mode: 'none', rawText: '' }, auth: { type: 'none', bearerToken: '' } },
                    { id: 'r2', name: 'Req 2', method: 'POST', url: '/2', headers: [], queryParams: [], body: { mode: 'none', rawText: '' }, auth: { type: 'none', bearerToken: '' } },
                  ],
                  updatedAt: Date.now(),
                },
              ],
              environments: [],
              updatedAt: Date.now(),
            },
          ],
          createdAt: Date.now(),
        },
      ];

      const counts = countWorkspaceEntities(mockOrgs);
      expect(counts.orgCount).toBe(1);
      expect(counts.projectCount).toBe(1);
      expect(counts.fileCount).toBe(1);
      expect(counts.requestCount).toBe(2);
    });
  });

  describe('mergeSyncPayloads', () => {
    it('should cleanly merge local and remote payloads without losing files or requests', () => {
      const local: SyncPayload = {
        version: '1.0.0',
        updatedAt: '2026-03-01T10:00:00Z',
        organizations: [
          {
            id: 'org1',
            name: 'Main Org',
            updatedAt: 1000,
            variables: [],
            projects: [
              {
                id: 'proj1',
                name: 'Core API',
                description: '',
                createdAt: 1000,
                activeEnvId: null,
                folders: [],
                files: [
                  {
                    id: 'file1',
                    name: 'local_file.rest',
                    rawContent: '',
                    requests: [
                      { id: 'r1', name: 'Local Request', method: 'GET', url: '/local', headers: [], queryParams: [], body: { mode: 'none', rawText: '' }, auth: { type: 'none', bearerToken: '' } },
                    ],
                    updatedAt: 1000,
                  },
                ],
                environments: [],
                updatedAt: 1000,
              },
            ],
            createdAt: 1000,
          },
        ],
        activeOrgId: 'org1',
        activeProjectId: 'proj1',
        environments: [],
        history: [],
      };

      const remote: SyncPayload = {
        version: '1.0.0',
        updatedAt: '2026-03-01T11:00:00Z',
        organizations: [
          {
            id: 'org1',
            name: 'Main Org',
            updatedAt: 1000,
            variables: [],
            projects: [
              {
                id: 'proj1',
                name: 'Core API',
                description: '',
                createdAt: 1000,
                activeEnvId: null,
                folders: [],
                files: [
                  {
                    id: 'file2',
                    name: 'remote_file.rest',
                    rawContent: '',
                    requests: [
                      { id: 'r2', name: 'Remote Request', method: 'POST', url: '/remote', headers: [], queryParams: [], body: { mode: 'none', rawText: '' }, auth: { type: 'none', bearerToken: '' } },
                    ],
                    updatedAt: 2000,
                  },
                ],
                environments: [],
                updatedAt: 2000,
              },
            ],
            createdAt: 1000,
          },
        ],
        activeOrgId: 'org1',
        activeProjectId: 'proj1',
        environments: [],
        history: [],
      };

      const merged = mergeSyncPayloads(local, remote);
      const projFiles = merged.organizations[0].projects[0].files;

      expect(projFiles.length).toBe(2);
      expect(projFiles.some((f) => f.name === 'local_file.rest')).toBe(true);
      expect(projFiles.some((f) => f.name === 'remote_file.rest')).toBe(true);
    });
  });

  describe('Snapshot Deletion Tracking API', () => {
    it('should save and clear deleted snapshot commit IDs', () => {
      deleteSnapshotRevision('sha_123456');
      deleteSnapshotRevision('sha_789012');

      expect(getDeletedSnapshotIds()).toEqual(['sha_123456', 'sha_789012']);

      clearDeletedSnapshotIds();
      expect(getDeletedSnapshotIds()).toEqual([]);
    });
  });
});
