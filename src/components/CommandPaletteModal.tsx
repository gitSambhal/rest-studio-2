import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { RestRequest, HTTPMethod, Organization, Project } from '../types';
import {
  Search,
  Zap,
  Plus,
  Send,
  Download,
  Settings,
  Moon,
  Sun,
  Cookie,
  SlidersHorizontal,
  FolderOpen,
  Keyboard,
  FileCode,
  Sparkles,
  GitBranch,
  History,
  Trash2,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Requests' | 'Actions' | 'Navigation' | 'Tools' | 'Settings';
  shortcut?: string;
  icon: React.ReactNode;
  method?: HTTPMethod;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: RestRequest[];
  onSelectRequest: (req: RestRequest) => void;
  onSendRequest: () => void;
  onNewRequest: () => void;
  onOpenCurlImport: () => void;
  onOpenCookieJar: () => void;
  onOpenEnvManager: () => void;
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onOpenHistory?: () => void;
  onOpenRunner?: () => void;
  onOpenGitHubSync?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  requests,
  onSelectRequest,
  onSendRequest,
  onNewRequest,
  onOpenCurlImport,
  onOpenCookieJar,
  onOpenEnvManager,
  onToggleDarkMode,
  isDarkMode,
  onOpenShortcuts,
  onOpenSettings,
  onOpenHistory,
  onOpenRunner,
  onOpenGitHubSync,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus on mount
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command list
  const commands: CommandItem[] = [
    // Primary Actions
    {
      id: 'action-send',
      title: 'Send Active Request',
      category: 'Actions',
      shortcut: 'Ctrl+Enter',
      icon: <Send className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onClose();
        onSendRequest();
      },
    },
    {
      id: 'action-new',
      title: 'Create New Request Draft',
      category: 'Actions',
      shortcut: 'Ctrl+N',
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onClose();
        onNewRequest();
      },
    },
    {
      id: 'action-curl',
      title: 'Import cURL Command with Auto-Env Mapping',
      category: 'Tools',
      shortcut: 'Ctrl+I',
      icon: <Download className="w-4 h-4 text-amber-400" />,
      action: () => {
        onClose();
        onOpenCurlImport();
      },
    },
    {
      id: 'tool-cookie-jar',
      title: 'Manage Cookie Jar & Session Cookies',
      category: 'Tools',
      shortcut: 'Ctrl+J',
      icon: <Cookie className="w-4 h-4 text-amber-400" />,
      action: () => {
        onClose();
        onOpenCookieJar();
      },
    },
    {
      id: 'nav-env',
      title: 'Manage Environment & Global Variables',
      category: 'Navigation',
      shortcut: 'Ctrl+E',
      icon: <SlidersHorizontal className="w-4 h-4 text-blue-400" />,
      action: () => {
        onClose();
        onOpenEnvManager();
      },
    },
    {
      id: 'tool-shortcuts',
      title: 'Keyboard Shortcuts Guide',
      category: 'Tools',
      shortcut: '?',
      icon: <Keyboard className="w-4 h-4 text-purple-400" />,
      action: () => {
        onClose();
        onOpenShortcuts();
      },
    },
    {
      id: 'action-theme',
      title: `Toggle Theme (Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode)`,
      category: 'Settings',
      icon: isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onClose();
        onToggleDarkMode();
      },
    },
    ...(onOpenRunner ? [{
      id: 'nav-runner',
      title: 'Open Collection Runner & Automated Tests',
      category: 'Tools' as const,
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onClose();
        onOpenRunner();
      },
    }] : []),
    ...(onOpenHistory ? [{
      id: 'nav-history',
      title: 'View Execution History Log',
      category: 'Navigation' as const,
      icon: <History className="w-4 h-4 text-slate-400" />,
      action: () => {
        onClose();
        onOpenHistory();
      },
    }] : []),
    ...(onOpenGitHubSync ? [{
      id: 'tool-github',
      title: 'GitHub Gist Sync & Backup',
      category: 'Tools' as const,
      icon: <GitBranch className="w-4 h-4 text-slate-300" />,
      action: () => {
        onClose();
        onOpenGitHubSync();
      },
    }] : []),
    {
      id: 'nav-settings',
      title: 'Open Application Settings',
      category: 'Settings',
      shortcut: 'Ctrl+,',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      action: () => {
        onClose();
        onOpenSettings();
      },
    },
    // Dynamically loaded workspace requests
    ...requests.map((req) => ({
      id: `req-${req.id}`,
      title: req.name || req.url || 'Untitled Request',
      category: 'Requests' as const,
      method: req.method,
      icon: <FileCode className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onClose();
        onSelectRequest(req);
      },
    })),
  ];

  // Filter commands by query
  const filteredCommands = commands.filter((cmd) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.method && cmd.method.toLowerCase().includes(q))
    );
  });

  // Keep selected index in range
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Global Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selectedItem = list.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const getMethodBadgeClass = (method?: HTTPMethod) => {
    switch (method) {
      case 'GET': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'POST': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'PUT': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'DELETE': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'PATCH': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-slate-950/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', damping: 30, stiffness: 420 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a command, search requests, or actions... (↑↓ to navigate, Enter to run)"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 rounded">
            ESC to close
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching commands or requests found for &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  data-index={idx}
                  type="button"
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/10 text-slate-100 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0">
                      {cmd.icon}
                    </div>
                    {cmd.method && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${getMethodBadgeClass(cmd.method)}`}>
                        {cmd.method}
                      </span>
                    )}
                    <span className="font-medium truncate">{cmd.title}</span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono px-4">
          <div className="flex items-center space-x-3">
            <span><kbd className="text-slate-400">↑↓</kbd> Navigate</span>
            <span><kbd className="text-slate-400">↵</kbd> Select</span>
            <span><kbd className="text-slate-400">Esc</kbd> Close</span>
          </div>
          <span className="text-emerald-400/80">Command Palette</span>
        </div>
      </motion.div>
    </motion.div>
  );
};
