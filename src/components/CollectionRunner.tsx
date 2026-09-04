import React, { useState } from 'react';
import { ExecutionResponse, Project, RestFile, RestRequest } from '../types';
import { PlayCircle, CheckCircle2, AlertCircle, Clock, Check, RefreshCw } from 'lucide-react';

interface CollectionRunnerProps {
  project: Project;
  onExecuteRequestProxy: (req: RestRequest) => Promise<ExecutionResponse>;
  isDarkMode?: boolean;
}

interface RunResult {
  request: RestRequest;
  response?: ExecutionResponse;
  status: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
}

export const CollectionRunner: React.FC<CollectionRunnerProps> = ({
  project,
  onExecuteRequestProxy,
  isDarkMode = true,
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string>('all');
  const [delayMs, setDelayMs] = useState<number>(200);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Gather requests to run
  const getRequestsToRun = (): RestRequest[] => {
    if (selectedFileId === 'all') {
      return (project?.files || []).flatMap((f) => f.requests || []);
    }
    const file = project?.files?.find((f) => f.id === selectedFileId);
    return file ? (file.requests || []) : [];
  };

  const handleStartRunner = async () => {
    const requests = getRequestsToRun();
    if (requests.length === 0) {
      alert('No requests available in the selected REST file or project.');
      return;
    }

    setIsRunning(true);
    const initialResults: RunResult[] = requests.map((req) => ({
      request: req,
      status: 'pending',
    }));
    setResults(initialResults);

    for (let i = 0; i < requests.length; i++) {
      setCurrentIndex(i);
      setResults((prev) => {
        const copy = [...prev];
        copy[i] = { ...copy[i], status: 'running' };
        return copy;
      });

      try {
        const resp = await onExecuteRequestProxy(requests[i]);
        setResults((prev) => {
          const copy = [...prev];
          copy[i] = {
            ...copy[i],
            status: resp.ok ? 'success' : 'failed',
            response: resp,
          };
          return copy;
        });
      } catch (err: any) {
        setResults((prev) => {
          const copy = [...prev];
          copy[i] = {
            ...copy[i],
            status: 'failed',
            error: err.message || 'Execution failed',
          };
          return copy;
        });
      }

      if (delayMs > 0 && i < requests.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    setIsRunning(false);
    setCurrentIndex(-1);
  };

  const total = results.length;
  const completed = results.filter((r) => r.status === 'success' || r.status === 'failed').length;
  const passed = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Top Configuration Bar */}
      <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <PlayCircle className="w-5 h-5 text-emerald-500" />
            <span className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>REST Collection Runner</span>
          </div>

          <div className={`flex items-center space-x-2 text-xs font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            <span>Target File:</span>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              disabled={isRunning}
              className={`border rounded-lg px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-emerald-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">Entire Project ({(project?.files || []).reduce((a, f) => a + (f.requests?.length || 0), 0)} requests)</option>
              {(project?.files || []).map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name} ({file.requests?.length || 0} requests)
                </option>
              ))}
            </select>
          </div>

          <div className={`flex items-center space-x-2 text-xs font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            <span>Delay (ms):</span>
            <input
              type="number"
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
              disabled={isRunning}
              step={100}
              min={0}
              className={`w-20 border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-emerald-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartRunner}
          disabled={isRunning}
          className="flex items-center justify-center space-x-2 min-w-[185px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs px-5 py-2 rounded-lg shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isRunning ? (
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
          ) : (
            <PlayCircle className="w-4 h-4 fill-slate-950" />
          )}
          <span>{isRunning ? 'Running Collection...' : 'Run Collection'}</span>
        </button>
      </div>

      {/* Progress & Summary Bar */}
      {total > 0 && (
        <div className={`p-3 border-b flex items-center justify-between text-xs font-mono shrink-0 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <div className="flex items-center space-x-6">
            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
              Progress: <strong>{completed} / {total}</strong>
            </span>
            <span className="text-emerald-500 font-bold">Passed: {passed}</span>
            <span className="text-rose-500 font-bold">Failed: {failed}</span>
          </div>

          <div className={`w-48 rounded-full h-2 overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
            <div
              className="bg-emerald-500 h-full transition-all duration-200"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results Log Table */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className={`border rounded-xl overflow-hidden divide-y ${isDarkMode ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-200'}`}>
          <div className={`grid grid-cols-12 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider font-mono ${isDarkMode ? 'bg-slate-900/80 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Method</div>
            <div className="col-span-4">Request Name</div>
            <div className="col-span-4">Target URL</div>
            <div className="col-span-2 text-right">Duration</div>
          </div>

          {results.map((item, idx) => (
            <div key={item.request.id + '_' + idx} className={`grid grid-cols-12 px-4 py-3 items-center font-mono text-xs transition-colors ${isDarkMode ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}`}>
              <div className="col-span-1">
                {item.status === 'pending' && <span className="text-slate-400">Pending</span>}
                {item.status === 'running' && (
                  <span className="text-emerald-500 font-bold animate-pulse flex items-center space-x-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Running</span>
                  </span>
                )}
                {item.status === 'success' && (
                  <span className="inline-flex items-center space-x-1 text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{item.response?.status}</span>
                  </span>
                )}
                {item.status === 'failed' && (
                  <span className="inline-flex items-center space-x-1 text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                    <AlertCircle className="w-3 h-3" />
                    <span>{item.response?.status || 'Error'}</span>
                  </span>
                )}
              </div>

              <div className={`col-span-1 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.request.method}</div>
              <div className={`col-span-4 font-bold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{item.request.name}</div>
              <div className={`col-span-4 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.request.url}</div>
              <div className={`col-span-2 text-right ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {item.response ? `${item.response.duration} ms` : '-'}
              </div>
            </div>
          ))}

          {results.length === 0 && (
            <div className={`py-16 text-center text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Select a REST file or project above and click "Run Collection" to execute test suite.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
