import type {
  UnifiedTimeEntry,
  MocoMetadata,
  JiraMetadata,
  OutlookMetadata,
  DayOverview,
  MocoCreateActivity,
  MocoUpdateActivity,
  JiraCreateWorklog,
  JiraUpdateWorklog,
  JiraCreateWorklogPayload,
  JiraUpdateWorklogPayload
} from '../types';
import type { MocoActivity, MSGraphEvent } from '../types';
import type { WorklogWithIssue, JiraWorklogClient } from '../api';
import { getMocoClient, getJiraClient, getOutlookClient } from './connections.svelte';
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
import { secondsToHours, hoursToSeconds } from '../utils/time-format';
import { logger } from '../utils/logger';
import { toast } from './toast.svelte';

// Month cache persists indefinitely - only updated when day-level fetches reveal changes

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
// Month cache (Moco activities only — for calendar + stats)
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
// Initialization
// ---------------------------------------------------------------------------
export async function initializeTimeEntries(): Promise<void> {
  // Load persisted month cache from storage
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
  void setStorageItemAsync(STORAGE_KEYS.MONTH_CACHE, monthCacheState.cache);
}

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
          entry.mocoEntries = activities.map(mapMocoActivity);
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

/**
 * Invalidate the month cache for a given month start date.
 */
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

/**
 * Update month cache with fresh entries for a specific day.
 * Replaces all entries for that day while keeping other days intact.
 */
function updateMonthCacheForDay(date: string, entries: UnifiedTimeEntry[]): void {
  const monthKey = getMonthStart(date);
  const cached = monthCacheState.cache[monthKey];
  if (!cached) return;

  // Remove old entries for this day and add new ones
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
  // Only fetch if cache doesn't exist yet - day-level updates handle the rest
  await fetchMonthCache(monthStart, monthEnd);
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

    // Refresh both live entries and month cache
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

/**
 * Build ISO timestamp from date and time for Jira API
 * Jira expects: 2024-02-06T09:00:00.000+0000
 */
function buildJiraTimestamp(date: string, time: string = '09:00'): string {
  const [hours, minutes] = time.split(':').map(Number);
  const dateObj = new Date(
    `${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
  );
  return dateObj.toISOString().replace('Z', '+0000');
}

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
// Mappers
// ---------------------------------------------------------------------------
function mapMocoActivity(activity: MocoActivity): UnifiedTimeEntry {
  const metadata: MocoMetadata = {
    source: 'moco',
    activityId: activity.id,
    projectId: activity.project.id,
    taskId: activity.task.id,
    projectName: activity.project.name,
    taskName: activity.task.name,
    customerName: activity.customer.name,
    billable: activity.billable,
    remoteTicketKey: activity.remote_id ?? undefined,
    remoteService: activity.remote_service,
    remoteId: activity.remote_id
  };

  return {
    id: `moco-${activity.id}`,
    source: 'moco',
    date: activity.date,
    hours: activity.hours,
    title: `${activity.project.name} \u2013 ${activity.task.name}`,
    description: activity.description || undefined,
    category: activity.customer.name,
    metadata
  };
}

function mapJiraWorklog(item: WorklogWithIssue, client: JiraWorklogClient): UnifiedTimeEntry {
  const { worklog, issueKey, issueSummary, issueType, projectKey } = item;

  const metadata: JiraMetadata = {
    source: 'jira',
    worklogId: worklog.id,
    issueKey,
    issueSummary,
    issueType,
    projectKey
  };

  return {
    id: `jira-${worklog.id}`,
    source: 'jira',
    date: worklog.started.split('T')[0],
    hours: secondsToHours(worklog.timeSpentSeconds),
    title: `${issueKey} \u2013 ${issueSummary}`,
    description: client.extractWorklogComment(worklog.comment),
    category: projectKey,
    metadata
  };
}

function mapOutlookEvent(event: MSGraphEvent): UnifiedTimeEntry {
  const startDate = event.start.dateTime.split('T')[0];
  const hours = calculateEventHours(event.start.dateTime, event.end.dateTime, event.isAllDay);
  const startTime = event.isAllDay
    ? undefined
    : event.start.dateTime.split('T')[1]?.substring(0, 5);
  const endTime = event.isAllDay ? undefined : event.end.dateTime.split('T')[1]?.substring(0, 5);

  const metadata: OutlookMetadata = {
    source: 'outlook',
    eventId: event.id,
    isAllDay: event.isAllDay,
    showAs: event.showAs,
    responseStatus: event.responseStatus.response,
    attendeeCount: event.attendees?.length ?? 0,
    isOnlineMeeting: event.isOnlineMeeting,
    webLink: event.webLink
  };

  return {
    id: `outlook-${event.id}`,
    source: 'outlook',
    date: startDate,
    hours,
    startTime,
    endTime,
    title: event.subject || '(No subject)',
    description: event.organizer?.emailAddress?.name,
    category: event.showAs,
    metadata
  };
}

function calculateEventHours(start: string, end: string, isAllDay: boolean): number {
  if (isAllDay) {
    const dayIndex = getDayOfWeekIndex(start.split('T')[0]);
    return settingsState.weekdayHours[dayIndex] ?? 8;
  }
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
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
// Selectors: Cached month data (used by MiniCalendar + StatsModal)
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

// ---------------------------------------------------------------------------
// Shared overview builder
// ---------------------------------------------------------------------------
function buildDayOverview(
  date: string,
  entries: { moco: UnifiedTimeEntry[]; jira: UnifiedTimeEntry[]; outlook: UnifiedTimeEntry[] }
): DayOverview {
  const mocoTotal = entries.moco.reduce((sum, e) => sum + e.hours, 0);
  const jiraTotal = entries.jira.reduce((sum, e) => sum + e.hours, 0);
  const outlookTotal = entries.outlook.reduce((sum, e) => sum + e.hours, 0);

  const dayIndex = getDayOfWeekIndex(date);
  const configuredHours = settingsState.weekdayHours[dayIndex] ?? 8;

  // Always use configured hours as the booking target.
  // Presence hours represent raw clock-in/out time (including lunch breaks)
  // and would inflate the target beyond actual bookable hours.
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

// ---------------------------------------------------------------------------
// Task budget helpers
// ---------------------------------------------------------------------------

/**
 * Get total logged hours for a specific task across all cached months.
 * Returns the sum of hours from Moco entries matching the given taskId.
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
// Cache availability helpers
// ---------------------------------------------------------------------------
export function hasCachedDataForDate(date: string, monthStart: string): boolean {
  const cached = monthCacheState.cache[monthStart];
  if (!cached) return false;

  // Check if we have any Moco entries for this date
  const hasEntries = cached.mocoEntries.some((e) => e.date === date);
  if (hasEntries) return true;

  // Check if we have presence data for this date
  const presence = getPresenceForDate(date);
  if (presence) return true;

  return false;
}

export function getCachedDatesWithData(monthStart: string): string[] {
  const cached = monthCacheState.cache[monthStart];
  if (!cached) return [];

  const datesWithData = new Set<string>();

  // Add dates with Moco entries
  for (const entry of cached.mocoEntries) {
    datesWithData.add(entry.date);
  }

  return Array.from(datesWithData);
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
