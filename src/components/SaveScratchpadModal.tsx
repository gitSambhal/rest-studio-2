import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Organization, RestRequest } from '../types';
import { X, Save, CheckCircle2, Building2, Folder, FileCode, AlertCircle } from 'lucide-react';

interface SaveScratchpadModalProps {
  isOpen: boolean;
  request: RestRequest | null;
  organizations: Organization[];
  activeOrgId: string;
  activeProjectId: string;
  isDarkMode?: boolean;
  onClose: () => void;
  onSaveToProjectFile: (
    targetOrgId: string,
    targetProjectId: string,
    targetFileId: string | 'NEW_FILE',
    newFileName: string,
    request: RestRequest
  ) => void;
}

export const SaveScratchpadModal: React.FC<SaveScratchpadModalProps> = ({
  isOpen,
  request,
  organizations,
  activeOrgId,
  activeProjectId,
  isDarkMode = true,
  onClose,
  onSaveToProjectFile,
}) => {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [targetFileOption, setTargetFileOption] = useState<string>('NEW_FILE');
  const [newFileName, setNewFileName] = useState<string>('api_endpoints.http');
  const [requestName, setRequestName] = useState<string>('');

  // Synchronize state safely when modal opens or inputs change
  useEffect(() => {
    if (!isOpen || !request) return;

    setRequestName(request.name || 'API Request');

    // Find the best valid organization
    const validOrg =
      organizations.find((o) => o.id === activeOrgId) ||
      (organizations.length > 0 ? organizations[0] : null);

    if (validOrg) {
      setSelectedOrgId(validOrg.id);

      const validProj =
        (validOrg.projects || []).find((p) => p.id === activeProjectId) ||
        (validOrg.projects && validOrg.projects.length > 0 ? validOrg.projects[0] : null);

      if (validProj) {
        setSelectedProjectId(validProj.id);
        if (validProj.files && validProj.files.length > 0) {
          setTargetFileOption(validProj.files[0].id);
        } else {
          setTargetFileOption('NEW_FILE');
        }
      } else {
        setSelectedProjectId('');
        setTargetFileOption('NEW_FILE');
      }
    } else {
      setSelectedOrgId('');
      setSelectedProjectId('');
      setTargetFileOption('NEW_FILE');
    }
  }, [isOpen, request, activeOrgId, activeProjectId, organizations]);

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

  if (!isOpen || !request) return null;

  // Resolve current active organization and projects safely
  const currentOrg =
    organizations.find((o) => o.id === selectedOrgId) ||
    organizations.find((o) => o.id === activeOrgId) ||
    (organizations.length > 0 ? organizations[0] : null);

  const projects = currentOrg?.projects || [];
  const currentProject =
    projects.find((p) => p.id === selectedProjectId) ||
    projects.find((p) => p.id === activeProjectId) ||
    (projects.length > 0 ? projects[0] : null);

  const files = currentProject?.files || [];

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    const org = organizations.find((o) => o.id === orgId);
    const firstProj = org?.projects && org.projects.length > 0 ? org.projects[0] : null;
    if (firstProj) {
      setSelectedProjectId(firstProj.id);
      if (firstProj.files && firstProj.files.length > 0) {
        setTargetFileOption(firstProj.files[0].id);
      } else {
        setTargetFileOption('NEW_FILE');
      }
    } else {
      setSelectedProjectId('');
      setTargetFileOption('NEW_FILE');
    }
  };

  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = projects.find((p) => p.id === projId);
    if (proj?.files && proj.files.length > 0) {
      setTargetFileOption(proj.files[0].id);
    } else {
      setTargetFileOption('NEW_FILE');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalOrgId = currentOrg?.id || selectedOrgId;
    const finalProjectId = currentProject?.id || selectedProjectId;

    if (!finalOrgId || !finalProjectId) return;

    const updatedRequest: RestRequest = {
      ...request,
      name: requestName.trim() || request.name || 'Saved Request',
    };

    onSaveToProjectFile(
      finalOrgId,
      finalProjectId,
      targetFileOption,
      newFileName.trim() || 'api_endpoints.http',
      updatedRequest
    );
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Save Request to Project
              </h2>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Move this standalone scratchpad request into a project collection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Request Preview */}
          <div
            className={`p-3 rounded-xl border space-y-2 ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {request.method}
              </span>
              <span
                className={`text-xs font-mono truncate flex-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {request.url}
              </span>
            </div>
            <div>
              <label
                className={`text-[11px] font-semibold block mb-1 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Request Name
              </label>
              <input
                type="text"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                placeholder="Request Name"
                className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700/80 text-slate-200 placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Org & Project Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                className={`text-[11px] font-semibold flex items-center space-x-1.5 mb-1.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Organization</span>
              </label>
              <select
                value={currentOrg?.id || selectedOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-100'
                    : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                }`}
              >
                {organizations.length === 0 ? (
                  <option value="">No organizations available</option>
                ) : (
                  organizations.map((org) => (
                    <option
                      key={org.id}
                      value={org.id}
                      className={isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}
                    >
                      {org.name || 'Personal Workspace'} ({org.projects?.length || 0} projects)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label
                className={`text-[11px] font-semibold flex items-center space-x-1.5 mb-1.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-emerald-400" />
                <span>Project</span>
              </label>
              <select
                value={currentProject?.id || selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={projects.length === 0}
                className={`w-full border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-100 disabled:opacity-50'
                    : 'bg-white border-slate-300 text-slate-900 shadow-sm disabled:opacity-50'
                }`}
              >
                {projects.length === 0 ? (
                  <option value="">No projects in this organization</option>
                ) : (
                  projects.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      className={isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}
                    >
                      {p.name || 'Untitled Project'} ({p.files?.length || 0} files)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Target File */}
          <div className="space-y-2">
            <label
              className={`text-[11px] font-semibold flex items-center space-x-1.5 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Destination File (.http / .rest)</span>
            </label>
            <select
              value={targetFileOption}
              onChange={(e) => setTargetFileOption(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-white border-slate-300 text-slate-900 shadow-sm'
              }`}
            >
              <option
                value="NEW_FILE"
                className={isDarkMode ? 'bg-slate-900 text-emerald-400 font-bold' : 'bg-white text-emerald-600 font-bold'}
              >
                + Create a New Collection File
              </option>
              {files.map((file) => (
                <option
                  key={file.id}
                  value={file.id}
                  className={isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}
                >
                  📄 {file.name} ({file.requests?.length || 0} requests)
                </option>
              ))}
            </select>

            {targetFileOption === 'NEW_FILE' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g., api_endpoints.http"
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div
            className={`pt-3 border-t flex items-center justify-end space-x-2 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isDarkMode
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!currentOrg || !currentProject}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save to Project</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

