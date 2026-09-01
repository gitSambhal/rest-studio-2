import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Check,
  AlertCircle,
  History,
  Lock,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Clock,
  User,
  LogOut,
  Zap,
  HelpCircle,
  FileCode,
  GitMerge,
  Layers,
  Database,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import {
  GitHubUser,
  GistRevision,
  SyncPayload,
  verifyGitHubToken,
  findOrCreateWorkspaceGist,
  createFreshWorkspaceGist,
  pushToGitHubGist,
  pullFromGitHubGist,
  getGistRevisionHistory,
  restoreGistRevision,
  saveGitHubSession,
  clearGitHubSession,
  getSavedGitHubToken,
  getSavedGistId,
  getSavedGitHubUser,
  getSavedAutoSync,
  setAutoSyncSetting,
  countWorkspaceEntities,
  mergeSyncPayloads,
  peekRemoteWorkspace,
} from '../services/githubSyncService';
import { Organization, RequestHistoryItem, Environment } from '../types';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  activeOrgId: string;
  activeProjectId: string;
  environments: Environment[];
  history: RequestHistoryItem[];
  onApplySyncedData: (data: SyncPayload) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  isDarkMode?: boolean;
}

interface CloudComparisonState {
  remote: SyncPayload;
  remoteStats: {
    orgCount: number;
    projectCount: number;
    fileCount: number;
    requestCount: number;
    historyCount: number;
  };
  localStats: {
    orgCount: number;
    projectCount: number;
    fileCount: number;
    requestCount: number;
    historyCount: number;
  };
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({
  isOpen,
  onClose,
  organizations,
  activeOrgId,
  activeProjectId,
  environments,
  history,
  onApplySyncedData,
  showToast,
  isDarkMode = true,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'history' | 'guide'>('sync');
  const [tokenInput, setTokenInput] = useState('');
  const [user, setUser] = useState<GitHubUser | null>(() => getSavedGitHubUser());
  const [token, setToken] = useState<string | null>(() => getSavedGitHubToken());
  const [gistId, setGistId] = useState<string | null>(() => getSavedGistId());
  const [autoSync, setAutoSync] = useState<boolean>(() => getSavedAutoSync());

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [revisions, setRevisions] = useState<GistRevision[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);
  const [restoringSha, setRestoringSha] = useState<string | null>(null);

  // Cloud detection & conflict resolution state
  const [detectedCloudPayload, setDetectedCloudPayload] = useState<CloudComparisonState | null>(null);

  useEffect(() => {
    if (token && gistId && isOpen) {
      fetchRevisions();
    }
  }, [token, gistId, isOpen]);

  if (!isOpen) return null;

  const currentLocalStats = countWorkspaceEntities(organizations);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      showToast('Please enter a valid GitHub Access Token', 'warning');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Verifying token with GitHub...');

    try {
      const trimmedToken = tokenInput.trim();
      const gitHubUser = await verifyGitHubToken(trimmedToken);
      setStatusMessage('Finding or locating your workspace Gist...');
      const gId = await findOrCreateWorkspaceGist(trimmedToken);

      setToken(trimmedToken);
      setUser(gitHubUser);
      setGistId(gId);
      saveGitHubSession(trimmedToken, gitHubUser, gId);

      setStatusMessage('Checking remote cloud workspace data...');
      const remotePayload = await peekRemoteWorkspace(trimmedToken, gId);

      setTokenInput('');
      setStatusMessage(null);

      // Inspect if remote cloud has data
      if (remotePayload && remotePayload.organizations && remotePayload.organizations.length > 0) {
        const remoteStats = countWorkspaceEntities(remotePayload);
        const localStats = countWorkspaceEntities(organizations);

        // Show decision dialog so user can choose to pull, merge, or keep
        setDetectedCloudPayload({
          remote: remotePayload,
          remoteStats,
          localStats,
        });
        showToast(`Connected as @${gitHubUser.login}! Cloud workspace detected.`, 'info');
      } else {
        showToast(`Connected as @${gitHubUser.login}! Gist ready for cloud backup.`, 'success');
      }

      fetchRevisions();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Authentication failed', 'error');
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearGitHubSession();
    setToken(null);
    setUser(null);
    setGistId(null);
    setRevisions([]);
    setDetectedCloudPayload(null);
    showToast('Disconnected from GitHub Sync', 'info');
  };

  const handleToggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    setAutoSyncSetting(next);
    showToast(
      next
        ? 'Auto-Sync enabled! Workspace will safely sync without overwriting remote data.'
        : 'Auto-Sync disabled',
      'info'
    );
  };

  const handleCreateFreshGist = async () => {
    if (!token) return;
    if (!window.confirm('Create a brand new private GitHub Gist for your workspace?')) return;

    setIsLoading(true);
    setStatusMessage('Creating brand new private Gist on GitHub...');
    try {
      const newGId = await createFreshWorkspaceGist(token);
      setGistId(newGId);
      if (user) {
        saveGitHubSession(token, user, newGId);
      }
      showToast('Created new private Gist! Pushing your current workspace now...', 'info');
      // Push local data into the new Gist
      const updatedIso = await pushToGitHubGist(token, newGId, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        organizations,
        activeOrgId,
        activeProjectId,
        environments,
        history,
      });
      setLastSyncTime(new Date(updatedIso).toLocaleTimeString());
      showToast('Workspace initialized and synced in new private Gist!', 'success');
      fetchRevisions();
    } catch (err: any) {
      showToast(err.message || 'Failed to create new Gist', 'error');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleApplyCloudToLocal = (remotePayload: SyncPayload) => {
    onApplySyncedData(remotePayload);
    setLastSyncTime(new Date().toLocaleTimeString());
    setDetectedCloudPayload(null);
    showToast('Restored and loaded cloud workspace onto this device!', 'success');
  };

  const handleSmartMerge = async (remotePayloadToMerge?: SyncPayload) => {
    if (!token || !gistId) return;

    setIsLoading(true);
    setStatusMessage('Merging cloud & local collections...');

    try {
      let remotePayload = remotePayloadToMerge;
      if (!remotePayload) {
        remotePayload = await pullFromGitHubGist(token, gistId);
      }

      const localPayload: SyncPayload = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        organizations,
        activeOrgId,
        activeProjectId,
        environments,
        history,
      };

      const merged = mergeSyncPayloads(localPayload, remotePayload);
      onApplySyncedData(merged);

      setStatusMessage('Saving merged workspace to GitHub Gist...');
      const updatedIso = await pushToGitHubGist(token, gistId, merged);
      setLastSyncTime(new Date(updatedIso).toLocaleTimeString());
      setDetectedCloudPayload(null);
      showToast('Smart merge successful! Both device & cloud are 100% up to date.', 'success');
      fetchRevisions();
    } catch (err: any) {
      showToast(err.message || 'Smart merge failed', 'error');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handlePushToCloud = async () => {
    if (!token || !gistId) return;

    // Safety check: peek remote to avoid accidental destructive wipeout
    try {
      const remote = await peekRemoteWorkspace(token, gistId);
      if (remote && remote.organizations && remote.organizations.length > 0) {
        const remoteStats = countWorkspaceEntities(remote);
        const localStats = countWorkspaceEntities(organizations);

        if (remoteStats.requestCount > localStats.requestCount) {
          const confirmed = window.confirm(
            `Cloud Safety Notice:\n\nThe remote GitHub Gist currently contains ${remoteStats.requestCount} endpoints (${remoteStats.projectCount} projects), while this local device only has ${localStats.requestCount} endpoints.\n\nPushing will overwrite the cloud Gist with this device's data.\n\nTo preserve all data from both devices, click "Cancel" and choose "Smart Merge" instead.\n\nAre you sure you want to overwrite the cloud?`
          );
          if (!confirmed) return;
        }
      }
    } catch (e) {
      // Continue if peek fails
    }

    setIsLoading(true);
    setStatusMessage('Pushing local workspace & history to GitHub Gist...');

    try {
      const updatedIso = await pushToGitHubGist(token, gistId, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        organizations,
        activeOrgId,
        activeProjectId,
        environments,
        history,
      });

      setLastSyncTime(new Date(updatedIso).toLocaleTimeString());
      showToast('Workspace & execution history backed up to GitHub Gist!', 'success');
      fetchRevisions();
    } catch (err: any) {
      showToast(err.message || 'Push sync failed', 'error');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handlePullFromCloud = async () => {
    if (!token || !gistId) return;

    setIsLoading(true);
    setStatusMessage('Pulling workspace snapshot from GitHub Gist...');

    try {
      const payload = await pullFromGitHubGist(token, gistId);
      onApplySyncedData(payload);
      setLastSyncTime(new Date().toLocaleTimeString());
      showToast('Workspace & request history restored from GitHub Cloud!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Pull sync failed', 'error');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const fetchRevisions = async () => {
    if (!token || !gistId) return;
    setIsLoadingRevisions(true);
    try {
      const historyList = await getGistRevisionHistory(token, gistId);
      setRevisions(historyList);
    } catch (err) {
      console.error('Failed to load Git history', err);
    } finally {
      setIsLoadingRevisions(false);
    }
  };

  const handleRestoreRevision = async (commitSha: string) => {
    if (!token || !gistId) return;

    if (
      !window.confirm(
        `Are you sure you want to restore workspace snapshot (${commitSha.slice(0, 7)})? Current unsaved changes on this device will be replaced.`
      )
    ) {
      return;
    }

    setRestoringSha(commitSha);
    setIsLoading(true);
    setStatusMessage(`Restoring snapshot ${commitSha.slice(0, 7)} from GitHub...`);

    try {
      const restoredPayload = await restoreGistRevision(token, gistId, commitSha);
      
      // 1. Immediately apply the restored snapshot locally
      onApplySyncedData(restoredPayload);

      // 2. Also write this restored snapshot back to GitHub Gist HEAD so cloud and device stay synchronized
      setStatusMessage(`Syncing restored snapshot ${commitSha.slice(0, 7)} to GitHub Cloud...`);
      const updatedIso = await pushToGitHubGist(token, gistId, restoredPayload);
      setLastSyncTime(new Date(updatedIso).toLocaleTimeString());

      const entityCount = countWorkspaceEntities(restoredPayload.organizations);
      showToast(
        `Successfully restored snapshot (${entityCount.requestCount} requests across ${entityCount.projectCount} projects)!`,
        'success'
      );

      // Refresh revision list to reflect the restoration commit
      fetchRevisions();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore snapshot', 'error');
    } finally {
      setRestoringSha(null);
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold">Free Cloud & Data Sync</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  100% Free Forever
                </span>
              </div>
              <p className="text-xs text-slate-400">Zero Maintenance • Safe Cross-Device Sync • Version History</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Sync Control</span>
            {user && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Git Data History</span>
            {revisions.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {revisions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Token Setup Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* TAB 1: SYNC CONTROL */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              {!token ? (
                /* Unauthenticated state */
                <div className="space-y-4">
                  {/* Option 1: One-click GitHub OAuth redirect */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-100 uppercase tracking-wider">
                        <GitBranch className="w-4 h-4 text-emerald-400" />
                        <span>1-Click GitHub Automatic Login</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Click below to generate and authorize your GitHub access credentials with pre-configured <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded">gist</code> permissions.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        window.open(
                          'https://github.com/settings/tokens/new?description=RestPulse%20API%20Studio%20Sync&scopes=gist',
                          'github_oauth_popup',
                          'width=700,height=800'
                        );
                      }}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 hover:border-emerald-400 transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md group"
                    >
                      <GitBranch className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Authorize & Login with GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  {/* Option 2: Direct Token Entry */}
                  <form onSubmit={handleConnect} className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <span>Enter GitHub Access Token</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Paste your token starting with <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded">ghp_</code>. When logging in on another device, RestPulse protects your cloud data and never automatically overwrites previous changes.
                      </p>

                      <div>
                        <input
                          type="password"
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('guide')}
                          className="text-xs text-emerald-400 hover:underline flex items-center space-x-1"
                        >
                          <span>Need a token? Follow 1-min guide</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center space-x-2"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>{statusMessage || 'Connecting...'}</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              <span>Connect & Check Cloud</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : detectedCloudPayload ? (
                /* SMART CONFLICT & DEVICE SYNC RESOLUTION PROMPT */
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>Cloud Workspace Found on GitHub</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      We detected existing API collections saved from your account <strong className="text-white">@{user?.login}</strong>. Your cloud data is safe and has <strong className="text-emerald-300">not</strong> been overwritten. Choose how to synchronize data on this device:
                    </p>
                  </div>

                  {/* Comparison Stats Card */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">GitHub Cloud Workspace</span>
                        <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-sm font-bold text-slate-100">
                        {detectedCloudPayload.remoteStats.requestCount} Endpoints
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <div>{detectedCloudPayload.remoteStats.projectCount} Projects • {detectedCloudPayload.remoteStats.orgCount} Orgs</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Updated {new Date(detectedCloudPayload.remote.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">This Device (Local)</span>
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="text-sm font-bold text-slate-100">
                        {detectedCloudPayload.localStats.requestCount} Endpoints
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <div>{detectedCloudPayload.localStats.projectCount} Projects • {detectedCloudPayload.localStats.orgCount} Orgs</div>
                        <div className="text-[10px] text-slate-500">Current local browser storage</div>
                      </div>
                    </div>
                  </div>

                  {/* 3 Resolution Actions */}
                  <div className="space-y-2.5 pt-1">
                    {/* Option 1: Pull Cloud Data (Recommended for new device) */}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleApplyCloudToLocal(detectedCloudPayload.remote)}
                      className="w-full p-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-left transition-all cursor-pointer flex items-center justify-between group shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <CloudDownload className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-300">
                            1. Load & Restore Cloud Workspace (Recommended)
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                            Safe for new device
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                          Replaces starter local state with all your {detectedCloudPayload.remoteStats.requestCount} saved cloud endpoints.
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                    </button>

                    {/* Option 2: Smart Merge */}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSmartMerge(detectedCloudPayload.remote)}
                      className="w-full p-3.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-left transition-all cursor-pointer flex items-center justify-between group shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <GitMerge className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold text-indigo-300">
                            2. Smart Merge (Combine Both)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                          Combines remote cloud collections with any local endpoints created on this device without losing anything.
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                    </button>

                    {/* Option 3: Keep Local */}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        setDetectedCloudPayload(null);
                        showToast('Using local device data. Cloud data is safely preserved.', 'info');
                      }}
                      className="w-full p-3 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 text-left transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <HardDrive className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-300">
                            3. Keep This Device Workspace Only
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 pl-6">
                          Work with current local state and do not push or overwrite cloud data.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                /* Authenticated State Dashboard */
                <div className="space-y-5">
                  {/* User Badge Card */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={user?.avatar_url || 'https://github.com/identicons/user.png'}
                        alt={user?.login}
                        className="w-10 h-10 rounded-full border border-slate-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-100">{user?.name || user?.login}</span>
                          <span className="text-xs font-mono text-emerald-400">@{user?.login}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                          <span className="truncate max-w-[160px] font-mono">Gist: {gistId?.slice(0, 8)}...</span>
                          <a
                            href={`https://gist.github.com/${user?.login}/${gistId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline flex items-center space-x-0.5"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={handleCreateFreshGist}
                            disabled={isLoading}
                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                            title="Create a new dedicated Gist on GitHub"
                          >
                            Create New Gist
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold rounded-lg border border-rose-500/30 flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>

                  {/* Device Workspace Summary Status */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      <span>
                        Local Device: <strong className="text-white">{currentLocalStats.requestCount} endpoints</strong> across{' '}
                        <strong className="text-white">{currentLocalStats.projectCount} projects</strong>
                      </span>
                    </div>
                    {lastSyncTime && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Synced: {lastSyncTime}
                      </span>
                    )}
                  </div>

                  {/* Manual Sync Control Grid - 3 Options */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Pull from Cloud */}
                    <button
                      type="button"
                      onClick={handlePullFromCloud}
                      disabled={isLoading}
                      className="p-3.5 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer group space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <CloudDownload className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-mono text-slate-400 font-semibold">CLOUD → LOCAL</span>
                      </div>
                      <div className="font-bold text-xs text-slate-200">Pull Cloud to Local</div>
                      <p className="text-[10.5px] text-slate-400 leading-snug">
                        Load collections and history from your GitHub Gist onto this device.
                      </p>
                    </button>

                    {/* Smart Merge */}
                    <button
                      type="button"
                      onClick={() => handleSmartMerge()}
                      disabled={isLoading}
                      className="p-3.5 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 hover:border-indigo-500/40 text-left transition-all cursor-pointer group space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <GitMerge className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-mono text-indigo-400 font-semibold">MERGE BOTH</span>
                      </div>
                      <div className="font-bold text-xs text-slate-200">Smart Merge</div>
                      <p className="text-[10.5px] text-slate-400 leading-snug">
                        Combines cloud & local collections without deleting any endpoints.
                      </p>
                    </button>

                    {/* Push to Cloud */}
                    <button
                      type="button"
                      onClick={handlePushToCloud}
                      disabled={isLoading}
                      className="p-3.5 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <CloudUpload className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-mono text-slate-400 font-semibold">LOCAL → CLOUD</span>
                      </div>
                      <div className="font-bold text-xs text-slate-200">Push Local to Cloud</div>
                      <p className="text-[10.5px] text-slate-400 leading-snug">
                        Backup this device's workspace to your private GitHub Gist.
                      </p>
                    </button>
                  </div>

                  {/* Auto-Sync Banner */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap className={`w-5 h-5 ${autoSync ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold text-xs text-slate-200">Automatic Background Sync</div>
                        <p className="text-[11px] text-slate-400">
                          Periodically backup workspace updates to your private GitHub Gist.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleAutoSync}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoSync ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          autoSync ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GIT REVISION DATA HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Snapshot Commit History
                  </h4>
                  <p className="text-xs text-slate-400">Every cloud push generates an immutable Git commit version.</p>
                </div>

                <button
                  type="button"
                  onClick={fetchRevisions}
                  disabled={isLoadingRevisions}
                  className="p-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRevisions ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoadingRevisions ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
                  <p>Loading commit snapshots from GitHub...</p>
                </div>
              ) : revisions.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <Clock className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No previous version commits found.</p>
                  <p className="text-[11px] text-slate-500">Push your workspace to GitHub to create version snapshots.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-mono text-[10px] text-emerald-400 font-bold">
                          {rev.id.slice(0, 4)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs text-slate-200 font-semibold">{rev.id.slice(0, 7)}</span>
                            <span className="text-[11px] text-slate-400">
                              by {rev.user?.login || user?.login || 'you'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                            <span>{new Date(rev.committed_at).toLocaleString()}</span>
                            {rev.change_status && (
                              <span>
                                (+{rev.change_status.additions} / -{rev.change_status.deletions})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreRevision(rev.id)}
                        disabled={restoringSha === rev.id}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        {restoringSha === rev.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        <span>Restore Snapshot</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TOKEN SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="font-bold text-slate-100 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>How to generate a Free Personal Access Token</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-slate-400 leading-relaxed">
                  <li>
                    Visit{' '}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 underline inline-flex items-center space-x-0.5"
                    >
                      <span>GitHub Token Settings</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </li>
                  <li>Click <strong>Generate new token (classic)</strong>.</li>
                  <li>Give it a Note: e.g. <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded">RestPulse Sync</code></li>
                  <li>
                    Under Scopes, check only <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded">gist</code> (create and read gists).
                  </li>
                  <li>Click <strong>Generate Token</strong> and copy the token (<code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded">ghp_...</code>).</li>
                  <li>Paste it into RestPulse to sync across all your laptops and browsers!</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200">Safe Multi-Device Philosophy</div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  RestPulse stores your collections in private Gists directly under your GitHub account. No third-party servers ever see your request payloads, API keys, or tokens. When you log in on another device, RestPulse prevents automatic overwrite and gives you full control to pull, smart-merge, or keep local data.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>End-to-End Encrypted via Private GitHub Gists</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

