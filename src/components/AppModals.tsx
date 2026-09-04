import React from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Organization,
  Project,
  RestRequest,
  EnvVariable,
  RestFile,
  RequestHistoryItem,
  HTTPMethod,
} from '../types';
import { EnvironmentManager } from './EnvironmentManager';
import { ImportExportModal } from './ImportExportModal';
import { QuickNewRequestModal } from './QuickNewRequestModal';
import { QuickCurlModal } from './QuickCurlModal';
import { SaveScratchpadModal } from './SaveScratchpadModal';
import { SettingsModal, SettingsTabId } from './SettingsModal';
import { GitHubSyncModal } from './GitHubSyncModal';
import { BatchWorkspaceModal } from './BatchWorkspaceModal';
import { PromptModal } from './PromptModal';
import { CommandPaletteModal } from './CommandPaletteModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ApiDocumentationModal } from './ApiDocumentationModal';
import { GitHubUser, SyncPayload } from '../services/githubSyncService';
import { UIThemeId } from '../utils/themeManager';
import { parseRestFileContent } from '../utils/restParser';

export interface PromptModalState {
  isOpen: boolean;
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  hideInput?: boolean;
  onConfirm: (value: string) => void;
}

export interface AppModalsProps {
  // Environment Manager
  isEnvManagerOpen: boolean;
  setIsEnvManagerOpen: (open: boolean) => void;
  activeOrg: Organization | undefined;
  activeProject: Project | undefined;
  globalVariables: EnvVariable[];
  setGlobalVariables: React.Dispatch<React.SetStateAction<EnvVariable[]>>;
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  organizations: Organization[];
  activeOrgId: string;
  activeProjectId: string;
  activeFileId: string | null;

  // Import / Export
  isImportExportOpen: boolean;
  setIsImportExportOpen: (open: boolean) => void;
  isDarkMode: boolean;
  updateProjectFiles: (files: RestFile[]) => void;
  handleOpenRequestInTab: (fileId: string, reqId: string) => void;
  handleImportPostman: (folders: { id: string; name: string; fileIds: string[] }[], files: RestFile[]) => void;

  // Quick New Request
  isQuickNewRequestOpen: boolean;
  setIsQuickNewRequestOpen: (open: boolean) => void;
  initialPasteText: string;
  setInitialPasteText: (text: string) => void;
  handleCreateRequest: (fileId: string, method: HTTPMethod, name: string, url?: string, extraProps?: Partial<RestRequest>) => void;
  handleCreateNewFileAndRequest: (fileName: string, method: HTTPMethod, name: string, url?: string, extraProps?: Partial<RestRequest>) => void;
  handleCreateScratchpadRequest: (method: HTTPMethod, name: string, url?: string, extraProps?: Partial<RestRequest>) => void;

  // Quick Curl
  isQuickCurlOpen: boolean;
  setIsQuickCurlOpen: (open: boolean) => void;
  handleImportQuickCurl: (req: RestRequest, targetFileId?: string) => void;
  handleAddNewVariables: (newVars: EnvVariable[]) => void;

  // Save Scratchpad
  isSaveScratchpadOpen: boolean;
  setIsSaveScratchpadOpen: (open: boolean) => void;
  scratchpadToSave: RestRequest | null;
  setScratchpadToSave: (req: RestRequest | null) => void;
  handleSaveScratchpadToProjectFile: (
    targetOrgId: string,
    targetProjectId: string,
    targetFileId: string | 'NEW_FILE',
    newFileName: string,
    request: RestRequest
  ) => void;

  // Settings Modal
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  handleToggleDarkMode: () => void;
  currentTheme: UIThemeId;
  handleSelectTheme: (themeId: UIThemeId) => void;
  splitOrientation: 'left-right' | 'top-bottom';
  setSplitOrientation: React.Dispatch<React.SetStateAction<'left-right' | 'top-bottom'>>;
  settingsTab: SettingsTabId;
  setSettingsTab: (tab: SettingsTabId) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  githubUser: GitHubUser | null;
  setGithubUser: (user: GitHubUser | null) => void;

  // GitHub Sync
  isGitHubSyncOpen: boolean;
  setIsGitHubSyncOpen: (open: boolean) => void;
  history: RequestHistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<RequestHistoryItem[]>>;
  handleApplySyncedData: (payload: SyncPayload, setHistory?: (history: RequestHistoryItem[]) => void) => void;

  // Batch Workspace
  isBatchWorkspaceModalOpen: boolean;
  setIsBatchWorkspaceModalOpen: (open: boolean) => void;
  scratchpadRequests: RestRequest[];
  handleBatchDeleteOrganizations: (orgIds: string[]) => void;
  handleBatchDeleteProjects: (orgId: string, projectIds: string[]) => void;
  handleBatchDeleteEnvironments: (orgId: string, projectId: string, envIds: string[]) => void;
  handleBatchDeleteGlobalVars: (varKeys: string[]) => void;
  handleBatchDeleteOrgVars: (orgId: string, varKeys: string[]) => void;
  handleBatchDeleteFiles: (orgId: string, projectId: string, fileIds: string[]) => void;
  handleBatchDeleteRequests: (orgId: string, projectId: string, fileId: string, requestIds: string[]) => void;
  handleBatchDeleteScratchpadRequests: (requestIds: string[]) => void;

  // Prompt Modal
  appPromptState: PromptModalState;
  setAppPromptState: React.Dispatch<React.SetStateAction<PromptModalState>>;

  // Command Palette
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  activeRequest: RestRequest | undefined;
  handleExecuteRequest: (req: RestRequest) => void;
  handleOpenScratchpadRequestInTab: (reqId: string) => void;
  setActiveTabMode: (mode: 'editor' | 'code' | 'runner' | 'history') => void;

  // Keyboard Shortcuts Modal
  isKeyboardShortcutsOpen: boolean;
  setIsKeyboardShortcutsOpen: (open: boolean) => void;

  // Interactive API Documentation Generator
  isApiDocsOpen: boolean;
  setIsApiDocsOpen: (open: boolean) => void;
  activeRequestId?: string | null;
}

export const AppModals: React.FC<AppModalsProps> = ({
  isEnvManagerOpen,
  setIsEnvManagerOpen,
  activeOrg,
  activeProject,
  globalVariables,
  setGlobalVariables,
  setOrganizations,
  organizations,
  activeOrgId,
  activeProjectId,
  activeFileId,
  isImportExportOpen,
  setIsImportExportOpen,
  isDarkMode,
  updateProjectFiles,
  handleOpenRequestInTab,
  handleImportPostman,
  isQuickNewRequestOpen,
  setIsQuickNewRequestOpen,
  initialPasteText,
  setInitialPasteText,
  handleCreateRequest,
  handleCreateNewFileAndRequest,
  handleCreateScratchpadRequest,
  isQuickCurlOpen,
  setIsQuickCurlOpen,
  handleImportQuickCurl,
  handleAddNewVariables,
  isSaveScratchpadOpen,
  setIsSaveScratchpadOpen,
  scratchpadToSave,
  setScratchpadToSave,
  handleSaveScratchpadToProjectFile,
  isSettingsOpen,
  setIsSettingsOpen,
  handleToggleDarkMode,
  currentTheme,
  handleSelectTheme,
  splitOrientation,
  setSplitOrientation,
  settingsTab,
  setSettingsTab,
  showToast,
  githubUser,
  setGithubUser,
  isGitHubSyncOpen,
  setIsGitHubSyncOpen,
  history,
  setHistory,
  handleApplySyncedData,
  isBatchWorkspaceModalOpen,
  setIsBatchWorkspaceModalOpen,
  scratchpadRequests,
  handleBatchDeleteOrganizations,
  handleBatchDeleteProjects,
  handleBatchDeleteEnvironments,
  handleBatchDeleteGlobalVars,
  handleBatchDeleteOrgVars,
  handleBatchDeleteFiles,
  handleBatchDeleteRequests,
  handleBatchDeleteScratchpadRequests,
  appPromptState,
  setAppPromptState,
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  activeRequest,
  handleExecuteRequest,
  handleOpenScratchpadRequestInTab,
  setActiveTabMode,
  isKeyboardShortcutsOpen,
  setIsKeyboardShortcutsOpen,
  isApiDocsOpen,
  setIsApiDocsOpen,
  activeRequestId,
}) => {
  return (
    <AnimatePresence>
      {/* Environment Hierarchy Manager Modal */}
      {isEnvManagerOpen && (
        <EnvironmentManager
          organization={activeOrg}
          project={activeProject}
          globalVariables={globalVariables}
          onClose={() => setIsEnvManagerOpen(false)}
          onUpdateGlobalVariables={setGlobalVariables}
          onUpdateOrganizationVariables={(updatedOrgVars) => {
            setOrganizations((prev) =>
              prev.map((org) => (org.id === activeOrg?.id ? { ...org, variables: updatedOrgVars } : org))
            );
          }}
          onUpdateProjectEnvironments={(updatedEnvs, activeEnvId) => {
            setOrganizations((prev) =>
              prev.map((org) =>
                org.id === activeOrg?.id
                  ? {
                      ...org,
                      projects: (org.projects || []).map((p) =>
                        p.id === activeProject?.id
                          ? { ...p, environments: updatedEnvs, activeEnvId: activeEnvId }
                          : p
                      ),
                    }
                  : org
              )
            );
          }}
        />
      )}

      {/* Import / Export Workspace Modal */}
      {isImportExportOpen && activeProject && (
        <ImportExportModal
          project={activeProject}
          isDarkMode={isDarkMode}
          onClose={() => setIsImportExportOpen(false)}
          onImportRestFile={(fileName, content) => {
            const parsed = parseRestFileContent(content, fileName);
            const newFile: RestFile = {
              id: 'file_' + Math.random().toString(36).substring(2, 9),
              name: fileName,
              rawContent: content,
              requests: parsed.requests,
              fileVariables: parsed.fileVariables,
              updatedAt: Date.now(),
            };
            updateProjectFiles([...(activeProject.files || []), newFile]);
            if (newFile.requests.length > 0) {
              handleOpenRequestInTab(newFile.id, newFile.requests[0].id);
            }
          }}
          onImportCurl={(req) => {
            const activeFile = activeProject.files?.find((f) => f.id === activeFileId);
            if (activeFile) {
              const updatedFiles = (activeProject.files || []).map((f) =>
                f.id === activeFile.id ? { ...f, requests: [...(f.requests || []), req] } : f
              );
              updateProjectFiles(updatedFiles);
              handleOpenRequestInTab(activeFile.id, req.id);
            }
          }}
          onImportPostman={handleImportPostman}
        />
      )}

      {/* Quick New Request Modal */}
      {isQuickNewRequestOpen && activeProject && (
        <QuickNewRequestModal
          isOpen={isQuickNewRequestOpen}
          project={activeProject}
          activeFileId={activeFileId}
          isDarkMode={isDarkMode}
          initialPasteText={initialPasteText}
          onClose={() => {
            setIsQuickNewRequestOpen(false);
            setInitialPasteText('');
          }}
          onCreateRequest={handleCreateRequest}
          onCreateNewFileAndRequest={handleCreateNewFileAndRequest}
          onCreateScratchpadRequest={handleCreateScratchpadRequest}
        />
      )}

      {/* Quick Request from cURL Modal */}
      {isQuickCurlOpen && (
        <QuickCurlModal
          isOpen={isQuickCurlOpen}
          project={activeProject}
          activeFileId={activeFileId}
          isDarkMode={isDarkMode}
          onClose={() => setIsQuickCurlOpen(false)}
          onImportCurl={handleImportQuickCurl}
          onAddEnvironmentVariables={handleAddNewVariables}
        />
      )}

      {/* Save Scratchpad Request to Project File Modal */}
      {isSaveScratchpadOpen && (
        <SaveScratchpadModal
          isOpen={isSaveScratchpadOpen}
          request={scratchpadToSave}
          organizations={organizations}
          activeOrgId={activeOrgId}
          activeProjectId={activeProjectId}
          isDarkMode={isDarkMode}
          onClose={() => {
            setIsSaveScratchpadOpen(false);
            setScratchpadToSave(null);
          }}
          onSaveToProjectFile={handleSaveScratchpadToProjectFile}
        />
      )}

      {/* Settings & Reference Center Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          currentTheme={currentTheme}
          onSelectTheme={handleSelectTheme}
          activeProject={activeProject}
          organizations={organizations}
          activeOrgId={activeOrgId}
          splitOrientation={splitOrientation}
          onToggleSplitOrientation={() =>
            setSplitOrientation((prev) => (prev === 'top-bottom' ? 'left-right' : 'top-bottom'))
          }
          onOpenGitHubSync={() => setIsGitHubSyncOpen(true)}
          onOpenImportExport={() => setIsImportExportOpen(true)}
          onOpenEnvManager={() => setIsEnvManagerOpen(true)}
          onOpenQuickHelp={() => setSettingsTab('shortcuts')}
          initialTab={settingsTab}
          showToast={showToast}
          githubUser={githubUser}
        />
      )}

      {/* Free GitHub Cloud & Data Sync Modal */}
      {isGitHubSyncOpen && (
        <GitHubSyncModal
          isOpen={isGitHubSyncOpen}
          onClose={() => setIsGitHubSyncOpen(false)}
          organizations={organizations}
          activeOrgId={activeOrgId}
          activeProjectId={activeProjectId}
          environments={activeProject?.environments || []}
          history={history}
          globalVariables={globalVariables}
          onApplySyncedData={(payload) => handleApplySyncedData(payload, setHistory)}
          showToast={(msg, type) => showToast(type, msg)}
          isDarkMode={isDarkMode}
          onUserChange={(u) => setGithubUser(u)}
        />
      )}

      {/* Batch Workspace & Multi-Delete Modal */}
      {isBatchWorkspaceModalOpen && (
        <BatchWorkspaceModal
          isOpen={isBatchWorkspaceModalOpen}
          onClose={() => setIsBatchWorkspaceModalOpen(false)}
          organizations={organizations}
          activeOrgId={activeOrgId}
          activeProjectId={activeProjectId}
          globalVariables={globalVariables}
          scratchpadRequests={scratchpadRequests}
          onBatchDeleteOrganizations={handleBatchDeleteOrganizations}
          onBatchDeleteProjects={handleBatchDeleteProjects}
          onBatchDeleteEnvironments={handleBatchDeleteEnvironments}
          onBatchDeleteGlobalVariables={handleBatchDeleteGlobalVars}
          onBatchDeleteOrgVariables={handleBatchDeleteOrgVars}
          onBatchDeleteFiles={handleBatchDeleteFiles}
          onBatchDeleteRequests={handleBatchDeleteRequests}
          onBatchDeleteScratchpadRequests={handleBatchDeleteScratchpadRequests}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Global App Prompt Modal */}
      {appPromptState.isOpen && (
        <PromptModal
          isOpen={appPromptState.isOpen}
          title={appPromptState.title}
          message={appPromptState.message}
          initialValue={appPromptState.initialValue}
          placeholder={appPromptState.placeholder}
          confirmLabel={appPromptState.confirmLabel}
          hideInput={appPromptState.hideInput}
          isDarkMode={isDarkMode}
          onConfirm={(val) => {
            appPromptState.onConfirm(val);
            setAppPromptState((prev) => ({ ...prev, isOpen: false }));
          }}
          onCancel={() => setAppPromptState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Global Command Palette Modal */}
      {isCommandPaletteOpen && (
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          requests={[
            ...scratchpadRequests,
            ...(activeProject?.files || []).flatMap((f) => f.requests || []),
          ]}
          onSelectRequest={(req) => {
            const isScratchpad = scratchpadRequests.some((s) => s.id === req.id);
            if (isScratchpad) {
              handleOpenScratchpadRequestInTab(req.id);
            } else {
              const parentFile = (activeProject?.files || []).find((f) =>
                (f.requests || []).some((r) => r.id === req.id)
              );
              if (parentFile) {
                handleOpenRequestInTab(parentFile.id, req.id);
              }
            }
          }}
          onSendRequest={() => {
            if (activeRequest) {
              handleExecuteRequest(activeRequest);
            }
          }}
          onNewRequest={() => setIsQuickNewRequestOpen(true)}
          onOpenCurlImport={() => setIsQuickCurlOpen(true)}
          onOpenCookieJar={() => {
            setSettingsTab('preferences');
            setIsSettingsOpen(true);
          }}
          onOpenEnvManager={() => setIsEnvManagerOpen(true)}
          onToggleDarkMode={handleToggleDarkMode}
          isDarkMode={isDarkMode}
          onOpenShortcuts={() => setIsKeyboardShortcutsOpen(true)}
          onOpenSettings={() => {
            setSettingsTab('preferences');
            setIsSettingsOpen(true);
          }}
          onOpenHistory={() => setActiveTabMode('history')}
          onOpenRunner={() => setActiveTabMode('runner')}
          onOpenGitHubSync={() => setIsGitHubSyncOpen(true)}
          onOpenApiDocs={() => setIsApiDocsOpen(true)}
        />
      )}

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      {isKeyboardShortcutsOpen && (
        <KeyboardShortcutsModal
          isOpen={isKeyboardShortcutsOpen}
          onClose={() => setIsKeyboardShortcutsOpen(false)}
        />
      )}

      {/* Interactive API Documentation Generator Modal */}
      {isApiDocsOpen && activeProject && (
        <ApiDocumentationModal
          isOpen={isApiDocsOpen}
          onClose={() => setIsApiDocsOpen(false)}
          project={activeProject}
          activeFileId={activeFileId}
          activeRequestId={activeRequestId}
          onSelectRequest={handleOpenRequestInTab}
          isDarkMode={isDarkMode}
        />
      )}
    </AnimatePresence>
  );
};
