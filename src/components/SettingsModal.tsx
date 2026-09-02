import React, { useState } from 'react';
import {
  X,
  Sliders,
  Moon,
  Sun,
  MonitorCheck,
  Palette,
  Check,
  Cloud,
  GitBranch,
  Upload,
  Download,
  Layers,
  Keyboard,
  FileCode,
  Info,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Search,
  Code2,
  Sparkles,
  Database,
  ArrowRight,
  Split,
  FolderOpen,
} from 'lucide-react';
import { THEMES, UIThemeId } from '../utils/themeManager';
import { Project, Organization } from '../types';
import { getSavedGitHubUser } from '../services/githubSyncService';

export type SettingsTabId =
  | 'appearance'
  | 'cloud'
  | 'import-export'
  | 'environments'
  | 'shortcuts'
  | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentTheme?: UIThemeId;
  onSelectTheme?: (themeId: UIThemeId) => void;
  activeProject?: Project;
  organizations?: Organization[];
  activeOrgId?: string;
  splitOrientation?: 'top-bottom' | 'left-right';
  onToggleSplitOrientation?: () => void;
  onOpenGitHubSync?: () => void;
  onOpenImportExport?: () => void;
  onOpenEnvManager?: () => void;
  onOpenQuickHelp?: () => void;
  initialTab?: SettingsTabId;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  currentTheme = 'dark',
  onSelectTheme,
  activeProject,
  organizations = [],
  activeOrgId,
  splitOrientation = 'top-bottom',
  onToggleSplitOrientation,
  onOpenGitHubSync,
  onOpenImportExport,
  onOpenEnvManager,
  onOpenQuickHelp,
  initialTab = 'appearance',
  showToast,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [shortcutSearch, setShortcutSearch] = useState('');

  if (!isOpen) return null;

  const currentThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];
  const isGitHubConfigured = typeof window !== 'undefined' && !!localStorage.getItem('restpulse_github_pat');
  const gistId = typeof window !== 'undefined' ? localStorage.getItem('restpulse_github_gist_id') : null;
  const githubUser = typeof window !== 'undefined' ? getSavedGitHubUser() : null;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const allShortcuts = [
    { key: 'Ctrl + Enter / Cmd + Enter', desc: 'Execute active HTTP / REST API request immediately', category: 'Execution' },
    { key: 'Ctrl + N / Cmd + N', desc: 'Quick New Request creator & auto-paste modal', category: 'Navigation' },
    { key: 'Ctrl + Shift + C / Alt + C', desc: 'Direct cURL importer & parser modal', category: 'Import' },
    { key: 'Ctrl + K / Cmd + K', desc: 'Open Quick Help & Documentation reference', category: 'Help' },
    { key: 'Ctrl + , / Cmd + ,', desc: 'Open Workspace Settings & Control Center', category: 'General' },
    { key: 'Ctrl + Space', desc: 'Trigger Environment Variable autocomplete menu', category: 'Editor' },
    { key: 'Type {{', desc: 'Auto-open environment variable suggestions popup', category: 'Editor' },
    { key: 'Tab', desc: 'Navigate to next field or accept autocomplete item', category: 'Editor' },
    { key: 'Esc', desc: 'Dismiss active popovers or close open modals', category: 'General' },
  ];

  const filteredShortcuts = allShortcuts.filter(
    (s) =>
      s.desc.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
      s.key.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(shortcutSearch.toLowerCase())
  );

  const navItems: { id: SettingsTabId; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
    {
      id: 'cloud',
      label: 'Cloud Sync & GitHub',
      icon: Cloud,
      badge: isGitHubConfigured ? (githubUser?.login ? `@${githubUser.login}` : 'Connected') : undefined,
    },
    { id: 'import-export', label: 'Import & Export', icon: Upload },
    { id: 'environments', label: 'Variable Scopes', icon: Layers },
    { id: 'shortcuts', label: 'Shortcuts & Syntax', icon: Keyboard },
    { id: 'about', label: 'About & Attribution', icon: Info },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 ${
        isDarkMode ? 'bg-slate-950/80 backdrop-blur-sm' : 'bg-slate-900/40 backdrop-blur-sm'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-4xl h-[88vh] max-h-[780px] rounded-2xl shadow-2xl overflow-hidden flex flex-col border animate-in zoom-in-95 duration-150 ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
            isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/90'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-xl border ${
                isDarkMode
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}
            >
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight">Workspace Settings</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  RestPulse v1.2.1
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure themes, free cloud sync, variable scopes, and keyboard shortcuts
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Close Settings (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body: Sidebar Tabs + Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar Navigation */}
          <div
            className={`w-48 sm:w-56 shrink-0 border-r flex flex-col p-2 space-y-1 overflow-y-auto scrollbar-none ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Preferences
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer group ${
                    isActive
                      ? isDarkMode
                        ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 shadow-sm'
                      : isDarkMode
                      ? 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-emerald-400'
                          : isDarkMode
                          ? 'text-slate-400 group-hover:text-slate-200'
                          : 'text-slate-500 group-hover:text-slate-800'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-4 mt-auto">
              <div
                className={`p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold">
                  <span>Status</span>
                  {isOnline ? (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>Offline</span>
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  Author:{' '}
                  <a
                    href="https://suhail.top"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    Suhail Akhtar
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content Canvas */}
          <div className="flex-1 min-w-0 p-5 overflow-y-auto scrollbar-none">
            {/* 1. APPEARANCE & THEMES */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Theme & Workspace Styling</h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Choose from {THEMES.length} handcrafted syntax & interface color palettes
                  </p>
                </div>

                {/* Dark / Light Toggle Banner */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-xl border ${
                        isDarkMode
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      }`}
                    >
                      {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">Color Mode: {isDarkMode ? 'Dark' : 'Light'}</div>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Toggle between dark night mode and high-contrast daylight theme
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleDarkMode}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center space-x-1.5"
                  >
                    {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    <span>Switch to {isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                </div>

                {/* Theme Palette Grid */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Palette className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Theme Presets</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {THEMES.map((theme) => {
                      const isSelected = currentTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            if (onSelectTheme) {
                              onSelectTheme(theme.id);
                              showToast('info', 'Theme Applied', `Switched theme to ${theme.name}`);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/30'
                              : isDarkMode
                              ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-start justify-between space-x-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`text-xs font-bold ${
                                    isSelected
                                      ? 'text-emerald-400'
                                      : isDarkMode
                                      ? 'text-slate-200 group-hover:text-slate-100'
                                      : 'text-slate-800 group-hover:text-slate-900'
                                  }`}
                                >
                                  {theme.name}
                                </span>
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                                    theme.category === 'dark'
                                      ? 'bg-slate-900 text-slate-400 border-slate-800'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {theme.category}
                                </span>
                              </div>
                              <p className={`text-[11px] leading-tight mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {theme.description}
                              </p>
                            </div>

                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>

                          {/* Color preview chips */}
                          <div className="flex items-center space-x-1.5 pt-1">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-700/50 shadow-inner"
                              style={{ backgroundColor: theme.previewColors.bg }}
                              title="Canvas"
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-700/50 shadow-inner"
                              style={{ backgroundColor: theme.previewColors.surface }}
                              title="Surface"
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-700/50 shadow-inner"
                              style={{ backgroundColor: theme.previewColors.border }}
                              title="Border"
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-700/50 shadow-inner"
                              style={{ backgroundColor: theme.previewColors.primary }}
                              title="Accent"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Editor Split Orientation */}
                {onToggleSplitOrientation && (
                  <div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-xl border ${
                          isDarkMode
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                            : 'bg-purple-50 border-purple-200 text-purple-600'
                        }`}
                      >
                        <Split className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Request / Response Split Layout</div>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Current mode: <b className="font-mono text-emerald-400">{splitOrientation === 'top-bottom' ? 'Horizontal (Stacked)' : 'Vertical (Side-by-Side)'}</b>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onToggleSplitOrientation}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                      }`}
                    >
                      Switch to {splitOrientation === 'top-bottom' ? 'Side-by-Side' : 'Stacked'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. CLOUD SYNC & GITHUB */}
            {activeTab === 'cloud' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Free GitHub Gist Cloud Sync</h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Zero-cost, secure, personal cloud storage & commit snapshot history powered by GitHub Gists
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border space-y-3.5 ${
                    isGitHubConfigured
                      ? isDarkMode
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-emerald-50/80 border-emerald-200'
                      : isDarkMode
                      ? 'bg-slate-950/60 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {isGitHubConfigured && githubUser?.avatar_url ? (
                        <img
                          src={githubUser.avatar_url}
                          alt={githubUser.login}
                          className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <GitBranch className={`w-5 h-5 ${isGitHubConfigured ? 'text-emerald-400' : 'text-slate-400'}`} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <div className="text-xs font-bold">
                            {isGitHubConfigured
                              ? githubUser?.name || githubUser?.login || 'GitHub Cloud Sync Connected'
                              : 'Cloud Sync Not Configured'}
                          </div>
                          {isGitHubConfigured && githubUser?.login && (
                            <a
                              href={githubUser.html_url || `https://github.com/${githubUser.login}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center space-x-0.5"
                            >
                              <span>@{githubUser.login}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isGitHubConfigured
                            ? `Connected Account • Gist ID: ${gistId ? gistId.slice(0, 10) + '...' : 'Active'}`
                            : 'Connect with a personal access token (gist scope only)'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenGitHubSync) onOpenGitHubSync();
                      }}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-1.5 shrink-0"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>{isGitHubConfigured ? 'Manage Cloud Sync' : 'Connect GitHub Gist'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Why Use GitHub Gist Sync?</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div
                      className={`p-3 rounded-xl border space-y-1 ${
                        isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>100% Free & Private</span>
                      </div>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Uses secret GitHub Gists owned exclusively by your account. No paid database required.
                      </p>
                    </div>

                    <div
                      className={`p-3 rounded-xl border space-y-1 ${
                        isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>Git Commit History</span>
                      </div>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Every sync creates a Git revision. Restore historical snapshots with one click.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. IMPORT & EXPORT */}
            {activeTab === 'import-export' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Import & Export Workspace</h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Migrate effortlessly between Postman, OpenAPI, cURL, and native .rest files
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                        <Upload className="w-4 h-4" />
                        <span>Import Suite</span>
                      </div>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Import Postman Collections v2.1, OpenAPI/Swagger JSON/YAML, raw cURL, or .rest files.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenImportExport) onOpenImportExport();
                      }}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Open Import Dialog</span>
                    </button>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                        <Download className="w-4 h-4" />
                        <span>Export Project</span>
                      </div>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Export active project ({activeProject?.name || 'Workspace'}) to standard .rest files or JSON.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenImportExport) onOpenImportExport();
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        isDarkMode
                          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Collections</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ENVIRONMENTS & VARIABLE SCOPES */}
            {activeTab === 'environments' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Variable Scopes & Hierarchy</h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    RestStudio resolves variables through a clean 4-tier cascading hierarchy
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    { level: '1. Local Variables (Local Var)', desc: '@baseUrl = https://api.example.com defined in .rest file header or local script memory', tag: 'Highest Priority' },
                    { level: '2. Project Environment (Env)', desc: 'Active environment variables (Development, Staging, Production) in the current project', tag: 'High Priority' },
                    { level: '3. Organization Defaults (Org)', desc: 'Org-wide shared base variables across all projects in the active organization', tag: 'Medium Priority' },
                    { level: '4. Global Workspace (Global)', desc: 'Universal fallback variables accessible everywhere across all organizations and projects', tag: 'Base Level' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{item.level}</div>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                          idx === 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isDarkMode
                            ? 'bg-slate-900 text-slate-400 border-slate-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.tag}
                      </span>
                    </div>
                  ))}
                </div>

                {onOpenEnvManager && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEnvManager();
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-2 shadow-sm"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Open Variable Hierarchy Manager</span>
                  </button>
                )}
              </div>
            )}

            {/* 5. SHORTCUTS & SYNTAX */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">Keyboard Shortcuts</h3>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Speed up your API workflow with lightning-fast key combinations
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={shortcutSearch}
                    onChange={(e) => setShortcutSearch(e.target.value)}
                    placeholder="Search shortcuts..."
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none transition-all ${
                      isDarkMode
                        ? 'bg-slate-950/60 border-slate-800 text-slate-100 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                {/* Shortcuts List */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-none">
                  {filteredShortcuts.map((s, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs ${
                        isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <span className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {s.desc}
                      </span>
                      <kbd
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                          isDarkMode
                            ? 'bg-slate-800 text-emerald-400 border-slate-700 shadow-inner'
                            : 'bg-white text-emerald-700 border-slate-300 shadow-sm'
                        }`}
                      >
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>

                {onOpenQuickHelp && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenQuickHelp();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Open Full .rest Syntax & Scripting Guide</span>
                  </button>
                )}
              </div>
            )}

            {/* 7. ABOUT & ATTRIBUTION */}
            {activeTab === 'about' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">About RestPulse</h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Offline-first, developer-friendly REST API Studio with native .rest support
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img src="/icon.svg" alt="RestPulse" className="w-10 h-10 rounded-xl" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm">RestPulse API Studio</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          v1.2.1
                        </span>
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Crafted for high-velocity API development, automated testing, and multi-device cloud collaboration.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Developer Attribution Card */}
                <div
                  className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200'
                  }`}
                >
                  <div className="text-xs font-bold text-emerald-400">Created by Suhail Akhtar</div>
                  <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    RestPulse is designed and engineered by <b>Suhail Akhtar</b>. Visit{' '}
                    <a
                      href="https://suhail.top"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-500 hover:text-emerald-400 font-semibold underline inline-flex items-center space-x-0.5"
                    >
                      <span>suhail.top</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>{' '}
                    for more tools, open-source projects, and developer utilities.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">Esc</kbd> to close</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
