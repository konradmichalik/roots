import type {
  UnifiedTimeEntry,
  DayOverview,
  MocoCreateActivity,
  MocoUpdateActivity,
  JiraCreateWorklog,
  JiraUpdateWorklog,
  JiraCreateWorklogPayload,
  JiraUpdateWorklogPayload
} from '../types';
import { getMocoClient, getJiraClient, getOutlookClient } from './connections.svelte';
import { connectionsState } from './connections.svelte';
import { hoursToSeconds } from '../utils/time-format';
import { logger } from '../utils/logger';
import { toast } from './toast.svelte';
import {
  mapMocoActivity,
  mapJiraWorklog,
  mapOutlookEvent,
  buildJiraTimestamp
} from './timeEntriesMappers';
import {
  monthCacheState,
  updateMonthCacheForDay,
  refreshMonthCacheForDate,
  buildDayOverview
} from './timeEntriesCache.svelte';

// Re-export everything from sub-modules so consumers don't need to change imports
export {
  monthCacheState,
  initializeTimeEntries,
  fetchMonthCache,
  invalidateMonthCache,
  clearAllMonthCache,
  getCachedMonthCount,
  refreshMonthCacheForDate,
  getCachedEntriesForDate,
  getCachedDayOverview,
  getCachedDatesWithData,
  hasCachedDataForDate,
  getLoggedHoursForTask
} from './timeEntriesCache.svelte';

// ---------------------------------------------------------------------------
// Live day entries (Moco + Jira + Outlook — fetched per day)
// ---------------------------------------------------------------------------
export const timeEntriesState = $state({
  mocoActivities: [] as UnifiedTimeEntry[],
  jiraWorklogs: [] as UnifiedTimeEntry[],
  outlookEvents: [] as UnifiedTimeEntry[],
  loading: {
    moco: false,
    jira: false,
    outlook: false
  },
  errors: {
    moco: null as string | null,
    jira: null as string | null,
    outlook: null as string | null
  },
  lastFetched: null as string | null,
  fetchedDate: null as string | null
});

// ---------------------------------------------------------------------------
// Live day fetch (Moco + Jira + Outlook)
// ---------------------------------------------------------------------------
export async function fetchDayEntries(date: string): Promise<void> {
  if (timeEntriesState.fetchedDate === date && timeEntriesState.lastFetched) {
    return;
  }

  const fetches: Promise<void>[] = [];

  if (connectionsState.moco.isConnected) {
    fetches.push(fetchMocoEntries(date, date));
  }

  if (connectionsState.jira.isConnected) {
    fetches.push(fetchJiraEntries(date, date));
  }

  if (connectionsState.outlook.isConnected) {
    fetches.push(fetchOutlookEntries(date, date));
  }

  await Promise.allSettled(fetches);
  timeEntriesState.lastFetched = new Date().toISOString();
  timeEntriesState.fetchedDate = date;
}

/**
 * Force re-fetch all sources for the given date (bypasses cache check).
 */
export async function refreshDayEntries(date: string): Promise<void> {
  timeEntriesState.fetchedDate = null;
  await fetchDayEntries(date);
}

// ---------------------------------------------------------------------------
// Individual source fetchers (write to live state)
// ---------------------------------------------------------------------------
async function fetchMocoEntries(from: string, to: string): Promise<void> {
  const client = getMocoClient();
  if (!client) return;

  timeEntriesState.loading.moco = true;
  timeEntriesState.errors.moco = null;

  try {
    const activities = await client.getActivities(from, to);
    const mappedEntries = activities.map(mapMocoActivity);
    timeEntriesState.mocoActivities = mappedEntries;
    logger.store('timeEntries', `Loaded ${activities.length} Moco activities`);

    // Update month cache with fresh data for this day
    if (from === to) {
      updateMonthCacheForDay(from, mappedEntries);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Moco activities';
    timeEntriesState.errors.moco = message;
    logger.error('Failed to fetch Moco activities', error);
  } finally {
    timeEntriesState.loading.moco = false;
  }
}

async function fetchJiraEntries(from: string, to: string): Promise<void> {
  const client = getJiraClient();
  if (!client) return;

  timeEntriesState.loading.jira = true;
  timeEntriesState.errors.jira = null;

  try {
    const worklogs = await client.getWorklogsForRange(from, to);
    timeEntriesState.jiraWorklogs = worklogs.map((w) => mapJiraWorklog(w, client));
    logger.store('timeEntries', `Loaded ${worklogs.length} Jira worklogs`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Jira worklogs';
    timeEntriesState.errors.jira = message;
    logger.error('Failed to fetch Jira worklogs', error);
  } finally {
    timeEntriesState.loading.jira = false;
  }
}

async function fetchOutlookEntries(from: string, to: string): Promise<void> {
  const client = getOutlookClient();
  if (!client) return;

  timeEntriesState.loading.outlook = true;
  timeEntriesState.errors.outlook = null;

  try {
    const events = await client.getCalendarEvents(from, to);
    timeEntriesState.outlookEvents = events.map(mapOutlookEvent);
    logger.store('timeEntries', `Loaded ${events.length} Outlook events`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Outlook events';
    timeEntriesState.errors.outlook = message;
    logger.error('Failed to fetch Outlook events', error);
  } finally {
    timeEntriesState.loading.outlook = false;
  }
}

// ---------------------------------------------------------------------------
// Moco activity mutations
// ---------------------------------------------------------------------------
export async function createMocoActivity(data: MocoCreateActivity): Promise<boolean> {
  const client = getMocoClient();
  if (!client) return false;

  try {
    await client.createActivity(data);
    logger.store('timeEntries', 'Created Moco activity', { date: data.date });

    await Promise.allSettled([refreshDayEntries(data.date), refreshMonthCacheForDate(data.date)]);
    toast.success('Entry created');
    return true;
  } catch (error) {
    logger.error('Failed to create Moco activity', error);
    toast.error('Failed to create entry');
    return false;
  }
}

export async function updateMocoActivity(
  id: number,
  data: MocoUpdateActivity,
  date: string
): Promise<boolean> {
  const client = getMocoClient();
  if (!client) return false;

  try {
    await client.updateActivity(id, data);
    logger.store('timeEntries', `Updated Moco activity ${id}`);

    await Promise.allSettled([refreshDayEntries(date), refreshMonthCacheForDate(date)]);
    toast.success('Entry updated');
    return true;
  } catch (error) {
    logger.error(`Failed to update Moco activity ${id}`, error);
    toast.error('Failed to update entry');
    return false;
  }
}

export async function deleteMocoActivity(id: number, date: string): Promise<boolean> {
  const client = getMocoClient();
  if (!client) return false;

  try {
    await client.deleteActivity(id);
    logger.store('timeEntries', `Deleted Moco activity ${id}`);

    await Promise.allSettled([refreshDayEntries(date), refreshMonthCacheForDate(date)]);
    toast.success('Entry deleted');
    return true;
  } catch (error) {
    logger.error(`Failed to delete Moco activity ${id}`, error);
    toast.error('Failed to delete entry');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Jira worklog mutations
// ---------------------------------------------------------------------------
export async function createJiraWorklog(data: JiraCreateWorklog): Promise<boolean> {
  const client = getJiraClient();
  if (!client) {
    toast.error('Jira not connected');
    return false;
  }

  try {
    const payload: JiraCreateWorklogPayload = {
      timeSpentSeconds: hoursToSeconds(data.hours),
      started: buildJiraTimestamp(data.date, data.startTime),
      comment: data.comment
    };

    await client.createWorklog(data.issueKey, payload);
    logger.store('timeEntries', 'Created Jira worklog', { issueKey: data.issueKey });

    await refreshDayEntries(data.date);
    toast.success('Jira worklog created');
    return true;
  } catch (error) {
    logger.error('Failed to create Jira worklog', error);
    const message = error instanceof Error ? error.message : 'Failed to create worklog';
    toast.error(message);
    return false;
  }
}

export async function updateJiraWorklog(
  issueKey: string,
  worklogId: string,
  data: JiraUpdateWorklog,
  date: string
): Promise<boolean> {
  const client = getJiraClient();
  if (!client) {
    toast.error('Jira not connected');
    return false;
  }

  try {
    const payload: JiraUpdateWorklogPayload = {};

    if (data.hours !== undefined) {
      payload.timeSpentSeconds = hoursToSeconds(data.hours);
    }
    if (data.startTime !== undefined) {
      payload.started = buildJiraTimestamp(date, data.startTime);
    }
    if (data.comment !== undefined) {
      payload.comment = data.comment;
    }

    await client.updateWorklog(issueKey, worklogId, payload);
    logger.store('timeEntries', `Updated Jira worklog ${worklogId}`);

    await refreshDayEntries(date);
    toast.success('Jira worklog updated');
    return true;
  } catch (error) {
    logger.error(`Failed to update Jira worklog ${worklogId}`, error);
    const message = error instanceof Error ? error.message : 'Failed to update worklog';
    toast.error(message);
    return false;
  }
}

export async function deleteJiraWorklog(
  issueKey: string,
  worklogId: string,
  date: string
): Promise<boolean> {
  const client = getJiraClient();
  if (!client) {
    toast.error('Jira not connected');
    return false;
  }

  try {
    await client.deleteWorklog(issueKey, worklogId);
    logger.store('timeEntries', `Deleted Jira worklog ${worklogId}`);

    await refreshDayEntries(date);
    toast.success('Jira worklog deleted');
    return true;
  } catch (error) {
    logger.error(`Failed to delete Jira worklog ${worklogId}`, error);
    const message = error instanceof Error ? error.message : 'Failed to delete worklog';
    toast.error(message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Selectors: Day data (all from live state)
// ---------------------------------------------------------------------------
export function getEntriesForDate(date: string): {
  moco: UnifiedTimeEntry[];
  jira: UnifiedTimeEntry[];
  outlook: UnifiedTimeEntry[];
} {
  return {
    moco: timeEntriesState.mocoActivities.filter((e) => e.date === date),
    jira: timeEntriesState.jiraWorklogs.filter((e) => e.date === date),
    outlook: timeEntriesState.outlookEvents.filter((e) => e.date === date)
  };
}

export function getDayOverview(date: string): DayOverview {
  const entries = getEntriesForDate(date);
  return buildDayOverview(date, entries);
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
export function isAnyLoading(): boolean {
  return (
    monthCacheState.loading ||
    timeEntriesState.loading.moco ||
    timeEntriesState.loading.jira ||
    timeEntriesState.loading.outlook
  );
}

export function hasAnyError(): boolean {
  return !!(
    timeEntriesState.errors.moco ||
    timeEntriesState.errors.jira ||
    timeEntriesState.errors.outlook
  );
}
