import { useState, useEffect } from 'react';
import {
  Organization,
  Project,
  RestFile,
  RestRequest,
  EnvVariable,
  Environment,
  RequestHistoryItem,
} from '../types';
import { INITIAL_ORGANIZATIONS, INITIAL_GLOBAL_VARIABLES } from '../data/initialOrganizations';
import { SyncPayload, countWorkspaceEntities } from '../services/githubSyncService';

export function useWorkspaceState(showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void) {
  // 1. Global Variables
  const [globalVariables, setGlobalVariables] = useState<EnvVariable[]>(() => {
    try {
      const saved = localStorage.getItem('reststudio_global_vars') || localStorage.getItem('restpulse_global_vars');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_GLOBAL_VARIABLES;
  });

  // 2. Organizations & Projects
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    try {
      const saved = localStorage.getItem('reststudio_organizations') || localStorage.getItem('restpulse_organizations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load saved organizations:', e);
    }
    return INITIAL_ORGANIZATIONS;
  });

  // Determine best initial active org, project, and file
  const initialLoc = (() => {
    const savedOrgId =
      localStorage.getItem('reststudio_active_org_id') ||
      localStorage.getItem('restpulse_active_org_id');
    const savedProjId =
      localStorage.getItem('reststudio_active_project_id') ||
      localStorage.getItem('restpulse_active_project_id');
    const savedFileId =
      localStorage.getItem('reststudio_active_file_id') ||
      localStorage.getItem('restpulse_active_file_id');

    if (savedOrgId && savedProjId) {
      const matchedOrg = organizations.find((o) => o.id === savedOrgId);
      const matchedProj = matchedOrg?.projects?.find((p) => p.id === savedProjId);
      if (matchedProj) {
        return {
          orgId: matchedOrg!.id,
          projId: matchedProj.id,
          fileId:
            savedFileId && matchedProj.files?.some((f) => f.id === savedFileId)
              ? savedFileId
              : matchedProj.files?.[0]?.id || null,
        };
      }
    }

    // If no saved selection, find the first project that actually has collections/files
    for (const org of organizations) {
      for (const proj of org.projects || []) {
        if ((proj.files || []).length > 0) {
          return {
            orgId: org.id,
            projId: proj.id,
            fileId: proj.files[0]?.id || null,
          };
        }
      }
    }

    return {
      orgId: organizations[0]?.id || 'org_acme',
      projId: organizations[0]?.projects?.[0]?.id || 'proj_ecommerce',
      fileId: organizations[0]?.projects?.[0]?.files?.[0]?.id || null,
    };
  })();

  const [activeOrgId, setActiveOrgId] = useState<string>(initialLoc.orgId);
  const activeOrg = organizations?.find((o) => o.id === activeOrgId) || organizations?.[0];

  const [activeProjectId, setActiveProjectId] = useState<string>(initialLoc.projId);
  const activeProject = activeOrg?.projects?.find((p) => p.id === activeProjectId) || activeOrg?.projects?.[0];

  const [activeFileId, setActiveFileId] = useState<string | null>(initialLoc.fileId);
  const activeFile = activeProject?.files?.find((f) => f.id === activeFileId) || activeProject?.files?.[0];

  // Standalone Scratchpad / Drafts State (Zero Org / Zero Env required)
  const [scratchpadRequests, setScratchpadRequests] = useState<RestRequest[]>(() => {
    try {
      const saved = localStorage.getItem('reststudio_scratchpad_requests');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'req_scratch_default',
        name: 'Draft: Quick Test',
        method: 'GET',
        url: 'https://httpbin.org/get',
        headers: [
          { id: 'h_sc_1', key: 'Accept', value: 'application/json', enabled: true },
        ],
        queryParams: [],
        body: { mode: 'none', rawText: '' },
        auth: { type: 'none', bearerToken: '' },
      },
    ];
  });

  const [activeRequestId, setActiveRequestId] = useState<string | null>(
    activeFile?.requests?.[0]?.id || null
  );

  const activeScratchpadRequest = scratchpadRequests.find((r) => r.id === activeRequestId);
  const isCurrentRequestStandalone = Boolean(activeScratchpadRequest);
  const activeRequest =
    activeScratchpadRequest ||
    activeFile?.requests?.find((r) => r.id === activeRequestId) ||
    activeFile?.requests?.[0] ||
    scratchpadRequests[0];

  // LocalStorage Persistence
  useEffect(() => {
    try {
      localStorage.setItem('reststudio_global_vars', JSON.stringify(globalVariables));
      localStorage.setItem('restpulse_global_vars', JSON.stringify(globalVariables));
    } catch (e) {}
  }, [globalVariables]);

  useEffect(() => {
    try {
      localStorage.setItem('reststudio_organizations', JSON.stringify(organizations));
      localStorage.setItem('restpulse_organizations', JSON.stringify(organizations));
    } catch (e) {}
  }, [organizations]);

  useEffect(() => {
    try {
      if (activeOrgId) {
        localStorage.setItem('reststudio_active_org_id', activeOrgId);
        localStorage.setItem('restpulse_active_org_id', activeOrgId);
      }
      if (activeProjectId) {
        localStorage.setItem('reststudio_active_project_id', activeProjectId);
        localStorage.setItem('restpulse_active_project_id', activeProjectId);
      }
      if (activeFileId) {
        localStorage.setItem('reststudio_active_file_id', activeFileId);
        localStorage.setItem('restpulse_active_file_id', activeFileId);
      }
    } catch (e) {}
  }, [activeOrgId, activeProjectId, activeFileId]);

  useEffect(() => {
    try {
      localStorage.setItem('reststudio_scratchpad_requests', JSON.stringify(scratchpadRequests));
    } catch (e) {}
  }, [scratchpadRequests]);

  // CRUD helpers
  const updateProjectFiles = (updatedFiles: RestFile[]) => {
    if (!activeOrg || !activeProject) return;
    setOrganizations((prevOrgs) =>
      prevOrgs.map((org) =>
        org.id === activeOrg.id
          ? {
              ...org,
              projects: (org.projects || []).map((p) =>
                p.id === activeProject.id ? { ...p, files: updatedFiles, updatedAt: Date.now() } : p
              ),
            }
          : org
      )
    );
  };

  const handleUpdateActiveRequest = (updatedReq: RestRequest) => {
    const isScratchpad = scratchpadRequests.some((r) => r.id === updatedReq.id);
    if (isScratchpad) {
      setScratchpadRequests((prev) =>
        prev.map((r) => (r.id === updatedReq.id ? updatedReq : r))
      );
      return;
    }

    if (!activeFile || !activeProject) return;
    const updatedRequests = (activeFile.requests || []).map((r) => (r.id === updatedReq.id ? updatedReq : r));
    const updatedFiles = (activeProject.files || []).map((f) =>
      f.id === activeFile.id ? { ...f, requests: updatedRequests, updatedAt: Date.now() } : f
    );
    updateProjectFiles(updatedFiles);
  };

  const handleCreateNewScratchpad = (customName?: string): RestRequest => {
    const newReq: RestRequest = {
      id: 'req_sc_' + Math.random().toString(36).substring(2, 9),
      name: customName || `Draft ${scratchpadRequests.length + 1}`,
      method: 'GET',
      url: 'https://httpbin.org/get',
      headers: [
        { id: 'h_sc_' + Math.random().toString(36).substring(2, 7), key: 'Accept', value: 'application/json', enabled: true },
      ],
      queryParams: [],
      body: { mode: 'none', rawText: '' },
      auth: { type: 'none', bearerToken: '' },
    };
    setScratchpadRequests((prev) => [newReq, ...prev]);
    setActiveFileId(null);
    setActiveRequestId(newReq.id);
    return newReq;
  };

  const handleDeleteScratchpad = (id: string) => {
    setScratchpadRequests((prev) => prev.filter((r) => r.id !== id));
    if (activeRequestId === id) {
      const remaining = scratchpadRequests.filter((r) => r.id !== id);
      if (remaining.length > 0) {
        setActiveRequestId(remaining[0].id);
      } else if (activeFile?.requests?.[0]) {
        setActiveFileId(activeFile.id);
        setActiveRequestId(activeFile.requests[0].id);
      }
    }
  };

  const handleAddNewVariables = (newVars: EnvVariable[]) => {
    if (!newVars || newVars.length === 0) return;
    if (activeProject && activeProject.activeEnvId) {
      setOrganizations((prevOrgs) =>
        prevOrgs.map((org) => {
          if (org.id !== activeOrgId) return org;
          return {
            ...org,
            projects: (org.projects || []).map((p) => {
              if (p.id !== activeProject.id) return p;
              return {
                ...p,
                environments: (p.environments || []).map((env) => {
                  if (env.id !== activeProject.activeEnvId) return env;
                  const existingVars = env.variables || [];
                  const updatedVars = [...existingVars];
                  for (const nv of newVars) {
                    const idx = updatedVars.findIndex((v) => (v.key || '').trim().toLowerCase() === (nv.key || '').trim().toLowerCase());
                    if (idx >= 0) {
                      updatedVars[idx] = { ...updatedVars[idx], value: nv.value, enabled: nv.enabled ?? true };
                    } else {
                      updatedVars.push(nv);
                    }
                  }
                  return {
                    ...env,
                    variables: updatedVars,
                  };
                }),
              };
            }),
          };
        })
      );
      showToast('success', 'Variables Extracted', `Upserted ${newVars.length} variable(s) in active environment.`);
    } else {
      setGlobalVariables((prev) => {
        const updated = [...prev];
        for (const nv of newVars) {
          const idx = updated.findIndex((v) => (v.key || '').trim().toLowerCase() === (nv.key || '').trim().toLowerCase());
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], value: nv.value, enabled: nv.enabled ?? true };
          } else {
            updated.push(nv);
          }
        }
        return updated;
      });
      showToast('success', 'Global Variables Extracted', `Upserted ${newVars.length} variable(s) in Global Variables.`);
    }
  };

  const handleApplySyncedData = (
    payload: SyncPayload,
    setHistory?: (history: RequestHistoryItem[]) => void
  ) => {
    const incomingOrgs = payload.organizations;
    if (!incomingOrgs || !Array.isArray(incomingOrgs) || incomingOrgs.length === 0) {
      // Do not overwrite local organizations with empty data
      return;
    }

    const incomingStats = countWorkspaceEntities(incomingOrgs);
    const currentStats = countWorkspaceEntities(organizations);

    // CRITICAL GUARD: If remote cloud data has 0 requests and 0 files, but local workspace HAS collections,
    // NEVER overwrite local collections!
    if (
      incomingStats.requestCount === 0 &&
      incomingStats.fileCount === 0 &&
      (currentStats.requestCount > 0 || currentStats.fileCount > 0)
    ) {
      console.warn('[Sync Guard] Prevented overwriting local collections with empty cloud data.');
      showToast('warning', 'Sync Protected', 'Prevented replacing local collections with empty cloud data.');
      return;
    }

    setOrganizations(incomingOrgs);
    try {
      localStorage.setItem('reststudio_organizations', JSON.stringify(incomingOrgs));
      localStorage.setItem('restpulse_organizations', JSON.stringify(incomingOrgs));
    } catch (e) {}

    if (payload.globalVariables && Array.isArray(payload.globalVariables)) {
      setGlobalVariables(payload.globalVariables);
      try {
        localStorage.setItem('reststudio_global_vars', JSON.stringify(payload.globalVariables));
        localStorage.setItem('restpulse_global_vars', JSON.stringify(payload.globalVariables));
      } catch (e) {}
    }

    if (setHistory && payload.history && Array.isArray(payload.history)) {
      setHistory(payload.history);
      try {
        localStorage.setItem('reststudio_history', JSON.stringify(payload.history));
        localStorage.setItem('restpulse_history', JSON.stringify(payload.history));
      } catch (e) {}
    }

    // Determine target org and project: prefer one that has actual files/collections
    let targetOrg = incomingOrgs.find((o) => o.id === payload.activeOrgId) || incomingOrgs[0];
    let targetProject =
      (targetOrg.projects || []).find((p) => p.id === payload.activeProjectId) ||
      targetOrg.projects?.[0];

    // If candidate project is empty, look for any project that actually has collections
    if (!targetProject || (targetProject.files || []).length === 0) {
      for (const org of incomingOrgs) {
        for (const proj of org.projects || []) {
          if ((proj.files || []).length > 0) {
            targetOrg = org;
            targetProject = proj;
            break;
          }
        }
        if (targetProject && (targetProject.files || []).length > 0) break;
      }
    }

    const newOrgId = targetOrg.id;
    const newProjectId = targetProject?.id || '';
    const targetFile = targetProject?.files?.[0];
    const newFileId = targetFile?.id || null;
    const targetRequest = targetFile?.requests?.[0];
    const newRequestId = targetRequest?.id || null;

    setActiveOrgId(newOrgId);
    setActiveProjectId(newProjectId);
    setActiveFileId(newFileId);
    setActiveRequestId(newRequestId);

    try {
      localStorage.setItem('reststudio_active_org_id', newOrgId);
      localStorage.setItem('reststudio_active_project_id', newProjectId);
      if (newFileId) localStorage.setItem('reststudio_active_file_id', newFileId);
    } catch (e) {}
  };

  return {
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
  };
}
