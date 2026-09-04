import { useState, useEffect } from 'react';
import { WorkspaceTab, RestRequest, RestFile, Organization, Project } from '../types';

interface UseTabManagerProps {
  organizations: Organization[];
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  activeOrg: Organization | undefined;
  activeOrgId: string;
  setActiveOrgId: (id: string) => void;
  activeProject: Project | undefined;
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  activeFile: RestFile | undefined;
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;
  scratchpadRequests: RestRequest[];
  setActiveRequestId: (id: string | null) => void;
  updateProjectFiles: (files: RestFile[]) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export function useTabManager({
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
}: UseTabManagerProps) {
  const [tabs, setTabs] = useState<WorkspaceTab[]>(() => {
    try {
      const saved = localStorage.getItem('reststudio_tabs') || localStorage.getItem('restpulse_tabs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'tab_onboarding',
        type: 'onboarding',
        title: 'Welcome Workspace',
      },
      {
        id: 'tab_req_1',
        type: 'request',
        title: 'GET Products',
        fileId: activeFile?.id,
        requestId: activeFile?.requests?.[0]?.id,
        method: 'GET',
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || 'tab_onboarding');
  const [activeTabMode, setActiveTabMode] = useState<'editor' | 'code' | 'runner' | 'history'>('editor');

  const activeTab = tabs?.find((t) => t.id === activeTabId) || tabs?.[0];

  useEffect(() => {
    try {
      localStorage.setItem('reststudio_tabs', JSON.stringify(tabs));
      localStorage.setItem('restpulse_tabs', JSON.stringify(tabs));
    } catch (e) {}
  }, [tabs]);

  const handleSelectTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    setActiveTabId(tabId);

    if (tab.type === 'onboarding') {
      // Stay on onboarding
    } else if (tab.type === 'code') {
      if (tab.fileId) setActiveFileId(tab.fileId);
      setActiveTabMode('code');
    } else if (tab.type === 'runner') {
      setActiveTabMode('runner');
    } else if (tab.type === 'history') {
      setActiveTabMode('history');
    } else if (tab.type === 'request') {
      if (tab.fileId && tab.requestId) {
        setActiveFileId(tab.fileId);
        setActiveRequestId(tab.requestId);
      } else if (tab.requestId) {
        setActiveFileId(null);
        setActiveRequestId(tab.requestId);
      }
      setActiveTabMode('editor');
    }
  };

  const handleOpenRequestInTab = (fileId: string, requestId: string) => {
    setActiveFileId(fileId);
    setActiveRequestId(requestId);

    const file = activeProject?.files?.find((f) => f.id === fileId);
    const req = file?.requests?.find((r) => r.id === requestId);
    const reqName = req?.name || 'REST Request';
    const reqMethod = req?.method || 'GET';

    const existingTab = tabs?.find((t) => t.requestId === requestId);
    if (existingTab) {
      setTabs((prevTabs) =>
        prevTabs.map((t) =>
          t.requestId === requestId ? { ...t, title: reqName, method: reqMethod } : t
        )
      );
      setActiveTabId(existingTab.id);
    } else {
      const newTab: WorkspaceTab = {
        id: 'tab_' + Math.random().toString(36).substring(2, 9),
        type: 'request',
        title: reqName,
        fileId,
        requestId,
        method: reqMethod,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
    setActiveTabMode('editor');
  };

  const handleOpenScratchpadRequestInTab = (requestId: string) => {
    setActiveFileId(null);
    setActiveRequestId(requestId);

    const req = scratchpadRequests.find((r) => r.id === requestId);
    const reqName = req?.name || 'Draft Request';
    const reqMethod = req?.method || 'GET';

    const existingTab = tabs?.find((t) => t.requestId === requestId);
    if (existingTab) {
      setTabs((prevTabs) =>
        prevTabs.map((t) =>
          t.requestId === requestId ? { ...t, title: reqName, method: reqMethod } : t
        )
      );
      setActiveTabId(existingTab.id);
    } else {
      const newTab: WorkspaceTab = {
        id: 'tab_' + Math.random().toString(36).substring(2, 9),
        type: 'request',
        title: reqName,
        requestId,
        method: reqMethod,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
    setActiveTabMode('editor');
  };

  const handleCreateNewTabWithDummy = () => {
    let org = activeOrg;
    if (!org) {
      org = organizations[0];
      if (org) setActiveOrgId(org.id);
    }

    let project = activeProject;
    if (!project && org) {
      project = org.projects?.[0];
      if (project) setActiveProjectId(project.id);
    }

    if (!project) return;

    let targetFile = activeFile || project.files?.[0];
    const dummyReq: RestRequest = {
      id: 'req_' + Math.random().toString(36).substring(2, 9),
      name: 'New Request',
      method: 'GET',
      url: '{{baseUrl}}/users',
      headers: [
        { id: 'h1', key: 'Accept', value: 'application/json', enabled: true },
      ],
      queryParams: [],
      body: { mode: 'none', rawText: '' },
      auth: { type: 'inherit', bearerToken: '' },
    };

    if (!targetFile) {
      const newFile: RestFile = {
        id: 'file_' + Math.random().toString(36).substring(2, 9),
        name: 'requests.http',
        rawContent: '',
        requests: [dummyReq],
        updatedAt: Date.now(),
      };
      const updatedFiles = [...(project.files || []), newFile];
      updateProjectFiles(updatedFiles);
      handleOpenRequestInTab(newFile.id, dummyReq.id);
    } else {
      const updatedFiles = (project.files || []).map((f) =>
        f.id === targetFile!.id ? { ...f, requests: [...(f.requests || []), dummyReq] } : f
      );
      updateProjectFiles(updatedFiles);
      handleOpenRequestInTab(targetFile.id, dummyReq.id);
    }
  };

  const handleTogglePinTab = (tabId: string) => {
    setTabs((prevTabs) => {
      const target = prevTabs.find((t) => t.id === tabId);
      const isCurrentlyPinned = Boolean(target?.isPinned);
      const updated = prevTabs.map((t) =>
        t.id === tabId ? { ...t, isPinned: !isCurrentlyPinned } : t
      );
      const pinned = updated.filter((t) => t.isPinned);
      const unpinned = updated.filter((t) => !t.isPinned);
      showToast(
        'info',
        isCurrentlyPinned ? 'Tab Unpinned' : 'Tab Pinned',
        isCurrentlyPinned ? 'Tab can now be closed normally.' : 'Pinned to start of tab bar.'
      );
      return [...pinned, ...unpinned];
    });
  };

  const handleCloseTab = (tabId: string) => {
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (tabToClose?.isPinned) {
      showToast('info', 'Pinned Tab Unpinned', 'Unpinned and closed tab.');
    }
    if (tabs.length <= 1) {
      setTabs([
        {
          id: 'tab_onboarding',
          type: 'onboarding',
          title: 'Welcome Workspace',
        },
      ]);
      setActiveTabId('tab_onboarding');
      return;
    }

    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleCloseOtherTabs = (targetTabId: string) => {
    const targetTab = tabs.find((t) => t.id === targetTabId);
    if (targetTab) {
      const newTabs = tabs.filter((t) => t.id === targetTabId || t.isPinned);
      setTabs(newTabs);
      setActiveTabId(targetTab.id);
      showToast('info', 'Tabs Closed', 'Closed unpinned tabs.');
    }
  };

  const handleCloseTabsToRight = (targetTabId: string) => {
    const index = tabs.findIndex((t) => t.id === targetTabId);
    if (index !== -1) {
      const newTabs = tabs.filter((t, i) => i <= index || t.isPinned);
      setTabs(newTabs);
      if (!newTabs.some((t) => t.id === activeTabId)) {
        setActiveTabId(targetTabId);
      }
      showToast('info', 'Tabs Closed', 'Closed unpinned tabs to the right.');
    }
  };

  const handleCloseTabsToLeft = (targetTabId: string) => {
    const index = tabs.findIndex((t) => t.id === targetTabId);
    if (index !== -1) {
      const newTabs = tabs.filter((t, i) => i >= index || t.isPinned);
      setTabs(newTabs);
      if (!newTabs.some((t) => t.id === activeTabId)) {
        setActiveTabId(targetTabId);
      }
      showToast('info', 'Tabs Closed', 'Closed unpinned tabs to the left.');
    }
  };

  const handleCloseAllTabs = () => {
    const pinnedTabs = tabs.filter((t) => t.isPinned);
    if (pinnedTabs.length > 0) {
      setTabs(pinnedTabs);
      if (!pinnedTabs.some((t) => t.id === activeTabId)) {
        setActiveTabId(pinnedTabs[0].id);
      }
      showToast('info', 'Unpinned Tabs Closed', 'Closed all unpinned workspace tabs.');
    } else {
      const onboardingTab: WorkspaceTab = {
        id: 'tab_onboarding',
        type: 'onboarding',
        title: 'Welcome Workspace',
      };
      setTabs([onboardingTab]);
      setActiveTabId(onboardingTab.id);
      showToast('info', 'All Tabs Closed', 'Closed all open workspace tabs.');
    }
  };

  return {
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
  };
}
