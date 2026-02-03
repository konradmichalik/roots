import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { refreshDayEntries, refreshMonthCacheIfStale, isAnyLoading } from './timeEntries.svelte';
import { dateNavState, getDateRange } from './dateNavigation.svelte';
import { logger } from '../utils/logger';

export type AutoRefreshInterval = 'off' | '5min' | '30min' | '1hour';

export const AUTO_REFRESH_OPTIONS: { value: AutoRefreshInterval; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: '5min', label: '5 min' },
  { value: '30min', label: '30 min' },
  { value: '1hour', label: '1 hour' }
];

const INTERVAL_MS: Record<AutoRefreshInterval, number> = {
  off: 0,
  '5min': 5 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000
};

export const autoRefreshState = $state<{
  interval: AutoRefreshInterval;
}>({
  interval: 'off'
});

let refreshTimerId: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize auto-refresh from storage.
 */
export async function initializeAutoRefresh(): Promise<void> {
  try {
    const stored = await getStorageItemAsync<AutoRefreshInterval>(STORAGE_KEYS.AUTO_REFRESH);
    if (stored && INTERVAL_MS[stored] !== undefined) {
      autoRefreshState.interval = stored;
      startTimer();
      logger.store('autoRefresh', `Initialized with interval: ${stored}`);
    }
  } catch (error) {
    logger.error('Failed to initialize auto-refresh', error);
  }
}

/**
 * Set auto-refresh interval.
 */
export function setAutoRefreshInterval(interval: AutoRefreshInterval): void {
  autoRefreshState.interval = interval;
  saveStorage(STORAGE_KEYS.AUTO_REFRESH, interval);

  stopTimer();
  if (interval !== 'off') {
    startTimer();
  }

  logger.store('autoRefresh', `Interval changed to: ${interval}`);
}

/**
 * Start the auto-refresh timer.
 */
function startTimer(): void {
  const ms = INTERVAL_MS[autoRefreshState.interval];
  if (ms === 0) return;

  refreshTimerId = setInterval(async () => {
    await performRefresh();
  }, ms);

  logger.store('autoRefresh', `Timer started: ${autoRefreshState.interval}`);
}

/**
 * Stop the auto-refresh timer.
 */
function stopTimer(): void {
  if (refreshTimerId) {
    clearInterval(refreshTimerId);
    refreshTimerId = null;
    logger.store('autoRefresh', 'Timer stopped');
  }
}

/**
 * Perform a refresh cycle.
 */
async function performRefresh(): Promise<void> {
  // Skip if already loading
  if (isAnyLoading()) {
    logger.store('autoRefresh', 'Skipping refresh - already loading');
    return;
  }

  logger.store('autoRefresh', 'Performing auto-refresh');

  try {
    // Refresh current day and month cache
    const range = getDateRange();
    await Promise.allSettled([
      refreshDayEntries(dateNavState.selectedDate),
      refreshMonthCacheIfStale(range.from, range.to)
    ]);
  } catch (error) {
    logger.error('Auto-refresh failed', error);
  }
}

/**
 * Cleanup auto-refresh (call on unmount).
 */
export function cleanupAutoRefresh(): void {
  stopTimer();
}
