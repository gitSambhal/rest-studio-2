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

  // In-app confirmation dialog state to replace iframe-incompatible window.confirm
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

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

    setConfirmDialog({
      title: 'Create New Private Gist',
      message: 'Create a brand new private GitHub Gist for your workspace and push this device\'s current workspace data?',
      confirmLabel: 'Create & Initialize',
      danger: false,
      onConfirm: async () => {
        setConfirmDialog(null);
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
      },
    });
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

  const executePushToCloud = async () => {
    if (!token || !gistId) return;

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

  const handlePushToCloud = async () => {
    if (!token || !gistId) return;

    // Safety check: peek remote to avoid accidental destructive wipeout
    try {
      const remote = await peekRemoteWorkspace(token, gistId);
      if (remote && remote.organizations && remote.organizations.length > 0) {
        const remoteStats = countWorkspaceEntities(remote);
        const localStats = countWorkspaceEntities(organizations);

        if (remoteStats.requestCount > localStats.requestCount) {
          setConfirmDialog({
            title: 'Cloud Overwrite Notice',
            message: `The remote GitHub Gist currently contains ${remoteStats.requestCount} endpoints (${remoteStats.projectCount} projects), while this local device only has ${localStats.requestCount} endpoints.\n\nPushing will overwrite the cloud Gist with this device's data.\n\nTo preserve data from both sides, cancel and choose Smart Merge instead.`,
            confirmLabel: 'Overwrite Cloud',
            danger: true,
            onConfirm: async () => {
              setConfirmDialog(null);
              await executePushToCloud();
            },
          });
          return;
        }
      }
    } catch (e) {
      // Continue if peek fails
    }

    await executePushToCloud();
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

  const executeRestoreRevision = async (commitSha: string) => {
    if (!token || !gistId) return;

    setRestoringSha(commitSha);
    setIsLoading(true);
    setStatusMessage(`Restoring snapshot ${commitSha.slice(0, 7)} from GitHub...`);

    try {
      const restoredPayload = await restoreGistRevision(token, gistId, commitSha);
      
      // 1. Immediately apply the restored snapshot locally
      onApplySyncedData(restoredPayload);

      // 2. Also write this restored snapshot back to GitHub Gist HEAD so cloud and device stay synchronized
      try {
        setStatusMessage(`Syncing restored snapshot ${commitSha.slice(0, 7)} to GitHub Cloud...`);
        const updatedIso = await pushToGitHubGist(
          token,
          gistId,
          restoredPayload,
          `RestStudio Workspace Data Sync (Restored from snapshot ${commitSha.slice(0, 7)})`
        );
        setLastSyncTime(new Date(updatedIso).toLocaleTimeString());
      } catch (cloudErr) {
        console.warn('Snapshot restored locally; cloud HEAD fast-forward note:', cloudErr);
      }

      const entityCount = countWorkspaceEntities(restoredPayload.organizations);
      showToast(
        `Successfully restored snapshot (${entityCount.requestCount} requests across ${entityCount.projectCount} projects)!`,
        'success'
      );

      // Refresh revision list to reflect the restoration commit
      await fetchRevisions();
    } catch (err: any) {
      console.error('Failed to restore snapshot:', err);
      showToast(err.message || 'Failed to restore snapshot', 'error');
    } finally {
      setRestoringSha(null);
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handlePromptRestoreRevision = (rev: GistRevision) => {
    if (!token || !gistId) return;
    const shortSha = rev.id.slice(0, 7);
    const dateStr = new Date(rev.committed_at).toLocaleString();

    setConfirmDialog({
      title: `Restore Snapshot (${shortSha})`,
      message: `Are you sure you want to restore workspace snapshot from ${dateStr}?\n\nYour current local workspace will be replaced with this snapshot state.`,
      confirmLabel: 'Restore Snapshot',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        await executeRestoreRevision(rev.id);
      },
    });
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-100">Free Cloud Backup & Sync</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  100% Free & Private
                </span>
              </div>
              <p className="text-xs text-slate-400">Keep your API collections, history, and variables backed up safely across devices.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Cloud Sync Control</span>
            {user && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Saved Version Snapshots</span>
            {revisions.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
                {revisions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>How It Works (1-Min Setup)</span>
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
                  {/* Step 1: 1-Click GitHub Token Generator */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-100 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>Step 1: Get Your Free GitHub Token (1-Click)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Simple & Fast
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Click the button below to open GitHub with pre-selected <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">gist</code> permission. Just scroll down and click <strong className="text-white font-semibold">"Generate token"</strong> on GitHub, then copy it.
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
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/20 group"
                    >
                      <GitBranch className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
                      <span>Generate Token on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-900" />
                    </button>
                  </div>

                  {/* Step 2: Paste Token & Connect */}
                  <form onSubmit={handleConnect} className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <span>Step 2: Paste Access Token Here</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Paste the copied token (starts with <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">ghp_</code> or <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">github_pat_</code>):
                      </p>

                      <div>
                        <input
                          type="password"
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                          placeholder="Paste your token here (ghp_...)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('guide')}
                          className="text-xs text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer font-medium"
                        >
                          <span>Need help? View 1-minute visual guide</span>
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center space-x-2"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-900" />
                              <span>{statusMessage || 'Connecting...'}</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              <span>Connect & Start Sync</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : detectedCloudPayload ? (
                /* SIMPLE CLOUD WORKSPACE DETECTED PROMPT */
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>Existing Cloud Data Found!</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      We found your saved API collections under account <strong className="text-white">@{user?.login}</strong>. Your cloud backup is safe and untouched. What would you like to do on this device?
                    </p>
                  </div>

                  {/* Comparison Stats Card */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Saved Cloud Workspace</span>
                        <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-sm font-bold text-slate-100">
                        {detectedCloudPayload.remoteStats.requestCount} Endpoints
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <div>{detectedCloudPayload.remoteStats.projectCount} Projects • {detectedCloudPayload.remoteStats.orgCount} Folders</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Last Saved: {new Date(detectedCloudPayload.remote.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">This Device (Current)</span>
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="text-sm font-bold text-slate-100">
                        {detectedCloudPayload.localStats.requestCount} Endpoints
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <div>{detectedCloudPayload.localStats.projectCount} Projects • {detectedCloudPayload.localStats.orgCount} Folders</div>
                        <div className="text-[10px] text-slate-500">Local browser storage</div>
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
                            1. Load Cloud Data to This Device (Recommended)
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                            Best for new laptop/browser
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                          Loads all {detectedCloudPayload.remoteStats.requestCount} saved cloud endpoints onto this device.
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
                            2. Combine Cloud & Device Data (Smart Merge)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                          Safely merges saved cloud endpoints with endpoints on this device without deleting anything.
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
                        showToast('Using device data. Your cloud backup is safely preserved.', 'info');
                      }}
                      className="w-full p-3 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 text-left transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <HardDrive className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-300">
                            3. Keep Current Device Data Only
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 pl-6">
                          Continue using what you have on this device without changing your cloud backup.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                /* Authenticated Dashboard */
                <div className="space-y-5">
                  {/* Connected Account Card */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={user?.avatar_url || 'https://github.com/identicons/user.png'}
                        alt={user?.login}
                        className="w-10 h-10 rounded-full border border-slate-700 shrink-0 object-cover"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-100">{user?.name || user?.login}</span>
                          <span className="text-xs font-mono text-emerald-400">@{user?.login}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                          <span className="text-slate-300">Cloud Storage Active</span>
                          <a
                            href={`https://gist.github.com/${user?.login}/${gistId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline flex items-center space-x-0.5"
                          >
                            <span>View on GitHub</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
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
                        Device Workspace: <strong className="text-white">{currentLocalStats.requestCount} endpoints</strong> across{' '}
                        <strong className="text-white">{currentLocalStats.projectCount} projects</strong>
                      </span>
                    </div>
                    {lastSyncTime && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Last Synced: {lastSyncTime}
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
                        <span className="text-[9px] font-mono text-slate-400 font-semibold">CLOUD → DEVICE</span>
                      </div>
                      <div className="font-bold text-xs text-slate-200">Load Cloud Data</div>
                      <p className="text-[10.5px] text-slate-400 leading-snug">
                        Downloads saved endpoints & history from your GitHub backup to this device.
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
                        <span className="text-[9px] font-mono text-indigo-400 font-semibold">COMBINE BOTH</span>
                      </div>
                      <div className="font-bold text-xs text-slate-200">Smart Merge</div>
                      <p className="text-[10.5px] text-slate-400 leading-snug">
                        Combines endpoints from cloud and device without losing anything.
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
                        <span className="text-[9px] font-mono text-slate-400 font-semibold">DEVICE → CLOUD</span>
                      </div>
                      <div className="font-bold text-xs text-slate-200">Backup to Cloud</div>
                      <p className="text-[10.5px] text-slate-400 leading-snug">
                        Saves this device's current endpoints and history to your cloud backup.
                      </p>
                    </button>
                  </div>

                  {/* Auto-Sync Banner */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap className={`w-5 h-5 ${autoSync ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold text-xs text-slate-200">Automatic Background Backup</div>
                        <p className="text-[11px] text-slate-400">
                          Automatically backs up your workspace to GitHub whenever you create or edit endpoints.
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

          {/* TAB 2: SAVED VERSION SNAPSHOTS */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Saved Workspace Snapshots
                  </h4>
                  <p className="text-xs text-slate-400">Every cloud backup creates a saved point in time. You can restore any past version easily.</p>
                </div>

                <button
                  type="button"
                  onClick={fetchRevisions}
                  disabled={isLoadingRevisions}
                  className="p-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRevisions ? 'animate-spin' : ''}`} />
                  <span>Refresh List</span>
                </button>
              </div>

              {isLoadingRevisions ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
                  <p>Loading saved snapshots from GitHub...</p>
                </div>
              ) : revisions.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <Clock className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No saved snapshots found yet.</p>
                  <p className="text-[11px] text-slate-500">Back up your workspace to create your first saved snapshot point.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {revisions.map((rev, idx) => (
                    <div
                      key={rev.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        idx === 0
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold ${
                            idx === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-emerald-400'
                          }`}
                        >
                          v{revisions.length - idx}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-xs text-slate-200">
                              Snapshot {rev.id.slice(0, 7)}
                            </span>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                                Latest Backup
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                            <span>Saved {new Date(rev.committed_at).toLocaleString()}</span>
                            <span>• by {rev.user?.login || user?.login || 'you'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePromptRestoreRevision(rev)}
                        disabled={restoringSha === rev.id || isLoading}
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title={`Restore workspace to version ${rev.id.slice(0, 7)}`}
                      >
                        {restoringSha === rev.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>{restoringSha === rev.id ? 'Restoring...' : idx === 0 ? 'Re-apply Version' : 'Restore Version'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HOW IT WORKS GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="font-bold text-slate-100 flex items-center space-x-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>How to Set Up Free Cloud Sync in 3 Easy Steps</span>
                </div>
                <ol className="list-decimal list-inside space-y-2.5 text-slate-300 leading-relaxed">
                  <li>
                    Click <strong className="text-emerald-400 font-semibold">"Generate Token on GitHub"</strong> on the main tab.
                  </li>
                  <li>
                    GitHub will open with the <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">gist</code> box pre-selected.
                  </li>
                  <li>
                    Scroll to the bottom of the GitHub page and click <strong className="text-white font-semibold">"Generate token"</strong>.
                  </li>
                  <li>
                    Copy the token (looks like <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">ghp_...</code>) and paste it into RestPulse!
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Your Data Belongs to You</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-xs">
                  RestPulse stores your workspace in private Gists created directly under your own GitHub account. Your data is encrypted and private to you — no third-party database servers ever store your requests or secrets.
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

        {/* In-App Confirmation Modal (Replaces browser window.confirm for iframe reliability) */}
        {confirmDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    confirmDialog.danger
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold">{confirmDialog.title}</h4>
                  <p className={`text-xs leading-relaxed whitespace-pre-line ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {confirmDialog.cancelLabel || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    confirmDialog.danger
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-900/40'
                  }`}
                >
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

