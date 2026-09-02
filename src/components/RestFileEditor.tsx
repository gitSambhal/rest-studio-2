import React, { useState, useEffect } from 'react';
import { RestFile, RestRequest, EnvVariable, ExecutionResponse, HTTPMethod } from '../types';
import { parseRestFileContent, generateRestFileContent } from '../utils/restParser';
import { ScopeContext } from '../utils/envUtils';
import { VarBadge, RenderTextWithVars } from './VarBadge';
import {
  Play,
  Copy,
  Check,
  Variable,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Code2,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileCode,
  Search,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

interface RestFileEditorProps {
  file: RestFile;
  isDarkMode?: boolean;
  envVariables?: EnvVariable[];
  scopeCtx?: ScopeContext;
  onSaveFileContent: (
    fileId: string,
    rawContent: string,
    parsedRequests: RestRequest[],
    fileVariables?: Record<string, string>
  ) => void;
  onRunSingleRequest: (req: RestRequest) => Promise<ExecutionResponse>;
  onOpenInBuilder?: (req: RestRequest) => void;
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const RestFileEditor: React.FC<RestFileEditorProps> = ({
  file,
  isDarkMode = true,
  envVariables,
  scopeCtx,
  onSaveFileContent,
  onRunSingleRequest,
  onOpenInBuilder,
  showToast,
}) => {
  const [content, setContent] = useState(file.rawContent || generateRestFileContent(file.requests));
  const [copied, setCopied] = useState(false);
  const [copiedRespId, setCopiedRespId] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Execution states
  const [executingReqIds, setExecutingReqIds] = useState<Set<string>>(new Set());
  const [responsesMap, setResponsesMap] = useState<Record<string, ExecutionResponse>>({});
  const [expandedResponseBlockId, setExpandedResponseBlockId] = useState<string | null>(null);
  const [activeResponseTab, setActiveResponseTab] = useState<'body' | 'headers' | 'tests' | 'logs'>('body');
  const [responseSearchQuery, setResponseSearchQuery] = useState('');
  const [isRunAllRunning, setIsRunAllRunning] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    setContent(file.rawContent || generateRestFileContent(file.requests));
  }, [file.id, file.rawContent]);

  const handleContentChange = (newText: string) => {
    setContent(newText);
    try {
      const { requests, fileVariables } = parseRestFileContent(newText, file.name);
      setParseError(null);
      onSaveFileContent(file.id, newText, requests, fileVariables);
    } catch (err: any) {
      setParseError(err.message || 'Syntax warning');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyResponseBody = (reqId: string, bodyText: string) => {
    navigator.clipboard.writeText(bodyText);
    setCopiedRespId(reqId);
    if (showToast) {
      showToast('info', 'Copied to Clipboard', 'Response body copied successfully');
    }
    setTimeout(() => setCopiedRespId(null), 2000);
  };

  const parsed = parseRestFileContent(content, file.name);

  // Extract all variables present in file content or fileVariables
  const fileVars = parsed.fileVariables || {};
  const extractedVarKeys = Array.from(
    new Set([
      ...Object.keys(fileVars),
      ...Array.from(content.matchAll(/\{\{([a-zA-Z0-9_$.-]+)\}\}/g)).map((m) => m[1]),
    ])
  );

  // Run single executable block
  const handleRunBlock = async (req: RestRequest) => {
    const blockKey = req.id || req.name || req.url;
    setExecutingReqIds((prev) => new Set(prev).add(blockKey));

    try {
      const response = await onRunSingleRequest(req);
      setResponsesMap((prev) => ({
        ...prev,
        [blockKey]: response,
      }));
      setExpandedResponseBlockId(blockKey);

      if (showToast) {
        if (response.ok || (response.status >= 200 && response.status < 400)) {
          showToast(
            'success',
            `${req.method} ${req.name || 'Request'}: ${response.status} ${response.statusText || 'OK'}`,
            `${response.duration}ms • ${(response.size / 1024).toFixed(1)} KB`
          );
        } else {
          showToast(
            'error',
            `${req.method} ${req.name || 'Request'} Failed: ${response.status || 'Error'}`,
            response.error || response.statusText || 'Request encountered an error'
          );
        }
      }
    } catch (err: any) {
      const fallbackErrorResp: ExecutionResponse = {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: JSON.stringify({ error: err?.message || 'Failed to execute request' }, null, 2),
        size: 0,
        duration: 0,
        timestamp: Date.now(),
        ok: false,
        error: err?.message || 'Network request failed',
      };
      setResponsesMap((prev) => ({
        ...prev,
        [blockKey]: fallbackErrorResp,
      }));
      setExpandedResponseBlockId(blockKey);
      if (showToast) {
        showToast('error', `Execution Failed: ${req.name || 'Request'}`, err?.message || 'Network Error');
      }
    } finally {
      setExecutingReqIds((prev) => {
        const next = new Set(prev);
        next.delete(blockKey);
        return next;
      });
    }
  };

  // Run all executable blocks sequentially
  const handleRunAllBlocks = async () => {
    if (parsed.requests.length === 0 || isRunAllRunning) return;

    setIsRunAllRunning(true);
    setRunAllProgress({ current: 0, total: parsed.requests.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < parsed.requests.length; i++) {
      const req = parsed.requests[i];
      const blockKey = req.id || req.name || req.url;
      setRunAllProgress({ current: i + 1, total: parsed.requests.length });
      setExecutingReqIds((prev) => new Set(prev).add(blockKey));

      try {
        const resp = await onRunSingleRequest(req);
        setResponsesMap((prev) => ({
          ...prev,
          [blockKey]: resp,
        }));
        if (resp.ok || (resp.status >= 200 && resp.status < 400)) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      } finally {
        setExecutingReqIds((prev) => {
          const next = new Set(prev);
          next.delete(blockKey);
          return next;
        });
      }

      // Small delay between sequential requests
      if (i < parsed.requests.length - 1) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    setIsRunAllRunning(false);
    setRunAllProgress(null);

    if (showToast) {
      if (failCount === 0) {
        showToast('success', `Completed ${parsed.requests.length} requests`, `All executable blocks succeeded.`);
      } else {
        showToast(
          'warning',
          `Ran ${parsed.requests.length} requests`,
          `${successCount} succeeded, ${failCount} failed.`
        );
      }
    }
  };

  const getMethodBadgeClass = (method: HTTPMethod) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'POST':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'PUT':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'DELETE':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'PATCH':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = (status: number, ok?: boolean) => {
    if (status >= 200 && status < 300) {
      return {
        label: `${status} OK`,
        color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2,
      };
    }
    if (status >= 300 && status < 400) {
      return {
        label: `${status} Redirect`,
        color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        icon: CheckCircle2,
      };
    }
    if (status >= 400 && status < 500) {
      return {
        label: `${status} Error`,
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icon: AlertCircle,
      };
    }
    if (status >= 500) {
      return {
        label: `${status} Server Error`,
        color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        icon: XCircle,
      };
    }
    return {
      label: 'Error',
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      icon: XCircle,
    };
  };

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden transition-colors ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Header Bar */}
      <div
        className={`p-3 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center space-x-2.5 sm:space-x-3 flex-wrap">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono font-bold text-sm truncate max-w-[200px]">{file.name}</span>
          </div>

          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
              isDarkMode
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {parsed.requests.length} {parsed.requests.length === 1 ? 'Request' : 'Requests'} Parsed
          </span>

          {parseError && (
            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-mono">
              Syntax Warning
            </span>
          )}

          {/* Active variables inspector toolbar */}
          {extractedVarKeys.length > 0 && (
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border hidden md:flex ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-100/80 border-slate-200'
              }`}
            >
              <Variable className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className={`text-[11px] font-sans font-medium shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Variables:
              </span>
              <div className="flex items-center space-x-1.5 overflow-x-auto max-w-xs scrollbar-none">
                {extractedVarKeys.map((vk) => (
                  <VarBadge
                    key={vk}
                    varKey={vk}
                    envVariables={envVariables}
                    fileVariables={fileVars}
                    scopeCtx={scopeCtx}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {parsed.requests.length > 0 && (
            <button
              type="button"
              onClick={handleRunAllBlocks}
              disabled={isRunAllRunning}
              className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                isRunAllRunning
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
              title="Run all executable request blocks in this file"
            >
              {isRunAllRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    Running ({runAllProgress?.current}/{runAllProgress?.total})
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run All ({parsed.requests.length})</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Copy full script content to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Code Textarea + Executable Request Blocks & Live Inspector */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
        {/* Left: Interactive Code Textarea (7 cols on lg) */}
        <div
          className={`lg:col-span-7 p-3 sm:p-4 border-b lg:border-b-0 lg:border-r flex flex-col overflow-y-auto space-y-3 ${
            isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs font-mono flex items-center justify-between">
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
              HTTP Request Script Code
            </span>
            <span className="text-emerald-400 text-[11px]">
              @var = val &nbsp;|&nbsp; ### Request Name
            </span>
          </div>

          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={16}
            className={`w-full flex-1 font-mono text-xs p-4 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500/50 leading-relaxed min-h-[260px] ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
            placeholder="### Get Users&#10;GET https://api.example.com/users&#10;Accept: application/json&#10;&#10;### Create User&#10;POST https://api.example.com/users&#10;Content-Type: application/json&#10;&#10;{&#10;  &quot;name&quot;: &quot;Alex&quot;&#10;}"
            spellCheck={false}
          />

          {extractedVarKeys.length > 0 && (
            <div
              className={`p-3 rounded-xl border space-y-2 shrink-0 ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-sans font-semibold">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                  Live Variable Resolution Preview:
                </span>
                <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {extractedVarKeys.length} Variables Detected
                </span>
              </div>

              <div
                className={`p-3 rounded-lg font-mono text-xs leading-relaxed whitespace-pre-wrap break-all overflow-x-auto max-h-36 border ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <RenderTextWithVars
                  text={content}
                  envVariables={envVariables}
                  fileVariables={fileVars}
                  scopeCtx={scopeCtx}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Executable Request Cards & Inline Response Viewer (5 cols on lg) */}
        <div
          className={`lg:col-span-5 p-3 sm:p-4 overflow-y-auto space-y-3.5 flex flex-col min-h-0 ${
            isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Executable Blocks
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                {parsed.requests.length}
              </span>
            </div>
            <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              One-Click Instant Execution
            </span>
          </div>

          {parsed.requests.length === 0 && (
            <div
              className={`text-center py-16 px-4 rounded-2xl border border-dashed flex flex-col items-center justify-center space-y-2 ${
                isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'
              }`}
            >
              <Code2 className="w-8 h-8 opacity-40 mb-1 text-emerald-400" />
              <p className="text-xs font-mono font-medium">No request blocks found in this file.</p>
              <p className="text-[11px] max-w-xs text-center leading-relaxed">
                Type <code className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">### Request Name</code> followed by <code className="text-emerald-400">METHOD URL</code> to create executable endpoints.
              </p>
            </div>
          )}

          <div className="space-y-3 flex-1 overflow-y-auto">
            {parsed.requests.map((req, idx) => {
              const blockKey = req.id || req.name || req.url;
              const isExecuting = executingReqIds.has(blockKey);
              const response = responsesMap[blockKey];
              const isResponseExpanded = expandedResponseBlockId === blockKey;
              const statusInfo = response ? getStatusBadge(response.status, response.ok) : null;
              const StatusIcon = statusInfo?.icon;

              return (
                <div
                  key={blockKey || idx}
                  className={`p-3 rounded-xl border transition-all shadow-sm space-y-2.5 ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  } ${isResponseExpanded ? 'ring-1 ring-emerald-500/30' : ''}`}
                >
                  {/* Card Header: Request Name & Action Buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase shrink-0 ${getMethodBadgeClass(req.method)}`}>
                        {req.method}
                      </span>
                      <span className={`font-mono text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`} title={req.name}>
                        {req.name || `Request ${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {onOpenInBuilder && (
                        <button
                          type="button"
                          onClick={() => onOpenInBuilder(req)}
                          className={`p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            isDarkMode
                              ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700/60'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border-slate-200'
                          }`}
                          title="Open in Visual Request Builder"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRunBlock(req)}
                        disabled={isExecuting}
                        className={`flex items-center space-x-1 font-bold text-xs px-3 py-1.5 rounded-lg shadow transition-all cursor-pointer disabled:opacity-60 ${
                          isExecuting
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                        }`}
                        title="Execute request block"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Running</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Run</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* URL Row */}
                  <div
                    className={`font-mono text-[11px] px-2.5 py-1.5 rounded-lg border truncate ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800/80 text-slate-300' : 'bg-slate-100/80 border-slate-200 text-slate-700'
                    }`}
                  >
                    <RenderTextWithVars
                      text={req.url}
                      envVariables={envVariables}
                      fileVariables={fileVars}
                      scopeCtx={scopeCtx}
                    />
                  </div>

                  {/* Headers / Body Preview Snippet */}
                  {(req.headers.length > 0 || (req.body.mode !== 'none' && req.body.rawText)) && (
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
                      {req.headers.length > 0 && (
                        <span>{req.headers.length} header{req.headers.length > 1 ? 's' : ''}</span>
                      )}
                      {req.headers.length > 0 && req.body.mode !== 'none' && <span>•</span>}
                      {req.body.mode !== 'none' && (
                        <span className="uppercase">{req.body.mode} body</span>
                      )}
                    </div>
                  )}

                  {/* Executed Result Summary Bar */}
                  {response && (
                    <div
                      className={`pt-2 border-t flex items-center justify-between text-xs font-mono ${
                        isDarkMode ? 'border-slate-800/80' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2 flex-wrap">
                        {statusInfo && StatusIcon && (
                          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusInfo.label}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{response.duration}ms</span>
                        </div>

                        <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
                          <HardDrive className="w-3 h-3 text-slate-500" />
                          <span>{(response.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyResponseBody(blockKey, response.body)}
                          className={`p-1 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer`}
                          title="Copy response body"
                        >
                          {copiedRespId === blockKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedResponseBlockId(isResponseExpanded ? null : blockKey)
                          }
                          className={`flex items-center space-x-1 text-[11px] font-sans font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            isResponseExpanded
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isDarkMode
                              ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>{isResponseExpanded ? 'Hide' : 'Inspect'}</span>
                          {isResponseExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expandable Embedded Response Inspector Drawer */}
                  {response && isResponseExpanded && (
                    <div
                      className={`mt-2 p-3 rounded-xl border space-y-2.5 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Tab Headers inside Response Drawer */}
                      <div className="flex items-center justify-between border-b pb-2 border-slate-800/80">
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setActiveResponseTab('body')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              activeResponseTab === 'body'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Body
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveResponseTab('headers')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              activeResponseTab === 'headers'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Headers ({Object.keys(response.headers || {}).length})
                          </button>
                          {response.testResults && response.testResults.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveResponseTab('tests')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                activeResponseTab === 'tests'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Tests ({response.testResults.filter((t) => t.passed).length}/{response.testResults.length})
                            </button>
                          )}
                          {response.scriptLogs && response.scriptLogs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveResponseTab('logs')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                activeResponseTab === 'logs'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Logs ({response.scriptLogs.length})
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleCopyResponseBody(blockKey, response.body)}
                            className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer font-mono"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Body</span>
                          </button>
                        </div>
                      </div>

                      {/* Tab 1: Body */}
                      {activeResponseTab === 'body' && (
                        <div className="space-y-2">
                          <div
                            className={`p-3 rounded-lg font-mono text-[11px] max-h-60 overflow-y-auto leading-relaxed border whitespace-pre-wrap break-all ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-emerald-300' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            {response.body || (
                              <span className="text-slate-500 italic">Empty response body</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tab 2: Headers */}
                      {activeResponseTab === 'headers' && (
                        <div
                          className={`rounded-lg border max-h-48 overflow-y-auto ${
                            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <table className="w-full text-left font-mono text-[11px]">
                            <tbody className="divide-y divide-slate-800">
                              {Object.entries(response.headers || {}).map(([hk, hv]) => (
                                <tr key={hk} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                                  <td className="py-1.5 px-2.5 font-bold text-slate-400 w-1/3 truncate">{hk}</td>
                                  <td className="py-1.5 px-2.5 text-slate-200 break-all">{hv}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tab 3: Tests */}
                      {activeResponseTab === 'tests' && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {response.testResults?.map((test, tidx) => (
                            <div
                              key={tidx}
                              className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                                test.passed
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                {test.passed ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                                <span className="font-semibold truncate">
                                  {test.message || `${test.type}: ${test.targetValue}`}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] uppercase font-bold">
                                {test.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tab 4: Logs */}
                      {activeResponseTab === 'logs' && (
                        <div
                          className={`p-2.5 rounded-lg font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 border ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {response.scriptLogs?.map((log, lidx) => (
                            <div key={lidx} className="flex items-start space-x-2">
                              <span className="text-slate-500 select-none">›</span>
                              <span>{log}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
