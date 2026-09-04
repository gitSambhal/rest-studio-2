import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceTab, HTTPMethod, RequestStatusInfo } from '../types';
import {
  X,
  FileCode,
  Play,
  History,
  Compass,
  Rows3,
  Columns3,
  Code2,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Trash2,
  Pin,
  PinOff,
} from 'lucide-react';

interface TabBarProps {
  tabs: WorkspaceTab[];
  activeTabId: string;
  activeTabMode?: 'editor' | 'code' | 'runner' | 'history';
  onChangeTabMode?: (mode: 'editor' | 'code' | 'runner' | 'history') => void;
  activeFile?: { id: string; name: string };
  onRunRequest?: () => void;
  isRequestRunning?: boolean;
  isDarkMode?: boolean;
  executingRequestIds?: Record<string, boolean>;
  requestStatuses?: Record<string, RequestStatusInfo>;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs?: (tabId: string) => void;
  onCloseTabsToRight?: (tabId: string) => void;
  onCloseTabsToLeft?: (tabId: string) => void;
  onCloseAllTabs?: () => void;
  onTogglePinTab?: (tabId: string) => void;
  onNewTab: () => void;
  onOpenQuickNewRequest?: () => void;
  onOpenQuickCurl?: () => void;
  splitOrientation?: 'top-bottom' | 'left-right';
  onToggleSplitOrientation?: () => void;
}

const METHOD_COLORS: Record<HTTPMethod, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  HEAD: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  QUERY: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
};

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  activeTabMode = 'editor',
  onChangeTabMode,
  activeFile,
  onRunRequest,
  isRequestRunning = false,
  isDarkMode = true,
  executingRequestIds,
  requestStatuses,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseTabsToLeft,
  onCloseAllTabs,
  onTogglePinTab,
  onNewTab,
  onOpenQuickNewRequest,
  onOpenQuickCurl,
  splitOrientation = 'top-bottom',
  onToggleSplitOrientation,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);

  // Automatically scroll the active tab within the tab bar container (without shifting main window/page layout)
  useEffect(() => {
    if (activeTabId && tabRefs.current[activeTabId] && tabsContainerRef.current) {
      const activeEl = tabRefs.current[activeTabId];
      const container = tabsContainerRef.current;
      if (activeEl && container) {
        const elLeft = activeEl.offsetLeft;
        const elWidth = activeEl.offsetWidth;
        const containerWidth = container.offsetWidth;
        const targetScroll = elLeft - containerWidth / 2 + elWidth / 2;
        container.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: 'smooth',
        });
      }
    }
  }, [activeTabId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabId,
    });
  };

  const renderTabIcon = (tab: WorkspaceTab) => {
    switch (tab.type) {
      case 'request':
        return tab.method ? (
          <span
            className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0 ${
              METHOD_COLORS[tab.method] || 'text-slate-300'
            }`}
          >
            {tab.method}
          </span>
        ) : (
          <Code2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        );
      case 'file':
        return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'runner':
        return <Play className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'history':
        return <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'onboarding':
      default:
        return <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
  };

  const activeContextMenuTab = contextMenu ? tabs.find((t) => t.id === contextMenu.tabId) : null;

  return (
    <div className={`h-10 border-b flex items-center justify-between px-2 overflow-x-auto scrollbar-none shrink-0 select-none relative ${
      isDarkMode
        ? 'bg-slate-900/90 border-slate-800'
        : 'bg-slate-100 border-slate-200'
    }`}>
      {/* Left: Open Tabs List */}
      <div ref={tabsContainerRef} className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isExecutingThisTab = Boolean(
            (tab.requestId && executingRequestIds?.[tab.requestId]) ||
            (tab.requestId && requestStatuses?.[tab.requestId]?.state === 'loading')
          );
          const reqStatus = tab.requestId ? requestStatuses?.[tab.requestId] : undefined;

          return (
            <div
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              onClick={() => onSelectTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }
              }}
              className={`group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border shrink-0 w-40 ${
                isActive
                  ? isDarkMode
                    ? 'bg-slate-800 text-slate-100 border-slate-700 shadow-md'
                    : 'bg-white text-slate-900 border-slate-300 shadow-sm'
                  : isDarkMode
                    ? 'bg-slate-950/40 text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
                    : 'bg-slate-200/50 text-slate-600 border-transparent hover:bg-slate-200 hover:text-slate-900'
              } ${tab.isPinned ? (isDarkMode ? 'border-l-2 border-l-emerald-500 bg-slate-900/60' : 'border-l-2 border-l-emerald-500 bg-emerald-50/50') : ''}`}
            >
              {isExecutingThisTab ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" title="Request executing..." />
              ) : (
                renderTabIcon(tab)
              )}
              <span className="truncate min-w-0 flex-1 font-mono text-[11px]">{tab.title}</span>

              {/* Status Indicator inside Tab */}
              {!isExecutingThisTab && reqStatus?.state === 'success' && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold shrink-0" title={`Status: ${reqStatus.statusCode || 200}`}>
                  {reqStatus.statusCode || 200}
                </span>
              )}
              {!isExecutingThisTab && reqStatus?.state === 'error' && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold shrink-0" title={`Error: ${reqStatus.statusCode || 'ERR'}`}>
                  {reqStatus.statusCode && reqStatus.statusCode > 0 ? reqStatus.statusCode : 'ERR'}
                </span>
              )}

              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
              )}

              {tab.isPinned ? (
                <span title="Pinned Tab (Right-click to unpin)" className="p-0.5 text-emerald-400 shrink-0">
                  <Pin className="w-3 h-3 fill-emerald-400/20" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Controls: Mode Switchers, Run button, Split Layout Toggle */}
      <div className={`flex items-center space-x-2 pl-2 border-l shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}>


        {onRunRequest && activeTabMode === 'editor' && (
          <button
            type="button"
            onClick={onRunRequest}
            disabled={isRequestRunning}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              isRequestRunning
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-not-allowed'
                : isDarkMode
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold hover:shadow-emerald-500/25 shadow-xs'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold hover:shadow-emerald-600/25 shadow-xs'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRequestRunning ? 'animate-spin' : ''}`} />
            <span>{isRequestRunning ? 'Sending...' : 'Send'}</span>
          </button>
        )}

        {onToggleSplitOrientation && (
          <button
            type="button"
            onClick={onToggleSplitOrientation}
            className={`flex items-center space-x-1.5 px-2 py-1 border rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-emerald-300'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:text-emerald-600 shadow-sm'
            }`}
            title={`Current Split: ${splitOrientation === 'top-bottom' ? 'Top/Bottom' : 'Left/Right'}. Click to toggle layout.`}
          >
            {splitOrientation === 'top-bottom' ? (
              <>
                <Rows3 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Response: Bottom</span>
              </>
            ) : (
              <>
                <Columns3 className="w-3.5 h-3.5 text-sky-500" />
                <span>Response: Right</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y + 4, left: contextMenu.x }}
          className={`fixed z-50 border rounded-xl shadow-2xl p-1.5 w-52 text-xs font-sans space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
            isDarkMode
              ? 'bg-slate-900 border-slate-700 text-slate-200'
              : 'bg-white border-slate-200 text-slate-800 shadow-slate-900/10'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              if (onTogglePinTab) onTogglePinTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer font-medium ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-200 hover:text-slate-100' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
          >
            {activeContextMenuTab?.isPinned ? (
              <>
                <PinOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Unpin Tab</span>
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pin Tab</span>
              </>
            )}
          </button>

          <div className={`h-px my-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />

          <button
            type="button"
            onClick={() => {
              onCloseTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-200 hover:text-slate-100' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
            <span>Close Tab</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onCloseOtherTabs) onCloseOtherTabs(contextMenu.tabId);
              else {
                tabs.forEach((t) => {
                  if (t.id !== contextMenu.tabId && !t.isPinned) onCloseTab(t.id);
                });
              }
              setContextMenu(null);
            }}
            className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-200 hover:text-slate-100' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-500" />
            <span>Close Other Tabs</span>
          </button>

          <div className={`h-px my-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />

          <button
            type="button"
            onClick={() => {
              if (onCloseTabsToRight) onCloseTabsToRight(contextMenu.tabId);
              setContextMenu(null);
            }}
            className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-200 hover:text-slate-100' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-purple-500" />
            <span>Close Tabs to Right</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onCloseTabsToLeft) onCloseTabsToLeft(contextMenu.tabId);
              setContextMenu(null);
            }}
            className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-200 hover:text-slate-100' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-500" />
            <span>Close Tabs to Left</span>
          </button>

          <div className={`h-px my-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />

          <button
            type="button"
            onClick={() => {
              if (onCloseAllTabs) onCloseAllTabs();
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-500 hover:text-rose-600 dark:text-rose-300 transition-colors text-left cursor-pointer font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Close All Tabs</span>
          </button>
        </div>
      )}
    </div>
  );
};
