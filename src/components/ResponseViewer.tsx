import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ExecutionResponse, TestAssertion, SavedResponseItem } from '../types';
import { highlightJson, renderHighlightedSegment } from '../utils/syntaxHighlighter';
import { JsonSchemaTreeViewer } from './JsonSchemaTreeViewer';
import { ResponseRichPreview } from './ResponseRichPreview';
import { ResponseSearchBar } from './ResponseSearchBar';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Copy,
  Check,
  Code,
  FlaskConical,
  Terminal,
  Bookmark,
  BookmarkCheck,
  Download,
  Trash2,
  BookmarkPlus,
  Layers,
  X,
  XCircle,
  Search,
  Eye,
  Image,
} from 'lucide-react';

interface ResponseViewerProps {
  response: ExecutionResponse | null;
  isLoading: boolean;
  assertions?: TestAssertion[];
  savedResponses?: SavedResponseItem[];
  onSaveResponseSnapshot?: (response: ExecutionResponse, name: string) => void;
  onDeleteSavedResponseSnapshot?: (snapshotId: string) => void;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  isLoading,
  assertions,
  savedResponses = [],
  onSaveResponseSnapshot,
  onDeleteSavedResponseSnapshot,
}) => {
  const [activeTab, setActiveTab] = useState<'pretty' | 'raw' | 'preview' | 'schema' | 'headers' | 'tests' | 'logs'>('pretty');
  const [copied, setCopied] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [snapshotTitleInput, setSnapshotTitleInput] = useState('');
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Compute active response to render (either selected snapshot or live response)
  const activeSnapshot = savedResponses.find((s) => s.id === selectedSnapshotId);
  const displayResponse = activeSnapshot ? activeSnapshot.response : response;

  const contentType = (displayResponse?.contentType || displayResponse?.headers?.['content-type'] || '').toLowerCase();
  const rawBody = displayResponse?.body || '';

  const hasRichPreview = useMemo(() => {
    if (!displayResponse) return false;
    const lowerBody = rawBody.toLowerCase().trim();
    return (
      contentType.startsWith('image/') ||
      contentType.includes('svg') ||
      contentType.includes('text/html') ||
      contentType.includes('application/xhtml+xml') ||
      lowerBody.startsWith('<!doctype html') ||
      lowerBody.startsWith('<html') ||
      lowerBody.startsWith('<svg') ||
      contentType.includes('application/pdf') ||
      contentType.startsWith('audio/') ||
      contentType.startsWith('video/') ||
      Boolean(displayResponse.base64Body && /^(image\/|audio\/|video\/|application\/pdf)/i.test(contentType))
    );
  }, [displayResponse, contentType, rawBody]);

  const previewBadgeLabel = useMemo(() => {
    if (!displayResponse) return 'Media';
    const lowerBody = rawBody.toLowerCase().trim();
    if (
      contentType.includes('text/html') ||
      contentType.includes('application/xhtml+xml') ||
      lowerBody.startsWith('<!doctype html') ||
      lowerBody.startsWith('<html')
    ) {
      return 'HTML';
    }
    if (
      contentType.includes('image/svg') ||
      (contentType.includes('svg') && !contentType.includes('html')) ||
      (!lowerBody.includes('<html') && lowerBody.startsWith('<svg'))
    ) {
      return 'SVG';
    }
    if (contentType.startsWith('image/')) return 'Image';
    if (contentType.includes('application/pdf')) return 'PDF';
    if (contentType.startsWith('audio/')) return 'Audio';
    if (contentType.startsWith('video/')) return 'Video';
    return 'Media';
  }, [displayResponse, contentType, rawBody]);

  // Auto-switch to preview tab if response is pure image/svg/pdf/media (not HTML/JSON)
  useEffect(() => {
    if (displayResponse) {
      const lowerBody = rawBody.toLowerCase().trim();
      const isHtmlDoc =
        contentType.includes('text/html') ||
        lowerBody.startsWith('<!doctype html') ||
        lowerBody.startsWith('<html');
      const isPureMedia =
        !isHtmlDoc &&
        (contentType.startsWith('image/') ||
          (contentType.includes('svg') && !contentType.includes('html')) ||
          contentType.includes('application/pdf') ||
          contentType.startsWith('audio/') ||
          contentType.startsWith('video/'));
      if (isPureMedia) {
        setActiveTab('preview');
      }
    }
  }, [displayResponse?.timestamp]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Format Pretty Body (calculated with useMemo to keep hook order invariant)
  const { formattedBody, isJson } = useMemo(() => {
    if (!displayResponse?.body) return { formattedBody: '', isJson: false };
    try {
      const jsonObj = JSON.parse(displayResponse.body);
      return { formattedBody: JSON.stringify(jsonObj, null, 2), isJson: true };
    } catch {
      return { formattedBody: displayResponse.body, isJson: false };
    }
  }, [displayResponse?.body]);

  // Search matches calculation (always called at top level)
  const searchMatches = useMemo(() => {
    if (!searchQuery || !displayResponse) return [];
    const text = activeTab === 'pretty' ? formattedBody : displayResponse.body;
    if (!text) return [];

    const matches: { start: number; end: number }[] = [];
    try {
      let regex: RegExp;
      if (isRegex) {
        regex = new RegExp(searchQuery, isCaseSensitive ? 'g' : 'gi');
      } else {
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, isCaseSensitive ? 'g' : 'gi');
      }

      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length });
        if (matches.length >= 500) break;
      }
    } catch {
      // Ignore invalid regex patterns
    }
    return matches;
  }, [searchQuery, isCaseSensitive, isRegex, formattedBody, displayResponse?.body, activeTab]);

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery, isCaseSensitive, isRegex]);

  // Auto-scroll active search match into view
  useEffect(() => {
    if (isSearchOpen && searchMatches.length > 0) {
      const el = document.getElementById(`search-match-${currentMatchIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentMatchIndex, searchMatches, isSearchOpen, activeTab]);

  if (isLoading) {
    return (
      <div className="h-full bg-slate-950 border-t border-slate-800 flex flex-col items-center justify-center text-slate-400 p-8">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="font-semibold text-slate-200 text-sm">Executing HTTP Request...</p>
        <p className="text-xs text-slate-500 font-mono mt-1">Executing request via HTTP engine (auto client / proxy)</p>
      </div>
    );
  }

  if (!displayResponse) {
    return (
      <div className="h-full bg-slate-950 border-t border-slate-800 flex flex-col items-center justify-center text-slate-500 p-8 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
          <Code className="w-6 h-6 text-slate-600" />
        </div>
        <p className="font-bold text-slate-300 text-sm">No Response Received Yet</p>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Click <strong className="text-emerald-400">Send Request</strong> or press <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">Ctrl+Enter</code> to execute this REST call.
        </p>

        {savedResponses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 max-w-sm w-full">
            <p className="text-xs font-semibold text-emerald-400 mb-2">Or check previously saved responses ({savedResponses.length}):</p>
            <div className="space-y-1.5 text-left max-h-40 overflow-y-auto">
              {savedResponses.map((snap) => (
                <button
                  key={snap.id}
                  type="button"
                  onClick={() => setSelectedSnapshotId(snap.id)}
                  className="w-full p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <span className="font-medium text-slate-200 truncate">{snap.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400 shrink-0 ml-2">{snap.response.status} {snap.response.statusText}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (status >= 300 && status < 400) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (status >= 400 && status < 500) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  const handleCopy = () => {
    if (!displayResponse) return;
    navigator.clipboard.writeText(displayResponse.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!displayResponse) return;
    const isJsonFormat = (() => {
      try {
        JSON.parse(displayResponse.body);
        return true;
      } catch {
        return false;
      }
    })();
    const ext = isJsonFormat ? 'json' : 'txt';
    const blob = new Blob([displayResponse.body], { type: isJsonFormat ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `response_${displayResponse.status}_${Date.now()}.${ext}`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleOpenSaveModal = () => {
    if (!displayResponse) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSnapshotTitleInput(`Snapshot ${displayResponse.status} ${displayResponse.statusText} (${timeStr})`);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSaveSnapshot = () => {
    if (!displayResponse || !onSaveResponseSnapshot) return;
    onSaveResponseSnapshot(displayResponse, snapshotTitleInput.trim() || 'Saved Response Snapshot');
    setIsSaveModalOpen(false);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % searchMatches.length);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
  };

  const activeAssertions = (assertions || []).filter((a) => a.enabled);
  const passedAssertions = activeAssertions.filter((a) => a.passed);

  return (
    <div className="h-full flex flex-col bg-slate-950 border-t border-slate-800 overflow-hidden relative">
      {/* Saved Toast Banner */}
      {showSaveToast && (
        <div className="absolute top-2 right-2 z-40 bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <BookmarkCheck className="w-4 h-4" />
          <span>Response Snapshot Saved!</span>
        </div>
      )}

      {/* Floating Response Search Bar */}
      {isSearchOpen && (
        <div className="absolute top-12 right-4 z-40">
          <ResponseSearchBar
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            query={searchQuery}
            onChangeQuery={setSearchQuery}
            matchCount={searchMatches.length}
            currentMatchIndex={currentMatchIndex}
            onNextMatch={handleNextMatch}
            onPrevMatch={handlePrevMatch}
            isCaseSensitive={isCaseSensitive}
            onToggleCaseSensitive={() => setIsCaseSensitive((v) => !v)}
            isRegex={isRegex}
            onToggleRegex={() => setIsRegex((v) => !v)}
          />
        </div>
      )}

      {/* Response Header Bar */}
      <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-3 overflow-x-auto">
          {/* Saved Snapshot Selector Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono shrink-0">View:</span>
            <select
              value={selectedSnapshotId || 'live'}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSnapshotId(val === 'live' ? null : val);
              }}
              className="bg-transparent text-xs text-emerald-400 font-medium focus:outline-none cursor-pointer"
            >
              <option value="live" className="bg-slate-900 text-slate-200">
                Live Execution Response {response ? `(${response.status})` : ''}
              </option>
              {savedResponses.map((snap) => (
                <option key={snap.id} value={snap.id} className="bg-slate-900 text-slate-200">
                  📁 {snap.name} ({snap.response.status})
                </option>
              ))}
            </select>
          </div>

          {/* Status Badge */}
          <div
            className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs flex items-center space-x-1.5 ${getStatusColor(
              displayResponse.status
            )}`}
          >
            {displayResponse.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>
              {displayResponse.status} {displayResponse.statusText}
            </span>
          </div>

          {/* Time duration */}
          <div className="flex items-center space-x-1 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{displayResponse.duration} ms</span>
          </div>

          {/* Size */}
          <div className="flex items-center space-x-1 text-xs font-mono text-slate-300">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>{(displayResponse.size / 1024).toFixed(2)} KB</span>
          </div>

          {/* Test Outcomes Badge if available */}
          {activeAssertions.length > 0 && (
            <div
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold flex items-center space-x-1 border ${
                passedAssertions.length === activeAssertions.length
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              <FlaskConical className="w-3 h-3" />
              <span>
                {passedAssertions.length}/{activeAssertions.length} Tests Passed
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons: Find, Save Snapshot, Download, Copy, Delete */}
        <div className="flex items-center space-x-1.5">
          {/* Find in response */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
              isSearchOpen
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Find in response (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Find</span>
          </button>

          {/* Save Response Snapshot Button */}
          {onSaveResponseSnapshot && (
            <button
              type="button"
              onClick={handleOpenSaveModal}
              className="flex items-center space-x-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold transition-colors cursor-pointer"
              title="Save this response snapshot to check later"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Save Resp</span>
            </button>
          )}

          {/* Download Response Body */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-medium transition-colors cursor-pointer"
            title="Download Response Body"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          {/* Copy Response Body */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center space-x-1 min-w-[76px] text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-medium transition-colors cursor-pointer"
            title="Copy Response Body"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Delete active snapshot if viewing a saved snapshot */}
          {activeSnapshot && onDeleteSavedResponseSnapshot && (
            <button
              type="button"
              onClick={() => {
                onDeleteSavedResponseSnapshot(activeSnapshot.id);
                setSelectedSnapshotId(null);
              }}
              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer border border-rose-500/30"
              title="Delete Saved Snapshot"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Response View Navigation Tabs */}
      <div className="flex items-center px-4 bg-slate-900/60 border-b border-slate-800 text-xs font-semibold space-x-6 shrink-0 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('pretty')}
          className={`py-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'pretty'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Pretty Body</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('raw')}
          className={`py-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'raw'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Raw Body</span>
        </button>

        {/* Rich Preview Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`py-2 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeTab === 'preview'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
          {hasRichPreview && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono uppercase">
              {previewBadgeLabel}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`py-2 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeTab === 'schema'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Schema</span>
          {isJson && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
              Tree
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('headers')}
          className={`py-2 border-b-2 flex items-center space-x-1 transition-colors cursor-pointer ${
            activeTab === 'headers'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Response Headers</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono">
            {Object.keys(displayResponse.headers || {}).length}
          </span>
        </button>

        {activeAssertions.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`py-2 border-b-2 flex items-center space-x-1 transition-colors ${
              activeTab === 'tests'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Test Results</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
              {passedAssertions.length}/{activeAssertions.length}
            </span>
          </button>
        )}

        {(displayResponse.scriptLogs?.length || 0) > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-2 border-b-2 flex items-center space-x-1 transition-colors ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Script Logs</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
              {displayResponse.scriptLogs?.length}
            </span>
          </button>
        )}
      </div>

      {/* Tab Content Body */}
      {activeTab === 'preview' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <ResponseRichPreview response={displayResponse} />
        </div>
      ) : activeTab === 'schema' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <JsonSchemaTreeViewer responseBody={displayResponse.body} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 select-text">
          {activeTab === 'pretty' && (
            <div className="space-y-3">
              <pre className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed select-text">
                <code>
                  {isJson
                    ? highlightJson(formattedBody, searchMatches, currentMatchIndex)
                    : renderHighlightedSegment(
                        formattedBody,
                        0,
                        searchMatches,
                        currentMatchIndex,
                        undefined,
                        'pr'
                      )}
                </code>
              </pre>
            </div>
          )}

          {activeTab === 'raw' && (
            <pre className="w-full font-mono text-xs p-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl focus:outline-none leading-relaxed select-text overflow-x-auto whitespace-pre-wrap">
              <code>
                {renderHighlightedSegment(
                  displayResponse.body,
                  0,
                  searchMatches,
                  currentMatchIndex,
                  undefined,
                  'rw'
                )}
              </code>
            </pre>
          )}

          {activeTab === 'headers' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
              <div className="grid grid-cols-12 bg-slate-900/80 px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                <div className="col-span-4">Header Key</div>
                <div className="col-span-8">Header Value</div>
              </div>

              {Object.entries(displayResponse.headers || {}).map(([key, val]) => (
                <div key={key} className="grid grid-cols-12 px-3 py-2 items-center gap-2 text-xs font-mono hover:bg-slate-900/40">
                  <div className="col-span-4 text-emerald-400 font-bold truncate">{key}</div>
                  <div className="col-span-8 text-slate-200 break-all">{val}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300">Automated Assertion Results:</div>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 font-mono text-xs">
                {activeAssertions.map((a) => (
                  <div key={a.id} className="p-3 flex items-start justify-between bg-slate-900/60">
                    <div className="flex items-start space-x-2">
                      {a.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-slate-200">{a.message || a.type}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Target: {a.targetValue}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        a.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {a.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-amber-300 flex items-center space-x-2">
                <Terminal className="w-4 h-4" />
                <span>Pre / Post Request Execution Console Logs:</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-amber-200 space-y-1.5 overflow-x-auto leading-relaxed">
                {(displayResponse.scriptLogs || []).map((log, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className="text-slate-500 select-none">[{i + 1}]</span>
                    <span className="whitespace-pre-wrap">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Snapshot Modal */}
      {isSaveModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSaveModalOpen(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <BookmarkPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Save Response Snapshot</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Save this response payload ({displayResponse.status} {displayResponse.statusText}) under this REST request to inspect or compare later anytime.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Snapshot Name / Label:</label>
              <input
                type="text"
                autoFocus
                value={snapshotTitleInput}
                onChange={(e) => setSnapshotTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmSaveSnapshot();
                  if (e.key === 'Escape') setIsSaveModalOpen(false);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="e.g. 200 OK Initial Success Payload"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveSnapshot}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-md flex items-center space-x-1.5"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>Save Snapshot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
