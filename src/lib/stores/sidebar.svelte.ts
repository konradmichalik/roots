import { settingsState, updateSettings } from './settings.svelte';

export const sidebarState = $state({
  leftOpen: true,
  rightOpen: false
});

export function initializeSidebar(): void {
  sidebarState.leftOpen = settingsState.sidebarLeft;
  sidebarState.rightOpen = settingsState.sidebarRight;
}

export function toggleLeftSidebar(): void {
  sidebarState.leftOpen = !sidebarState.leftOpen;
  updateSettings({ sidebarLeft: sidebarState.leftOpen });
}

export function toggleRightSidebar(): void {
  sidebarState.rightOpen = !sidebarState.rightOpen;
  updateSettings({ sidebarRight: sidebarState.rightOpen });
}
