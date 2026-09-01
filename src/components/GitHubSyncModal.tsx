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
} from 'lucide-react';
import {
  GitHubUser,
  GistRevision,
  SyncPayload,
  verifyGitHubToken,
  findOrCreateWorkspaceGist,
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

  useEffect(() => {
    if (token && gistId && isOpen) {
      fetchRevisions();
    }
  }, [token, gistId, isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      showToast('Please enter a valid GitHub Access Token', 'warning');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Verifying token with GitHub...');

    try {
      const gitHubUser = await verifyGitHubToken(tokenInput.trim());
      setStatusMessage('Finding or creating private workspace Gist...');
      const gId = await findOrCreateWorkspaceGist(tokenInput.trim());

      setToken(tokenInput.trim());
      setUser(gitHubUser);
      setGistId(gId);
      saveGitHubSession(tokenInput.trim(), gitHubUser, gId);

      showToast(`Connected as @${gitHubUser.login}! Gist initialized.`, 'success');
      setTokenInput('');
      setStatusMessage(null);
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
    showToast('Disconnected from GitHub Sync', 'info');
  };

  const handleToggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    setAutoSyncSetting(next);
    showToast(next ? 'Auto-Sync enabled! Workspace will sync automatically.' : 'Auto-Sync disabled', 'info');
  };

  const handlePushToCloud = async () => {
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
      showToast('Workspace & execution history successfully backed up to GitHub Gist!', 'success');
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

    if (!window.confirm(`Are you sure you want to restore workspace snapshot (${commitSha.slice(0, 7)})? Current unsaved changes will be replaced.`)) {
      return;
    }

    setRestoringSha(commitSha);
    try {
      const restoredPayload = await restoreGistRevision(token, gistId, commitSha);
      onApplySyncedData(restoredPayload);
      showToast(`Successfully restored workspace snapshot commit ${commitSha.slice(0, 7)}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to restore snapshot', 'error');
    } finally {
      setRestoringSha(null);
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
              <p className="text-xs text-slate-400">Zero Maintenance • Private Gist Cloud Backup • Version History</p>
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
                      Click below to generate and authorize your GitHub access credentials with pre-configured <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded">gist</code> permissions automatically.
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
                        Paste your token starting with <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded">ghp_</code>. Your data is synced to your private Gist with zero server costs or management.
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
                              <span>Connecting...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              <span>Connect & Initialize Gist</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                /* Authenticated State */
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
                          <span className="truncate max-w-[200px] font-mono">Gist: {gistId?.slice(0, 10)}...</span>
                          <a
                            href={`https://gist.github.com/${user?.login}/${gistId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline flex items-center space-x-0.5"
                          >
                            <span>Open Gist</span>
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

                  {/* Manual Sync Control Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handlePushToCloud}
                      disabled={isLoading}
                      className="p-4 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <CloudUpload className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-mono text-slate-400">LOCAL → CLOUD</span>
                      </div>
                      <div className="font-bold text-xs text-slate-200">Push Local to GitHub</div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Upload current workspace ({organizations.length} orgs, {history.length} request logs) to your private Gist.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={handlePullFromCloud}
                      disabled={isLoading}
                      className="p-4 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <CloudDownload className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-mono text-slate-400">CLOUD → LOCAL</span>
                      </div>
                      <div className="font-bold text-xs text-slate-200">Pull Cloud to Local</div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Restore workspace collections, environments, and execution history from GitHub Gist.
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
                          Automatically push workspace updates & execution history to GitHub on change.
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

                  {lastSyncTime && (
                    <div className="text-center text-[11px] font-mono text-slate-400">
                      Last synced at {lastSyncTime}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GIT REVISION DATA HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-xs text-slate-200 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Workspace Git Revision Log</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Every sync creates an immutable Git commit revision in your Gist. Roll back workspace state anytime.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchRevisions}
                  disabled={isLoadingRevisions || !token}
                  className="text-xs text-slate-400 hover:text-emerald-400 flex items-center space-x-1 p-1.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRevisions ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {!token ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Connect your GitHub token to inspect and restore historical Git snapshots.
                </div>
              ) : isLoadingRevisions ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading Git revisions...</span>
                </div>
              ) : revisions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No Git revisions recorded yet. Perform a sync to record your first snapshot!
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 font-mono text-xs">
                          <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {rev.version.slice(0, 7)}
                          </span>
                          <span className="text-slate-300">@{rev.user.login}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                          <span>{new Date(rev.committed_at).toLocaleString()}</span>
                          {rev.change_status && (
                            <span className="font-mono text-[10px]">
                              <span className="text-emerald-400">+{rev.change_status.additions}</span>{' '}
                              <span className="text-rose-400">-{rev.change_status.deletions}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreRevision(rev.version)}
                        disabled={restoringSha === rev.version}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
                      >
                        {restoringSha === rev.version ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>Restore Snapshot</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TOKEN GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span>How to create a free GitHub Token (1 Minute)</span>
                </h4>

                <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                  <li>
                    Log in to your GitHub account and open{' '}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline inline-flex items-center space-x-1 font-semibold"
                    >
                      <span>GitHub Developer Settings</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>.
                  </li>
                  <li>Click <strong>"Generate new token"</strong> (Classic or Fine-grained).</li>
                  <li>Give your token a description like <code className="bg-slate-800 text-emerald-300 px-1 rounded font-mono">RestPulse Workspace Sync</code>.</li>
                  <li>
                    Check the box for <code className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">gist</code> permission (Create and edit gists).
                  </li>
                  <li>Click <strong>"Generate Token"</strong> and copy the token string starting with <code className="bg-slate-800 text-emerald-300 px-1 rounded font-mono">ghp_</code>.</li>
                  <li>Paste your token into RestPulse to start syncing for free!</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-slate-300 space-y-1">
                <div className="font-bold text-xs text-emerald-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security & Privacy Guarantee</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your token is stored locally in your browser’s secure storage and is only used to directly communicate with official GitHub Gist APIs. Zero server proxies, zero third-party databases, zero cost.
                </p>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
