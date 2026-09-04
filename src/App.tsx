/**
 * RestStudio - Offline-First REST API Client & Workspace
 * Created by Suhail Akhtar (https://suhail.top)
 *
 * @author Suhail Akhtar <https://suhail.top>
 * @license Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Organization,
  Project,
  RestFile,
  RestRequest,
  HTTPMethod,
  RequestAuth,
  RequestHistoryItem,
} from './types';
import { INITIAL_ORGANIZATIONS } from './data/initialOrganizations';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { OnboardingScreen } from './components/OnboardingScreen';
import { ToastContainer, ToastMessage } from './components/ToastContainer';
import { AppModals, PromptModalState } from './components/AppModals';
import { MainWorkspace } from './components/MainWorkspace';
import { useWorkspaceState } from './hooks/useWorkspaceState';
import { useTabManager } from './hooks/useTabManager';
import { useRequestExecutor } from './hooks/useRequestExecutor';
import { ScopeContext } from './utils/envUtils';
import { getSavedTheme, applyTheme, UIThemeId } from './utils/themeManager';
import {
  getSavedGitHubToken,
  getSavedGistId,
  getSavedAutoSync,
  getSavedGitHubUser,
  pullFromGitHubGist,
  GitHubUser,
} from './services/githubSyncService';
import { SettingsTabId } from './components/SettingsModal';

export default function App() {
  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback(
    (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string, duration?: number) => {
      const newToast: ToastMessage = {
        id: 'toast_' + Math.random().toString(36).substring(2, 9),
        type,
        title,
        message,
        duration,
      };
      setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
    },
    []
  );

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Workspace State (Organizations, Projects, Files, Requests, Standalone Drafts, Global Variables)
  const {
    globalVariables,
    setGlobalVariables,
    organizations,
    setOrganizations,
    activeOrgId,
    setActiveOrgId,
    activeOrg,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    activeFileId,
    setActiveFileId,
    activeFile,
    scratchpadRequests,
    setScratchpadRequests,
    activeRequestId,
    setActiveRequestId,
    activeRequest,
    activeScratchpadRequest,
    isCurrentRequestStandalone,
    updateProjectFiles,
    handleUpdateActiveRequest,
    handleCreateNewScratchpad,
    handleDeleteScratchpad,
    handleAddNewVariables,
    handleApplySyncedData,
  } = useWorkspaceState(showToast);

  // 2. Tab Management
  const {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTabMode,
    setActiveTabMode,
    activeTab,
    handleSelectTab,
    handleOpenRequestInTab,
    handleOpenScratchpadRequestInTab,
    handleCreateNewTabWithDummy,
    handleTogglePinTab,
    handleCloseTab,
    handleCloseOtherTabs,
    handleCloseTabsToRight,
    handleCloseTabsToLeft,
    handleCloseAllTabs,
  } = useTabManager({
    organizations,
    setOrganizations,
    activeOrg,
    activeOrgId,
    setActiveOrgId,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    activeFile,
    activeFileId,
    setActiveFileId,
    scratchpadRequests,
    setActiveRequestId,
    updateProjectFiles,
    showToast,
  });

  // 3. UI Theme & Dark Mode State
  const [currentTheme, setCurrentTheme] = useState<UIThemeId>(() => getSavedTheme());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('reststudio_dark_mode') || localStorage.getItem('restpulse_dark_mode');
    return saved ? saved === 'true' : true;
  });

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleToggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('reststudio_dark_mode', String(next));
    localStorage.setItem('restpulse_dark_mode', String(next));
  };

  const handleSelectTheme = (themeId: UIThemeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
  };

  // 4. Split Ratio & Orientation
  const [splitOrientation, setSplitOrientation] = useState<'left-right' | 'top-bottom'>(() => {
    return (localStorage.getItem('reststudio_split_orientation') as any) || 'top-bottom';
  });
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem('reststudio_split_ratio');
    return saved ? parseFloat(saved) : 50;
  });

  useEffect(() => {
    localStorage.setItem('reststudio_split_orientation', splitOrientation);
  }, [splitOrientation]);

  useEffect(() => {
    localStorage.setItem('reststudio_split_ratio', String(splitRatio));
  }, [splitRatio]);

  const handleToggleSplitOrientation = useCallback(() => {
    setSplitOrientation((prev) => (prev === 'top-bottom' ? 'left-right' : 'top-bottom'));
  }, []);

  // Sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('reststudio_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('reststudio_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // 5. Active Environment & Scope Context
  const activeEnv = activeProject?.environments?.find((e) => e.id === activeProject.activeEnvId);

  const scopeCtx: ScopeContext = useMemo(
    () => ({
      globalVariables,
      orgVariables: activeOrg?.variables || [],
      projectVariables: activeEnv?.variables || [],
      fileVariables: activeFile?.fileVariables || {},
    }),
    [globalVariables, activeOrg?.variables, activeEnv?.variables, activeFile?.fileVariables]
  );

  const saveScriptVariables = (newVars: Record<string, string>) => {
    const envVars = Object.entries(newVars).map(([key, value]) => ({
      id: 'var_script_' + Math.random().toString(36).substring(2, 9),
      key,
      value,
      enabled: true,
    }));
    handleAddNewVariables(envVars);
  };

  // 6. Request Executor & History
  const {
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
  } = useRequestExecutor({
    activeOrg,
    activeProject,
    activeFile,
    scopeCtx,
    handleUpdateActiveRequest,
    showToast,
    saveScriptVariables,
  });

  // 7. Modals State
  const [isEnvManagerOpen, setIsEnvManagerOpen] = useState<boolean>(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('appearance');
  const [isGitHubSyncOpen, setIsGitHubSyncOpen] = useState<boolean>(false);
  const [isBatchWorkspaceModalOpen, setIsBatchWorkspaceModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState<boolean>(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState<boolean>(false);
  const [isQuickNewRequestOpen, setIsQuickNewRequestOpen] = useState<boolean>(false);
  const [initialPasteText, setInitialPasteText] = useState<string>('');
  const [isQuickCurlOpen, setIsQuickCurlOpen] = useState<boolean>(false);
  const [isSaveScratchpadOpen, setIsSaveScratchpadOpen] = useState<boolean>(false);
  const [scratchpadToSave, setScratchpadToSave] = useState<RestRequest | null>(null);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(() => getSavedGitHubUser());

  // Prompt Modal
  const [appPromptState, setAppPromptState] = useState<PromptModalState>({
    isOpen: false,
    title: '',
    message: '',
    initialValue: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  // 8. Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === '?' && !['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        e.preventDefault();
        setIsKeyboardShortcutsOpen(true);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsEnvManagerOpen(true);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setSettingsTab('auth');
        setIsSettingsOpen(true);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      } else if (isCmdOrCtrl && e.key === ',') {
        e.preventDefault();
        setSettingsTab('appearance');
        setIsSettingsOpen(true);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsQuickCurlOpen(true);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickNewRequestOpen(true);
      } else if (isCmdOrCtrl && e.key === 'Enter') {
        if (activeRequest && activeTabMode === 'editor') {
          e.preventDefault();
          handleExecuteRequest(activeRequest);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeRequest, activeTabMode, handleExecuteRequest]);

  // Auto-sync on load if enabled
  useEffect(() => {
    if (getSavedAutoSync()) {
      const token = getSavedGitHubToken();
      const gistId = getSavedGistId();
      if (token && gistId) {
        pullFromGitHubGist(token, gistId)
          .then((payload) => {
            if (payload && payload.organizations && payload.organizations.length > 0) {
              handleApplySyncedData(payload, setHistory);
              showToast('success', 'Auto-Synced', 'Loaded latest cloud workspace data from GitHub Gist.');
            }
          })
          .catch((err) => {
            console.error('Auto-sync on load failed:', err);
          });
      }
    }
  }, []);

  // Sidebar CRUD Operations
  const handleCreateFile = (fileName: string, folderId?: string) => {
    if (!activeOrg || !activeProject) return;
    const newFileId = 'file_' + Math.random().toString(36).substring(2, 9);
    const newFile: RestFile = {
      id: newFileId,
      name: fileName,
      rawContent: `@baseUrl = {{baseUrl}}\n\n### GET Initial Endpoint\nGET {{baseUrl}}/users\n`,
      requests: [
        {
          id: 'req_init_' + Math.random().toString(36).substring(2, 9),
          name: 'GET Initial Endpoint',
          method: 'GET',
          url: '{{baseUrl}}/users',
          headers: [],
          queryParams: [],
          body: { mode: 'none', rawText: '' },
          auth: { type: 'none', bearerToken: '' },
        },
      ],
      updatedAt: Date.now(),
    };

    const updatedFiles = [...(activeProject.files || []), newFile];

    if (folderId) {
      const updatedFolders = (activeProject.folders || []).map((f) =>
        f.id === folderId ? { ...f, fileIds: [...(f.fileIds || []), newFileId] } : f
      );
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === activeOrg.id
            ? {
                ...org,
                projects: (org.projects || []).map((p) =>
                  p.id === activeProject.id
                    ? { ...p, files: updatedFiles, folders: updatedFolders }
                    : p
                ),
              }
            : org
        )
      );
    } else {
      updateProjectFiles(updatedFiles);
    }

    handleOpenRequestInTab(newFile.id, newFile.requests[0].id);
    showToast('success', 'File Created', `Created REST file "${newFile.name}" successfully.`);
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    if (!activeProject) return;
    const updatedFiles = (activeProject.files || []).map((f) =>
      f.id === fileId ? { ...f, name: newName, updatedAt: Date.now() } : f
    );
    updateProjectFiles(updatedFiles);
    showToast('success', 'File Renamed', `Renamed file to "${newName}".`);
  };

  const handleDuplicateFile = (fileId: string) => {
    if (!activeOrg || !activeProject) return;
    const targetFile = (activeProject.files || []).find((f) => f.id === fileId);
    if (!targetFile) return;

    const dupFileId = 'file_' + Math.random().toString(36).substring(2, 9);
    const duplicatedRequests = (targetFile.requests || []).map((r) => ({
      ...r,
      id: 'req_' + Math.random().toString(36).substring(2, 9),
    }));

    const dupFile: RestFile = {
      ...targetFile,
      id: dupFileId,
      name: `copy_${targetFile.name}`,
      requests: duplicatedRequests,
      updatedAt: Date.now(),
    };

    const updatedFiles = [...(activeProject.files || []), dupFile];
    updateProjectFiles(updatedFiles);

    if (duplicatedRequests.length > 0) {
      handleOpenRequestInTab(dupFileId, duplicatedRequests[0].id);
    }
    showToast('success', 'File Duplicated', `Created "${dupFile.name}".`);
  };

  const handleDeleteFile = (fileId: string) => {
    if (!activeOrg || !activeProject) return;
    const targetFile = (activeProject.files || []).find((f) => f.id === fileId);
    const updatedFiles = (activeProject.files || []).filter((f) => f.id !== fileId);
    const updatedFolders = (activeProject.folders || []).map((f) => ({
      ...f,
      fileIds: (f.fileIds || []).filter((id) => id !== fileId),
    }));

    const fileRequestIds = new Set((targetFile?.requests || []).map((r) => r.id));
    setTabs((prevTabs) => {
      const remainingTabs = prevTabs.filter(
        (t) => t.fileId !== fileId && (!t.requestId || !fileRequestIds.has(t.requestId))
      );
      return remainingTabs.length === 0
        ? [{ id: 'tab_onboarding', type: 'onboarding', title: 'Welcome Workspace' }]
        : remainingTabs;
    });

    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === activeOrg.id
          ? {
              ...org,
              projects: (org.projects || []).map((p) =>
                p.id === activeProject.id
                  ? { ...p, files: updatedFiles, folders: updatedFolders }
                  : p
              ),
            }
          : org
      )
    );

    if (activeFileId === fileId) {
      if (updatedFiles.length > 0) {
        setActiveFileId(updatedFiles[0].id);
        setActiveRequestId(updatedFiles[0].requests?.[0]?.id || null);
      } else if (scratchpadRequests.length > 0) {
        handleOpenScratchpadRequestInTab(scratchpadRequests[0].id);
      } else {
        setActiveFileId(null);
        setActiveRequestId(null);
      }
    }

    showToast('info', 'File Deleted', `Deleted file "${targetFile?.name || 'file'}".`);
  };

  const handleMoveFileToFolder = (fileId: string, targetFolderId: string | null) => {
    if (!activeProject) return;
    const targetFolder = (activeProject.folders || []).find((f) => f.id === targetFolderId);
    const targetFile = (activeProject.files || []).find((f) => f.id === fileId);
    const updatedFolders = (activeProject.folders || []).map((f) => {
      if (f.id === targetFolderId) {
        return (f.fileIds || []).includes(fileId) ? f : { ...f, fileIds: [...(f.fileIds || []), fileId] };
      } else {
        return { ...f, fileIds: (f.fileIds || []).filter((id) => id !== fileId) };
      }
    });

    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === activeOrg?.id
          ? {
              ...org,
              projects: (org.projects || []).map((p) =>
                p.id === activeProject.id ? { ...p, folders: updatedFolders } : p
              ),
            }
          : org
      )
    );
    showToast(
      'success',
      'File Moved',
      `Moved "${targetFile?.name || 'file'}" to ${targetFolder ? `folder "${targetFolder.name}"` : 'Root level'}.`
    );
  };

  const handleCreateFolder = (folderName: string) => {
    if (!activeProject) return;
    const newFolder = {
      id: 'folder_' + Math.random().toString(36).substring(2, 9),
      name: folderName,
      fileIds: [],
    };
    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === activeOrg?.id
          ? {
              ...org,
              projects: (org.projects || []).map((p) =>
                p.id === activeProject.id ? { ...p, folders: [...(p.folders || []), newFolder] } : p
              ),
            }
          : org
      )
    );
    showToast('success', 'Folder Created', `Created folder "${folderName}".`);
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    if (!activeProject) return;
    const updatedFolders = (activeProject.folders || []).map((f) =>
      f.id === folderId ? { ...f, name: newName } : f
    );
    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === activeOrg?.id
          ? {
              ...org,
              projects: (org.projects || []).map((p) =>
                p.id === activeProject.id ? { ...p, folders: updatedFolders } : p
              ),
            }
          : org
      )
    );
    showToast('success', 'Folder Renamed', `Renamed folder to "${newName}".`);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!activeProject) return;
    const targetFolder = (activeProject.folders || []).find((f) => f.id === folderId);
    const updatedFolders = (activeProject.folders || []).filter((f) => f.id !== folderId);
    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === activeOrg?.id
          ? {
              ...org,
              projects: (org.projects || []).map((p) =>
                p.id === activeProject.id ? { ...p, folders: updatedFolders } : p
              ),
            }
          : org
      )
    );
    showToast('info', 'Folder Deleted', `Deleted folder "${targetFolder?.name || 'folder'}".`);
  };

  const handleCreateRequest = (fileId: string, method: HTTPMethod, name: string, url?: string) => {
    const newReq: RestRequest = {
      id: 'req_' + Math.random().toString(36).substring(2, 9),
      name: name || `${method} Endpoint`,
      method,
      url: url || '{{baseUrl}}/endpoint',
      headers: [],
      queryParams: [],
      body: { mode: 'none', rawText: '' },
      auth: { type: 'none', bearerToken: '' },
    };

    const updatedFiles = (activeProject?.files || []).map((f) =>
      f.id === fileId ? { ...f, requests: [...(f.requests || []), newReq], updatedAt: Date.now() } : f
    );
    updateProjectFiles(updatedFiles);
    handleOpenRequestInTab(fileId, newReq.id);
    showToast('success', 'Endpoint Created', `Added "${newReq.name}".`);
  };

  const handleCreateNewFileAndRequest = (fileName: string, method: HTTPMethod, name: string, url?: string) => {
    if (!activeProject) return;
    const newReq: RestRequest = {
      id: 'req_' + Math.random().toString(36).substring(2, 9),
      name: name || `${method} Endpoint`,
      method,
      url: url || '{{baseUrl}}/endpoint',
      headers: [],
      queryParams: [],
      body: { mode: 'none', rawText: '' },
      auth: { type: 'none', bearerToken: '' },
    };

    const newFile: RestFile = {
      id: 'file_' + Math.random().toString(36).substring(2, 9),
      name: fileName,
      rawContent: `### ${newReq.name}\n${method} ${url || '{{baseUrl}}/endpoint'}\n`,
      requests: [newReq],
      updatedAt: Date.now(),
    };

    updateProjectFiles([...(activeProject.files || []), newFile]);
    handleOpenRequestInTab(newFile.id, newReq.id);
    showToast('success', 'File & Request Created', `Created "${fileName}" with endpoint "${newReq.name}".`);
  };

  const handleImportQuickCurl = (req: RestRequest, targetFileId?: string) => {
    if (targetFileId === 'SCRATCHPAD') {
      setScratchpadRequests((prev) => [req, ...prev]);
      handleOpenScratchpadRequestInTab(req.id);
      showToast('success', 'Imported to Scratchpad', `Imported "${req.name}" into standalone scratchpad.`);
      return;
    }

    if (!activeProject) return;
    let targetFile = (activeProject.files || []).find((f) => f.id === targetFileId) || activeFile || activeProject.files?.[0];

    if (!targetFile) {
      const newFile: RestFile = {
        id: 'file_' + Math.random().toString(36).substring(2, 9),
        name: 'curl_requests',
        rawContent: '',
        requests: [req],
        updatedAt: Date.now(),
      };
      updateProjectFiles([newFile]);
      handleOpenRequestInTab(newFile.id, req.id);
      showToast('success', 'cURL Endpoint Imported', `Imported "${req.name}" into new collection file.`);
      return;
    }

    const updatedFiles = (activeProject.files || []).map((f) =>
      f.id === targetFile!.id ? { ...f, requests: [...(f.requests || []), req], updatedAt: Date.now() } : f
    );
    updateProjectFiles(updatedFiles);
    handleOpenRequestInTab(targetFile.id, req.id);
    showToast('success', 'cURL Endpoint Imported', `Imported "${req.name}" into ${targetFile.name}.`);
  };

  const handleRenameRequest = (fileId: string, requestId: string, newName: string) => {
    if (!activeProject) return;
    const targetFile = (activeProject.files || []).find((f) => f.id === fileId);
    if (!targetFile) return;

    const updatedRequests = (targetFile.requests || []).map((r) =>
      r.id === requestId ? { ...r, name: newName } : r
    );
    const updatedFiles = (activeProject.files || []).map((f) =>
      f.id === fileId ? { ...f, requests: updatedRequests } : f
    );
    updateProjectFiles(updatedFiles);
    setTabs((prevTabs) =>
      prevTabs.map((t) =>
        t.requestId === requestId ? { ...t, title: newName || 'REST Request' } : t
      )
    );
  };

  const handleDuplicateRequest = (fileId: string, requestId: string) => {
    if (!activeProject) return;
    const targetFile = (activeProject.files || []).find((f) => f.id === fileId);
    if (!targetFile) return;

    const targetReq = (targetFile.requests || []).find((r) => r.id === requestId);
    if (!targetReq) return;

    const dupReq: RestRequest = {
      ...targetReq,
      id: 'req_' + Math.random().toString(36).substring(2, 9),
      name: `${targetReq.name} (Copy)`,
    };

    const targetIdx = (targetFile.requests || []).findIndex((r) => r.id === requestId);
    const updatedRequests = [...(targetFile.requests || [])];
    if (targetIdx !== -1) {
      updatedRequests.splice(targetIdx + 1, 0, dupReq);
    } else {
      updatedRequests.push(dupReq);
    }

    const updatedFiles = (activeProject.files || []).map((f) =>
      f.id === fileId ? { ...f, requests: updatedRequests } : f
    );
    updateProjectFiles(updatedFiles);
    handleOpenRequestInTab(fileId, dupReq.id);
    showToast('success', 'Request Duplicated', `Duplicated "${targetReq.name}".`);
  };

  const handleDeleteRequest = (fileId: string, requestId: string) => {
    if (!activeProject) return;
    const targetFile = (activeProject.files || []).find((f) => f.id === fileId);
    if (!targetFile) return;

    const targetReq = (targetFile.requests || []).find((r) => r.id === requestId);
    const updatedRequests = (targetFile.requests || []).filter((r) => r.id !== requestId);
    const updatedFiles = (activeProject.files || []).map((f) =>
      f.id === fileId ? { ...f, requests: updatedRequests } : f
    );
    updateProjectFiles(updatedFiles);

    setTabs((prevTabs) => {
      const remaining = prevTabs.filter((t) => t.requestId !== requestId);
      return remaining.length === 0
        ? [{ id: 'tab_onboarding', type: 'onboarding', title: 'Welcome Workspace' }]
        : remaining;
    });

    if (activeRequestId === requestId) {
      if (updatedRequests.length > 0) {
        handleOpenRequestInTab(fileId, updatedRequests[0].id);
      } else {
        const otherFile = updatedFiles.find((f) => f.id !== fileId && (f.requests || []).length > 0);
        if (otherFile && otherFile.requests && otherFile.requests[0]) {
          handleOpenRequestInTab(otherFile.id, otherFile.requests[0].id);
        } else if (scratchpadRequests.length > 0) {
          handleOpenScratchpadRequestInTab(scratchpadRequests[0].id);
        } else {
          setActiveRequestId(null);
        }
      }
    }

    showToast('info', 'Endpoint Deleted', `Deleted endpoint "${targetReq?.name || 'request'}".`);
  };

  const handleMoveRequestOrder = (fileId: string, requestId: string, direction: 'up' | 'down') => {
    if (!activeProject) return;
    const targetFile = (activeProject.files || []).find((f) => f.id === fileId);
    if (!targetFile) return;

    const idx = (targetFile.requests || []).findIndex((r) => r.id === requestId);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= (targetFile.requests || []).length) return;

    const newReqs = [...(targetFile.requests || [])];
    const temp = newReqs[idx];
    newReqs[idx] = newReqs[targetIdx];
    newReqs[targetIdx] = temp;

    const updatedFiles = (activeProject.files || []).map((f) =>
      f.id === fileId ? { ...f, requests: newReqs } : f
    );
    updateProjectFiles(updatedFiles);
  };

  const handleCreateScratchpadRequest = (
    method: HTTPMethod = 'GET',
    name: string = 'Draft Request',
    url: string = 'https://httpbin.org/get',
    extraProps?: Partial<RestRequest>
  ) => {
    const newReq: RestRequest = {
      id: 'req_scratch_' + Math.random().toString(36).substring(2, 9),
      name: name || `${method} Draft`,
      method,
      url: url || 'https://httpbin.org/get',
      headers: extraProps?.headers || [],
      queryParams: extraProps?.queryParams || [],
      body: extraProps?.body || { mode: 'none', rawText: '' },
      auth: extraProps?.auth || { type: 'none', bearerToken: '' },
      preRequestScript: extraProps?.preRequestScript,
      postRequestScript: extraProps?.postRequestScript,
      assertions: extraProps?.assertions,
    };

    setScratchpadRequests((prev) => [newReq, ...prev]);
    handleOpenScratchpadRequestInTab(newReq.id);
    showToast('success', 'Draft Request Created', `Created draft "${newReq.name}".`);
  };

  const handleRenameScratchpadRequest = (requestId: string, newName: string) => {
    setScratchpadRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, name: newName } : r))
    );
    setTabs((prevTabs) =>
      prevTabs.map((t) =>
        t.requestId === requestId ? { ...t, title: newName || 'Draft Request' } : t
      )
    );
    showToast('success', 'Draft Renamed', `Renamed draft to "${newName}".`);
  };

  const handleDuplicateScratchpadRequest = (requestId: string) => {
    const target = scratchpadRequests.find((r) => r.id === requestId);
    if (!target) return;

    const dupReq: RestRequest = {
      ...target,
      id: 'req_scratch_' + Math.random().toString(36).substring(2, 9),
      name: `${target.name} (Copy)`,
    };

    const targetIdx = scratchpadRequests.findIndex((r) => r.id === requestId);
    const updated = [...scratchpadRequests];
    if (targetIdx !== -1) {
      updated.splice(targetIdx + 1, 0, dupReq);
    } else {
      updated.push(dupReq);
    }
    setScratchpadRequests(updated);
    handleOpenScratchpadRequestInTab(dupReq.id);
    showToast('success', 'Draft Duplicated', `Duplicated "${target.name}".`);
  };

  const handleDeleteScratchpadRequest = (requestId: string) => {
    const target = scratchpadRequests.find((r) => r.id === requestId);
    const updated = scratchpadRequests.filter((r) => r.id !== requestId);
    setScratchpadRequests(updated);

    setTabs((prevTabs) => prevTabs.filter((t) => t.requestId !== requestId));
    if (activeRequestId === requestId) {
      if (updated.length > 0) {
        handleOpenScratchpadRequestInTab(updated[0].id);
      } else if (activeFile && activeFile.requests && activeFile.requests.length > 0) {
        handleOpenRequestInTab(activeFile.id, activeFile.requests[0].id);
      }
    }
    showToast('info', 'Draft Deleted', `Deleted draft "${target?.name || 'request'}".`);
  };

  const handleSaveScratchpadToProjectFile = (
    targetOrgId: string,
    targetProjectId: string,
    targetFileId: string | 'NEW_FILE',
    newFileName: string,
    request: RestRequest
  ) => {
    setActiveOrgId(targetOrgId);
    setActiveProjectId(targetProjectId);

    const targetOrg = organizations.find((o) => o.id === targetOrgId) || organizations[0];
    const targetProj = (targetOrg.projects || []).find((p) => p.id === targetProjectId) || targetOrg.projects?.[0];
    if (!targetProj) return;

    const reqToInsert: RestRequest = {
      ...request,
      id: 'req_' + Math.random().toString(36).substring(2, 9),
    };

    let targetFileIdToOpen = targetFileId;

    if (targetFileId === 'NEW_FILE') {
      const newFileId = 'file_' + Math.random().toString(36).substring(2, 9);
      targetFileIdToOpen = newFileId;
      const formattedName = newFileName.endsWith('.http') || newFileName.endsWith('.rest') ? newFileName : `${newFileName}.http`;
      const newFile: RestFile = {
        id: newFileId,
        name: formattedName,
        rawContent: `@baseUrl = {{baseUrl}}\n\n### ${reqToInsert.name}\n${reqToInsert.method} ${reqToInsert.url}\n`,
        requests: [reqToInsert],
        updatedAt: Date.now(),
      };
      const updatedFiles = [...(targetProj.files || []), newFile];

      setOrganizations((prevOrgs) =>
        prevOrgs.map((org) =>
          org.id === targetOrgId
            ? {
                ...org,
                projects: (org.projects || []).map((p) =>
                  p.id === targetProjectId ? { ...p, files: updatedFiles, updatedAt: Date.now() } : p
                ),
              }
            : org
        )
      );
    } else {
      const updatedFiles = (targetProj.files || []).map((f) => {
        if (f.id !== targetFileId) return f;
        return {
          ...f,
          requests: [...(f.requests || []), reqToInsert],
          updatedAt: Date.now(),
        };
      });

      setOrganizations((prevOrgs) =>
        prevOrgs.map((org) =>
          org.id === targetOrgId
            ? {
                ...org,
                projects: (org.projects || []).map((p) =>
                  p.id === targetProjectId ? { ...p, files: updatedFiles, updatedAt: Date.now() } : p
                ),
              }
            : org
        )
      );
    }

    setIsSaveScratchpadOpen(false);
    setScratchpadToSave(null);
    handleOpenRequestInTab(targetFileIdToOpen, reqToInsert.id);
    showToast('success', 'Saved to Project', `Saved "${reqToInsert.name}" to project collection!`);
  };

  const handleUpdateProjectAuth = (auth: RequestAuth) => {
    if (!activeOrg || !activeProject) return;
    setOrganizations((prevOrgs) =>
      prevOrgs.map((org) =>
        org.id === activeOrg.id
          ? {
              ...org,
              projects: (org.projects || []).map((p) =>
                p.id === activeProject.id ? { ...p, auth, updatedAt: Date.now() } : p
              ),
            }
          : org
      )
    );
    showToast('success', 'Project Auth Updated', 'Updated project authentication settings.');
  };

  // Launch workspace from onboarding
  const handleLaunchWorkspace = () => {
    const openRequestTab = tabs.find((t) => t.type === 'request');
    if (openRequestTab) {
      setActiveTabId(openRequestTab.id);
      if (openRequestTab.fileId && openRequestTab.requestId) {
        setActiveFileId(openRequestTab.fileId);
        setActiveRequestId(openRequestTab.requestId);
      } else if (openRequestTab.requestId) {
        setActiveFileId(null);
        setActiveRequestId(openRequestTab.requestId);
      }
      setActiveTabMode('editor');
      return;
    }

    const targetFile = activeFile || activeProject?.files?.[0];
    if (targetFile && targetFile.requests && targetFile.requests.length > 0) {
      handleOpenRequestInTab(targetFile.id, targetFile.requests[0].id);
    } else if (scratchpadRequests.length > 0) {
      handleOpenScratchpadRequestInTab(scratchpadRequests[0].id);
    } else {
      handleCreateNewTabWithDummy();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none font-sans antialiased">
      {/* Top Application Header */}
      {activeTab?.type !== 'onboarding' && (
        <Header
          organizations={organizations}
          activeOrg={activeOrg!}
          onSelectOrg={(org) => {
            setActiveOrgId(org.id);
            if (org.projects && org.projects.length > 0) {
              setActiveProjectId(org.projects[0].id);
              const targetFile = org.projects[0].files?.[0];
              if (targetFile) {
                setActiveFileId(targetFile.id);
                setActiveRequestId(targetFile.requests?.[0]?.id || null);
              }
            }
          }}
          onOpenNewOrgModal={() => {
            setAppPromptState({
              isOpen: true,
              title: 'Create Organization',
              placeholder: 'e.g. Acme Corp',
              confirmLabel: 'Create',
              onConfirm: (name) => {
                if (name.trim()) {
                  const newOrgId = 'org_' + Math.random().toString(36).substring(2, 9);
                  const newOrg = {
                    id: newOrgId,
                    name: name.trim(),
                    projects: [
                      {
                        id: 'proj_' + Math.random().toString(36).substring(2, 9),
                        name: 'Default Project',
                        files: [],
                        environments: [],
                        activeEnvId: null,
                      },
                    ],
                  };
                  setOrganizations((prev) => [...prev, newOrg as any]);
                  setActiveOrgId(newOrgId);
                  showToast('success', 'Organization Created', `Created organization "${name.trim()}".`);
                }
              },
            });
          }}
          projects={activeOrg?.projects || []}
          activeProject={activeProject!}
          onSelectProject={(project) => {
            setActiveProjectId(project.id);
            if (project.files && project.files.length > 0) {
              setActiveFileId(project.files[0].id);
              setActiveRequestId(project.files[0].requests?.[0]?.id || null);
            }
          }}
          onOpenNewProjectModal={() => {
            setAppPromptState({
              isOpen: true,
              title: 'Create Project',
              placeholder: 'e.g. Backend Microservices',
              confirmLabel: 'Create',
              onConfirm: (name) => {
                if (name.trim() && activeOrg) {
                  const newProjId = 'proj_' + Math.random().toString(36).substring(2, 9);
                  const newProj = {
                    id: newProjId,
                    name: name.trim(),
                    files: [],
                    environments: [],
                    activeEnvId: null,
                  };
                  setOrganizations((prev) =>
                    prev.map((org) =>
                      org.id === activeOrg.id ? { ...org, projects: [...(org.projects || []), newProj as any] } : org
                    )
                  );
                  setActiveProjectId(newProjId);
                  showToast('success', 'Project Created', `Created project "${name.trim()}".`);
                }
              },
            });
          }}
          onSelectEnvironment={(envId) => {
            if (!activeOrg || !activeProject) return;
            setOrganizations((prev) =>
              prev.map((org) =>
                org.id === activeOrg.id
                  ? {
                      ...org,
                      projects: (org.projects || []).map((p) =>
                        p.id === activeProject.id ? { ...p, activeEnvId: envId } : p
                      ),
                    }
                  : org
              )
            );
          }}
          onOpenEnvManager={() => setIsEnvManagerOpen(true)}
          activeTab={activeTabMode}
          onChangeTab={setActiveTabMode}
          onOpenImportExport={() => setIsImportExportOpen(true)}
          onOpenSettings={() => {
            setSettingsTab('appearance');
            setIsSettingsOpen(true);
          }}
          onOpenQuickNewRequest={() => setIsQuickNewRequestOpen(true)}
          onOpenQuickCurl={() => setIsQuickCurlOpen(true)}
          onOpenGitHubSync={() => setIsGitHubSyncOpen(true)}
          onOpenBatchWorkspaceModal={() => setIsBatchWorkspaceModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcuts={() => setIsKeyboardShortcutsOpen(true)}
          onOpenApiDocs={() => setIsApiDocsOpen(true)}
          isGitHubSynced={Boolean(githubUser)}
          githubUser={githubUser}
          historyCount={history.length}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          currentTheme={currentTheme}
          onSelectTheme={handleSelectTheme}
        />
      )}

      {/* Main Workspace Frame */}
      {activeTab?.type === 'onboarding' ? (
        <div className="flex-1 overflow-y-auto">
          <OnboardingScreen
            onCreateNewRequest={() => setIsQuickNewRequestOpen(true)}
            onOpenImportModal={() => setIsImportExportOpen(true)}
            onOpenQuickCurl={() => setIsQuickCurlOpen(true)}
            onLaunchWorkspace={handleLaunchWorkspace}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            currentTheme={currentTheme}
            onSelectTheme={handleSelectTheme}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
            activeOrg={activeOrg}
            project={activeProject!}
            activeFileId={activeFileId}
            activeRequestId={activeRequestId}
            scratchpadRequests={scratchpadRequests}
            requestStatuses={requestStatuses}
            onSelectFile={(fId) => {
              setActiveFileId(fId);
              const file = activeProject?.files?.find((f) => f.id === fId);
              if (file && file.requests && file.requests.length > 0) {
                handleOpenRequestInTab(file.id, file.requests[0].id);
              }
            }}
            onSelectRequest={(fileId, reqId) => handleOpenRequestInTab(fileId, reqId)}
            onSelectScratchpadRequest={(reqId) => handleOpenScratchpadRequestInTab(reqId)}
            onCreateScratchpadRequest={handleCreateScratchpadRequest}
            onRenameScratchpadRequest={handleRenameScratchpadRequest}
            onDuplicateScratchpadRequest={handleDuplicateScratchpadRequest}
            onDeleteScratchpadRequest={handleDeleteScratchpadRequest}
            onSaveScratchpadToProject={(req) => {
              setScratchpadToSave(req);
              setIsSaveScratchpadOpen(true);
            }}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFile={handleRenameFile}
            onDuplicateFile={handleDuplicateFile}
            onDeleteFile={handleDeleteFile}
            onMoveFileToFolder={handleMoveFileToFolder}
            onCreateRequest={handleCreateRequest}
            onRenameRequest={handleRenameRequest}
            onDuplicateRequest={handleDuplicateRequest}
            onDeleteRequest={handleDeleteRequest}
            onMoveRequestOrder={handleMoveRequestOrder}
            onOpenQuickNewRequest={() => setIsQuickNewRequestOpen(true)}
            onOpenQuickCurl={() => setIsQuickCurlOpen(true)}
            onOpenBatchWorkspaceModal={() => setIsBatchWorkspaceModalOpen(true)}
            onOpenApiDocs={() => setIsApiDocsOpen(true)}
          />

          {/* Central Workspace Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Top Workspace Tab Bar */}
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              onTogglePinTab={handleTogglePinTab}
              onCloseOtherTabs={handleCloseOtherTabs}
              onCloseTabsToRight={handleCloseTabsToRight}
              onCloseTabsToLeft={handleCloseTabsToLeft}
              onCloseAllTabs={handleCloseAllTabs}
              onNewTab={handleCreateNewTabWithDummy}
              activeTabMode={activeTabMode}
              onChangeTabMode={setActiveTabMode}
              activeFile={activeFile}
              onRunRequest={() => {
                if (activeRequest) handleExecuteRequest(activeRequest);
              }}
              isRequestRunning={Boolean(activeRequest && executingRequests[activeRequest.id])}
              splitOrientation={splitOrientation}
              onToggleSplitOrientation={handleToggleSplitOrientation}
            />

            {/* Split Editor / Response / Tools View */}
            <MainWorkspace
              activeTabMode={activeTabMode}
              activeRequest={activeRequest}
              activeFile={activeFile}
              activeProject={activeProject}
              activeEnv={activeEnv}
              scopeCtx={scopeCtx}
              isCurrentRequestStandalone={isCurrentRequestStandalone}
              splitOrientation={splitOrientation}
              onToggleSplitOrientation={handleToggleSplitOrientation}
              splitRatio={splitRatio}
              setSplitRatio={setSplitRatio}
              executingRequests={executingRequests}
              lastResponse={lastResponse}
              setLastResponse={setLastResponse}
              history={history}
              setHistory={setHistory}
              isDarkMode={isDarkMode}
              onSaveToProject={(req) => {
                setScratchpadToSave(req);
                setIsSaveScratchpadOpen(true);
              }}
              onUpdateProjectAuth={handleUpdateProjectAuth}
              onUpdateRequest={handleUpdateActiveRequest}
              onSendRequest={handleExecuteRequest}
              onStopRequest={handleStopRequest}
              updateProjectFiles={updateProjectFiles}
              handleOpenRequestInTab={handleOpenRequestInTab}
              setActiveTabMode={setActiveTabMode}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {/* Global Application Modals Container */}
      <AppModals
        isEnvManagerOpen={isEnvManagerOpen}
        setIsEnvManagerOpen={setIsEnvManagerOpen}
        activeOrg={activeOrg}
        activeProject={activeProject}
        globalVariables={globalVariables}
        setGlobalVariables={setGlobalVariables}
        setOrganizations={setOrganizations}
        organizations={organizations}
        activeOrgId={activeOrgId}
        activeProjectId={activeProjectId}
        activeFileId={activeFileId}
        isImportExportOpen={isImportExportOpen}
        setIsImportExportOpen={setIsImportExportOpen}
        isDarkMode={isDarkMode}
        updateProjectFiles={updateProjectFiles}
        handleOpenRequestInTab={handleOpenRequestInTab}
        handleImportPostman={(newFolders, newFiles) => {
          if (!activeProject) return;
          setOrganizations((prev) =>
            prev.map((org) =>
              org.id === activeOrg?.id
                ? {
                    ...org,
                    projects: (org.projects || []).map((p) =>
                      p.id === activeProject.id
                        ? {
                            ...p,
                            folders: [...(p.folders || []), ...newFolders],
                            files: [...(p.files || []), ...newFiles],
                            updatedAt: Date.now(),
                          }
                        : p
                    ),
                  }
                : org
            )
          );
        }}
        isQuickNewRequestOpen={isQuickNewRequestOpen}
        setIsQuickNewRequestOpen={setIsQuickNewRequestOpen}
        initialPasteText={initialPasteText}
        setInitialPasteText={setInitialPasteText}
        handleCreateRequest={handleCreateRequest}
        handleCreateNewFileAndRequest={handleCreateNewFileAndRequest}
        handleCreateScratchpadRequest={handleCreateScratchpadRequest}
        isQuickCurlOpen={isQuickCurlOpen}
        setIsQuickCurlOpen={setIsQuickCurlOpen}
        handleImportQuickCurl={handleImportQuickCurl}
        handleAddNewVariables={handleAddNewVariables}
        isSaveScratchpadOpen={isSaveScratchpadOpen}
        setIsSaveScratchpadOpen={setIsSaveScratchpadOpen}
        scratchpadToSave={scratchpadToSave}
        setScratchpadToSave={setScratchpadToSave}
        handleSaveScratchpadToProjectFile={handleSaveScratchpadToProjectFile}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        handleToggleDarkMode={handleToggleDarkMode}
        currentTheme={currentTheme}
        handleSelectTheme={handleSelectTheme}
        splitOrientation={splitOrientation}
        setSplitOrientation={setSplitOrientation}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        showToast={showToast}
        githubUser={githubUser}
        setGithubUser={setGithubUser}
        isGitHubSyncOpen={isGitHubSyncOpen}
        setIsGitHubSyncOpen={setIsGitHubSyncOpen}
        history={history}
        setHistory={setHistory}
        handleApplySyncedData={handleApplySyncedData}
        isBatchWorkspaceModalOpen={isBatchWorkspaceModalOpen}
        setIsBatchWorkspaceModalOpen={setIsBatchWorkspaceModalOpen}
        scratchpadRequests={scratchpadRequests}
        handleBatchDeleteOrganizations={(orgIds) => {
          const orgIdSet = new Set(orgIds);
          const remaining = organizations.filter((o) => !orgIdSet.has(o.id));
          if (remaining.length === 0) {
            setOrganizations(INITIAL_ORGANIZATIONS);
          } else {
            setOrganizations(remaining);
          }
          showToast('info', 'Organizations Deleted', `Deleted ${orgIds.length} organization(s).`);
        }}
        handleBatchDeleteProjects={(orgId, projectIds) => {
          const projIdSet = new Set(projectIds);
          setOrganizations((prev) =>
            prev.map((org) => {
              if (org.id !== orgId) return org;
              return {
                ...org,
                projects: (org.projects || []).filter((p) => !projIdSet.has(p.id)),
              };
            })
          );
          showToast('info', 'Projects Deleted', `Deleted ${projectIds.length} project(s).`);
        }}
        handleBatchDeleteEnvironments={(orgId, projectId, envIds) => {
          const envIdSet = new Set(envIds);
          setOrganizations((prev) =>
            prev.map((org) => {
              if (org.id !== orgId) return org;
              return {
                ...org,
                projects: (org.projects || []).map((p) => {
                  if (p.id !== projectId) return p;
                  return {
                    ...p,
                    environments: (p.environments || []).filter((e) => !envIdSet.has(e.id)),
                  };
                }),
              };
            })
          );
          showToast('info', 'Environments Deleted', `Deleted ${envIds.length} environment(s).`);
        }}
        handleBatchDeleteGlobalVars={(keys) => {
          const keySet = new Set(keys);
          setGlobalVariables((prev) => prev.filter((v) => !keySet.has(v.key)));
          showToast('info', 'Variables Deleted', `Deleted ${keys.length} variable(s).`);
        }}
        handleBatchDeleteOrgVars={(orgId, keys) => {
          const keySet = new Set(keys);
          setOrganizations((prev) =>
            prev.map((org) => {
              if (org.id !== orgId) return org;
              return {
                ...org,
                variables: (org.variables || []).filter((v) => !keySet.has(v.key)),
              };
            })
          );
          showToast('info', 'Variables Deleted', `Deleted ${keys.length} organization variable(s).`);
        }}
        handleBatchDeleteFiles={(orgId, projectId, fileIds) => {
          const fileIdSet = new Set(fileIds);
          setOrganizations((prev) =>
            prev.map((org) => {
              if (org.id !== orgId) return org;
              return {
                ...org,
                projects: (org.projects || []).map((p) => {
                  if (p.id !== projectId) return p;
                  return {
                    ...p,
                    files: (p.files || []).filter((f) => !fileIdSet.has(f.id)),
                    folders: (p.folders || []).map((f) => ({
                      ...f,
                      fileIds: (f.fileIds || []).filter((id) => !fileIdSet.has(id)),
                    })),
                  };
                }),
              };
            })
          );
          showToast('info', 'Files Deleted', `Deleted ${fileIds.length} file(s).`);
        }}
        handleBatchDeleteRequests={(orgId, projectId, fileId, requestIds) => {
          const reqIdSet = new Set(requestIds);
          setOrganizations((prev) =>
            prev.map((org) => {
              if (org.id !== orgId) return org;
              return {
                ...org,
                projects: (org.projects || []).map((p) => {
                  if (p.id !== projectId) return p;
                  return {
                    ...p,
                    files: (p.files || []).map((f) => {
                      if (f.id !== fileId) return f;
                      return {
                        ...f,
                        requests: (f.requests || []).filter((r) => !reqIdSet.has(r.id)),
                      };
                    }),
                  };
                }),
              };
            })
          );
          showToast('info', 'Endpoints Deleted', `Deleted ${requestIds.length} endpoint(s).`);
        }}
        handleBatchDeleteScratchpadRequests={(requestIds) => {
          const reqIdSet = new Set(requestIds);
          setScratchpadRequests((prev) => prev.filter((r) => !reqIdSet.has(r.id)));
          showToast('info', 'Drafts Deleted', `Deleted ${requestIds.length} draft(s).`);
        }}
        appPromptState={appPromptState}
        setAppPromptState={setAppPromptState}
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        activeRequest={activeRequest}
        handleExecuteRequest={handleExecuteRequest}
        handleOpenScratchpadRequestInTab={handleOpenScratchpadRequestInTab}
        setActiveTabMode={setActiveTabMode}
        isKeyboardShortcutsOpen={isKeyboardShortcutsOpen}
        setIsKeyboardShortcutsOpen={setIsKeyboardShortcutsOpen}
        isApiDocsOpen={isApiDocsOpen}
        setIsApiDocsOpen={setIsApiDocsOpen}
        activeRequestId={activeRequestId}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
