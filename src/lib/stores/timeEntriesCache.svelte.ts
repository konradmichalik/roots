import type { UnifiedTimeEntry, DayOverview, MocoMetadata } from '../types';
import { getMocoClient } from './connections.svelte';
import { connectionsState } from './connections.svelte';
import { settingsState } from './settings.svelte';
import { getAbsenceForDate, fetchPersonioAbsences } from './absences.svelte';
import { fetchPresences, getPresenceForDate } from './presences.svelte';
import {
  isWeekend,
  isToday as checkIsToday,
  getDayOfWeekIndex,
  getMonthStart,
  getMonthEnd
} from '../utils/date-helpers';
import { getStorageItemAsync, setStorageItemAsync, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import { isDemoMode, anonymizeEntriesIfDemoMode } from '../utils/demo-data';
import { mapMocoActivity } from './timeEntriesMappers';

// ---------------------------------------------------------------------------
// Month cache state (Moco activities only — for calendar + stats)
// ---------------------------------------------------------------------------
interface MonthCacheEntry {
  mocoEntries: UnifiedTimeEntry[];
  lastFetched: number;
}

export const monthCacheState = $state({
  cache: {} as Record<string, MonthCacheEntry>,
  loading: false,
  loadedMonth: null as string | null
});

// ---------------------------------------------------------------------------
// Initialization (loads persisted cache from storage)
// ---------------------------------------------------------------------------
export async function initializeTimeEntries(): Promise<void> {
  const persistedCache = await getStorageItemAsync<Record<string, MonthCacheEntry>>(
    STORAGE_KEYS.MONTH_CACHE
  );
  if (persistedCache) {
    monthCacheState.cache = persistedCache;
    logger.store('timeEntries', `Loaded ${Object.keys(persistedCache).length} months from cache`);
  }
  logger.store('timeEntries', 'Initialized');
}

// ---------------------------------------------------------------------------
// Cache persistence
// ---------------------------------------------------------------------------
function persistMonthCache(): void {
  if (isDemoMode()) return;
  void setStorageItemAsync(STORAGE_KEYS.MONTH_CACHE, monthCacheState.cache);
}

// ---------------------------------------------------------------------------
// Month cache fetch (Moco + Presences only)
// ---------------------------------------------------------------------------
export async function fetchMonthCache(from: string, to: string): Promise<void> {
  // Always fetch presences (has its own TTL cache - important for today's data)
  if (connectionsState.moco.isConnected) {
    fetchPresences(from, to).catch((error) => {
      logger.error('Failed to fetch presences', error);
    });
  }

  // Fetch Personio absences for this month (fire-and-forget)
  fetchPersonioAbsences(from, to).catch((error) => {
    logger.error('Failed to fetch Personio absences', error);
  });

  const monthKey = from;
  const cached = monthCacheState.cache[monthKey];

  // Skip Moco entries fetch if cache already exists - it persists indefinitely
  // Updates happen via day-level fetches (updateMonthCacheForDay)
  if (cached) return;

  monthCacheState.loading = true;

  try {
    const entry: MonthCacheEntry = {
      mocoEntries: [],
      lastFetched: Date.now()
    };

    if (connectionsState.moco.isConnected) {
      const client = getMocoClient();
      if (client) {
        try {
          const activities = await client.getActivities(from, to);
          entry.mocoEntries = anonymizeEntriesIfDemoMode(activities.map(mapMocoActivity));
        } catch (error) {
          logger.error('Month cache: Failed to fetch Moco entries', error);
        }
      }
    }

    monthCacheState.cache = {
      ...monthCacheState.cache,
      [monthKey]: entry
    };
    monthCacheState.loadedMonth = monthKey;
    persistMonthCache();
    logger.store('timeEntries', `Month cache loaded for ${from} to ${to}`);
  } finally {
    monthCacheState.loading = false;
  }
}

// ---------------------------------------------------------------------------
// Moco-only month fetch (no presences/absences side effects)
// Used by yearStats to backfill past months without triggering unrelated fetches.
// ---------------------------------------------------------------------------
export async function fetchMonthMocoOnly(monthStart: string): Promise<void> {
  if (monthCacheState.cache[monthStart]) return;
  if (!connectionsState.moco.isConnected) return;

  const client = getMocoClient();
  if (!client) return;

  const monthEnd = getMonthEnd(monthStart);
  try {
    const activities = await client.getActivities(monthStart, monthEnd);
    monthCacheState.cache = {
      ...monthCacheState.cache,
      [monthStart]: {
        mocoEntries: anonymizeEntriesIfDemoMode(activities.map(mapMocoActivity)),
        lastFetched: Date.now()
      }
    };
    persistMonthCache();
  } catch (error) {
    logger.error(`Month cache (moco-only): Failed to fetch ${monthStart}`, error);
  }
}

// ---------------------------------------------------------------------------
// Cache invalidation
// ---------------------------------------------------------------------------
export function invalidateMonthCache(monthStart: string): void {
  const { [monthStart]: _, ...rest } = monthCacheState.cache;
  monthCacheState.cache = rest;
  persistMonthCache();
}

export function clearAllMonthCache(): void {
  monthCacheState.cache = {};
  monthCacheState.loadedMonth = null;
  persistMonthCache();
  logger.store('timeEntries', 'Cleared all month cache');
}

export function getCachedMonthCount(): number {
  return Object.keys(monthCacheState.cache).length;
}

// ---------------------------------------------------------------------------
// Day-level cache updates
// ---------------------------------------------------------------------------

/**
 * Update month cache with fresh entries for a specific day.
 * Replaces all entries for that day while keeping other days intact.
 */
export function updateMonthCacheForDay(date: string, entries: UnifiedTimeEntry[]): void {
  const monthKey = getMonthStart(date);
  const cached = monthCacheState.cache[monthKey];
  if (!cached) return;

  const otherDaysEntries = cached.mocoEntries.filter((e) => e.date !== date);
  const updatedEntries = [...otherDaysEntries, ...entries];

  monthCacheState.cache = {
    ...monthCacheState.cache,
    [monthKey]: {
      ...cached,
      mocoEntries: updatedEntries
    }
  };
  persistMonthCache();
  logger.store('timeEntries', `Updated month cache for ${date}`);
}

/**
 * Refresh month cache for a specific date.
 * Day-level fetch (refreshDayEntries) already updates the cache via updateMonthCacheForDay,
 * so this function only ensures the month cache exists.
 */
export async function refreshMonthCacheForDate(date: string): Promise<void> {
  const monthStart = getMonthStart(date);
  const monthEnd = getMonthEnd(date);
  await fetchMonthCache(monthStart, monthEnd);
}

// ---------------------------------------------------------------------------
// Cache selectors
// ---------------------------------------------------------------------------
export function getCachedEntriesForDate(
  date: string,
  monthStart: string
): {
  moco: UnifiedTimeEntry[];
  jira: UnifiedTimeEntry[];
  outlook: UnifiedTimeEntry[];
} {
  const cached = monthCacheState.cache[monthStart];
  return {
    moco: cached ? cached.mocoEntries.filter((e) => e.date === date) : [],
    jira: [],
    outlook: []
  };
}

export function getCachedDayOverview(date: string, monthStart: string): DayOverview {
  const entries = getCachedEntriesForDate(date, monthStart);
  return buildDayOverview(date, entries);
}

export function getCachedDatesWithData(monthStart: string): string[] {
  const cached = monthCacheState.cache[monthStart];
  if (!cached) return [];

  const datesWithData = new Set<string>();
  for (const entry of cached.mocoEntries) {
    datesWithData.add(entry.date);
  }
  return Array.from(datesWithData);
}

export function hasCachedDataForDate(date: string, monthStart: string): boolean {
  const cached = monthCacheState.cache[monthStart];
  if (!cached) return false;

  if (cached.mocoEntries.some((e) => e.date === date)) return true;
  if (getPresenceForDate(date)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Task budget helpers
// ---------------------------------------------------------------------------

/**
 * Get total logged hours for a specific task across all cached months.
 */
export function getLoggedHoursForTask(taskId: number): number {
  let total = 0;
  for (const month of Object.values(monthCacheState.cache)) {
    for (const entry of month.mocoEntries) {
      const meta = entry.metadata as MocoMetadata;
      if (meta.taskId === taskId) {
        total += entry.hours;
      }
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Shared day overview builder (used by live + cache selectors)
// ---------------------------------------------------------------------------
export function buildDayOverview(
  date: string,
  entries: { moco: UnifiedTimeEntry[]; jira: UnifiedTimeEntry[]; outlook: UnifiedTimeEntry[] }
): DayOverview {
  const mocoTotal = entries.moco.reduce((sum, e) => sum + e.hours, 0);
  const jiraTotal = entries.jira.reduce((sum, e) => sum + e.hours, 0);
  const outlookTotal = entries.outlook.reduce((sum, e) => sum + e.hours, 0);

  const dayIndex = getDayOfWeekIndex(date);
  const configuredHours = settingsState.weekdayHours[dayIndex] ?? 8;

  const presence = getPresenceForDate(date);
  const baseTargetHours = configuredHours;

  // Reduce required hours for manual absences
  const manualAbsence = getAbsenceForDate(date);
  const absenceReduction = manualAbsence
    ? manualAbsence.halfDay
      ? baseTargetHours / 2
      : baseTargetHours
    : 0;
  const requiredHours = Math.max(0, baseTargetHours - absenceReduction);

  // Calculate presence balance (how much of presence time is booked)
  const presenceBalance = presence ? mocoTotal - presence.hours : undefined;

  return {
    date,
    dayOfWeek: dayIndex,
    isWeekend: isWeekend(date),
    isToday: checkIsToday(date),
    requiredHours,
    presence: presence ?? undefined,
    manualAbsence,
    entries,
    totals: {
      moco: mocoTotal,
      jira: jiraTotal,
      outlook: outlookTotal,
      actual: mocoTotal
    },
    balance: mocoTotal - requiredHours,
    presenceBalance
  };
}
