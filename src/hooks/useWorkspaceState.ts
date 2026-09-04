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
import { SyncPayload } from '../services/githubSyncService';

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
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved organizations:', e);
    }
    return INITIAL_ORGANIZATIONS;
  });

  const [activeOrgId, setActiveOrgId] = useState<string>(
    organizations[0]?.id || 'org_acme'
  );
  const activeOrg = organizations?.find((o) => o.id === activeOrgId) || organizations?.[0];

  const [activeProjectId, setActiveProjectId] = useState<string>(
    activeOrg?.projects?.[0]?.id || 'proj_ecommerce'
  );
  const activeProject = activeOrg?.projects?.find((p) => p.id === activeProjectId) || activeOrg?.projects?.[0];

  const [activeFileId, setActiveFileId] = useState<string | null>(
    activeProject?.files?.[0]?.id || null
  );
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
                    const idx = updatedVars.findIndex((v) => v.key.trim().toLowerCase() === nv.key.trim().toLowerCase());
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
          const idx = updated.findIndex((v) => v.key.trim().toLowerCase() === nv.key.trim().toLowerCase());
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
    let incomingOrgs = payload.organizations;
    if (!incomingOrgs || !Array.isArray(incomingOrgs) || incomingOrgs.length === 0) {
      incomingOrgs = INITIAL_ORGANIZATIONS;
    }
    setOrganizations(incomingOrgs);

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

    const targetOrg =
      incomingOrgs.find((o) => o.id === payload.activeOrgId) || incomingOrgs[0];
    setActiveOrgId(targetOrg.id);

    const targetProject =
      (targetOrg.projects || []).find((p) => p.id === payload.activeProjectId) ||
      targetOrg.projects?.[0];
    const newProjectId = targetProject?.id || '';
    setActiveProjectId(newProjectId);

    const targetFile = targetProject?.files?.[0];
    const newFileId = targetFile?.id || null;
    setActiveFileId(newFileId);

    const targetRequest = targetFile?.requests?.[0];
    const newRequestId = targetRequest?.id || null;
    setActiveRequestId(newRequestId);
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
