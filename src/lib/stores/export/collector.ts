import { connectionsState } from '../connections.svelte';
import { getCachedDayOverview, getOpenHoursDays } from '../timeEntriesCache.svelte';
import { getVacationSummary } from '../absences.svelte';
import { autoRefreshState } from '../autoRefresh.svelte';
import { getWeekDates, getMonthStart, today } from '../../utils/date-helpers';
import type { ExportSerializerInput } from './types';

const TTL_SECONDS_BY_INTERVAL: Record<string, number> = {
  '5min': 5 * 60,
  '30min': 30 * 60,
  '1hour': 60 * 60
};
const DEFAULT_TTL_SECONDS = 5 * 60;

export function collectExportInput(now: Date = new Date()): ExportSerializerInput {
  const mocoConnected = connectionsState.moco.isConnected;
  const ttlSeconds = TTL_SECONDS_BY_INTERVAL[autoRefreshState.interval] ?? DEFAULT_TTL_SECONDS;

  const input: ExportSerializerInput = { now, ttlSeconds, mocoConnected };

  if (mocoConnected) {
    const todayStr = today();
    const todayOverview = getCachedDayOverview(todayStr, getMonthStart(todayStr));
    input.today = { actual: todayOverview.totals.actual, required: todayOverview.requiredHours };

    const weekOverviews = getWeekDates(todayStr).map((date) =>
      getCachedDayOverview(date, getMonthStart(date))
    );
    input.week = {
      actual: weekOverviews.reduce((sum, o) => sum + o.totals.actual, 0),
      required: weekOverviews.reduce((sum, o) => sum + o.requiredHours, 0)
    };

    const gapDays = getOpenHoursDays();
    input.gaps = {
      count: gapDays.length,
      hours: gapDays.reduce((sum, g) => sum + Math.abs(g.overview.presenceBalance ?? 0), 0)
    };
  }

  if (connectionsState.personio.isConnected) {
    const vacation = getVacationSummary();
    if (vacation) {
      input.vacationRemainingDays = vacation.remaining;
    }
  }

  return input;
}
