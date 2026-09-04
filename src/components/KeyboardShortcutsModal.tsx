import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  X,
  Search,
  Zap,
  Globe,
  Send,
  Code,
  Layers,
  Terminal,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  icon: React.ReactNode;
  items: {
    keys: string[];
    description: string;
    tag?: string;
  }[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchFilter, setSearchFilter] = useState('');

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

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';
  const altKey = isMac ? '⌥' : 'Alt';
  const shiftKey = isMac ? '⇧' : 'Shift';

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: 'Global & Navigation',
      icon: <Globe className="w-4 h-4 text-purple-400" />,
      items: [
        { keys: [modKey, 'K'], description: 'Open Global Command Palette', tag: 'Fast Switch' },
        { keys: ['?'], description: 'Open Keyboard Shortcuts Guide' },
        { keys: [modKey, 'E'], description: 'Open Environment & Global Variables Manager' },
        { keys: [modKey, 'J'], description: 'Open Automatic Cookie Jar Manager', tag: 'Cookies' },
        { keys: [modKey, 'B'], description: 'Toggle Sidebar Expand / Collapse' },
        { keys: [modKey, ','], description: 'Open Application Settings & Themes' },
        { keys: [modKey, 'O'], description: 'Open Import / Export Workspace' },
        { keys: [modKey, 'G'], description: 'Open GitHub Cloud Sync Manager' },
        { keys: [modKey, shiftKey, 'B'], description: 'Open Batch Workspace Manager' },
      ],
    },
    {
      category: 'Request Execution & Tabs',
      icon: <Send className="w-4 h-4 text-emerald-400" />,
      items: [
        { keys: [modKey, 'Enter'], description: 'Execute Active Request (Send / Cancel)', tag: 'Core' },
        { keys: [modKey, 'N'], description: 'Create New Quick Request Draft' },
        { keys: [modKey, 'S'], description: 'Save Active Request changes' },
        { keys: [modKey, shiftKey, 'S'], description: 'Save Snapshot / Scratchpad Request' },
        { keys: [modKey, 'I'], description: 'Quick cURL Import with Auto-Env Mapping', tag: 'cURL' },
        { keys: [modKey, shiftKey, 'C'], description: 'Alternative Quick cURL Import' },
        { keys: [modKey, 'W'], description: 'Close Active Workspace Tab' },
        { keys: [modKey, shiftKey, 'W'], description: 'Close All Tabs' },
      ],
    },
    {
      category: 'Editing & Autocomplete',
      icon: <Code className="w-4 h-4 text-blue-400" />,
      items: [
        { keys: ['{{'], description: 'Trigger Environment Variable Autocomplete Dropdown', tag: 'Autocomplete' },
        { keys: ['Tab'], description: 'Accept Autocomplete Suggestion or indent' },
        { keys: ['Esc'], description: 'Dismiss active suggestion or close modal' },
      ],
    },
    {
      category: 'Response Viewer & Search',
      icon: <Search className="w-4 h-4 text-amber-400" />,
      items: [
        { keys: [modKey, 'F'], description: 'Find / Search inside Response Body or HTML', tag: 'Search' },
        { keys: ['Enter'], description: 'Jump to Next Search Highlight' },
        { keys: ['Shift', 'Enter'], description: 'Jump to Previous Search Highlight' },
        { keys: ['Esc'], description: 'Dismiss Search Bar / Clear Highlights' },
        { keys: [modKey, shiftKey, 'C'], description: 'Copy Full Response Body to Clipboard' },
      ],
    },
    {
      category: 'Automation & Tools',
      icon: <Zap className="w-4 h-4 text-rose-400" />,
      items: [
        { keys: [modKey, shiftKey, 'R'], description: 'Open Automated Collection Runner', tag: 'Runner' },
        { keys: [modKey, shiftKey, 'E'], description: 'Open Full-featured .rest File Code Editor' },
        { keys: [modKey, 'H'], description: 'Switch to Request Execution History' },
      ],
    },
  ];

  const q = searchFilter.toLowerCase().trim();
  const filteredGroups = shortcutGroups
    .map((grp) => ({
      ...grp,
      items: grp.items.filter(
        (item) =>
          !q ||
          item.description.toLowerCase().includes(q) ||
          item.keys.some((k) => k.toLowerCase().includes(q)) ||
          item.tag?.toLowerCase().includes(q) ||
          grp.category.toLowerCase().includes(q)
      ),
    }))
    .filter((grp) => grp.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">Keyboard Shortcuts</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                  {isMac ? 'macOS Layout' : 'Windows / Linux Layout'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Comprehensive hotkeys for high-speed API development</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search shortcuts by key or action (e.g. send, cookies, curl, find)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 font-mono"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              No shortcuts matching &quot;{searchFilter}&quot;.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.category} className="space-y-2.5">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  {group.icon}
                  <span>{group.category}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl divide-y divide-slate-800/60 overflow-hidden">
                  {group.items.map((item) => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-3">
                        <span className="text-slate-200 font-medium truncate">{item.description}</span>
                        {item.tag && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        {item.keys.map((key) => (
                          <kbd
                            key={key}
                            className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 font-mono text-[11px] font-semibold border border-slate-700 shadow-sm"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span className="text-[11px] flex items-center space-x-1">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">ESC</kbd>
            <span>to dismiss</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
