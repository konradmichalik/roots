import { isTauri } from '../utils/storage';
import { logger } from '../utils/logger';
import { settingsState } from './settings.svelte';
import { connectionsState } from './connections.svelte';
import { monthCacheState } from './timeEntriesCache.svelte';
import { absencesState } from './absences.svelte';
import { presencesState } from './presences.svelte';
import { autoRefreshState } from './autoRefresh.svelte';
import { collectExportInput } from './export/collector';
import { buildExportPayload } from './export/serializer';

const DEBOUNCE_MS = 500;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let disposeExportWatcher: (() => void) | undefined;

async function writeExportFile(): Promise<void> {
  const payload = buildExportPayload(collectExportInput());
  if (!payload) {
    await deleteExportFile();
    return;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('write_export_file', { contents: JSON.stringify(payload) });
  } catch (error) {
    logger.error('Failed to write export file', error);
  }
}

async function deleteExportFile(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('delete_export_file');
  } catch (error) {
    logger.error('Failed to delete export file', error);
  }
}

function scheduleExportSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (settingsState.exportDataForExternalApps) {
      void writeExportFile();
    } else {
      void deleteExportFile();
    }
  }, DEBOUNCE_MS);
}

export function initializeExportWatcher(): void {
  if (!isTauri()) return;
  if (disposeExportWatcher) return;

  disposeExportWatcher = $effect.root(() => {
    $effect(() => {
      void settingsState.exportDataForExternalApps;
      void connectionsState.moco.isConnected;
      void connectionsState.personio.isConnected;
      void monthCacheState.cache;
      void settingsState.weekdayHours;
      void presencesState.cache;
      void absencesState.absences;
      void absencesState.personioAbsences;
      void absencesState.absenceBalances;
      void absencesState.yearVacationDaysTaken;
      void autoRefreshState.interval;
      scheduleExportSync();
    });
  });

  logger.store('export', 'Watcher initialized');
}

export function cleanupExportWatcher(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = undefined;
  }
  if (disposeExportWatcher) {
    disposeExportWatcher();
    disposeExportWatcher = undefined;
  }
}
