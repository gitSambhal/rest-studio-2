import React, { useState, useRef, useEffect } from 'react';
import { Organization, Project } from '../types';
import { THEMES, UIThemeId } from '../utils/themeManager';
import { InlineThemeSelector, getThemeIcon } from './InlineThemeSelector';
import { getSavedGitHubUser, GitHubUser } from '../services/githubSyncService';
import {
  Zap,
  Building2,
  FolderOpen,
  Plus,
  Settings2,
  Upload,
  ChevronDown,
  FileCode,
  PlayCircle,
  History,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  SlidersHorizontal,
  Layers,
  Code2,
  Terminal,
  Edit2,
  Trash2,
  CheckCircle2,
  Palette,
  Cloud,
  GitBranch,
  MoreVertical,
  Menu,
  Check,
  Search,
  Keyboard,
} from 'lucide-react';

interface HeaderProps {
  organizations: Organization[];
  activeOrg: Organization;
  onSelectOrg: (org: Organization) => void;
  onOpenNewOrgModal: () => void;
  onRenameOrg?: (orgId: string, currentName: string) => void;
  onDeleteOrg?: (orgId: string, currentName: string) => void;

  projects: Project[];
  activeProject: Project;
  onSelectProject: (project: Project) => void;
  onOpenNewProjectModal: () => void;
  onRenameProject?: (projectId: string, currentName: string) => void;
  onDeleteProject?: (projectId: string, currentName: string) => void;

  onSelectEnvironment: (envId: string) => void;
  onOpenEnvManager: () => void;

  activeTab: string;
  onChangeTab: (tab: any) => void;
  onOpenImportExport: () => void;
  onOpenQuickHelp?: () => void;
  onOpenSettings?: () => void;
  onOpenQuickNewRequest?: () => void;
  onOpenQuickCurl?: () => void;
  onOpenGitHubSync?: () => void;
  onOpenBatchWorkspaceModal?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
  isGitHubSynced?: boolean;
  githubUser?: GitHubUser | null;
  historyCount: number;

  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentTheme?: UIThemeId;
  onSelectTheme?: (themeId: UIThemeId) => void;
}

export const Header: React.FC<HeaderProps> = ({
  organizations,
  activeOrg,
  onSelectOrg,
  onOpenNewOrgModal,
  onRenameOrg,
  onDeleteOrg,
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  onRenameProject,
  onDeleteProject,
  onSelectEnvironment,
  onOpenEnvManager,
  activeTab,
  onChangeTab,
  onOpenImportExport,
  onOpenQuickHelp,
  onOpenSettings,
  onOpenQuickNewRequest,
  onOpenQuickCurl,
  onOpenGitHubSync,
  onOpenBatchWorkspaceModal,
  onOpenCommandPalette,
  onOpenShortcuts,
  isGitHubSynced = false,
  githubUser: propGithubUser,
  historyCount,
  isDarkMode,
  onToggleDarkMode,
  currentTheme = 'dark',
  onSelectTheme,
}) => {

  const activeEnv = activeProject?.environments?.find((e) => e.id === activeProject?.activeEnvId);

  const [isOrgOpen, setIsOrgOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isEnvOpen, setIsEnvOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  const orgRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
        setIsOrgOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setIsProjectOpen(false);
      }
      if (envRef.current && !envRef.current.contains(event.target as Node)) {
        setIsEnvOpen(false);
      }
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];
  const githubUser = propGithubUser || (typeof window !== 'undefined' ? getSavedGitHubUser() : null);

  return (
    <header
      className={`relative z-40 border-b px-2 sm:px-3 lg:px-4 py-2 flex items-center justify-between shrink-0 select-none gap-1 sm:gap-2 w-full transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* SECTION 1: Brand & Workspace Context (Org, Project, Environment) */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 min-w-0">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <img
            src="/icon.svg"
            alt="RestStudio"
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl shrink-0 select-none pointer-events-none"
            draggable={false}
          />
          <div className="flex flex-col justify-center hidden xl:flex">
            <div className="flex items-center space-x-1.5 leading-none">
              <span className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>RestStudio</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.3.0
              </span>
            </div>
          </div>
        </div>

        <div className={`h-4 w-px shrink-0 hidden xl:block ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />

        {/* Unified Workspace Context Bar (Org -> Project -> Env) */}
        <div className={`flex items-center border p-0.5 rounded-xl space-x-0.5 min-w-0 ${
          isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-100/80 border-slate-300'
        }`}>
            {/* 1. Organization Dropdown */}
            <div className="relative shrink-0" ref={orgRef}>
              <button
                type="button"
                onClick={() => {
                  setIsOrgOpen(!isOrgOpen);
                  setIsProjectOpen(false);
                  setIsEnvOpen(false);
                }}
                className="flex items-center space-x-1 hover:bg-slate-800/80 px-1 sm:px-1.5 py-1 rounded-lg text-slate-200 text-xs font-medium transition-all cursor-pointer"
                title={`Organization: ${activeOrg?.name || 'Organization'}`}
              >
                <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="inline-block max-w-[60px] sm:max-w-[85px] md:max-w-[110px] lg:max-w-[140px] truncate font-semibold">{activeOrg?.name || 'Org'}</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${isOrgOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Org Menu */}
              {isOrgOpen && (
                <div className={`absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] rounded-xl shadow-2xl z-[999] divide-y p-1 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                  isDarkMode
                    ? 'bg-slate-900 border border-slate-700/80 divide-slate-800/60 text-slate-100 shadow-black/80'
                    : 'bg-white border border-slate-200 divide-slate-100 text-slate-900 shadow-slate-900/20'
                }`}>
                  <div className="p-1 space-y-0.5 max-h-56 overflow-y-auto">
                    <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Organizations
                    </div>
                    {organizations.map((org) => (
                      <div
                        key={org.id}
                        className={`group w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors ${
                          org.id === activeOrg?.id
                            ? isDarkMode ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'bg-purple-50 text-purple-700 font-semibold border border-purple-200'
                            : isDarkMode ? 'text-slate-200 hover:bg-slate-800/80' : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-900'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectOrg(org);
                            setIsOrgOpen(false);
                          }}
                          className="flex items-center space-x-2 min-w-0 flex-1 text-left cursor-pointer py-0.5"
                        >
                          <Building2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span className="truncate">{org.name || 'Organization'}</span>
                        </button>

                        <div className="flex items-center space-x-1 shrink-0">
                          <span className={`text-[10px] font-mono shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded border ${
                            isDarkMode ? 'bg-slate-800/60 text-slate-400 border-slate-700/50' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {org.projects?.length || 0} proj
                          </span>
                          {onRenameOrg && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRenameOrg(org.id, org.name || 'Organization');
                                setIsOrgOpen(false);
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:text-purple-400 rounded transition-all cursor-pointer"
                              title="Rename Organization"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {onDeleteOrg && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteOrg(org.id, org.name || 'Organization');
                                setIsOrgOpen(false);
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:text-rose-400 rounded transition-all cursor-pointer"
                              title="Delete Organization"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNewOrgModal();
                        setIsOrgOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer ${
                        isDarkMode ? 'text-purple-400 hover:bg-purple-500/10' : 'text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Organization</span>
                    </button>
                    {onOpenBatchWorkspaceModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenBatchWorkspaceModal();
                          setIsOrgOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                          isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span>Batch / Multi-Delete Orgs</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="text-slate-700 font-mono text-xs shrink-0">/</span>

            {/* 2. Project Dropdown */}
            <div className="relative shrink-0" ref={projectRef}>
              <button
                type="button"
                onClick={() => {
                  setIsProjectOpen(!isProjectOpen);
                  setIsOrgOpen(false);
                  setIsEnvOpen(false);
                }}
                className="flex items-center space-x-1 hover:bg-slate-800/80 px-1 sm:px-1.5 py-1 rounded-lg text-slate-200 text-xs font-medium transition-all cursor-pointer"
                title={`Project: ${activeProject?.name || 'Project'}`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="max-w-[60px] sm:max-w-[75px] md:max-w-[90px] lg:max-w-[130px] truncate font-semibold">{activeProject?.name || 'Project'}</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${isProjectOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Project Menu */}
              {isProjectOpen && (
                <div className={`absolute left-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] rounded-xl shadow-2xl z-[999] divide-y p-1 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                  isDarkMode
                    ? 'bg-slate-900 border border-slate-700/80 divide-slate-800/60 text-slate-100 shadow-black/80'
                    : 'bg-white border border-slate-200 divide-slate-100 text-slate-900 shadow-slate-900/20'
                }`}>
                  <div className="p-1 space-y-0.5 max-h-60 overflow-y-auto">
                    <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Projects in {activeOrg?.name}
                    </div>
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className={`group w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors ${
                          proj.id === activeProject?.id
                            ? isDarkMode ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                            : isDarkMode ? 'text-slate-200 hover:bg-slate-800/80' : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-900'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(proj);
                            setIsProjectOpen(false);
                          }}
                          className="flex items-center space-x-2 min-w-0 flex-1 text-left cursor-pointer py-0.5"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate font-medium">{proj.name || 'Project'}</span>
                        </button>

                        <div className="flex items-center space-x-1 shrink-0">
                          <span className={`text-[10px] font-mono shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded border ${
                            isDarkMode ? 'bg-slate-800/60 text-slate-400 border-slate-700/50' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {proj.files?.length || 0} collections
                          </span>
                          {onRenameProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRenameProject(proj.id, proj.name || 'Project');
                                setIsProjectOpen(false);
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:text-emerald-400 rounded transition-all cursor-pointer"
                              title="Rename Project"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {onDeleteProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteProject(proj.id, proj.name || 'Project');
                                setIsProjectOpen(false);
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:text-rose-400 rounded transition-all cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNewProjectModal();
                        setIsProjectOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer ${
                        isDarkMode ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Project in Org</span>
                    </button>
                    {onOpenBatchWorkspaceModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenBatchWorkspaceModal();
                          setIsProjectOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
                          isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Batch / Multi-Delete Projects</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="text-slate-700 font-mono text-xs shrink-0">:</span>

            {/* 3. Environment Dropdown */}
            <div className="relative shrink-0" ref={envRef}>
              <button
                type="button"
                onClick={() => {
                  setIsEnvOpen(!isEnvOpen);
                  setIsOrgOpen(false);
                  setIsProjectOpen(false);
                }}
                className={`flex items-center space-x-1 px-1 sm:px-1.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isDarkMode ? 'text-slate-200 hover:bg-slate-800/80' : 'text-slate-700 hover:bg-slate-200/80'
                }`}
                title={`Environment: ${activeEnv ? activeEnv.name : 'No Env'}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeEnv?.color || '#94a3b8' }}
                />
                <span className="max-w-[45px] sm:max-w-[60px] md:max-w-[75px] lg:max-w-[110px] truncate text-xs font-mono font-semibold">
                  {activeEnv ? activeEnv.name : 'No Env'}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60 transition-transform" />
              </button>

              {/* Environment Menu */}
              {isEnvOpen && (
                <div className={`absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] rounded-xl shadow-2xl z-[999] divide-y p-1 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                  isDarkMode
                    ? 'bg-slate-900 border border-slate-700/80 divide-slate-800/60 text-slate-100 shadow-black/80'
                    : 'bg-white border border-slate-200 divide-slate-100 text-slate-900 shadow-slate-900/20'
                }`}>
                  <div className="p-1 space-y-0.5 max-h-60 overflow-y-auto">
                    <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>Active Environment</span>
                      <span className="text-[10px] text-emerald-500 font-mono">
                        {activeProject?.environments?.length || 0} Envs
                      </span>
                    </div>

                    {/* Option 1: No Environment (Raw / Pure Request) */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectEnvironment('');
                        setIsEnvOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                        !activeProject?.activeEnvId
                          ? isDarkMode
                            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                            : 'bg-amber-50 text-amber-800 font-bold border border-amber-200'
                          : isDarkMode
                          ? 'text-slate-300 hover:bg-slate-800/80'
                          : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-900'
                      }`}
                      title="Run requests without any environment variables applied"
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-1">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-slate-500" />
                        <span className="truncate">No Environment (None)</span>
                      </div>
                      <span
                        className={`text-[10px] font-normal shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded border ${
                          isDarkMode
                            ? 'bg-slate-800/60 text-slate-400 border-slate-700/50'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        raw / plain
                      </span>
                    </button>

                    {activeProject?.environments?.map((env) => (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => {
                          onSelectEnvironment(env.id);
                          setIsEnvOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                          env.id === activeProject.activeEnvId
                            ? isDarkMode ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                            : isDarkMode ? 'text-slate-200 hover:bg-slate-800/80' : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 pr-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: env.color || '#10b981' }}
                          />
                          <span className="truncate">{env.name}</span>
                        </div>
                        <span className={`text-[10px] font-normal shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded border ${
                          isDarkMode ? 'bg-slate-800/60 text-slate-400 border-slate-700/50' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {env.variables.filter((v) => v.enabled).length} vars
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenEnvManager();
                        setIsEnvOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? 'text-slate-200 hover:bg-slate-800/80' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Settings2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Manage Env Variables</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* SECTION 2: Center View Modes (Request Builder, .rest Code, Runner, History) */}
      <div
        className={`flex items-center justify-center p-0.5 sm:p-1 rounded-xl border shadow-inner shrink-0 transition-colors space-x-0.5 sm:space-x-1 ${
          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
        }`}
      >
        <button
          type="button"
          onClick={() => onChangeTab('editor')}
          className={`flex items-center space-x-1 px-1.5 sm:px-2 lg:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'editor'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Visual Request Builder Interface"
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">Builder</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('code')}
          className={`flex items-center space-x-1 px-1.5 sm:px-2 lg:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'code'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Raw Script Code View"
        >
          <FileCode className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">Code</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('runner')}
          className={`flex items-center space-x-1 px-1.5 sm:px-2 lg:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'runner'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Batch Collection Runner"
        >
          <PlayCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">Runner</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('history')}
          className={`flex items-center space-x-1 px-1.5 sm:px-2 lg:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Execution History Log"
        >
          <History className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">History</span>
          {historyCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {historyCount}
            </span>
          )}
        </button>
      </div>

      {/* SECTION 3: Responsive Utility & Settings Actions */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
        {/* Full Toolbar on XL screens */}
        <div className="hidden xl:flex items-center space-x-1.5 shrink-0">
          {onOpenImportExport && (
            <button
              type="button"
              onClick={onOpenImportExport}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0 ${
                isDarkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-slate-100'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900'
              }`}
              title="Import Postman Collections, Insomnia, cURL, or OpenAPI"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import</span>
            </button>
          )}

          {onOpenGitHubSync && (
            <button
              type="button"
              onClick={onOpenGitHubSync}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0 ${
                isGitHubSynced
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                  : isDarkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-slate-100'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900'
              }`}
              title={
                isGitHubSynced
                  ? `Cloud Synced ${githubUser?.login ? `(@${githubUser.login})` : ''}`
                  : 'Free Cloud Backup, GitHub Gist Sync & Git Data History'
              }
            >
              {isGitHubSynced && githubUser?.avatar_url ? (
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="w-4 h-4 rounded-full border border-emerald-400 object-cover shrink-0"
                />
              ) : (
                <GitBranch className={`w-3.5 h-3.5 ${isGitHubSynced ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              )}
              <span className="truncate max-w-[120px]">
                {isGitHubSynced
                  ? githubUser?.login
                    ? `@${githubUser.login}`
                    : 'Cloud Synced'
                  : 'Sync'}
              </span>
            </button>
          )}

          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0 ${
                isDarkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-slate-100'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900'
              }`}
              title="Global Command Palette (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden 2xl:inline">Command</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-slate-900/60 border border-slate-700 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>
          )}

          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0 ${
                isDarkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title="Keyboard Shortcuts Cheatsheet (?)"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          )}

          {onSelectTheme && (
            <InlineThemeSelector
              currentTheme={currentTheme}
              onSelectTheme={onSelectTheme}
              isDarkMode={isDarkMode}
              onToggleDarkMode={onToggleDarkMode}
            />
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0 ${
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
              title="Settings & Reference Center (Ctrl+,)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Settings</span>
            </button>
          )}
        </div>

        {/* Compact Responsive Toolbar + Overflow Menu on Constrained Screens (< XL) */}
        <div className="flex xl:hidden items-center space-x-1 shrink-0">
          {/* Quick Dark Mode Switcher */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm shrink-0 ${
              isDarkMode
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-amber-300 hover:text-amber-200'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Direct Settings Icon Button */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`hidden sm:flex p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm shrink-0 ${
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
              title="Workspace Settings (Ctrl+,)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </button>
          )}

          {/* Dedicated Hamburger / Overflow Menu Button */}
          <div className="relative shrink-0" ref={overflowRef}>
            <button
              type="button"
              onClick={() => {
                setIsOverflowOpen(!isOverflowOpen);
                setIsOrgOpen(false);
                setIsProjectOpen(false);
                setIsEnvOpen(false);
              }}
              className={`flex items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm shrink-0 ${
                isOverflowOpen
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/30'
                  : isDarkMode
                  ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
              }`}
              title="Menu & Workspace Tools"
              aria-label="Menu and options"
            >
              <Menu className="w-4 h-4 shrink-0" />
              {isGitHubSynced && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse absolute -top-0.5 -right-0.5" />
              )}
            </button>

            {/* Overflow Dropdown Popover */}
            {isOverflowOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] max-h-[calc(100vh-70px)] overflow-y-auto rounded-2xl shadow-2xl z-[999] divide-y p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 border ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700/90 divide-slate-800 text-slate-100 shadow-black/80'
                    : 'bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-slate-900/20'
                }`}
              >
                {/* Header info */}
                <div className="px-2.5 py-1.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <img src="/icon.svg" alt="RestStudio" className="w-4 h-4 rounded-md" />
                    <span className="font-bold text-xs">Workspace Tools</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    RestStudio v1.3.0
                  </span>
                </div>

                {/* Primary Actions */}
                <div className="p-1 space-y-0.5">
                  {onOpenImportExport && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenImportExport();
                        setIsOverflowOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-semibold">Import / Export</div>
                          <div className="text-[10px] text-slate-400">Postman, Insomnia, OpenAPI, cURL</div>
                        </div>
                      </div>
                    </button>
                  )}

                  {onOpenBatchWorkspaceModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenBatchWorkspaceModal();
                        setIsOverflowOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <div className="font-semibold">Batch / Multi-Delete Manager</div>
                          <div className="text-[10px] text-slate-400">Bulk delete orgs, projects, envs, files</div>
                        </div>
                      </div>
                    </button>
                  )}

                  {onOpenGitHubSync && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenGitHubSync();
                        setIsOverflowOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {isGitHubSynced && githubUser?.avatar_url ? (
                          <img
                            src={githubUser.avatar_url}
                            alt={githubUser.login}
                            className="w-4 h-4 rounded-full border border-emerald-400 object-cover shrink-0"
                          />
                        ) : (
                          <GitBranch className={`w-4 h-4 shrink-0 ${isGitHubSynced ? 'text-emerald-400' : 'text-slate-400'}`} />
                        )}
                        <div>
                          <div className="font-semibold flex items-center space-x-1.5">
                            <span>Cloud & GitHub Sync</span>
                            {isGitHubSynced && githubUser?.login && (
                              <span className="text-[10px] text-emerald-400 font-mono">(@{githubUser.login})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">Free Gist Backup & Git History</div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                          isGitHubSynced
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
                        }`}
                      >
                        {isGitHubSynced ? 'Synced' : 'Off'}
                      </span>
                    </button>
                  )}

                  {onOpenQuickCurl && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenQuickCurl();
                        setIsOverflowOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Terminal className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <div className="font-semibold">Import cURL Command</div>
                          <div className="text-[10px] text-slate-400">Paste raw curl command</div>
                        </div>
                      </div>
                      <kbd className="text-[10px] font-mono text-slate-400">Ctrl+Shift+C</kbd>
                    </button>
                  )}

                  {onOpenQuickNewRequest && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenQuickNewRequest();
                        setIsOverflowOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-semibold">New Quick Request</div>
                          <div className="text-[10px] text-slate-400">Add to active collection</div>
                        </div>
                      </div>
                      <kbd className="text-[10px] font-mono text-slate-400">Ctrl+N</kbd>
                    </button>
                  )}

                  {onOpenCommandPalette && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCommandPalette();
                        setIsOverflowOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Search className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-semibold">Command Palette</div>
                          <div className="text-[10px] text-slate-400">Quick actions & search</div>
                        </div>
                      </div>
                      <kbd className="text-[10px] font-mono text-slate-400">Ctrl+K</kbd>
                    </button>
                  )}

                  {onOpenShortcuts && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenShortcuts();
                        setIsOverflowOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Keyboard className="w-4 h-4 text-sky-400 shrink-0" />
                        <div>
                          <div className="font-semibold">Keyboard Shortcuts</div>
                          <div className="text-[10px] text-slate-400">Quick keys reference cheatsheet</div>
                        </div>
                      </div>
                      <kbd className="text-[10px] font-mono text-slate-400">?</kbd>
                    </button>
                  )}
                </div>

                {/* Theme & Styling Section in Overflow */}
                {onSelectTheme && (
                  <div className="p-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      <span>Theme Preset</span>
                      <span className="text-emerald-400 font-mono capitalize">{activeThemeObj.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            onSelectTheme(theme.id);
                          }}
                          className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            currentTheme === theme.id
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold shadow-sm'
                              : isDarkMode
                              ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span
                            className="p-0.5 rounded shrink-0 flex items-center justify-center border border-slate-700/50"
                            style={{
                              backgroundColor: theme.previewColors.surface,
                              color: theme.previewColors.primary,
                            }}
                          >
                            {getThemeIcon(theme.iconType, 'w-3 h-3')}
                          </span>
                          <span className="truncate text-[11px]">{theme.name}</span>
                          {currentTheme === theme.id && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings & Help */}
                <div className="p-1 space-y-0.5">
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSettings();
                        setIsOverflowOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Settings & Reference</span>
                      </div>
                      <kbd className="text-[10px] font-mono text-slate-400">Ctrl+,</kbd>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
