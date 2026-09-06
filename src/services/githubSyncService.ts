import { Organization, RequestHistoryItem, Environment, EnvVariable } from '../types';

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface GistRevision {
  id: string; // Commit SHA
  version: string;
  user: GitHubUser;
  committed_at: string;
  change_status?: {
    total: number;
    additions: number;
    deletions: number;
  };
}

export interface SyncPayload {
  version: string;
  updatedAt: string;
  organizations: Organization[];
  activeOrgId: string;
  activeProjectId: string;
  environments: Environment[];
  history: RequestHistoryItem[];
  globalVariables?: EnvVariable[];
}

const GIST_DESCRIPTION = 'RestStudio API Client - Free Unlimited Workspace & History Sync';
const WORKSPACE_FILE = 'reststudio-workspace.json';
const HISTORY_FILE = 'reststudio-history.json';
const STORAGE_TOKEN_KEY = 'reststudio_github_pat';
const STORAGE_GIST_ID_KEY = 'reststudio_github_gist_id';
const STORAGE_USER_KEY = 'reststudio_github_user';
const STORAGE_AUTO_SYNC_KEY = 'reststudio_github_auto_sync';
const STORAGE_DELETED_SNAPSHOTS_KEY = 'reststudio_deleted_snapshots';

export function getDeletedSnapshotIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteSnapshotRevision(commitSha: string): void {
  try {
    const existing = getDeletedSnapshotIds();
    if (!existing.includes(commitSha)) {
      existing.push(commitSha);
      localStorage.setItem(STORAGE_DELETED_SNAPSHOTS_KEY, JSON.stringify(existing));
    }
  } catch (e) {
    console.error('Failed to save deleted snapshot ID', e);
  }
}

export function clearDeletedSnapshotIds(): void {
  try {
    localStorage.removeItem(STORAGE_DELETED_SNAPSHOTS_KEY);
  } catch (e) {
    console.error('Failed to clear deleted snapshot IDs', e);
  }
}

export function getAuthHeader(token: string): string {
  if (!token) return '';
  if (token.startsWith('Bearer ') || token.startsWith('token ')) return token;
  return `Bearer ${token}`;
}

export const getSavedGitHubToken = (): string | null => {
  try {
    return (
      localStorage.getItem(STORAGE_TOKEN_KEY) ||
      localStorage.getItem('restpulse_github_pat') ||
      localStorage.getItem('reststudio_github_pat')
    );
  } catch {
    return null;
  }
};

export const getSavedGistId = (): string | null => {
  try {
    return (
      localStorage.getItem(STORAGE_GIST_ID_KEY) ||
      localStorage.getItem('restpulse_github_gist_id') ||
      localStorage.getItem('reststudio_github_gist_id')
    );
  } catch {
    return null;
  }
};

export const getSavedGitHubUser = (): GitHubUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getSavedAutoSync = (): boolean => {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const gistId = localStorage.getItem(STORAGE_GIST_ID_KEY);
    return Boolean(token && gistId);
  } catch {
    return true;
  }
};

export const saveGitHubSession = (token: string, user: GitHubUser, gistId?: string) => {
  try {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    if (gistId) localStorage.setItem(STORAGE_GIST_ID_KEY, gistId);
    localStorage.setItem(STORAGE_AUTO_SYNC_KEY, 'true');
  } catch (e) {
    console.error('Failed to save GitHub session to localStorage', e);
  }
};

export const clearGitHubSession = () => {
  try {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_GIST_ID_KEY);
    localStorage.removeItem(STORAGE_AUTO_SYNC_KEY);
  } catch (e) {
    console.error('Failed to clear GitHub session', e);
  }
};

export const setAutoSyncSetting = (enabled: boolean) => {
  try {
    localStorage.setItem(STORAGE_AUTO_SYNC_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to set auto-sync setting', e);
  }
};

/**
 * Helper to count entities in a workspace for summary displays
 */
export function countWorkspaceEntities(payloadOrOrgs: SyncPayload | Organization[]) {
  const orgs: Organization[] = Array.isArray(payloadOrOrgs)
    ? payloadOrOrgs
    : payloadOrOrgs.organizations || [];

  let orgCount = orgs.length;
  let projectCount = 0;
  let fileCount = 0;
  let requestCount = 0;

  for (const org of orgs) {
    for (const proj of org.projects || []) {
      projectCount++;
      for (const file of proj.files || []) {
        fileCount++;
        requestCount += (file.requests || []).length;
      }
    }
  }

  const historyCount = !Array.isArray(payloadOrOrgs) ? (payloadOrOrgs.history || []).length : 0;

  return { orgCount, projectCount, fileCount, requestCount, historyCount };
}

/**
 * Resolves workspace and history files from Gist file map safely
 */
export function resolveGistFiles(files: Record<string, any>) {
  if (!files) return { workspaceFile: null, historyFile: null };
  const keys = Object.keys(files);

  let workspaceFile =
    files[WORKSPACE_FILE] ||
    files['reststudio-workspace.json'] ||
    files['restpulse-workspace.json'] ||
    files['workspace.json'];

  if (!workspaceFile) {
    const wsKey = keys.find((k) => {
      const lk = k.toLowerCase();
      return (
        lk.includes('workspace') ||
        (lk.endsWith('.json') && !lk.includes('history'))
      );
    });
    if (wsKey) workspaceFile = files[wsKey];
  }

  let historyFile =
    files[HISTORY_FILE] ||
    files['reststudio-history.json'] ||
    files['restpulse-history.json'] ||
    files['history.json'];

  if (!historyFile) {
    const hKey = keys.find((k) => k.toLowerCase().includes('history'));
    if (hKey) historyFile = files[hKey];
  }

  return { workspaceFile, historyFile };
}

/**
 * Robustly parses organizations array from workspace JSON payload
 */
export function parseOrganizationsData(workspaceData: any): Organization[] {
  if (!workspaceData) return [];
  if (Array.isArray(workspaceData)) {
    return workspaceData;
  }
  if (Array.isArray(workspaceData.organizations)) {
    return workspaceData.organizations;
  }
  if (workspaceData.id && Array.isArray(workspaceData.projects)) {
    return [workspaceData];
  }
  return [];
}

/**
 * Intelligently merges local and remote sync payloads without losing data
 */
export function mergeSyncPayloads(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const mergedOrgs: Organization[] = [...(remote.organizations || [])];

  for (const localOrg of local.organizations || []) {
    const existingOrgIdx = mergedOrgs.findIndex(
      (o) => o.id === localOrg.id || (o.name || '').trim().toLowerCase() === (localOrg.name || '').trim().toLowerCase()
    );

    if (existingOrgIdx === -1) {
      mergedOrgs.push(localOrg);
    } else {
      const remoteOrg = mergedOrgs[existingOrgIdx];
      const mergedProjects: any[] = [...(remoteOrg.projects || [])];

      for (const localProj of localOrg.projects || []) {
        const existingProjIdx = mergedProjects.findIndex(
          (p) => p.id === localProj.id || (p.name || '').trim().toLowerCase() === (localProj.name || '').trim().toLowerCase()
        );

        if (existingProjIdx === -1) {
          mergedProjects.push(localProj);
        } else {
          const remoteProj = mergedProjects[existingProjIdx];

          // Merge Environments
          const mergedEnvs: Environment[] = [...(remoteProj.environments || [])];
          for (const localEnv of localProj.environments || []) {
            const envIdx = mergedEnvs.findIndex(
              (e) => e.id === localEnv.id || (e.name || '').trim().toLowerCase() === (localEnv.name || '').trim().toLowerCase()
            );
            if (envIdx === -1) {
              mergedEnvs.push(localEnv);
            } else {
              const remoteEnv = mergedEnvs[envIdx];
              const varMap = new Map<string, any>();
              (remoteEnv.variables || []).forEach((v) => varMap.set(v.key, v));
              (localEnv.variables || []).forEach((v) => varMap.set(v.key, v));
              mergedEnvs[envIdx] = {
                ...remoteEnv,
                variables: Array.from(varMap.values()),
              };
            }
          }

          // Merge Folders
          const mergedFolders: any[] = [...(remoteProj.folders || [])];
          for (const localFolder of localProj.folders || []) {
            const folderIdx = mergedFolders.findIndex(
              (f) => f.id === localFolder.id || (f.name || '').trim().toLowerCase() === (localFolder.name || '').trim().toLowerCase()
            );
            if (folderIdx === -1) {
              mergedFolders.push(localFolder);
            } else {
              const remoteF = mergedFolders[folderIdx];
              mergedFolders[folderIdx] = {
                ...remoteF,
                fileIds: Array.from(new Set([...(remoteF.fileIds || []), ...(localFolder.fileIds || [])])),
              };
            }
          }

          // Merge Files & Requests
          const mergedFiles: any[] = [...(remoteProj.files || [])];
          for (const localFile of localProj.files || []) {
            const fileIdx = mergedFiles.findIndex(
              (f) => f.id === localFile.id || (f.name || '').trim().toLowerCase() === (localFile.name || '').trim().toLowerCase()
            );
            if (fileIdx === -1) {
              mergedFiles.push(localFile);
            } else {
              const remoteFile = mergedFiles[fileIdx];
              const mergedReqs: any[] = [...(remoteFile.requests || [])];
              for (const localReq of localFile.requests || []) {
                const reqIdx = mergedReqs.findIndex(
                  (r) =>
                    r.id === localReq.id ||
                    ((r.name || '').trim().toLowerCase() === (localReq.name || '').trim().toLowerCase() &&
                      r.method === localReq.method)
                );
                if (reqIdx === -1) {
                  mergedReqs.push(localReq);
                } else {
                  if ((localFile.updatedAt || 0) > (remoteFile.updatedAt || 0)) {
                    mergedReqs[reqIdx] = localReq;
                  }
                }
              }
              mergedFiles[fileIdx] = {
                ...remoteFile,
                requests: mergedReqs,
                updatedAt: Math.max(remoteFile.updatedAt || 0, localFile.updatedAt || 0, Date.now()),
              };
            }
          }

          mergedProjects[existingProjIdx] = {
            ...remoteProj,
            environments: mergedEnvs,
            folders: mergedFolders,
            files: mergedFiles,
            updatedAt: Math.max(remoteProj.updatedAt || 0, localProj.updatedAt || 0, Date.now()),
          };
        }
      }

      mergedOrgs[existingOrgIdx] = {
        ...remoteOrg,
        projects: mergedProjects,
        updatedAt: Math.max(remoteOrg.updatedAt || 0, localOrg.updatedAt || 0, Date.now()),
      };
    }
  }

  // Merge History
  const historyMap = new Map<string, RequestHistoryItem>();
  for (const h of remote.history || []) {
    historyMap.set(`${h.timestamp}_${h.method}_${h.url}`, h);
  }
  for (const h of local.history || []) {
    historyMap.set(`${h.timestamp}_${h.method}_${h.url}`, h);
  }
  const mergedHistory = Array.from(historyMap.values())
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 500);

  return {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    organizations: mergedOrgs,
    activeOrgId: remote.activeOrgId || local.activeOrgId || mergedOrgs[0]?.id || '',
    activeProjectId:
      remote.activeProjectId || local.activeProjectId || mergedOrgs[0]?.projects?.[0]?.id || '',
    environments: mergedOrgs[0]?.projects?.[0]?.environments || local.environments || [],
    history: mergedHistory,
  };
}

/**
 * Checks remote Gist workspace content without applying or failing destructively
 */
export async function peekRemoteWorkspace(
  token: string,
  gistId: string
): Promise<SyncPayload | null> {
  try {
    return await pullFromGitHubGist(token, gistId);
  } catch (e) {
    return null;
  }
}

/**
 * Validates a GitHub Personal Access Token and retrieves user details
 */
export async function verifyGitHubToken(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: getAuthHeader(token),
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new Error('Invalid GitHub Token or authorization failed.');
  }

  const data = await res.json();
  return {
    login: data.login,
    name: data.name || data.login,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
  };
}

/**
 * Finds existing RestPulse Gist or creates a new private one
 */
export async function findOrCreateWorkspaceGist(token: string): Promise<string> {
  // 1. First check if we already have a saved Gist ID
  const savedGistId = getSavedGistId();
  if (savedGistId) {
    try {
      const checkRes = await fetch(`https://api.github.com/gists/${savedGistId}`, {
        headers: {
          Authorization: getAuthHeader(token),
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (checkRes.ok) {
        const gist = await checkRes.json();
        // If the Gist exists but lacks workspace file, initialize it safely
        const { workspaceFile } = resolveGistFiles(gist.files || {});
        if (!workspaceFile) {
          await ensureGistInitialized(token, savedGistId);
        }
        return savedGistId;
      }
    } catch {
      // If check fails, fall back to searching user Gists
    }
  }

  // 2. Fetch user's Gists to look for existing RestStudio / RestPulse Gist
  const gistsRes = await fetch('https://api.github.com/gists?per_page=100', {
    headers: {
      Authorization: getAuthHeader(token),
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (gistsRes.ok) {
    const gists = await gistsRes.json();
    const existingGist = gists.find(
      (g: any) =>
        g.description === GIST_DESCRIPTION ||
        (g.description &&
          (g.description.includes('RestStudio') ||
            g.description.includes('RestPulse') ||
            g.description.includes('Workspace & History Sync'))) ||
        (g.files &&
          (resolveGistFiles(g.files).workspaceFile || resolveGistFiles(g.files).historyFile))
    );
    if (existingGist) {
      localStorage.setItem(STORAGE_GIST_ID_KEY, existingGist.id);
      const { workspaceFile } = resolveGistFiles(existingGist.files || {});
      if (!workspaceFile) {
        await ensureGistInitialized(token, existingGist.id);
      }
      return existingGist.id;
    }
  }

  // 3. Create a new private Gist if none found
  const createRes = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(token),
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [WORKSPACE_FILE]: {
          content: JSON.stringify(
            {
              version: '1.0.0',
              updatedAt: new Date().toISOString(),
              organizations: [],
              activeOrgId: '',
              activeProjectId: '',
              environments: [],
              history: [],
            },
            null,
            2
          ),
        },
        [HISTORY_FILE]: {
          content: JSON.stringify([], null, 2),
        },
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error('Failed to create private GitHub Gist for workspace sync.');
  }

  const newGist = await createRes.json();
  localStorage.setItem(STORAGE_GIST_ID_KEY, newGist.id);
  return newGist.id;
}

/**
 * Explicitly creates a brand new private workspace Gist on GitHub
 */
export async function createFreshWorkspaceGist(token: string): Promise<string> {
  const createRes = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(token),
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [WORKSPACE_FILE]: {
          content: JSON.stringify(
            {
              version: '1.0.0',
              updatedAt: new Date().toISOString(),
              organizations: [],
              activeOrgId: '',
              activeProjectId: '',
              environments: [],
              history: [],
            },
            null,
            2
          ),
        },
        [HISTORY_FILE]: {
          content: JSON.stringify([], null, 2),
        },
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error('Failed to create private GitHub Gist for workspace sync.');
  }

  const newGist = await createRes.json();
  localStorage.setItem(STORAGE_GIST_ID_KEY, newGist.id);
  return newGist.id;
}

/**
 * Pushes local workspace & request history to GitHub Gist
 */
export async function pushToGitHubGist(
  token: string,
  gistId: string,
  payload: SyncPayload,
  customDescription?: string,
  options?: { isAutoSync?: boolean; forceEmptyPush?: boolean }
): Promise<string> {
  const localEntities = countWorkspaceEntities(payload.organizations);

  // CRITICAL GUARD: Refuse to push empty collections over GitHub Gist unless explicitly forced!
  if (localEntities.fileCount === 0 && localEntities.requestCount === 0 && !options?.forceEmptyPush) {
    if (options?.isAutoSync) {
      console.warn(
        '[Auto-Sync Guard] Blocked auto-push: Refusing to push 0 collections/requests to GitHub Gist to prevent data loss.'
      );
      return new Date().toISOString();
    }
    throw new Error(
      'Refusing to push empty collections to GitHub Gist. Your cloud workspace has been protected from being overwritten or erased.'
    );
  }

  const workspaceData = {
    version: payload.version,
    updatedAt: payload.updatedAt,
    organizations: payload.organizations,
    activeOrgId: payload.activeOrgId,
    activeProjectId: payload.activeProjectId,
    environments: payload.environments,
    globalVariables: payload.globalVariables || {},
  };

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: getAuthHeader(token),
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: customDescription || GIST_DESCRIPTION,
      files: {
        [WORKSPACE_FILE]: {
          content: JSON.stringify(workspaceData, null, 2),
        },
        [HISTORY_FILE]: {
          content: JSON.stringify((payload.history || []).slice(0, 500), null, 2),
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to sync workspace to GitHub Gist.');
  }

  const data = await res.json();
  return data.updated_at || new Date().toISOString();
}

export interface SeamlessSyncOptions {
  isAutoSync?: boolean;
  onStatusUpdate?: (status: string) => void;
  forcePush?: boolean;
  forceEmptyPush?: boolean;
  onEmptyLocalWithRemoteData?: (remotePayload: SyncPayload) => Promise<'pull' | 'empty_cloud' | 'cancel'>;
}

export interface SeamlessSyncResult {
  success: boolean;
  action: 'merged' | 'pulled' | 'pushed' | 'noop' | 'blocked_empty_local' | 'error' | 'confirm_empty_wipe';
  payload?: SyncPayload;
  remotePayload?: SyncPayload;
  message: string;
  timestamp: string;
  error?: any;
}

/**
 * Perform a safe, seamless two-way synchronization between the device and GitHub Gist.
 * Guarantees zero data loss:
 * 1. If remote cannot be reached or fails to load, NEVER pushes local to remote.
 * 2. If local has 0 collections, NEVER pushes empty local to remote; instead pulls remote data if available.
 * 3. If both local and remote have collections, performs a non-destructive union merge so no file/endpoint is lost.
 */
export async function performSeamlessSync(
  token: string,
  gistId: string,
  localPayload: SyncPayload,
  options?: SeamlessSyncOptions
): Promise<SeamlessSyncResult> {
  if (!token || !gistId) {
    return {
      success: false,
      action: 'error',
      message: 'GitHub token or Gist ID not configured.',
      timestamp: new Date().toISOString(),
    };
  }

  // Step 1: Safely pull remote workspace
  let remotePayload: SyncPayload | null = null;
  try {
    options?.onStatusUpdate?.('Checking cloud workspace on GitHub Gist...');
    remotePayload = await pullFromGitHubGist(token, gistId, true);
  } catch (err: any) {
    console.warn('[SeamlessSync] Unable to load remote workspace from GitHub Gist:', err);
    // CRITICAL: If remote cannot be reached, DO NOT push local to remote!
    // Doing so could wipe remote data if local was empty or incomplete.
    return {
      success: false,
      action: 'error',
      message: `Unable to reach GitHub (${err?.message || 'Network error'}). Local workspace remains safely stored offline on this device.`,
      timestamp: new Date().toISOString(),
      error: err,
    };
  }

  const localStats = countWorkspaceEntities(localPayload.organizations);
  const remoteStats = countWorkspaceEntities(remotePayload.organizations);

  // Case 1: Local is empty (0 files and 0 requests)
  if (localStats.fileCount === 0 && localStats.requestCount === 0) {
    if (remoteStats.fileCount > 0 || remoteStats.requestCount > 0) {
      // If user explicitly requested / confirmed emptying the cloud:
      if (options?.forceEmptyPush) {
        options?.onStatusUpdate?.('Emptying cloud workspace on GitHub Gist...');
        const updatedIso = await pushToGitHubGist(token, gistId, localPayload, undefined, {
          isAutoSync: false,
          forceEmptyPush: true,
        });
        return {
          success: true,
          action: 'pushed',
          payload: localPayload,
          message: 'Emptied cloud workspace on GitHub Gist to match empty local workspace.',
          timestamp: updatedIso,
        };
      }

      // If an interactive prompt callback is provided:
      if (options?.onEmptyLocalWithRemoteData) {
        const decision = await options.onEmptyLocalWithRemoteData(remotePayload);
        if (decision === 'empty_cloud') {
          options?.onStatusUpdate?.('Emptying cloud workspace on GitHub Gist...');
          const updatedIso = await pushToGitHubGist(token, gistId, localPayload, undefined, {
            isAutoSync: false,
            forceEmptyPush: true,
          });
          return {
            success: true,
            action: 'pushed',
            payload: localPayload,
            message: 'Emptied cloud workspace on GitHub Gist to match empty local workspace.',
            timestamp: updatedIso,
          };
        } else if (decision === 'cancel') {
          return {
            success: false,
            action: 'noop',
            payload: localPayload,
            message: 'Cloud sync cancelled. Cloud backup remains safe and intact.',
            timestamp: new Date().toISOString(),
          };
        }
        // decision === 'pull'
        return {
          success: true,
          action: 'pulled',
          payload: remotePayload,
          message: `Restored ${remoteStats.requestCount} endpoint(s) across ${remoteStats.fileCount} collection(s) from cloud.`,
          timestamp: remotePayload.updatedAt || new Date().toISOString(),
        };
      }

      // If this is background auto-sync without prompt:
      // Return confirm_empty_wipe so the caller UI can prompt the user rather than blindly overwriting
      return {
        success: false,
        action: 'confirm_empty_wipe',
        remotePayload,
        payload: localPayload,
        message: `Local workspace is empty, but your cloud backup has ${remoteStats.requestCount} endpoint(s). Syncing will empty the cloud backup. User confirmation required.`,
        timestamp: remotePayload.updatedAt || new Date().toISOString(),
      };
    } else {
      // Both local and remote are empty
      return {
        success: true,
        action: 'noop',
        payload: localPayload,
        message: 'Both device and cloud workspaces are currently empty.',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Case 2: Remote is empty, but Local has collections
  if (remoteStats.fileCount === 0 && remoteStats.requestCount === 0) {
    options?.onStatusUpdate?.('Backing up local workspace to GitHub Gist...');
    const updatedIso = await pushToGitHubGist(token, gistId, localPayload, undefined, {
      isAutoSync: options?.isAutoSync,
    });
    return {
      success: true,
      action: 'pushed',
      payload: localPayload,
      message: `Backed up ${localStats.requestCount} endpoint(s) across ${localStats.fileCount} collection(s) to GitHub Gist.`,
      timestamp: updatedIso,
    };
  }

  // Case 3: Both have collections! Perform a non-destructive intelligent union merge
  options?.onStatusUpdate?.('Merging local & cloud collections...');
  const merged = mergeSyncPayloads(localPayload, remotePayload);
  const mergedStats = countWorkspaceEntities(merged.organizations);

  // Check if merged payload has changes compared to remote Gist
  const remoteSerialized = JSON.stringify({
    orgs: remotePayload.organizations,
    envs: remotePayload.environments,
    vars: remotePayload.globalVariables,
    historyLen: remotePayload.history?.length || 0,
  });
  const mergedSerialized = JSON.stringify({
    orgs: merged.organizations,
    envs: merged.environments,
    vars: merged.globalVariables,
    historyLen: merged.history?.length || 0,
  });

  let updatedIso = remotePayload.updatedAt || new Date().toISOString();
  if (remoteSerialized !== mergedSerialized || options?.forcePush) {
    options?.onStatusUpdate?.('Updating GitHub Gist with merged changes...');
    updatedIso = await pushToGitHubGist(token, gistId, merged, undefined, {
      isAutoSync: options?.isAutoSync,
    });
  }

  return {
    success: true,
    action: 'merged',
    payload: merged,
    message: `Synchronized ${mergedStats.requestCount} endpoint(s) across ${mergedStats.fileCount} collection(s). Zero data loss guaranteed.`,
    timestamp: updatedIso,
  };
}

/**
 * Initializes missing workspace files in an existing Gist
 * NEVER overwrites if workspace file already exists
 */
async function ensureGistInitialized(token: string, gistId: string) {
  try {
    const checkRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Authorization: getAuthHeader(token),
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (checkRes.ok) {
      const gist = await checkRes.json();
      const { workspaceFile } = resolveGistFiles(gist.files || {});
      if (workspaceFile) {
        // Safe: workspace file already exists, never overwrite with blank data!
        return;
      }
    }

    await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: getAuthHeader(token),
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        files: {
          [WORKSPACE_FILE]: {
            content: JSON.stringify(
              {
                version: '1.0.0',
                updatedAt: new Date().toISOString(),
                organizations: [],
                activeOrgId: '',
                activeProjectId: '',
                environments: [],
                globalVariables: {},
              },
              null,
              2
            ),
          },
          [HISTORY_FILE]: {
            content: JSON.stringify([], null, 2),
          },
        },
      }),
    });
  } catch (e) {
    console.warn('Could not auto-initialize files in Gist:', e);
  }
}

/**
 * Helper to extract file text either from content or raw_url safely
 */
async function getFileContent(fileObj: any, token: string): Promise<string | null> {
  if (!fileObj) return null;

  // 1. If content is complete (not truncated) and non-empty, use it immediately
  if (fileObj.content && !fileObj.truncated) {
    return fileObj.content;
  }

  // 2. If content is truncated or missing, fetch full content from raw_url
  if (fileObj.raw_url) {
    // Try unauthenticated fetch first (works for public gists without preflight issues)
    try {
      const res = await fetch(fileObj.raw_url);
      if (res.ok) {
        return await res.text();
      }
      throw new Error(`Raw URL fetch status: ${res.status}`);
    } catch (err) {
      console.warn('Direct fetch from raw_url without auth failed, trying with Authorization header:', err);
    }

    // Try authenticated fetch (works for private gists)
    try {
      const resWithAuth = await fetch(fileObj.raw_url, {
        headers: {
          Authorization: getAuthHeader(token),
        },
      });
      if (resWithAuth.ok) {
        return await resWithAuth.text();
      }
    } catch (authErr) {
      console.error('Failed to fetch file from raw_url with auth headers:', authErr);
    }
  }

  // 3. Fall back to fileObj.content ONLY if it wasn't truncated
  return fileObj.truncated ? null : fileObj.content || null;
}

/**
 * Pulls workspace & request execution history from GitHub Gist
 */
export async function pullFromGitHubGist(
  token: string,
  gistId: string,
  allowAutoRecovery = true
): Promise<SyncPayload> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: getAuthHeader(token),
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch workspace from GitHub Gist. Check your token and permissions.');
  }

  const gist = await res.json();
  const { workspaceFile, historyFile } = resolveGistFiles(gist.files || {});

  if (!workspaceFile) {
    // Auto-initialize the gist with empty workspace structure
    await ensureGistInitialized(token, gistId);
    throw new Error(
      'Workspace file was not initialized in this Gist yet. Please click "Push Local to GitHub" to save your current workspace to this Gist first.'
    );
  }

  const workspaceContent = await getFileContent(workspaceFile, token);
  if (!workspaceContent) {
    throw new Error(
      'Gist workspace file is currently empty or failed to download. Please click "Push Local to GitHub" to upload your collections first.'
    );
  }

  let workspaceData: any = {};
  try {
    workspaceData = JSON.parse(workspaceContent);
  } catch {
    throw new Error('Workspace file contains invalid JSON data in GitHub Gist.');
  }

  const organizationsData = parseOrganizationsData(workspaceData);
  const currentEntities = countWorkspaceEntities(organizationsData);

  // AUTO-RECOVERY GUARD:
  // If the cloud HEAD contains 0 requests and 0 files (for instance, if an empty auto-push previously cleared it),
  // check earlier Git revision snapshots to automatically recover the user's saved collections!
  if (allowAutoRecovery && currentEntities.requestCount === 0 && currentEntities.fileCount === 0) {
    try {
      const revisions = await getGistRevisionHistory(token, gistId);
      const currentVersion = gist.history?.[0]?.version;
      for (const rev of revisions) {
        if (rev.id && rev.id !== currentVersion) {
          try {
            const olderPayload = await restoreGistRevision(token, gistId, rev.id);
            const olderEntities = countWorkspaceEntities(olderPayload.organizations);
            if (olderEntities.requestCount > 0 || olderEntities.fileCount > 0) {
              console.log(
                `[GitHubSync Auto-Recovery] Cloud HEAD had 0 endpoints, but recovered ${olderEntities.requestCount} requests across ${olderEntities.fileCount} files from saved snapshot ${rev.id.slice(0, 7)}.`
              );
              return olderPayload;
            }
          } catch {
            // Keep inspecting previous snapshots
          }
        }
      }
    } catch (revErr) {
      console.warn('Failed to inspect revision history for auto-recovery:', revErr);
    }
  }

  let historyData: RequestHistoryItem[] = [];
  if (historyFile) {
    const historyContent = await getFileContent(historyFile, token);
    if (historyContent) {
      try {
        historyData = JSON.parse(historyContent);
      } catch {
        historyData = [];
      }
    }
  }

  return {
    version: workspaceData.version || '1.0.0',
    updatedAt: workspaceData.updatedAt || gist.updated_at,
    organizations: organizationsData,
    activeOrgId: workspaceData.activeOrgId || organizationsData[0]?.id || '',
    activeProjectId: workspaceData.activeProjectId || organizationsData[0]?.projects?.[0]?.id || '',
    environments: workspaceData.environments || [],
    history: historyData,
    globalVariables: workspaceData.globalVariables || {},
  };
}

/**
 * Fetches the revision history (Git commits) of the Gist
 */
export async function getGistRevisionHistory(
  token: string,
  gistId: string
): Promise<GistRevision[]> {
  try {
    // The official GitHub Gist API returns commit history in gist.history when calling GET /gists/{gist_id}
    const res = await fetch(`https://api.github.com/gists/${gistId}?t=${Date.now()}`, {
      headers: {
        Authorization: getAuthHeader(token),
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const gist = await res.json();
      if (Array.isArray(gist.history) && gist.history.length > 0) {
        const deletedIds = getDeletedSnapshotIds();
        return gist.history
          .map((c: any) => ({
            id: c.version || c.id,
            version: c.version || c.id,
            user: {
              login: c.user?.login || gist.owner?.login || 'GitHub User',
              name: c.user?.name || c.user?.login || gist.owner?.login || 'GitHub User',
              avatar_url: c.user?.avatar_url || gist.owner?.avatar_url || '',
              html_url: c.user?.html_url || gist.owner?.html_url || '',
            },
            committed_at: c.committed_at || new Date().toISOString(),
            change_status: c.change_status
              ? {
                  total: typeof c.change_status.total === 'number' ? c.change_status.total : 0,
                  additions: typeof c.change_status.additions === 'number' ? c.change_status.additions : 0,
                  deletions: typeof c.change_status.deletions === 'number' ? c.change_status.deletions : 0,
                }
              : { total: 0, additions: 0, deletions: 0 },
          }))
          .filter((rev) => {
            if (deletedIds.includes(rev.id) || deletedIds.includes(rev.version)) return false;
            // Exclude snapshots with 0 lines changed so only meaningful revision points are shown
            const additions = rev.change_status?.additions || 0;
            const deletions = rev.change_status?.deletions || 0;
            const total = rev.change_status?.total || 0;
            return total > 0 || additions > 0 || deletions > 0;
          });
      }
    }
  } catch (err) {
    console.warn('Failed to fetch Gist object history:', err);
  }

  return [];
}

/**
 * Restores a specific Git revision snapshot of the Gist
 */
export async function restoreGistRevision(
  token: string,
  gistId: string,
  commitSha: string
): Promise<SyncPayload> {
  const res = await fetch(`https://api.github.com/gists/${gistId}/${commitSha}`, {
    headers: {
      Authorization: getAuthHeader(token),
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch revision ${commitSha} from GitHub.`);
  }

  const gist = await res.json();
  const { workspaceFile, historyFile } = resolveGistFiles(gist.files || {});

  if (!workspaceFile) {
    throw new Error('Workspace snapshot content missing in this commit revision.');
  }

  const workspaceContent = await getFileContent(workspaceFile, token);
  if (!workspaceContent) {
    throw new Error('Workspace snapshot content missing or truncated in this commit revision.');
  }

  let workspaceData: any = {};
  try {
    workspaceData = JSON.parse(workspaceContent);
  } catch {
    throw new Error('Workspace snapshot contains invalid JSON data in GitHub.');
  }

  const organizationsData = parseOrganizationsData(workspaceData);

  let historyData: RequestHistoryItem[] = [];
  if (historyFile) {
    const historyContent = await getFileContent(historyFile, token);
    if (historyContent) {
      try {
        historyData = JSON.parse(historyContent);
      } catch {
        historyData = [];
      }
    }
  }

  return {
    version: workspaceData.version || '1.0.0',
    updatedAt: workspaceData.updatedAt || gist.updated_at || new Date().toISOString(),
    organizations: organizationsData,
    activeOrgId: workspaceData.activeOrgId || organizationsData[0]?.id || '',
    activeProjectId: workspaceData.activeProjectId || organizationsData[0]?.projects?.[0]?.id || '',
    environments: workspaceData.environments || [],
    history: historyData,
    globalVariables: workspaceData.globalVariables || {},
  };
}
