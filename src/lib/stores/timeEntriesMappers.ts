import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata, OutlookMetadata } from '../types';
import type { MocoActivity, MSGraphEvent } from '../types';
import type { WorklogWithIssue, JiraWorklogClient } from '../services';
import { settingsState } from './settings.svelte';
import { getDayOfWeekIndex } from '../utils/date-helpers';
import { secondsToHours } from '../utils/time-format';

// ---------------------------------------------------------------------------
// Moco
// ---------------------------------------------------------------------------
export function mapMocoActivity(activity: MocoActivity): UnifiedTimeEntry {
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

// ---------------------------------------------------------------------------
// Jira
// ---------------------------------------------------------------------------
export function mapJiraWorklog(
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

// ---------------------------------------------------------------------------
// Outlook
// ---------------------------------------------------------------------------
function calculateEventHours(start: string, end: string, isAllDay: boolean): number {
  if (isAllDay) {
    const dayIndex = getDayOfWeekIndex(start.split('T')[0]);
    return settingsState.weekdayHours[dayIndex] ?? 8;
  }
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
}

export function mapOutlookEvent(event: MSGraphEvent): UnifiedTimeEntry {
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

// ---------------------------------------------------------------------------
// Jira timestamp helper (used by mutations)
// ---------------------------------------------------------------------------

/**
 * Build ISO timestamp from date and time for Jira API.
 * Jira expects: 2024-02-06T09:00:00.000+0000
 */
export function buildJiraTimestamp(date: string, time: string = '09:00'): string {
  const [hours, minutes] = time.split(':').map(Number);
  const dateObj = new Date(
    `${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
  );
  return dateObj.toISOString().replace('Z', '+0000');
}
