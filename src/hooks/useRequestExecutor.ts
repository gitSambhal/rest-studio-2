import { useState } from 'react';
import {
  RestRequest,
  ExecutionResponse,
  RequestHistoryItem,
  RequestStatusInfo,
  Organization,
  Project,
  RestFile,
} from '../types';
import { ScopeContext, resolveEnvVariables } from '../utils/envUtils';
import { runPreRequestScript, runPostRequestScript } from '../utils/scriptRunner';
import { evaluateAssertions } from '../utils/testUtils';
import { executeHttpRequest } from '../utils/httpExecutor';

interface UseRequestExecutorProps {
  activeOrg: Organization | undefined;
  activeProject: Project | undefined;
  activeFile: RestFile | undefined;
  scopeCtx: ScopeContext;
  handleUpdateActiveRequest: (req: RestRequest) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  saveScriptVariables: (newVars: Record<string, string>) => void;
}

export function useRequestExecutor({
  activeOrg,
  activeProject,
  activeFile,
  scopeCtx,
  handleUpdateActiveRequest,
  showToast,
  saveScriptVariables,
}: UseRequestExecutorProps) {
  const [executingRequests, setExecutingRequests] = useState<Record<string, AbortController>>({});
  const [requestStatuses, setRequestStatuses] = useState<Record<string, RequestStatusInfo>>({});
  const [lastResponse, setLastResponse] = useState<ExecutionResponse | null>(null);

  // History State
  const [history, setHistory] = useState<RequestHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('reststudio_history') || localStorage.getItem('restpulse_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const handleStopRequest = (requestId: string) => {
    const controller = executingRequests[requestId];
    if (controller) {
      controller.abort();
      setExecutingRequests((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      setRequestStatuses((prev) => ({
        ...prev,
        [requestId]: {
          state: 'error',
          error: 'Cancelled by user',
          timestamp: Date.now(),
        },
      }));
      showToast('info', 'Request Cancelled', 'The in-flight request was aborted.');
    }
  };

  const handleExecuteRequest = async (req: RestRequest): Promise<ExecutionResponse | null> => {
    const existing = executingRequests[req.id];
    if (existing) {
      existing.abort();
    }

    const controller = new AbortController();
    setExecutingRequests((prev) => ({ ...prev, [req.id]: controller }));
    setRequestStatuses((prev) => ({
      ...prev,
      [req.id]: { state: 'loading', timestamp: Date.now() },
    }));

    // 1. Resolve Target URL
    let targetUrl = resolveEnvVariables(req.url, scopeCtx).resolved.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (
        targetUrl.startsWith('localhost') ||
        targetUrl.startsWith('127.0.0.1') ||
        targetUrl.startsWith('0.0.0.0') ||
        targetUrl.startsWith('192.168.') ||
        targetUrl.startsWith('10.') ||
        targetUrl.startsWith('172.')
      ) {
        targetUrl = 'http://' + targetUrl;
      } else {
        targetUrl = 'https://' + targetUrl;
      }
    }

    // 2. Resolve Query Params
    const queryParams = req.queryParams?.filter((q) => q.enabled && q.key) || [];
    if (queryParams.length > 0) {
      const urlObj = new URL(targetUrl);
      queryParams.forEach((qp) => {
        const k = resolveEnvVariables(qp.key, scopeCtx).resolved;
        const v = resolveEnvVariables(qp.value, scopeCtx).resolved;
        urlObj.searchParams.append(k, v);
      });
      targetUrl = urlObj.toString();
    }

    // 3. Resolve Headers
    const resolvedHeaders: Record<string, string> = {};
    const effectiveHeaders = req.headers?.filter((h) => h.enabled && h.key) || [];
    effectiveHeaders.forEach((h) => {
      const key = resolveEnvVariables(h.key, scopeCtx).resolved;
      const value = resolveEnvVariables(h.value, scopeCtx).resolved;
      resolvedHeaders[key] = value;
    });

    // 4. Resolve Auth
    let effectiveAuth = req.auth;
    if (effectiveAuth?.type === 'inherit') {
      const parentAuth = activeProject?.auth;
      if (parentAuth && parentAuth.type !== 'none' && parentAuth.type !== 'inherit') {
        effectiveAuth = parentAuth;
      }
    }

    if (effectiveAuth && effectiveAuth.type !== 'none' && effectiveAuth.type !== 'inherit') {
      if (effectiveAuth.type === 'bearer' && effectiveAuth.bearerToken) {
        const token = resolveEnvVariables(effectiveAuth.bearerToken, scopeCtx).resolved;
        resolvedHeaders['Authorization'] = `Bearer ${token}`;
      } else if (
        effectiveAuth.type === 'basic' &&
        (effectiveAuth.basicUsername || effectiveAuth.basicPassword)
      ) {
        const u = resolveEnvVariables(effectiveAuth.basicUsername || '', scopeCtx).resolved;
        const p = resolveEnvVariables(effectiveAuth.basicPassword || '', scopeCtx).resolved;
        try {
          resolvedHeaders['Authorization'] = `Basic ${btoa(`${u}:${p}`)}`;
        } catch (e) {
          resolvedHeaders['Authorization'] = `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;
        }
      } else if (effectiveAuth.type === 'apikey' && effectiveAuth.apiKeyKey) {
        const key = resolveEnvVariables(effectiveAuth.apiKeyKey, scopeCtx).resolved;
        const value = resolveEnvVariables(effectiveAuth.apiKeyValue || '', scopeCtx).resolved;
        const addTo = effectiveAuth.apiKeyAddTo || 'header';
        if (key && value) {
          if (addTo === 'header') {
            resolvedHeaders[key] = value;
          } else if (addTo === 'query') {
            targetUrl +=
              (targetUrl.includes('?') ? '&' : '?') +
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          }
        }
      }
    }

    // Ensure Content-Type header if body mode requires it
    const existingContentTypeKey = Object.keys(resolvedHeaders).find(
      (k) => k.toLowerCase() === 'content-type'
    );
    if (!existingContentTypeKey) {
      if (req.body.mode === 'json') {
        resolvedHeaders['Content-Type'] = 'application/json';
      } else if (req.body.mode === 'x-www-form-urlencoded') {
        resolvedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (req.body.mode === 'raw') {
        resolvedHeaders['Content-Type'] = 'text/plain';
      } else if (req.body.mode === 'binary' && req.body.binaryFile?.fileType) {
        resolvedHeaders['Content-Type'] = req.body.binaryFile.fileType;
      }
    }

    // 5. Resolve Body
    let resolvedBody: any = undefined;
    if (req.body.mode === 'json' || req.body.mode === 'raw' || req.body.mode === 'x-www-form-urlencoded') {
      if (
        req.body.mode === 'x-www-form-urlencoded' &&
        req.body.urlencodedItems &&
        req.body.urlencodedItems.length > 0
      ) {
        const uParams = req.body.urlencodedItems
          .filter((p) => p.enabled && p.key)
          .map(
            (p) =>
              `${encodeURIComponent(resolveEnvVariables(p.key, scopeCtx).resolved)}=${encodeURIComponent(
                resolveEnvVariables(p.value, scopeCtx).resolved
              )}`
          );
        resolvedBody = uParams.join('&');
      } else {
        resolvedBody = resolveEnvVariables(req.body.rawText, scopeCtx).resolved;
      }
    }

    // 6. Pre-Request Script
    let scriptLogs: string[] = [];
    if (req.preRequestScript?.enabled) {
      const preResult = await runPreRequestScript(
        req,
        scopeCtx,
        resolvedHeaders,
        targetUrl,
        typeof resolvedBody === 'string' ? resolvedBody : JSON.stringify(resolvedBody || '')
      );

      scriptLogs = preResult.logs || [];

      if (preResult.newVariables && Object.keys(preResult.newVariables).length > 0) {
        saveScriptVariables(preResult.newVariables);
      }

      if (!preResult.success && preResult.error) {
        const preErrResp: ExecutionResponse = {
          status: 400,
          statusText: 'Pre-Request Validation Failed',
          headers: {},
          body: JSON.stringify({ error: preResult.error, logs: preResult.logs }, null, 2),
          size: 0,
          duration: 0,
          timestamp: Date.now(),
          ok: false,
          error: preResult.error,
          scriptLogs,
        };
        setLastResponse(preErrResp);
        setExecutingRequests((prev) => {
          const next = { ...prev };
          delete next[req.id];
          return next;
        });
        showToast('error', 'Pre-Request Script Error', preResult.error);
        return preErrResp;
      }

      if (preResult.modifiedUrl) targetUrl = preResult.modifiedUrl;
      if (preResult.modifiedHeaders) Object.assign(resolvedHeaders, preResult.modifiedHeaders);
      if (preResult.modifiedBody) resolvedBody = preResult.modifiedBody;
    }

    try {
      const responseData = await executeHttpRequest({
        method: req.method,
        url: targetUrl,
        headers: resolvedHeaders,
        body: resolvedBody,
        formDataItems: req.body.formDataItems,
        binaryFile: req.body.binaryFile,
        signal: controller.signal,
      });
      responseData.scriptLogs = scriptLogs;

      // 7. Post-Request Script
      if (req.postRequestScript?.enabled) {
        const postResult = runPostRequestScript(req, responseData);
        if (postResult.logs && postResult.logs.length > 0) {
          responseData.scriptLogs = [...(responseData.scriptLogs || []), ...postResult.logs];
        }
        if (postResult.newVariables && Object.keys(postResult.newVariables).length > 0) {
          saveScriptVariables(postResult.newVariables);
        }
        if (postResult.assertions && postResult.assertions.length > 0) {
          responseData.testResults = postResult.assertions;
        }
      }

      setLastResponse(responseData);
      setRequestStatuses((prev) => ({
        ...prev,
        [req.id]: {
          state: responseData.ok || (responseData.status >= 200 && responseData.status < 400) ? 'success' : 'error',
          statusCode: responseData.status,
          duration: responseData.duration,
          error: responseData.error,
          timestamp: Date.now(),
        },
      }));

      if (req.assertions && req.assertions.length > 0) {
        const { assertions: evaluated } = evaluateAssertions(req.assertions, responseData);
        handleUpdateActiveRequest({
          ...req,
          assertions: evaluated,
        });
      }

      const historyItem: RequestHistoryItem = {
        id: 'hist_' + Date.now(),
        projectId: activeProject?.id || 'standalone_scratchpad',
        fileId: activeFile?.id,
        requestId: req.id,
        requestName: req.name || `${req.method} ${targetUrl}`,
        method: req.method,
        url: req.url,
        resolvedUrl: targetUrl,
        status: responseData.status,
        duration: responseData.duration,
        size: responseData.size,
        timestamp: Date.now(),
        response: responseData,
      };

      setHistory((prev) => {
        const next = [historyItem, ...prev.slice(0, 49)];
        try {
          localStorage.setItem('reststudio_history', JSON.stringify(next));
          localStorage.setItem('restpulse_history', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      return responseData;
    } catch (err: any) {
      const errResp: ExecutionResponse = {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: JSON.stringify({ error: err.message || 'Failed to execute request' }, null, 2),
        size: 0,
        duration: 0,
        timestamp: Date.now(),
        ok: false,
        error: err.message,
        scriptLogs,
      };
      setLastResponse(errResp);
      setRequestStatuses((prev) => ({
        ...prev,
        [req.id]: {
          state: 'error',
          statusCode: errResp.status || 0,
          error: errResp.error,
          timestamp: Date.now(),
        },
      }));
      return errResp;
    } finally {
      setExecutingRequests((prev) => {
        const next = { ...prev };
        delete next[req.id];
        return next;
      });
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('reststudio_history');
      localStorage.removeItem('restpulse_history');
    } catch (e) {}
    showToast('info', 'History Cleared', 'Execution history log has been cleared.');
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      try {
        localStorage.setItem('reststudio_history', JSON.stringify(next));
        localStorage.setItem('restpulse_history', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  return {
    executingRequests,
    requestStatuses,
    lastResponse,
    setLastResponse,
    history,
    setHistory,
    handleExecuteRequest,
    handleStopRequest,
    handleClearHistory,
    handleDeleteHistoryItem,
  };
}
