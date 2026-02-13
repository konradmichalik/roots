import {
  fetchMonthMocoOnly,
  getCachedDayOverview,
  monthCacheState
} from './timeEntriesCache.svelte';
import { getMonthStart, getMonthWorkingDays, toDateString } from '../utils/date-helpers';
import { logger } from '../utils/logger';

export const yearStatsState = $state({
  loading: false,
  loaded: false,
  monthsLoaded: 0,
  totalMonths: 0
});

/**
 * Fetch Moco entries for all months from January of the current year
 * up to the current month. Skips months already in the cache.
 * Fetches 3 months in parallel to balance speed and API load.
 */
export async function fetchYearStats(): Promise<void> {
  if (yearStatsState.loaded || yearStatsState.loading) return;

  yearStatsState.loading = true;

  const year = new Date().getFullYear();
  const currentMonth = getMonthStart(toDateString(new Date()));
  const allMonths: string[] = [];

  for (let m = 0; m < 12; m++) {
    const ms = `${year}-${String(m + 1).padStart(2, '0')}-01`;
    allMonths.push(ms);
    if (ms === currentMonth) break;
  }

  yearStatsState.totalMonths = allMonths.length;

  const missingMonths = allMonths.filter((ms) => !monthCacheState.cache[ms]);
  yearStatsState.monthsLoaded = allMonths.length - missingMonths.length;

  // Fetch in batches of 3
  for (let i = 0; i < missingMonths.length; i += 3) {
    const batch = missingMonths.slice(i, i + 3);
    await Promise.all(batch.map((ms) => fetchMonthMocoOnly(ms)));
    yearStatsState.monthsLoaded = allMonths.length - missingMonths.length + i + batch.length;
  }

  yearStatsState.loaded = true;
  yearStatsState.loading = false;
  logger.store('yearStats', 'Year data loaded', { months: allMonths.length });
}

/**
 * Compute year-to-date overtime balance from cached month data.
 * Pure computation — safe for use in $derived.
 * Only returns meaningful values when yearStatsState.loaded is true.
 */
export function getYearBalance(todayStr: string): {
  yearBalance: number;
  yearActual: number;
  yearTarget: number;
} {
  const year = new Date().getFullYear();
  const currentMonth = getMonthStart(todayStr);
  let yearBalance = 0;
  let yearActual = 0;
  let yearTarget = 0;

  for (let m = 0; m < 12; m++) {
    const ms = `${year}-${String(m + 1).padStart(2, '0')}-01`;
    if (ms > currentMonth) break;
    if (!monthCacheState.cache[ms]) continue;

    const workingDays = getMonthWorkingDays(ms).filter((d) => d < todayStr);
    for (const d of workingDays) {
      const overview = getCachedDayOverview(d, ms);
      yearBalance += overview.balance;
      yearActual += overview.totals.actual;
      yearTarget += overview.requiredHours;
    }
  }

  return { yearBalance, yearActual, yearTarget };
}
