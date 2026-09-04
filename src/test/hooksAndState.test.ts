import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabManager } from '../hooks/useTabManager';
import { INITIAL_ORGANIZATIONS } from '../data/initialOrganizations';
import { Organization, RestFile } from '../types';

describe('Workspace Hooks & Tab Manager Suite', () => {
  let mockOrgs: Organization[];
  let mockSetOrgs: any;
  let mockShowToast: any;
  let mockUpdateProjectFiles: any;

  beforeEach(() => {
    localStorage.clear();
    mockOrgs = JSON.parse(JSON.stringify(INITIAL_ORGANIZATIONS));
    mockSetOrgs = () => {};
    mockShowToast = () => {};
    mockUpdateProjectFiles = () => {};
  });

  it('should initialize default tabs', () => {
    const activeOrg = mockOrgs[0];
    const activeProject = activeOrg.projects[0];
    const activeFile = activeProject.files[0];

    const { result } = renderHook(() =>
      useTabManager({
        organizations: mockOrgs,
        setOrganizations: mockSetOrgs,
        activeOrg,
        activeOrgId: activeOrg.id,
        setActiveOrgId: () => {},
        activeProject,
        activeProjectId: activeProject.id,
        setActiveProjectId: () => {},
        activeFile,
        activeFileId: activeFile.id,
        setActiveFileId: () => {},
        scratchpadRequests: [],
        setActiveRequestId: () => {},
        updateProjectFiles: mockUpdateProjectFiles,
        showToast: mockShowToast,
      })
    );

    expect(result.current.tabs.length).toBeGreaterThan(0);
    expect(result.current.tabs[0].type).toBe('onboarding');
  });

  it('should switch tabs and update mode', () => {
    const activeOrg = mockOrgs[0];
    const activeProject = activeOrg.projects[0];
    const activeFile = activeProject.files[0];

    const { result } = renderHook(() =>
      useTabManager({
        organizations: mockOrgs,
        setOrganizations: mockSetOrgs,
        activeOrg,
        activeOrgId: activeOrg.id,
        setActiveOrgId: () => {},
        activeProject,
        activeProjectId: activeProject.id,
        setActiveProjectId: () => {},
        activeFile,
        activeFileId: activeFile.id,
        setActiveFileId: () => {},
        scratchpadRequests: [],
        setActiveRequestId: () => {},
        updateProjectFiles: mockUpdateProjectFiles,
        showToast: mockShowToast,
      })
    );

    const secondTabId = result.current.tabs[1]?.id;
    if (secondTabId) {
      act(() => {
        result.current.handleSelectTab(secondTabId);
      });
      expect(result.current.activeTabId).toBe(secondTabId);
      expect(result.current.activeTabMode).toBe('editor');
    }
  });

  it('should open new request in tab or focus existing tab', () => {
    const activeOrg = mockOrgs[0];
    const activeProject = activeOrg.projects[0];
    const activeFile = activeProject.files[0];
    const targetReq = activeFile.requests[0];

    const { result } = renderHook(() =>
      useTabManager({
        organizations: mockOrgs,
        setOrganizations: mockSetOrgs,
        activeOrg,
        activeOrgId: activeOrg.id,
        setActiveOrgId: () => {},
        activeProject,
        activeProjectId: activeProject.id,
        setActiveProjectId: () => {},
        activeFile,
        activeFileId: activeFile.id,
        setActiveFileId: () => {},
        scratchpadRequests: [],
        setActiveRequestId: () => {},
        updateProjectFiles: mockUpdateProjectFiles,
        showToast: mockShowToast,
      })
    );

    act(() => {
      result.current.handleOpenRequestInTab(activeFile.id, targetReq.id);
    });

    const openedTab = result.current.tabs.find((t) => t.requestId === targetReq.id);
    expect(openedTab).toBeDefined();
    expect(result.current.activeTabId).toBe(openedTab?.id);
  });

  it('should support tab pinning and closing unpinned tabs', () => {
    const activeOrg = mockOrgs[0];
    const activeProject = activeOrg.projects[0];
    const activeFile = activeProject.files[0];

    const { result } = renderHook(() =>
      useTabManager({
        organizations: mockOrgs,
        setOrganizations: mockSetOrgs,
        activeOrg,
        activeOrgId: activeOrg.id,
        setActiveOrgId: () => {},
        activeProject,
        activeProjectId: activeProject.id,
        setActiveProjectId: () => {},
        activeFile,
        activeFileId: activeFile.id,
        setActiveFileId: () => {},
        scratchpadRequests: [],
        setActiveRequestId: () => {},
        updateProjectFiles: mockUpdateProjectFiles,
        showToast: mockShowToast,
      })
    );

    const tabId = result.current.tabs[0].id;
    act(() => {
      result.current.handleTogglePinTab(tabId);
    });

    expect(result.current.tabs.find((t) => t.id === tabId)?.isPinned).toBe(true);

    act(() => {
      result.current.handleCloseAllTabs();
    });

    // Pinned tab should remain
    expect(result.current.tabs.some((t) => t.id === tabId)).toBe(true);
  });
});
