import { Organization, RequestHistoryItem, Environment } from '../types';

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
}

const GIST_DESCRIPTION = 'RestPulse API Client - Free Unlimited Workspace & History Sync';
const WORKSPACE_FILE = 'restpulse-workspace.json';
const HISTORY_FILE = 'restpulse-history.json';
const STORAGE_TOKEN_KEY = 'restpulse_github_pat';
const STORAGE_GIST_ID_KEY = 'restpulse_github_gist_id';
const STORAGE_USER_KEY = 'restpulse_github_user';
const STORAGE_AUTO_SYNC_KEY = 'restpulse_github_auto_sync';

export const getSavedGitHubToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_TOKEN_KEY);
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
 * Pushes local workspace & request history to GitHub Gist
 */
export async function pushToGitHubGist(
  token: string,
  gistId: string,
  payload: SyncPayload
): Promise<string> {
  const workspaceData = {
    version: payload.version,
    updatedAt: payload.updatedAt,
    organizations: payload.organizations,
    activeOrgId: payload.activeOrgId,
    activeProjectId: payload.activeProjectId,
    environments: payload.environments,
  };

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        [WORKSPACE_FILE]: {
          content: JSON.stringify(workspaceData, null, 2),
        },
        [HISTORY_FILE]: {
          content: JSON.stringify(payload.history.slice(0, 500), null, 2),
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
    throw new Error('Failed to fetch workspace from GitHub Gist.');
  }

  const gist = await res.json();
  const workspaceFile = gist.files?.[WORKSPACE_FILE];
  const historyFile = gist.files?.[HISTORY_FILE];

  if (!workspaceFile || !workspaceFile.content) {
    throw new Error('Workspace file not found in GitHub Gist.');
  }

  const workspaceData = JSON.parse(workspaceFile.content);
  let historyData: RequestHistoryItem[] = [];

  if (historyFile && historyFile.content) {
    try {
      historyData = JSON.parse(historyFile.content);
    } catch {
      historyData = [];
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
  const workspaceFile = gist.files?.[WORKSPACE_FILE];
  const historyFile = gist.files?.[HISTORY_FILE];

  if (!workspaceFile || !workspaceFile.content) {
    throw new Error('Workspace snapshot content missing in this commit revision.');
  }

  const workspaceData = JSON.parse(workspaceFile.content);
  let historyData: RequestHistoryItem[] = [];

  if (historyFile && historyFile.content) {
    try {
      historyData = JSON.parse(historyFile.content);
    } catch {
      historyData = [];
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
  };
}
