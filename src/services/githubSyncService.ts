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

export const getSavedGitHubToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_TOKEN_KEY) || localStorage.getItem('restpulse_github_pat');
  } catch {
    return null;
  }
};

export const getSavedGistId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_GIST_ID_KEY);
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
    return localStorage.getItem(STORAGE_AUTO_SYNC_KEY) === 'true';
  } catch {
    return false;
  }
};

export const saveGitHubSession = (token: string, user: GitHubUser, gistId?: string) => {
  try {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    if (gistId) localStorage.setItem(STORAGE_GIST_ID_KEY, gistId);
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
 * Intelligently merges local and remote sync payloads without losing data
 */
export function mergeSyncPayloads(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const mergedOrgs: Organization[] = [...(remote.organizations || [])];

  for (const localOrg of local.organizations || []) {
    const existingOrgIdx = mergedOrgs.findIndex(
      (o) => o.id === localOrg.id || o.name.trim().toLowerCase() === localOrg.name.trim().toLowerCase()
    );

    if (existingOrgIdx === -1) {
      mergedOrgs.push(localOrg);
    } else {
      const remoteOrg = mergedOrgs[existingOrgIdx];
      const mergedProjects: any[] = [...(remoteOrg.projects || [])];

      for (const localProj of localOrg.projects || []) {
        const existingProjIdx = mergedProjects.findIndex(
          (p) => p.id === localProj.id || p.name.trim().toLowerCase() === localProj.name.trim().toLowerCase()
        );

        if (existingProjIdx === -1) {
          mergedProjects.push(localProj);
        } else {
          const remoteProj = mergedProjects[existingProjIdx];

          // Merge Environments
          const mergedEnvs: Environment[] = [...(remoteProj.environments || [])];
          for (const localEnv of localProj.environments || []) {
            const envIdx = mergedEnvs.findIndex(
              (e) => e.id === localEnv.id || e.name.trim().toLowerCase() === localEnv.name.trim().toLowerCase()
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
              (f) => f.id === localFolder.id || f.name.trim().toLowerCase() === localFolder.name.trim().toLowerCase()
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
              (f) => f.id === localFile.id || f.name.trim().toLowerCase() === localFile.name.trim().toLowerCase()
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
                    (r.name.trim().toLowerCase() === localReq.name.trim().toLowerCase() &&
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
      Authorization: `token ${token}`,
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
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (checkRes.ok) {
        const gist = await checkRes.json();
        // If the Gist exists but lacks workspace file, initialize it
        if (!gist.files || !gist.files[WORKSPACE_FILE]) {
          await ensureGistInitialized(token, savedGistId);
        }
        return savedGistId;
      }
    } catch {
      // If check fails, fall back to searching user Gists
    }
  }

  // 2. Fetch user's Gists to look for existing RestPulse Gist
  const gistsRes = await fetch('https://api.github.com/gists?per_page=100', {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (gistsRes.ok) {
    const gists = await gistsRes.json();
    const existingGist = gists.find(
      (g: any) =>
        g.description === GIST_DESCRIPTION ||
        (g.files && (g.files[WORKSPACE_FILE] || g.files[HISTORY_FILE]))
    );
    if (existingGist) {
      localStorage.setItem(STORAGE_GIST_ID_KEY, existingGist.id);
      if (!existingGist.files || !existingGist.files[WORKSPACE_FILE]) {
        await ensureGistInitialized(token, existingGist.id);
      }
      return existingGist.id;
    }
  }

  // 3. Create a new private Gist if none found
  const createRes = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
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
      Authorization: `token ${token}`,
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
  customDescription?: string
): Promise<string> {
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
      Authorization: `token ${token}`,
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

/**
 * Initializes missing workspace files in an existing Gist
 */
async function ensureGistInitialized(token: string, gistId: string) {
  try {
    await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${token}`,
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
          Authorization: `token ${token}`,
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
  gistId: string
): Promise<SyncPayload> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch workspace from GitHub Gist. Check your token and permissions.');
  }

  const gist = await res.json();
  const files = gist.files || {};
  
  // Look for exact file match or any json file with workspace properties
  let workspaceFile = files[WORKSPACE_FILE];
  let historyFile = files[HISTORY_FILE];

  if (!workspaceFile) {
    // Try finding by case or any json file
    const fileKeys = Object.keys(files);
    const candidateKey = fileKeys.find(
      (k) => k.toLowerCase() === WORKSPACE_FILE.toLowerCase() || k.endsWith('.json')
    );
    if (candidateKey) {
      workspaceFile = files[candidateKey];
    }
  }

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
    organizations: workspaceData.organizations || [],
    activeOrgId: workspaceData.activeOrgId || '',
    activeProjectId: workspaceData.activeProjectId || '',
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
  const res = await fetch(`https://api.github.com/gists/${gistId}/commits`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch Gist revision history.');
  }

  const commits = await res.json();
  return commits.map((c: any) => ({
    id: c.version,
    version: c.version,
    user: {
      login: c.user?.login || 'GitHub User',
      name: c.user?.name || c.user?.login || 'GitHub User',
      avatar_url: c.user?.avatar_url || '',
      html_url: c.user?.html_url || '',
    },
    committed_at: c.committed_at,
    change_status: c.change_status,
  }));
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
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch revision ${commitSha} from GitHub.`);
  }

  const gist = await res.json();
  const files = gist.files || {};
  let workspaceFile = files[WORKSPACE_FILE];
  let historyFile = files[HISTORY_FILE];

  if (!workspaceFile) {
    const fileKeys = Object.keys(files);
    const candidateKey = fileKeys.find(
      (k) => k.toLowerCase() === WORKSPACE_FILE.toLowerCase() || k.endsWith('.json')
    );
    if (candidateKey) {
      workspaceFile = files[candidateKey];
    }
  }

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

  let organizationsData: Organization[] = [];
  if (Array.isArray(workspaceData)) {
    organizationsData = workspaceData;
  } else if (Array.isArray(workspaceData.organizations)) {
    organizationsData = workspaceData.organizations;
  } else if (workspaceData && workspaceData.id && Array.isArray(workspaceData.projects)) {
    // Single organization object
    organizationsData = [workspaceData];
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
    updatedAt: workspaceData.updatedAt || gist.updated_at || new Date().toISOString(),
    organizations: organizationsData,
    activeOrgId: workspaceData.activeOrgId || organizationsData[0]?.id || '',
    activeProjectId: workspaceData.activeProjectId || organizationsData[0]?.projects?.[0]?.id || '',
    environments: workspaceData.environments || [],
    history: historyData,
    globalVariables: workspaceData.globalVariables || {},
  };
}
