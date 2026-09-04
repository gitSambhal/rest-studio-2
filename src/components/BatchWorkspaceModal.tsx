import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Trash2,
  Building2,
  FolderOpen,
  Globe,
  Variable,
  FileText,
  Zap,
  CheckSquare,
  Square,
  AlertTriangle,
  Layers,
  Search,
  Check,
} from 'lucide-react';
import { Organization, Project, Environment, EnvVariable, RestFile, RestRequest } from '../types';

interface BatchWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  activeOrgId: string;
  activeProjectId: string;
  globalVariables: EnvVariable[];
  scratchpadRequests: RestRequest[];
  isDarkMode?: boolean;
  onBatchDeleteOrganizations: (orgIds: string[]) => void;
  onBatchDeleteProjects: (orgId: string, projectIds: string[]) => void;
  onBatchDeleteEnvironments: (orgId: string, projectId: string, envIds: string[]) => void;
  onBatchDeleteGlobalVariables: (varIds: string[]) => void;
  onBatchDeleteOrgVariables: (orgId: string, varIds: string[]) => void;
  onBatchDeleteFiles: (orgId: string, projectId: string, fileIds: string[]) => void;
  onBatchDeleteRequests: (orgId: string, projectId: string, fileId: string, requestIds: string[]) => void;
  onBatchDeleteScratchpadRequests: (requestIds: string[]) => void;
}

type BatchTab = 'orgs' | 'projects' | 'environments' | 'variables' | 'files' | 'scratchpad';

export const BatchWorkspaceModal: React.FC<BatchWorkspaceModalProps> = ({
  isOpen,
  onClose,
  organizations,
  activeOrgId,
  activeProjectId,
  globalVariables,
  scratchpadRequests,
  isDarkMode = true,
  onBatchDeleteOrganizations,
  onBatchDeleteProjects,
  onBatchDeleteEnvironments,
  onBatchDeleteGlobalVariables,
  onBatchDeleteOrgVariables,
  onBatchDeleteFiles,
  onBatchDeleteRequests,
  onBatchDeleteScratchpadRequests,
}) => {
  const [activeTab, setActiveTab] = useState<BatchTab>('orgs');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item IDs per tab
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [selectedProjectOrgId, setSelectedProjectOrgId] = useState<string>(activeOrgId || organizations[0]?.id || '');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Environment tab selection
  const [selectedEnvOrgId, setSelectedEnvOrgId] = useState<string>(activeOrgId || organizations[0]?.id || '');
  const [selectedEnvProjectId, setSelectedEnvProjectId] = useState<string>(activeProjectId || '');
  const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]);

  // Variables tab selection
  const [variableScope, setVariableScope] = useState<'global' | 'org'>('global');
  const [selectedVarOrgId, setSelectedVarOrgId] = useState<string>(activeOrgId || organizations[0]?.id || '');
  const [selectedVarIds, setSelectedVarIds] = useState<string[]>([]);

  // Files & Endpoints tab selection
  const [selectedFileOrgId, setSelectedFileOrgId] = useState<string>(activeOrgId || organizations[0]?.id || '');
  const [selectedFileProjectId, setSelectedFileProjectId] = useState<string>(activeProjectId || '');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  // Scratchpad drafts tab selection
  const [selectedScratchpadIds, setSelectedScratchpadIds] = useState<string[]>([]);

  // Confirmation banner state
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

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

  const currentProjectOrg = organizations.find((o) => o.id === selectedProjectOrgId) || organizations[0];
  const currentEnvOrg = organizations.find((o) => o.id === selectedEnvOrgId) || organizations[0];
  const currentEnvProj = (currentEnvOrg?.projects || []).find((p) => p.id === selectedEnvProjectId) || currentEnvOrg?.projects?.[0];
  const currentVarOrg = organizations.find((o) => o.id === selectedVarOrgId) || organizations[0];
  const currentFileOrg = organizations.find((o) => o.id === selectedFileOrgId) || organizations[0];
  const currentFileProj = (currentFileOrg?.projects || []).find((p) => p.id === selectedFileProjectId) || currentFileOrg?.projects?.[0];

  const handleToggleSelect = (id: string, currentList: string[], setList: (l: string[]) => void) => {
    if (currentList.includes(id)) {
      setList(currentList.filter((item) => item !== id));
    } else {
      setList([...currentList, id]);
    }
  };

  const handleSelectAll = (allIds: string[], currentList: string[], setList: (l: string[]) => void) => {
    if (currentList.length === allIds.length) {
      setList([]);
    } else {
      setList([...allIds]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className={`w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border ${
          isDarkMode
            ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Multi-Delete & Batch Manager</h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Bulk clean up organizations, projects, environment profiles, variables, endpoints, and drafts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex items-center space-x-1 p-2 border-b font-mono text-xs overflow-x-auto ${
            isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100/80 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('orgs');
              setConfirmingAction(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'orgs'
                ? isDarkMode
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 shadow-sm'
                  : 'bg-purple-100 text-purple-800 font-bold border border-purple-300 shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Organizations</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/15 border border-purple-500/30">
              {organizations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('projects');
              setConfirmingAction(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'projects'
                ? isDarkMode
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                  : 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Projects</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              {organizations.reduce((acc, o) => acc + (o.projects?.length || 0), 0)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('environments');
              setConfirmingAction(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'environments'
                ? isDarkMode
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                  : 'bg-sky-100 text-sky-800 font-bold border border-sky-300 shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>Environment Profiles</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('variables');
              setConfirmingAction(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'variables'
                ? isDarkMode
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'bg-amber-100 text-amber-800 font-bold border border-amber-300 shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Variable className="w-3.5 h-3.5 text-amber-400" />
            <span>Variables</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('files');
              setConfirmingAction(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'files'
                ? isDarkMode
                  ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40 shadow-sm'
                  : 'bg-blue-100 text-blue-800 font-bold border border-blue-300 shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Files & Endpoints</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('scratchpad');
              setConfirmingAction(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'scratchpad'
                ? isDarkMode
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'bg-amber-100 text-amber-800 font-bold border border-amber-300 shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Scratchpad Drafts</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 border border-amber-500/30">
              {(scratchpadRequests || []).length}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-4 flex flex-col overflow-y-auto space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items..."
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono focus:outline-none transition-colors ${
                isDarkMode
                  ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-rose-500/50'
                  : 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-rose-500'
              }`}
            />
          </div>

          {/* 1. ORGANIZATIONS TAB */}
          {activeTab === 'orgs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAll(
                        organizations.map((o) => o.id),
                        selectedOrgIds,
                        setSelectedOrgIds
                      )
                    }
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {selectedOrgIds.length === organizations.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{selectedOrgIds.length === organizations.length ? 'Deselect All' : 'Select All'}</span>
                  </button>
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedOrgIds.length} of {organizations.length} selected
                  </span>
                </div>

                {selectedOrgIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmingAction === 'delete_orgs') {
                        onBatchDeleteOrganizations(selectedOrgIds);
                        setSelectedOrgIds([]);
                        setConfirmingAction(null);
                      } else {
                        setConfirmingAction('delete_orgs');
                      }
                    }}
                    className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      confirmingAction === 'delete_orgs'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-rose-500 hover:bg-rose-400 text-white'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {confirmingAction === 'delete_orgs'
                        ? `Confirm Delete ${selectedOrgIds.length} Orgs?`
                        : `Delete Selected (${selectedOrgIds.length})`}
                    </span>
                  </button>
                )}
              </div>

              {confirmingAction === 'delete_orgs' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>
                    Warning: Deleting selected organizations will permanently delete all enclosed projects, collection files, and endpoints!
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {organizations
                  .filter((org) => !searchQuery || org.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((org) => {
                    const isSelected = selectedOrgIds.includes(org.id);
                    const isCurrent = org.id === activeOrgId;
                    const totalReqs = (org.projects || []).reduce(
                      (acc, p) => acc + (p.files || []).reduce((facc, f) => facc + (f.requests?.length || 0), 0),
                      0
                    );

                    return (
                      <div
                        key={org.id}
                        onClick={() => handleToggleSelect(org.id, selectedOrgIds, setSelectedOrgIds)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                              : 'bg-purple-50 border-purple-300 text-purple-900'
                            : isDarkMode
                            ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-200'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded bg-slate-900 border-slate-700 text-purple-500 cursor-pointer pointer-events-none"
                          />
                          <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs flex items-center space-x-2">
                              <span className="truncate">{org.name || 'Organization'}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Current Active
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {(org.projects || []).length} projects &bull; {totalReqs} endpoints
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">{org.id}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 2. PROJECTS TAB */}
          {activeTab === 'projects' && (
            <div className="space-y-3">
              {/* Select Org Filter */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Select Organization:
                  </span>
                  <select
                    value={selectedProjectOrgId}
                    onChange={(e) => {
                      setSelectedProjectOrgId(e.target.value);
                      setSelectedProjectIds([]);
                      setConfirmingAction(null);
                    }}
                    className={`text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none border ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        🏢 {org.name} ({(org.projects || []).length} projects)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAll(
                        (currentProjectOrg?.projects || []).map((p) => p.id),
                        selectedProjectIds,
                        setSelectedProjectIds
                      )
                    }
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {selectedProjectIds.length === (currentProjectOrg?.projects || []).length && (currentProjectOrg?.projects || []).length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {selectedProjectIds.length === (currentProjectOrg?.projects || []).length && (currentProjectOrg?.projects || []).length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </span>
                  </button>

                  {selectedProjectIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmingAction === 'delete_projects') {
                          onBatchDeleteProjects(currentProjectOrg.id, selectedProjectIds);
                          setSelectedProjectIds([]);
                          setConfirmingAction(null);
                        } else {
                          setConfirmingAction('delete_projects');
                        }
                      }}
                      className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        confirmingAction === 'delete_projects'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-rose-500 hover:bg-rose-400 text-white'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {confirmingAction === 'delete_projects'
                          ? `Confirm Delete ${selectedProjectIds.length} Projects?`
                          : `Delete Selected (${selectedProjectIds.length})`}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {(currentProjectOrg?.projects || [])
                  .filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((proj) => {
                    const isSelected = selectedProjectIds.includes(proj.id);
                    const isCurrent = proj.id === activeProjectId;
                    const reqCount = (proj.files || []).reduce((acc, f) => acc + (f.requests?.length || 0), 0);

                    return (
                      <div
                        key={proj.id}
                        onClick={() => handleToggleSelect(proj.id, selectedProjectIds, setSelectedProjectIds)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : isDarkMode
                            ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-200'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded bg-slate-900 border-slate-700 text-emerald-500 cursor-pointer pointer-events-none"
                          />
                          <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs flex items-center space-x-2">
                              <span className="truncate">{proj.name || 'Project'}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Current Active
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {(proj.files || []).length} collection files &bull; {reqCount} endpoints
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">{proj.id}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 3. ENVIRONMENT PROFILES TAB */}
          {activeTab === 'environments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedEnvOrgId}
                    onChange={(e) => {
                      setSelectedEnvOrgId(e.target.value);
                      const org = organizations.find((o) => o.id === e.target.value);
                      setSelectedEnvProjectId(org?.projects?.[0]?.id || '');
                      setSelectedEnvIds([]);
                    }}
                    className={`text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none border ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        🏢 {org.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedEnvProjectId}
                    onChange={(e) => {
                      setSelectedEnvProjectId(e.target.value);
                      setSelectedEnvIds([]);
                    }}
                    className={`text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none border ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {(currentEnvOrg?.projects || []).map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        📁 {proj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAll(
                        (currentEnvProj?.environments || []).map((e) => e.id),
                        selectedEnvIds,
                        setSelectedEnvIds
                      )
                    }
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {selectedEnvIds.length === (currentEnvProj?.environments || []).length && (currentEnvProj?.environments || []).length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {selectedEnvIds.length === (currentEnvProj?.environments || []).length && (currentEnvProj?.environments || []).length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </span>
                  </button>

                  {selectedEnvIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmingAction === 'delete_envs') {
                          onBatchDeleteEnvironments(currentEnvOrg.id, currentEnvProj.id, selectedEnvIds);
                          setSelectedEnvIds([]);
                          setConfirmingAction(null);
                        } else {
                          setConfirmingAction('delete_envs');
                        }
                      }}
                      className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        confirmingAction === 'delete_envs'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-rose-500 hover:bg-rose-400 text-white'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {confirmingAction === 'delete_envs'
                          ? `Confirm Delete ${selectedEnvIds.length} Profiles?`
                          : `Delete Selected (${selectedEnvIds.length})`}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {(currentEnvProj?.environments || [])
                  .filter((env) => !searchQuery || env.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((env) => {
                    const isSelected = selectedEnvIds.includes(env.id);
                    const isActive = env.id === currentEnvProj.activeEnvId;

                    return (
                      <div
                        key={env.id}
                        onClick={() => handleToggleSelect(env.id, selectedEnvIds, setSelectedEnvIds)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
                              : 'bg-sky-50 border-sky-300 text-sky-900'
                            : isDarkMode
                            ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-200'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded bg-slate-900 border-slate-700 text-sky-500 cursor-pointer pointer-events-none"
                          />
                          <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs flex items-center space-x-2">
                              <span className="truncate">{env.name}</span>
                              {isActive && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  Active Profile
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {(env.variables || []).length} variables
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">{env.id}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 4. VARIABLES TAB */}
          {activeTab === 'variables' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVariableScope('global');
                      setSelectedVarIds([]);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      variableScope === 'global'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : isDarkMode
                        ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Global Variables ({globalVariables.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVariableScope('org');
                      setSelectedVarIds([]);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      variableScope === 'org'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : isDarkMode
                        ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Organization Variables
                  </button>

                  {variableScope === 'org' && (
                    <select
                      value={selectedVarOrgId}
                      onChange={(e) => {
                        setSelectedVarOrgId(e.target.value);
                        setSelectedVarIds([]);
                      }}
                      className={`text-xs rounded-lg px-2 py-1 font-mono focus:outline-none border ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          🏢 {org.name} ({(org.variables || []).length} vars)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {(() => {
                    const currentVars = variableScope === 'global' ? globalVariables : currentVarOrg?.variables || [];
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectAll(
                              currentVars.map((v) => v.id),
                              selectedVarIds,
                              setSelectedVarIds
                            )
                          }
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                            isDarkMode
                              ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                              : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                        >
                          {selectedVarIds.length === currentVars.length && currentVars.length > 0 ? (
                            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>
                            {selectedVarIds.length === currentVars.length && currentVars.length > 0
                              ? 'Deselect All'
                              : 'Select All'}
                          </span>
                        </button>

                        {selectedVarIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirmingAction === 'delete_vars') {
                                if (variableScope === 'global') {
                                  onBatchDeleteGlobalVariables(selectedVarIds);
                                } else {
                                  onBatchDeleteOrgVariables(currentVarOrg.id, selectedVarIds);
                                }
                                setSelectedVarIds([]);
                                setConfirmingAction(null);
                              } else {
                                setConfirmingAction('delete_vars');
                              }
                            }}
                            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              confirmingAction === 'delete_vars'
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-rose-500 hover:bg-rose-400 text-white'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              {confirmingAction === 'delete_vars'
                                ? `Confirm Delete ${selectedVarIds.length} Vars?`
                                : `Delete Selected (${selectedVarIds.length})`}
                            </span>
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-1.5">
                {(variableScope === 'global' ? globalVariables : currentVarOrg?.variables || [])
                  .filter(
                    (v) =>
                      !searchQuery ||
                      v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      v.value.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((v) => {
                    const isSelected = selectedVarIds.includes(v.id);

                    return (
                      <div
                        key={v.id}
                        onClick={() => handleToggleSelect(v.id, selectedVarIds, setSelectedVarIds)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                              : 'bg-amber-50 border-amber-300 text-amber-900'
                            : isDarkMode
                            ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-200'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded bg-slate-900 border-slate-700 text-amber-500 cursor-pointer pointer-events-none"
                          />
                          <Variable className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-xs text-emerald-400 mr-2">{v.key || '(empty key)'}</span>
                            <span className="font-mono text-xs text-slate-400">
                              = {v.secret ? '••••••••' : v.value || '""'}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">{v.id}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 5. FILES & ENDPOINTS TAB */}
          {activeTab === 'files' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedFileOrgId}
                    onChange={(e) => {
                      setSelectedFileOrgId(e.target.value);
                      const org = organizations.find((o) => o.id === e.target.value);
                      setSelectedFileProjectId(org?.projects?.[0]?.id || '');
                      setSelectedFileIds([]);
                      setSelectedRequestIds([]);
                    }}
                    className={`text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none border ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        🏢 {org.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedFileProjectId}
                    onChange={(e) => {
                      setSelectedFileProjectId(e.target.value);
                      setSelectedFileIds([]);
                      setSelectedRequestIds([]);
                    }}
                    className={`text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none border ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {(currentFileOrg?.projects || []).map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        📁 {proj.name} ({(proj.files || []).length} files)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAll(
                        (currentFileProj?.files || []).map((f) => f.id),
                        selectedFileIds,
                        setSelectedFileIds
                      )
                    }
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {selectedFileIds.length === (currentFileProj?.files || []).length && (currentFileProj?.files || []).length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {selectedFileIds.length === (currentFileProj?.files || []).length && (currentFileProj?.files || []).length > 0
                        ? 'Deselect Files'
                        : 'Select All Files'}
                    </span>
                  </button>

                  {selectedFileIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmingAction === 'delete_files') {
                          onBatchDeleteFiles(currentFileOrg.id, currentFileProj.id, selectedFileIds);
                          setSelectedFileIds([]);
                          setConfirmingAction(null);
                        } else {
                          setConfirmingAction('delete_files');
                        }
                      }}
                      className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        confirmingAction === 'delete_files'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-rose-500 hover:bg-rose-400 text-white'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {confirmingAction === 'delete_files'
                          ? `Confirm Delete ${selectedFileIds.length} Files?`
                          : `Delete Selected (${selectedFileIds.length})`}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {(currentFileProj?.files || [])
                  .filter(
                    (f) =>
                      !searchQuery ||
                      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (f.requests || []).some((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((file) => {
                    const isFileSelected = selectedFileIds.includes(file.id);

                    return (
                      <div
                        key={file.id}
                        className={`p-3 rounded-xl border space-y-2 transition-all ${
                          isFileSelected
                            ? isDarkMode
                              ? 'bg-blue-500/10 border-blue-500/40'
                              : 'bg-blue-50 border-blue-300'
                            : isDarkMode
                            ? 'bg-slate-950/60 border-slate-800'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div
                          onClick={() => handleToggleSelect(file.id, selectedFileIds, setSelectedFileIds)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isFileSelected}
                              onChange={() => {}}
                              className="rounded bg-slate-900 border-slate-700 text-blue-500 cursor-pointer pointer-events-none"
                            />
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="font-semibold text-xs font-mono">{file.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">
                              ({(file.requests || []).length} endpoints)
                            </span>
                          </div>
                        </div>

                        {/* File Endpoints */}
                        {(file.requests || []).length > 0 && (
                          <div className="pl-6 space-y-1 pt-1 border-t border-slate-800/40">
                            {(file.requests || []).map((req) => (
                              <div
                                key={req.id}
                                className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-mono ${
                                  isDarkMode ? 'bg-slate-900/60 text-slate-300' : 'bg-white text-slate-800'
                                }`}
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <span className="text-[9px] font-bold px-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    {req.method}
                                  </span>
                                  <span className="truncate">{req.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onBatchDeleteRequests(currentFileOrg.id, currentFileProj.id, file.id, [req.id]);
                                  }}
                                  className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition-colors cursor-pointer"
                                  title="Delete Endpoint"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 6. SCRATCHPAD DRAFTS TAB */}
          {activeTab === 'scratchpad' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAll(
                        (scratchpadRequests || []).map((r) => r.id),
                        selectedScratchpadIds,
                        setSelectedScratchpadIds
                      )
                    }
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {selectedScratchpadIds.length === (scratchpadRequests || []).length && (scratchpadRequests || []).length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {selectedScratchpadIds.length === (scratchpadRequests || []).length && (scratchpadRequests || []).length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </span>
                  </button>
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedScratchpadIds.length} of {(scratchpadRequests || []).length} selected
                  </span>
                </div>

                {selectedScratchpadIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmingAction === 'delete_scratchpads') {
                        onBatchDeleteScratchpadRequests(selectedScratchpadIds);
                        setSelectedScratchpadIds([]);
                        setConfirmingAction(null);
                      } else {
                        setConfirmingAction('delete_scratchpads');
                      }
                    }}
                    className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      confirmingAction === 'delete_scratchpads'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-rose-500 hover:bg-rose-400 text-white'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {confirmingAction === 'delete_scratchpads'
                        ? `Confirm Delete ${selectedScratchpadIds.length} Drafts?`
                        : `Delete Selected (${selectedScratchpadIds.length})`}
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {(scratchpadRequests || [])
                  .filter(
                    (r) =>
                      !searchQuery ||
                      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.url.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((draft) => {
                    const isSelected = selectedScratchpadIds.includes(draft.id);

                    return (
                      <div
                        key={draft.id}
                        onClick={() => handleToggleSelect(draft.id, selectedScratchpadIds, setSelectedScratchpadIds)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                              : 'bg-amber-50 border-amber-300 text-amber-900'
                            : isDarkMode
                            ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-200'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded bg-slate-900 border-slate-700 text-amber-500 cursor-pointer pointer-events-none"
                          />
                          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs flex items-center space-x-2">
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {draft.method}
                              </span>
                              <span className="truncate">{draft.name || 'Untitled Draft'}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 truncate">{draft.url}</div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">{draft.id}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
            Tip: Deleted requests and files automatically close their corresponding workspace tabs.
          </span>

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
