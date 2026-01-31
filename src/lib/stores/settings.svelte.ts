import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import type { WeekdayHours } from '../types';

export interface AppSettings {
  sourceColors: {
    moco: string;
    jira: string;
    outlook: string;
    personio: string;
  };
  showWeekends: boolean;
  weekStartsOn: number;
  hoursFormat: 'decimal' | 'hhmm';
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
    moco: '#a3be8c',
    jira: '#5e81ac',
    outlook: '#b48ead',
    personio: '#d08770'
  },
  showWeekends: false,
  weekStartsOn: 1,
  hoursFormat: 'decimal',
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

export function getSourceColor(source: 'moco' | 'jira' | 'outlook' | 'personio'): string {
  return settingsState.sourceColors[source];
}
