import type { OutlookMetadata, SyncPreview, UnifiedTimeEntry } from '../types';
import { timeEntriesState } from './timeEntries.svelte';
import { findMatchingRules } from './rules.svelte';
import { isSynced } from './syncRecords.svelte';
import { isDismissed } from './dismissedEvents.svelte';
import { getSourceId, syncDay, executeSyncCandidates } from './ruleSync.svelte';
import { showToast, updateToast, dismissToast, toast } from './toast.svelte';
import { isOutlookEventEnded, today } from '../utils/date-helpers';
import { logger } from '../utils/logger';

const POLL_INTERVAL = 60_000;

interface WatcherState {
  notifiedEventIds: Set<string>;
  toastId: string | null;
  intervalId: ReturnType<typeof setInterval> | null;
  lastDate: string;
  syncPreview: SyncPreview | null;
  showSyncPreview: boolean;
}

export const watcherState = $state<WatcherState>({
  notifiedEventIds: new Set(),
  toastId: null,
  intervalId: null,
  lastDate: '',
  syncPreview: null,
  showSyncPreview: false
});

function clearToast(): void {
  if (watcherState.toastId) {
    dismissToast(watcherState.toastId);
    watcherState.toastId = null;
  }
}

function syncMessage(count: number): string {
  return count === 1
    ? '1 Outlook-Termin bereit zum Syncen'
    : `${count} Outlook-Termine bereit zum Syncen`;
}

function getEndedUnsyncedOutlookEntries(): UnifiedTimeEntry[] {
  const todayStr = today();
  const outlookEntries = timeEntriesState.outlookEvents.filter((e) => e.date === todayStr);

  return outlookEntries.filter((entry) => {
    const meta = entry.metadata as OutlookMetadata;

    if (isDismissed(meta.eventId, entry.date)) return false;
    if (!isOutlookEventEnded(entry.date, entry.endTime, meta.isAllDay)) return false;
    if (findMatchingRules(entry).length === 0) return false;

    const sourceId = getSourceId(entry);
    if (isSynced('outlook', sourceId)) return false;

    return true;
  });
}

async function tick(): Promise<void> {
  const todayStr = today();

  // Reset on date change
  if (watcherState.lastDate !== todayStr) {
    watcherState.notifiedEventIds = new Set();
    clearToast();
    watcherState.lastDate = todayStr;
  }

  const endedEntries = getEndedUnsyncedOutlookEntries();
  if (endedEntries.length === 0) {
    clearToast();
    return;
  }

  const autoSyncEntries: UnifiedTimeEntry[] = [];
  const manualEntries: UnifiedTimeEntry[] = [];

  for (const entry of endedEntries) {
    const rules = findMatchingRules(entry);
    const rule = rules[0];
    if (rule.autoSync) {
      autoSyncEntries.push(entry);
    } else {
      manualEntries.push(entry);
    }
  }

  // Execute auto-sync for new entries
  const newAutoEntries = autoSyncEntries.filter(
    (e) => !watcherState.notifiedEventIds.has((e.metadata as OutlookMetadata).eventId)
  );
  if (newAutoEntries.length > 0) {
    try {
      const preview = await syncDay(todayStr, { autoOnly: true });
      if (preview.pending.length > 0) {
        const result = await executeSyncCandidates(preview.pending, true);
        if (result.created.length > 0) {
          toast.success(
            `${result.created.length} Outlook-${result.created.length === 1 ? 'Termin' : 'Termine'} automatisch gesynced`
          );
        }
        if (result.failed.length > 0) {
          toast.error(`${result.failed.length} Auto-Sync fehlgeschlagen`);
        }
      }
    } catch (error) {
      logger.error('eventSyncWatcher: Auto-sync failed', error);
    }
    for (const entry of newAutoEntries) {
      watcherState.notifiedEventIds.add((entry.metadata as OutlookMetadata).eventId);
    }
  }

  // Handle manual entries
  const newManualEntries = manualEntries.filter(
    (e) => !watcherState.notifiedEventIds.has((e.metadata as OutlookMetadata).eventId)
  );

  for (const entry of newManualEntries) {
    watcherState.notifiedEventIds.add((entry.metadata as OutlookMetadata).eventId);
  }

  const totalManualPending = manualEntries.length;

  if (totalManualPending === 0) {
    clearToast();
    return;
  }

  const message = syncMessage(totalManualPending);

  if (watcherState.toastId) {
    updateToast(watcherState.toastId, message);
  } else {
    watcherState.toastId = showToast('action', message, {
      persistent: true,
      actionLabel: 'Syncen',
      onAction: () => openPendingSyncPreview()
    });
  }
}

async function openPendingSyncPreview(): Promise<void> {
  try {
    const preview = await syncDay(today());
    const outlookPreview: SyncPreview = {
      ...preview,
      pending: preview.pending.filter((c) => c.sourceEntry.metadata.source === 'outlook')
    };
    watcherState.syncPreview = outlookPreview;
    watcherState.showSyncPreview = true;
  } catch (error) {
    logger.error('eventSyncWatcher: Failed to build preview', error);
    toast.error('Sync-Vorschau konnte nicht erstellt werden');
  }
}

export function handleWatcherSyncClose(): void {
  watcherState.showSyncPreview = false;
  watcherState.syncPreview = null;

  const remaining = getEndedUnsyncedOutlookEntries().filter((entry) => {
    const rules = findMatchingRules(entry);
    return rules.length > 0 && !rules[0].autoSync;
  });

  if (remaining.length === 0) {
    clearToast();
  } else if (watcherState.toastId) {
    updateToast(watcherState.toastId, syncMessage(remaining.length));
  }
}

export function startWatcher(): void {
  if (watcherState.intervalId) return;
  watcherState.lastDate = today();

  // Initial tick after short delay (let stores initialize)
  setTimeout(() => tick(), 3000);

  watcherState.intervalId = setInterval(() => tick(), POLL_INTERVAL);
  logger.store('eventSyncWatcher', 'Watcher started (60s interval)');
}

export function stopWatcher(): void {
  if (watcherState.intervalId) {
    clearInterval(watcherState.intervalId);
    watcherState.intervalId = null;
  }
  clearToast();
  logger.store('eventSyncWatcher', 'Watcher stopped');
}
