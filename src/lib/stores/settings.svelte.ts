import type { ViewMode } from '../types';
import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';

export interface AppSettings {
  sourceColors: {
    moco: string;
    jira: string;
    outlook: string;
    personio: string;
  };
  showWeekends: boolean;
  weekStartsOn: number;
  defaultView: ViewMode;
  hoursFormat: 'decimal' | 'hhmm';
  outlookFilter: {
    showDeclined: boolean;
    showFree: false;
    showCancelled: false;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  sourceColors: {
    moco: '#10B981',
    jira: '#3B82F6',
    outlook: '#8B5CF6',
    personio: '#F59E0B'
  },
  showWeekends: false,
  weekStartsOn: 1,
  defaultView: 'week',
  hoursFormat: 'decimal',
  outlookFilter: {
    showDeclined: false,
    showFree: false,
    showCancelled: false
  }
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
