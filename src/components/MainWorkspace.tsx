import React, { useRef } from 'react';
import {
  RestRequest,
  RestFile,
  Project,
  ExecutionResponse,
  RequestHistoryItem,
  Environment,
  RequestAuth,
} from '../types';
import { ScopeContext } from '../utils/envUtils';
import { RequestEditor } from './RequestEditor';
import { ResponseViewer } from './ResponseViewer';
import { RestFileEditor } from './RestFileEditor';
import { CollectionRunner } from './CollectionRunner';
import { HistoryViewer } from './HistoryViewer';

export interface MainWorkspaceProps {
  activeTabMode: 'editor' | 'code' | 'runner' | 'history';
  activeRequest: RestRequest | undefined;
  activeFile: RestFile | undefined;
  activeProject: Project | undefined;
  activeEnv: Environment | undefined;
  scopeCtx: ScopeContext;
  isCurrentRequestStandalone: boolean;
  splitOrientation: 'left-right' | 'top-bottom';
  splitRatio: number;
  setSplitRatio: React.Dispatch<React.SetStateAction<number>>;
  executingRequests: Record<string, AbortController>;
  lastResponse: ExecutionResponse | null;
  setLastResponse: (resp: ExecutionResponse | null) => void;
  history: RequestHistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<RequestHistoryItem[]>>;
  isDarkMode: boolean;
  onSaveToProject: (req: RestRequest) => void;
  onUpdateProjectAuth: (auth: RequestAuth) => void;
  onUpdateRequest: (req: RestRequest) => void;
  onSendRequest: (req: RestRequest) => Promise<ExecutionResponse | null>;
  onStopRequest: (reqId: string) => void;
  updateProjectFiles: (files: RestFile[]) => void;
  handleOpenRequestInTab: (fileId: string, reqId: string) => void;
  setActiveTabMode: (mode: 'editor' | 'code' | 'runner' | 'history') => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  activeTabMode,
  activeRequest,
  activeFile,
  activeProject,
  activeEnv,
  scopeCtx,
  isCurrentRequestStandalone,
  splitOrientation,
  splitRatio,
  setSplitRatio,
  executingRequests,
  lastResponse,
  setLastResponse,
  history,
  setHistory,
  isDarkMode,
  onSaveToProject,
  onUpdateProjectAuth,
  onUpdateRequest,
  onSendRequest,
  onStopRequest,
  updateProjectFiles,
  handleOpenRequestInTab,
  setActiveTabMode,
  showToast,
}) => {
  const isDraggingSplitter = useRef<boolean>(false);

  // Global mousemove and mouseup listeners for resizable splitter
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
      const container = document.getElementById('resizable-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();

      let newPercentage: number;
      if (splitOrientation === 'top-bottom') {
        const offset = e.clientY - rect.top;
        newPercentage = (offset / rect.height) * 100;
      } else {
        const offset = e.clientX - rect.left;
        newPercentage = (offset / rect.width) * 100;
      }

      const clamped = Math.min(Math.max(newPercentage, 20), 80);
      setSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      if (isDraggingSplitter.current) {
        isDraggingSplitter.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [splitOrientation, setSplitRatio]);

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
      {/* TAB MODE 1: REQUEST BUILDER (Split Layout options: Top/Bottom or Left/Right) */}
      {activeTabMode === 'editor' && (
        <>
          {activeRequest ? (
            <div
              id="resizable-container"
              className={`flex-1 flex overflow-hidden relative ${
                splitOrientation === 'top-bottom' ? 'flex-col' : 'flex-row'
              }`}
            >
              {/* Section 1: Request Editor */}
              <div
                style={{
                  [splitOrientation === 'top-bottom' ? 'height' : 'width']: `${splitRatio}%`,
                }}
                className="overflow-hidden flex flex-col min-h-[150px] min-w-[200px]"
              >
                <RequestEditor
                  request={activeRequest}
                  scopeCtx={scopeCtx}
                  envVariables={activeEnv?.variables || []}
                  fileVariables={activeFile?.fileVariables || {}}
                  projectAuth={activeProject?.auth}
                  isStandalone={isCurrentRequestStandalone}
                  onSaveToProject={() => onSaveToProject(activeRequest)}
                  onUpdateProjectAuth={onUpdateProjectAuth}
                  onUpdateRequest={onUpdateRequest}
                  onSendRequest={onSendRequest}
                  onStopRequest={onStopRequest}
                  isLoading={Boolean(executingRequests[activeRequest.id])}
                  lastResponse={lastResponse}
                />
              </div>

              {/* Resizable Splitter Handle */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  isDraggingSplitter.current = true;
                  document.body.style.cursor =
                    splitOrientation === 'top-bottom' ? 'row-resize' : 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
                className={`bg-slate-800 hover:bg-emerald-500/80 active:bg-emerald-400 transition-colors z-20 shrink-0 ${
                  splitOrientation === 'top-bottom'
                    ? 'h-1.5 cursor-row-resize w-full'
                    : 'w-1.5 cursor-col-resize h-full'
                }`}
                title="Click and drag to resize Request / Response sections"
              />

              {/* Section 2: Response Viewer */}
              <div
                style={{
                  [splitOrientation === 'top-bottom' ? 'height' : 'width']: `${100 - splitRatio}%`,
                }}
                className="overflow-hidden flex flex-col min-h-[150px] min-w-[200px]"
              >
                <ResponseViewer
                  response={lastResponse}
                  isLoading={Boolean(executingRequests[activeRequest.id])}
                  assertions={activeRequest.assertions}
                  savedResponses={activeRequest.savedResponses}
                  onSaveResponseSnapshot={(resp, name) => {
                    const newSnapshot = {
                      id: 'snap_' + Math.random().toString(36).substring(2, 9),
                      name,
                      timestamp: Date.now(),
                      response: resp,
                    };
                    const updatedSaved = [...(activeRequest.savedResponses || []), newSnapshot];
                    onUpdateRequest({ ...activeRequest, savedResponses: updatedSaved });
                  }}
                  onDeleteSavedResponseSnapshot={(snapId) => {
                    const updatedSaved = (activeRequest.savedResponses || []).filter(
                      (s) => s.id !== snapId
                    );
                    onUpdateRequest({ ...activeRequest, savedResponses: updatedSaved });
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
              Select or create a REST request from the left sidebar.
            </div>
          )}
        </>
      )}

      {/* TAB MODE 2: RAW .REST FILE CODE EDITOR */}
      {activeTabMode === 'code' && (
        <>
          {activeFile ? (
            <RestFileEditor
              file={activeFile}
              isDarkMode={isDarkMode}
              envVariables={scopeCtx.projectVariables || []}
              scopeCtx={scopeCtx}
              onSaveFileContent={(fId, rawText, parsedRequests, parsedFileVars) => {
                if (!activeProject) return;
                const updatedFiles = (activeProject.files || []).map((f) =>
                  f.id === fId
                    ? {
                        ...f,
                        rawContent: rawText,
                        requests: parsedRequests,
                        fileVariables: parsedFileVars || f.fileVariables,
                      }
                    : f
                );
                updateProjectFiles(updatedFiles);
              }}
              onRunSingleRequest={async (req) => {
                const res = await onSendRequest(req);
                return res as ExecutionResponse;
              }}
              onOpenInBuilder={(req) => {
                if (activeFile) {
                  handleOpenRequestInTab(activeFile.id, req.id);
                }
              }}
              showToast={showToast}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
              No REST file selected. Create or select a file in sidebar.
            </div>
          )}
        </>
      )}

      {/* TAB MODE 3: COLLECTION RUNNER */}
      {activeTabMode === 'runner' && activeProject && (
        <CollectionRunner
          project={activeProject}
          onExecuteRequestProxy={async (req) => {
            const resp = await onSendRequest(req);
            return (
              resp || {
                status: 0,
                statusText: 'No Response',
                headers: {},
                body: '',
                size: 0,
                duration: 0,
                timestamp: Date.now(),
                ok: false,
                error: 'No response received',
              }
            );
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* TAB MODE 4: HISTORY VIEWER */}
      {activeTabMode === 'history' && (
        <HistoryViewer
          history={history}
          onClearHistory={() => {
            setHistory([]);
            try {
              localStorage.removeItem('reststudio_history');
              localStorage.removeItem('restpulse_history');
            } catch (e) {}
          }}
          onSelectHistoryItem={(item) => {
            setLastResponse(item.response);
            setActiveTabMode('editor');
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </main>
  );
};
