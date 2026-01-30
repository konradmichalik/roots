import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata, OutlookMetadata, DayOverview } from '../types';
import type { MocoActivity, MSGraphEvent } from '../types';
import type { WorklogWithIssue, JiraWorklogClient } from '../api';
import { getMocoClient, getJiraClient, getOutlookClient } from './connections.svelte';
import { connectionsState } from './connections.svelte';
import { isWeekend, isToday as checkIsToday, getDayOfWeekIndex } from '../utils/date-helpers';
import { secondsToHours } from '../utils/time-format';
import { logger } from '../utils/logger';

export const timeEntriesState = $state({
  mocoEntries: [] as UnifiedTimeEntry[],
  jiraWorklogs: [] as UnifiedTimeEntry[],
  outlookEvents: [] as UnifiedTimeEntry[],
  personioAbsences: [] as UnifiedTimeEntry[],
  loading: {
    moco: false,
    jira: false,
    outlook: false,
    personio: false
  },
  errors: {
    moco: null as string | null,
    jira: null as string | null,
    outlook: null as string | null,
    personio: null as string | null
  },
  lastFetched: null as string | null
});

export function initializeTimeEntries(): void {
  logger.store('timeEntries', 'Initialized');
}

export async function fetchAllEntries(from: string, to: string): Promise<void> {
  const fetches: Promise<void>[] = [];

  if (connectionsState.moco.isConnected) {
    fetches.push(fetchMocoEntries(from, to));
  }

  if (connectionsState.jira.isConnected) {
    fetches.push(fetchJiraEntries(from, to));
  }

  if (connectionsState.outlook.isConnected) {
    fetches.push(fetchOutlookEntries(from, to));
  }

  await Promise.allSettled(fetches);
  timeEntriesState.lastFetched = new Date().toISOString();
}

export async function fetchMocoEntries(from: string, to: string): Promise<void> {
  const client = getMocoClient();
  if (!client) return;

  timeEntriesState.loading.moco = true;
  timeEntriesState.errors.moco = null;

  try {
    const activities = await client.getActivities(from, to);
    timeEntriesState.mocoEntries = activities.map(mapMocoActivity);
    logger.store('timeEntries', `Loaded ${activities.length} Moco entries`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Moco entries';
    timeEntriesState.errors.moco = message;
    logger.error('Failed to fetch Moco entries', error);
  } finally {
    timeEntriesState.loading.moco = false;
  }
}

function mapMocoActivity(activity: MocoActivity): UnifiedTimeEntry {
  const metadata: MocoMetadata = {
    source: 'moco',
    activityId: activity.id,
    projectName: activity.project.name,
    taskName: activity.task.name,
    customerName: activity.customer.name,
    billable: activity.billable,
    remoteTicketKey: activity.remote_id ?? undefined
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

export async function fetchJiraEntries(from: string, to: string): Promise<void> {
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

function mapJiraWorklog(
  item: WorklogWithIssue,
  client: JiraWorklogClient
): UnifiedTimeEntry {
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

export async function fetchOutlookEntries(from: string, to: string): Promise<void> {
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

function mapOutlookEvent(event: MSGraphEvent): UnifiedTimeEntry {
  const startDate = event.start.dateTime.split('T')[0];
  const hours = calculateEventHours(event.start.dateTime, event.end.dateTime, event.isAllDay);
  const startTime = event.isAllDay ? undefined : event.start.dateTime.split('T')[1]?.substring(0, 5);
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
    title: event.subject || '(Kein Betreff)',
    description: event.organizer?.emailAddress?.name,
    category: event.showAs,
    metadata
  };
}

function calculateEventHours(start: string, end: string, isAllDay: boolean): number {
  if (isAllDay) return 8;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
}

export function getEntriesForDate(date: string): {
  moco: UnifiedTimeEntry[];
  jira: UnifiedTimeEntry[];
  outlook: UnifiedTimeEntry[];
} {
  return {
    moco: timeEntriesState.mocoEntries.filter((e) => e.date === date),
    jira: timeEntriesState.jiraWorklogs.filter((e) => e.date === date),
    outlook: timeEntriesState.outlookEvents.filter((e) => e.date === date)
  };
}

export function getDayOverview(date: string): DayOverview {
  const entries = getEntriesForDate(date);
  const mocoTotal = entries.moco.reduce((sum, e) => sum + e.hours, 0);
  const jiraTotal = entries.jira.reduce((sum, e) => sum + e.hours, 0);
  const outlookTotal = entries.outlook.reduce((sum, e) => sum + e.hours, 0);

  const weekend = isWeekend(date);
  const requiredHours = weekend ? 0 : 8; // Default 8h, will be overridden by Personio

  return {
    date,
    dayOfWeek: getDayOfWeekIndex(date),
    isWeekend: weekend,
    isToday: checkIsToday(date),
    requiredHours,
    entries,
    totals: {
      moco: mocoTotal,
      jira: jiraTotal,
      outlook: outlookTotal,
      actual: mocoTotal // Moco is source of truth
    },
    balance: mocoTotal - requiredHours
  };
}

export function isAnyLoading(): boolean {
  return (
    timeEntriesState.loading.moco ||
    timeEntriesState.loading.jira ||
    timeEntriesState.loading.outlook ||
    timeEntriesState.loading.personio
  );
}

export function hasAnyError(): boolean {
  return !!(
    timeEntriesState.errors.moco ||
    timeEntriesState.errors.jira ||
    timeEntriesState.errors.outlook ||
    timeEntriesState.errors.personio
  );
}
