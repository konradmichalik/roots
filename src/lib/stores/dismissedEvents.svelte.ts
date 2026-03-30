import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import { isDemoMode } from '../utils/demo-data';

// Persisted as array, runtime lookup via derived Set
export const dismissedEventsState = $state<{ keys: string[] }>({
  keys: []
});

// O(1) lookup set derived from the keys array
const dismissedSet = $derived(new Set(dismissedEventsState.keys));

function makeKey(eventId: string, date: string): string {
  return `${eventId}::${date}`;
}

export async function initializeDismissedEvents(): Promise<void> {
  const stored = await getStorageItemAsync<string[]>(STORAGE_KEYS.DISMISSED_EVENTS);
  if (stored) {
    dismissedEventsState.keys = stored;
  }

  // Prune entries older than 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  pruneOldEntries(threeMonthsAgo);

  logger.store('dismissedEvents', 'Initialized', { count: dismissedEventsState.keys.length });
}

function persist(): void {
  if (isDemoMode()) return;
  saveStorage(STORAGE_KEYS.DISMISSED_EVENTS, dismissedEventsState.keys);
}

export function dismissEvent(eventId: string, date: string): void {
  const key = makeKey(eventId, date);
  if (dismissedSet.has(key)) return;
  dismissedEventsState.keys = [...dismissedEventsState.keys, key];
  persist();
  logger.store('dismissedEvents', 'Dismissed', { eventId: eventId.slice(0, 20), date });
}

export function restoreEvent(eventId: string, date: string): void {
  const key = makeKey(eventId, date);
  if (!dismissedSet.has(key)) return;
  dismissedEventsState.keys = dismissedEventsState.keys.filter((k) => k !== key);
  persist();
  logger.store('dismissedEvents', 'Restored', { eventId: eventId.slice(0, 20), date });
}

export function isDismissed(eventId: string, date: string): boolean {
  return dismissedSet.has(makeKey(eventId, date));
}

function pruneOldEntries(olderThan: Date): void {
  const before = dismissedEventsState.keys.length;
  const cutoff = olderThan.toISOString().slice(0, 10); // YYYY-MM-DD
  dismissedEventsState.keys = dismissedEventsState.keys.filter((key) => {
    const date = key.split('::')[1];
    return date >= cutoff;
  });
  const pruned = before - dismissedEventsState.keys.length;
  if (pruned > 0) {
    persist();
    logger.store('dismissedEvents', 'Pruned old entries', { pruned });
  }
}
