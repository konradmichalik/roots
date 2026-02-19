import {
  setDemoActive,
  anonymizeTimeEntry,
  anonymizeFavorite,
  anonymizeDraft,
  anonymizeRecentPair,
  anonymizeTimerBooking
} from '$lib/utils/demo-data';
import { monthCacheState, initializeTimeEntries, fetchMonthCache } from './timeEntriesCache.svelte';
import { timeEntriesState } from './timeEntries.svelte';
import { favoritesState, initializeFavorites } from './favorites.svelte';
import { draftsState, timerState, initializeTimer } from './timer.svelte';
import { recentPairsState, initializeRecentPairs } from './recentMocoPairs.svelte';
import { dateNavState } from './dateNavigation.svelte';
import { getMonthStart, getMonthEnd } from '$lib/utils/date-helpers';
import { logger } from '$lib/utils/logger';

// ---------------------------------------------------------------------------
// Reactive state (for UI binding)
// ---------------------------------------------------------------------------
export const demoModeState = $state({ active: false });

// ---------------------------------------------------------------------------
// Enable — anonymize all in-memory state
// ---------------------------------------------------------------------------
export function enableDemoMode(): void {
  setDemoActive(true);
  demoModeState.active = true;
  document.documentElement.setAttribute('data-demo', '');

  // Anonymize month cache entries
  const anonymizedCache: typeof monthCacheState.cache = {};
  for (const [key, entry] of Object.entries(monthCacheState.cache)) {
    anonymizedCache[key] = {
      ...entry,
      mocoEntries: entry.mocoEntries.map(anonymizeTimeEntry)
    };
  }
  monthCacheState.cache = anonymizedCache;

  // Anonymize live day entries
  timeEntriesState.mocoActivities = timeEntriesState.mocoActivities.map(anonymizeTimeEntry);
  timeEntriesState.jiraWorklogs = timeEntriesState.jiraWorklogs.map(anonymizeTimeEntry);
  timeEntriesState.outlookEvents = timeEntriesState.outlookEvents.map(anonymizeTimeEntry);

  // Anonymize favorites
  favoritesState.favorites = favoritesState.favorites.map(anonymizeFavorite);

  // Anonymize drafts
  draftsState.drafts = draftsState.drafts.map(anonymizeDraft);

  // Anonymize recent pairs
  recentPairsState.pairs = recentPairsState.pairs.map(anonymizeRecentPair);

  // Anonymize timer booking
  if (timerState.mocoBooking) {
    timerState.mocoBooking = anonymizeTimerBooking(timerState.mocoBooking);
  }
  if (timerState.note) {
    timerState.note = 'Working on feature implementation';
  }

  logger.info('Demo mode enabled');
}

// ---------------------------------------------------------------------------
// Disable — restore real data from persistent storage + re-fetch
// ---------------------------------------------------------------------------
export async function disableDemoMode(): Promise<void> {
  setDemoActive(false);
  demoModeState.active = false;
  document.documentElement.removeAttribute('data-demo');

  // Re-initialize from persistent storage (contains real data because
  // persistence is skipped while demo mode is active)
  await initializeTimeEntries();
  await initializeFavorites();
  await initializeRecentPairs();
  await initializeTimer();

  // Force re-fetch live day entries for current date
  timeEntriesState.fetchedDate = null;

  // Re-fetch month cache if the loaded month was anonymized
  const date = dateNavState.selectedDate;
  const monthStart = getMonthStart(date);
  const monthEnd = getMonthEnd(date);
  await fetchMonthCache(monthStart, monthEnd);

  logger.info('Demo mode disabled');
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------
export function toggleDemoMode(): void {
  if (demoModeState.active) {
    disableDemoMode();
  } else {
    enableDemoMode();
  }
}
