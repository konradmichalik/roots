import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import type { WeekdayHours } from '../types';

export interface AppSettings {
  sourceColors: {
    moco: string;
    jira: string;
    outlook: string;
  };
  showWeekends: boolean;
  weekStartsOn: number;
  sidebarLeft: boolean;
  sidebarRight: boolean;
  outlookFilter: {
    showDeclined: boolean;
    showFree: false;
    showCancelled: false;
  };
  weekdayHours: WeekdayHours;
}

const DEFAULT_SETTINGS: AppSettings = {
  sourceColors: {
    moco: '#8fbf9f',
    jira: '#7ba3c9',
    outlook: '#c9a3c4'
  },
  showWeekends: false,
  weekStartsOn: 1,
  sidebarLeft: true,
  sidebarRight: false,
  outlookFilter: {
    showDeclined: false,
    showFree: false,
    showCancelled: false
  },
  weekdayHours: [8, 8, 8, 8, 8, 0, 0]
};

export const settingsState = $state<AppSettings>({ ...DEFAULT_SETTINGS });

export async function initializeSettings(): Promise<void> {
  const stored = await getStorageItemAsync<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS);
  if (stored) {
    Object.assign(settingsState, { ...DEFAULT_SETTINGS, ...stored });
  }
  logger.store('settings', 'Initialized');
}

export function updateSettings(partial: Partial<AppSettings>): void {
  Object.assign(settingsState, partial);
  saveStorage(STORAGE_KEYS.SETTINGS, settingsState);
  logger.store('settings', 'Updated', partial);
}

export function getSourceColor(source: 'moco' | 'jira' | 'outlook'): string {
  return settingsState.sourceColors[source];
}
