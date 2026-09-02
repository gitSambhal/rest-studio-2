import React, { useState } from 'react';
import {
  X,
  Sliders,
  Moon,
  Sun,
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
  Search,
  Code2,
  Sparkles,
  Split,
  ShieldCheck,
  FileText,
  Zap,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { THEMES, UIThemeId } from '../utils/themeManager';
import { Project, Organization } from '../types';
import { getSavedGitHubUser, getSavedGitHubToken, getSavedGistId, GitHubUser } from '../services/githubSyncService';
import { highlightJs, highlightRestSyntax } from '../utils/syntaxHighlighter';

export type SettingsTabId =
  | 'appearance'
  | 'cloud'
  | 'import-export'
  | 'environments'
  | 'shortcuts'
  | 'auth'
  | 'syntax'
  | 'scripting'
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
  githubUser?: GitHubUser | null;
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
  githubUser: propGithubUser,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [shortcutSearch, setShortcutSearch] = useState('');

  if (!isOpen) return null;

  const currentThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];
  const isGitHubConfigured = typeof window !== 'undefined' && !!getSavedGitHubToken();
  const gistId = typeof window !== 'undefined' ? getSavedGistId() : null;
  const effectiveGithubUser = propGithubUser || (typeof window !== 'undefined' ? getSavedGitHubUser() : null);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const shortcutGroups = [
    {
      category: '⚡ Request Execution & Creator',
      items: [
        { desc: 'Send current API request immediately', keys: [['Ctrl', 'Enter'], ['Cmd', 'Enter']], category: 'Execution' },
        { desc: 'Quick New Request creator & auto-paste modal', keys: [['Ctrl', 'N'], ['Cmd', 'N']], category: 'Creator' },
        { desc: 'Direct cURL importer & parser modal', keys: [['Ctrl', 'Shift', 'C'], ['Alt', 'C']], category: 'Import' },
        { desc: 'Cycle HTTP method (GET, POST, PUT, DELETE, etc.)', keys: [['Alt', 'M']], category: 'Editor' },
      ],
    },
    {
      category: '✍️ Variable Autocomplete & Editor',
      items: [
        { desc: 'Trigger Environment Variable autocomplete popup', keys: [['Ctrl', 'Space']], category: 'Autocomplete' },
        { desc: 'Auto-open environment variable suggestions', keys: [['{{']], category: 'Editor' },
        { desc: 'Accept autocomplete item or move to next field', keys: [['Tab'], ['Enter']], category: 'Autocomplete' },
        { desc: 'Navigate autocomplete dropdown choices', keys: [['↑'], ['↓']], category: 'Navigation' },
      ],
    },
    {
      category: '🧭 Workspace Navigation & Control',
      items: [
        { desc: 'Open Settings & Reference Center documentation', keys: [['Ctrl', 'K'], ['Cmd', 'K']], category: 'Help' },
        { desc: 'Open Workspace Settings & Control Center', keys: [['Ctrl', ','], ['Cmd', ',']], category: 'Settings' },
        { desc: 'Open Environment & Scope Manager', keys: [['Ctrl', 'E'], ['Cmd', 'E']], category: 'Scopes' },
        { desc: 'Dismiss active popovers or close open modals', keys: [['Esc']], category: 'General' },
      ],
    },
  ];

  const filteredShortcutGroups = shortcutGroups
    .map((group) => {
      const items = group.items.filter((item) => {
        const q = shortcutSearch.toLowerCase();
        const keyString = item.keys.flat(2).join(' ').toLowerCase();
        return (
          item.desc.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          keyString.includes(q)
        );
      });
      return { ...group, items };
    })
    .filter((g) => g.items.length > 0);

  const navGroups: {
    section: string;
    items: { id: SettingsTabId; label: string; icon: React.FC<{ className?: string }>; badge?: string }[];
  }[] = [
    {
      section: 'WORKSPACE & CONFIG',
      items: [
        { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
        {
          id: 'cloud',
          label: 'Cloud Sync & GitHub',
          icon: Cloud,
          badge: isGitHubConfigured ? (effectiveGithubUser?.login ? `@${effectiveGithubUser.login}` : 'Connected') : undefined,
        },
        { id: 'import-export', label: 'Import & Export', icon: Upload },
        { id: 'environments', label: 'Variable Scopes & Vars', icon: Layers },
      ],
    },
    {
      section: 'HELP & REFERENCE',
      items: [
        { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
        { id: 'auth', label: 'Inherited Auth Guide', icon: ShieldCheck },
        { id: 'syntax', label: 'HTTP Script Syntax', icon: FileText },
        { id: 'scripting', label: 'Scripting Engine (pm.*)', icon: Code2 },
      ],
    },
    {
      section: 'SYSTEM',
      items: [
        { id: 'about', label: 'About & Version', icon: Info },
      ],
    },
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
                <h2 className="text-base font-bold tracking-tight">Settings & Reference Center</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  RestStudio v1.3.0
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Workspace configuration, themes, cloud sync, variable scopes, and complete API documentation
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
              title="Close Settings & Reference (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body: Grouped Sidebar Tabs + Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar Navigation */}
          <div
            className={`w-52 sm:w-60 shrink-0 border-r flex flex-col p-2 space-y-3 overflow-y-auto scrollbar-none ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>{group.section}</span>
                </div>

                {group.items.map((item) => {
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
              </div>
            ))}

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
                      {isGitHubConfigured && effectiveGithubUser?.avatar_url ? (
                        <img
                          src={effectiveGithubUser.avatar_url}
                          alt={effectiveGithubUser.login}
                          className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover shrink-0 shadow-md"
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
                              ? effectiveGithubUser?.name || effectiveGithubUser?.login || 'GitHub Cloud Sync Connected'
                              : 'Cloud Sync Not Configured'}
                          </div>
                          {isGitHubConfigured && effectiveGithubUser?.login && (
                            <a
                              href={effectiveGithubUser.html_url || `https://github.com/${effectiveGithubUser.login}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center space-x-0.5"
                            >
                              <span>@{effectiveGithubUser.login}</span>
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
                    Migrate effortlessly between Postman collections, Insomnia v4, OpenAPI, cURL, and HTTP scripts
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
                        Import Postman Collections v2.1, Insomnia v4 exports, OpenAPI/Swagger JSON/YAML, raw cURL, or HTTP scripts.
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
                        Export active project ({activeProject?.name || 'Workspace'}) to Postman v2.1, Insomnia v4, OpenAPI v3, or HTTP scripts.
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
                  <h3 className="text-sm font-bold tracking-tight">Supported Variables & Scope Hierarchy</h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    RestStudio resolves dynamic variables through a clean 4-tier cascading scope hierarchy
                  </p>
                </div>

                {/* What are Supported Variables box */}
                <div className={`p-4 rounded-xl border space-y-2 text-xs ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                    <span>What Are Supported Variables?</span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Supported variables are dynamic placeholders enclosed in double curly braces (e.g. <code className="text-emerald-400 font-mono">{`{{baseUrl}}`}</code>, <code className="text-emerald-400 font-mono">{`{{authToken}}`}</code>, <code className="text-emerald-400 font-mono">{`{{tenantId}}`}</code>). You can place them anywhere inside:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60 text-slate-300">1. Request URLs & Paths</div>
                    <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60 text-slate-300">2. Request Headers & Auth Tokens</div>
                    <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60 text-slate-300">3. Query Key-Value Parameters</div>
                    <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60 text-slate-300">4. Request Bodies (JSON/Form)</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold">5-Tier Resolution Hierarchy (Highest Priority First):</div>
                  {[
                    { level: '1. Local Variables (Local Var)', desc: '@baseUrl = https://api.example.com defined in file header or local script memory', tag: 'Highest Priority' },
                    { level: '2. Project Environment (Env)', desc: 'Active environment variables (Development, Staging, Production) in the current project', tag: 'High Priority' },
                    { level: '3. Organization Defaults (Org)', desc: 'Org-wide shared base variables across all projects in the active organization', tag: 'Medium Priority' },
                    { level: '4. Global Workspace (Global)', desc: 'Universal fallback variables accessible everywhere across all organizations and projects', tag: 'Base Level' },
                    { level: '5. Built-in Dynamic System Vars', desc: '{{$timestamp}}, {{$guid}}, {{$randomInt}}, {{$randomEmail}}, etc. evaluated at runtime', tag: 'Auto Evaluated' },
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
                <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-none pr-1">
                  {filteredShortcutGroups.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No shortcuts matched "{shortcutSearch}"
                    </div>
                  ) : (
                    filteredShortcutGroups.map((group, groupIdx) => (
                      <div key={groupIdx} className="space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {group.category}
                        </div>
                        <div className="space-y-2">
                          {group.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className={`p-3 rounded-xl border flex items-center justify-between text-xs gap-3 ${
                                isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
                              }`}
                            >
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                {item.desc}
                              </span>

                              <div className="flex items-center space-x-1.5 shrink-0 justify-end">
                                {item.keys.map((combo, comboIdx) => (
                                  <React.Fragment key={comboIdx}>
                                    {comboIdx > 0 && <span className="text-slate-500 text-[10px] font-medium">or</span>}
                                    <div className="inline-flex items-center space-x-1">
                                      {combo.map((k, kIdx) => (
                                        <React.Fragment key={kIdx}>
                                          {kIdx > 0 && <span className="text-slate-600 text-[10px] font-bold">+</span>}
                                          <kbd
                                            className={`px-2 py-0.5 font-mono text-[11px] font-bold rounded shadow-sm inline-flex items-center justify-center min-w-[20px] ${
                                              isDarkMode
                                                ? 'bg-slate-800 border-b-2 border-slate-700 text-emerald-300'
                                                : 'bg-white border-b-2 border-slate-300 text-emerald-700'
                                            }`}
                                          >
                                            {k}
                                          </kbd>
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {onOpenQuickHelp && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('syntax');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Script Syntax & Scripting Engine Guide</span>
                  </button>
                )}
              </div>
            )}

            {/* 6. INHERITED AUTH GUIDE */}
            {activeTab === 'auth' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Project & File Level Auth Inheritance</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Avoid repeating authentication credentials across dozens of requests by using Auth Inheritance.
                  </p>
                </div>

                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                    <Zap className="w-4 h-4" />
                    <span>How to use Inherited Auth:</span>
                  </div>
                  <ol className={`list-decimal list-inside text-xs space-y-2 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <li>In any request, navigate to the <strong className={isDarkMode ? 'text-slate-100' : 'text-slate-900'}>Auth</strong> tab.</li>
                    <li>Select the <strong className="text-emerald-500">Inherit Auth</strong> option.</li>
                    <li>The request automatically inherits the Bearer Token, Basic Auth, or API Key configured at the parent Project or Organization level.</li>
                    <li>Dynamic placeholders like <code className="text-emerald-500 font-mono">{`{{authToken}}`}</code> inside Project Auth are dynamically evaluated at runtime.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* 7. HTTP SCRIPT SYNTAX */}
            {activeTab === 'syntax' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>HTTP Script Format Syntax</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    RestStudio supports standard executable HTTP request script syntax (.http / .rest).
                  </p>
                </div>

                <div
                  className={`p-4 rounded-xl border font-mono text-xs leading-relaxed overflow-x-auto space-y-2 ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                >
                  <div className="text-slate-500"># Variable Definition at top of file</div>
                  <div className="text-amber-400">@baseUrl = https://api.example.com</div>
                  <div className="text-amber-400">@token = secret_12345</div>
                  <br />
                  <div className="text-slate-500">### 1. Get User Details</div>
                  <div className="text-emerald-400">GET {`{{baseUrl}}`}/v1/users/me</div>
                  <div>Authorization: Bearer {`{{token}}`}</div>
                  <div>Accept: application/json</div>
                  <br />
                  <div className="text-slate-500">### 2. Create New Item</div>
                  <div className="text-teal-400">POST {`{{baseUrl}}`}/v1/items</div>
                  <div>Content-Type: application/json</div>
                  <br />
                  <div>{`{`}</div>
                  <div className="pl-4">{`"name": "Sample Item",`}</div>
                  <div className="pl-4">{`"status": "active"`}</div>
                  <div>{`}`}</div>
                </div>
              </div>
            )}

            {/* 8. SCRIPTING ENGINE (pm.*) */}
            {activeTab === 'scripting' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center space-x-2">
                    <Code2 className="w-4 h-4 text-emerald-400" />
                    <span>Pre-request & Test Scripting API</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Write JavaScript scripts before sending requests or assertion tests after receiving responses.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  <div
                    className={`p-3 rounded-xl border space-y-2 ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="text-emerald-400 font-bold font-sans">Pre-Request Script Methods</div>
                    <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap">
                      {highlightJs(`pm.environment.set('token', 'newVal');\npm.environment.get('baseUrl');\npm.request.setHeader('X-Trace', Date.now());`)}
                    </pre>
                  </div>

                  <div
                    className={`p-3 rounded-xl border space-y-2 ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="text-emerald-400 font-bold font-sans">Post-Request Test Assertions</div>
                    <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap">
                      {highlightJs(`pm.test('Status is 200', () => {\n  pm.expect(pm.response.status).to.equal(200);\n});`)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* 7. ABOUT & ATTRIBUTION */}
            {activeTab === 'about' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">About RestStudio</h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Offline-first, developer-friendly REST API Studio with Postman, Insomnia, and OpenAPI support
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img src="/icon.svg" alt="RestStudio" className="w-10 h-10 rounded-xl" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm">RestStudio API Studio</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          v1.3.0
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
                    RestStudio is designed and engineered by <b>Suhail Akhtar</b>. Visit{' '}
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
