import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Sliders,
  Moon,
  Sun,
  Palette,
  Check,
  Keyboard,
  Info,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { THEMES, UIThemeId } from '../utils/themeManager';
import { getThemeIcon } from './InlineThemeSelector';
import { Project, Organization } from '../types';
import { getSavedGitHubToken, getSavedGistId, GitHubUser } from '../services/githubSyncService';

export type SettingsTabId =
  | 'preferences'
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
  initialTab = 'preferences',
  showToast,
  githubUser: propGithubUser,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [shortcutSearch, setShortcutSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];
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
        { desc: 'Open Command Palette & quick actions', keys: [['Ctrl', 'K'], ['Cmd', 'K']], category: 'Help' },
        { desc: 'Open Workspace Settings & Preferences', keys: [['Ctrl', ','], ['Cmd', ',']], category: 'Settings' },
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
      section: 'PREFERENCES',
      items: [
        { id: 'preferences', label: 'General & Appearance', icon: Sliders },
        { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard, badge: 'Cheatsheet' },
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 ${
        isDarkMode ? 'bg-slate-950/80 backdrop-blur-sm' : 'bg-slate-900/40 backdrop-blur-sm'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className={`w-full max-w-4xl h-[88vh] max-h-[780px] rounded-2xl shadow-2xl overflow-hidden flex flex-col border ${
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
                <h2 className="text-base font-bold tracking-tight">Workspace Settings & Preferences</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  RestStudio v1.3.0
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure appearance, theme presets, layout split, keyboard shortcuts, and app version
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
            {/* 1. GENERAL & APPEARANCE */}
            {activeTab === 'preferences' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center space-x-2">
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <span>Appearance & Theme Preferences</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Customize dark/light mode and accent color themes across your workspace
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Dark / Light Mode Toggle */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold">Dark Mode / Light Mode</div>
                      <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Switch between high-contrast dark canvas and clean light mode
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleDarkMode}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                          : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-sm'
                      }`}
                    >
                      {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      <span>{isDarkMode ? 'Dark Active' : 'Light Active'}</span>
                    </button>
                  </div>

                  {/* Theme Presets */}
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold">Theme Accent & Color Palette</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {THEMES.map((theme) => {
                        const isSelected = currentTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => onSelectTheme && onSelectTheme(theme.id)}
                            className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/30 font-bold'
                                : isDarkMode
                                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className="p-1 rounded-lg shrink-0 flex items-center justify-center border border-slate-700/50"
                              style={{
                                backgroundColor: theme.previewColors.surface,
                                color: theme.previewColors.primary,
                              }}
                            >
                              {getThemeIcon(theme.iconType, 'w-3.5 h-3.5')}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold">{theme.name}</div>
                              <div className="text-[9px] text-slate-400 capitalize">{theme.id} style</div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. KEYBOARD SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-5 max-w-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight flex items-center space-x-2">
                      <Keyboard className="w-4 h-4 text-emerald-400" />
                      <span>Keyboard Shortcuts Reference</span>
                    </h3>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      High-speed hotkeys to navigate, create requests, and execute APIs instantly
                    </p>
                  </div>

                  <div className="relative w-full sm:w-52">
                    <Search className={`absolute left-2.5 top-2.5 w-3.5 h-3.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      value={shortcutSearch}
                      onChange={(e) => setShortcutSearch(e.target.value)}
                      placeholder="Search shortcuts..."
                      className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-all ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50'
                          : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredShortcutGroups.map((group, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                        <span>{group.category}</span>
                      </div>
                      <div className="space-y-2">
                        {group.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className={`flex items-center justify-between text-xs py-1.5 border-b last:border-0 ${
                              isDarkMode ? 'border-slate-800/60 text-slate-300' : 'border-slate-200/60 text-slate-700'
                            }`}
                          >
                            <span className="pr-2">{item.desc}</span>
                            <div className="flex items-center space-x-1 shrink-0 font-mono">
                              {item.keys.map((keyCombo, kIdx) => (
                                <React.Fragment key={kIdx}>
                                  {kIdx > 0 && <span className="text-[10px] text-slate-500">or</span>}
                                  <div className="flex items-center space-x-0.5">
                                    {keyCombo.map((k, subIdx) => (
                                      <kbd
                                        key={subIdx}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shadow-xs ${
                                          isDarkMode
                                            ? 'bg-slate-900 border-slate-700 text-slate-200'
                                            : 'bg-white border-slate-300 text-slate-800'
                                        }`}
                                      >
                                        {k}
                                      </kbd>
                                    ))}
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. ABOUT & VERSION */}
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
      </motion.div>
    </motion.div>
  );
}
