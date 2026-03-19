import type {
  UnifiedTimeEntry,
  MocoCreateActivity,
  SyncCandidate,
  SkippedEntry,
  SyncError,
  SyncPreview,
  SyncResult,
  SyncRecord,
  Rule
} from '../types';
import { timeEntriesState, refreshDayEntries } from './timeEntries.svelte';
import { refreshMonthCacheForDate } from './timeEntriesCache.svelte';
import {
  getMocoClient,
  getJiraClient,
  getOutlookClient,
  connectionsState
} from './connections.svelte';
import { findMatchingRules } from './rules.svelte';
import { isSynced, addSyncRecord, getSyncRecord } from './syncRecords.svelte';
import { mapMocoActivity, mapJiraWorklog, mapOutlookEvent } from './timeEntriesMappers';
import {
  renderDescriptionTemplate,
  buildJiraVariables,
  buildOutlookVariables
} from '../utils/description-template';
import { addDays } from '../utils/date-helpers';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Build Moco payload from a matched entry + rule
// ---------------------------------------------------------------------------

function buildMocoPayload(entry: UnifiedTimeEntry, rule: Rule): MocoCreateActivity {
  const variables =
    rule.source.type === 'jira' ? buildJiraVariables(entry) : buildOutlookVariables(entry);

  const description = renderDescriptionTemplate(rule.descriptionTemplate, variables);

  let hours = entry.hours;
  if (rule.source.type === 'outlook' && rule.source.overrideHours !== undefined) {
    hours = rule.source.overrideHours;
  }

  const payload: MocoCreateActivity = {
    date: entry.date,
    project_id: rule.target.mocoProjectId,
    task_id: rule.target.mocoTaskId,
    hours,
    description
  };

  // Set remote fields for linking and dedup
  if (rule.source.type === 'jira' && entry.metadata.source === 'jira') {
    payload.remote_service = 'jira';
    payload.remote_id = `${entry.metadata.issueKey}#${entry.metadata.worklogId}`;
  } else if (rule.source.type === 'outlook' && entry.metadata.source === 'outlook') {
    payload.remote_service = 'outlook';
    payload.remote_id = entry.metadata.eventId;
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Get source ID for dedup
// ---------------------------------------------------------------------------

function getSourceId(entry: UnifiedTimeEntry): string {
  if (entry.metadata.source === 'jira') return entry.metadata.worklogId;
  if (entry.metadata.source === 'outlook') return entry.metadata.eventId;
  return entry.id;
}

/**
 * Get a display label for a source entry. Used internally for sync records
 * and exported for UI components.
 */
export function getEntrySourceLabel(entry: UnifiedTimeEntry): string {
  if (entry.metadata.source === 'jira') return entry.metadata.issueKey;
  return entry.title;
}

// ---------------------------------------------------------------------------
// Shared preview builder — single source of truth for sync logic
// ---------------------------------------------------------------------------

function buildPreview(
  sourceEntries: UnifiedTimeEntry[],
  mocoEntries: UnifiedTimeEntry[],
  options: { autoOnly?: boolean } = {}
): SyncPreview {
  const pending: SyncCandidate[] = [];
  const skipped: SkippedEntry[] = [];
  const staleRules: Rule[] = [];
  const errors: SyncError[] = [];
  const seenStaleRuleIds = new Set<string>();

  for (const entry of sourceEntries) {
    const matchingRules = findMatchingRules(entry);
    if (matchingRules.length === 0) continue;

    const rule = matchingRules[0];

    // Check zero hours after matching — overrideHours can make 0h events billable
    const effectiveHours =
      rule.source.type === 'outlook' && rule.source.overrideHours !== undefined
        ? rule.source.overrideHours
        : entry.hours;
    if (effectiveHours <= 0) {
      skipped.push({ sourceEntry: entry, reason: 'zero_hours' });
      continue;
    }

    if (options.autoOnly && !rule.autoSync) continue;

    if (rule.targetStatus === 'stale') {
      if (!seenStaleRuleIds.has(rule.id)) {
        staleRules.push(rule);
        seenStaleRuleIds.add(rule.id);
      }
      errors.push({ sourceEntry: entry, rule, reason: 'Target task is no longer available' });
      continue;
    }

    const sourceId = getSourceId(entry);
    const sourceType = entry.source as 'jira' | 'outlook';

    if (isSynced(sourceType, sourceId)) {
      skipped.push({ sourceEntry: entry, reason: 'already_synced' });
      continue;
    }

    const payload = buildMocoPayload(entry, rule);
    if (payload.remote_service && payload.remote_id) {
      const mocoExists = mocoEntries.some((e) => {
        if (e.metadata.source !== 'moco') return false;
        return (
          e.metadata.remoteService === payload.remote_service &&
          e.metadata.remoteId === payload.remote_id
        );
      });
      if (mocoExists) {
        skipped.push({ sourceEntry: entry, reason: 'moco_remote_exists' });
        continue;
      }
    }

    pending.push({ rule, sourceEntry: entry, mocoPayload: payload });
  }

  return { pending, skipped, staleRules, errors };
}

// ---------------------------------------------------------------------------
// syncDay — Build a preview from live state entries
// ---------------------------------------------------------------------------

export async function syncDay(
  date: string,
  options: { dryRun?: boolean; autoOnly?: boolean } = {}
): Promise<SyncPreview> {
  const sourceEntries: UnifiedTimeEntry[] = [
    ...timeEntriesState.jiraWorklogs.filter((e) => e.date === date),
    ...timeEntriesState.outlookEvents.filter((e) => e.date === date)
  ];
  const mocoEntries = timeEntriesState.mocoActivities.filter((e) => e.date === date);

  return buildPreview(sourceEntries, mocoEntries, { autoOnly: options.autoOnly });
}

// ---------------------------------------------------------------------------
// executeSyncCandidates — Actually create Moco entries
// ---------------------------------------------------------------------------

export async function executeSyncCandidates(
  candidates: SyncCandidate[],
  autoSynced: boolean = false
): Promise<SyncResult> {
  const client = getMocoClient();
  if (!client) {
    throw new Error('Moco not connected');
  }

  const created: SyncRecord[] = [];
  const failed: SyncRecord[] = [];

  // Execute sequentially to avoid rate limits and race conditions
  for (const candidate of candidates) {
    const sourceId = getSourceId(candidate.sourceEntry);
    const sourceType = candidate.sourceEntry.source as 'jira' | 'outlook';

    // Re-check dedup right before creating (race condition safety)
    if (isSynced(sourceType, sourceId)) {
      logger.store('ruleSync', 'Skipped (already synced during batch)', { sourceId });
      continue;
    }

    try {
      const activity = await client.createActivity(candidate.mocoPayload);

      const record = addSyncRecord({
        ruleId: candidate.rule.id,
        sourceType,
        sourceId,
        sourceKey: getEntrySourceLabel(candidate.sourceEntry),
        mocoActivityId: activity.id,
        mocoDate: candidate.mocoPayload.date,
        hours: candidate.mocoPayload.hours,
        description: candidate.mocoPayload.description ?? '',
        autoSynced,
        status: 'success'
      });
      created.push(record);

      logger.store('ruleSync', 'Created Moco activity', {
        ruleId: candidate.rule.id,
        sourceId,
        activityId: activity.id
      });
    } catch (error) {
      const errorReason = error instanceof Error ? error.message : 'api_error';

      const record = addSyncRecord({
        ruleId: candidate.rule.id,
        sourceType,
        sourceId,
        sourceKey: getEntrySourceLabel(candidate.sourceEntry),
        mocoDate: candidate.mocoPayload.date,
        hours: candidate.mocoPayload.hours,
        description: candidate.mocoPayload.description ?? '',
        autoSynced,
        status: 'failed',
        errorReason
      });
      failed.push(record);

      logger.error(`ruleSync: Failed to create Moco activity`, error);
    }
  }

  // Refresh entries for all affected dates
  if (created.length > 0) {
    const affectedDates = [...new Set(created.map((r) => r.mocoDate))];
    await Promise.allSettled(
      affectedDates.flatMap((date) => [refreshDayEntries(date), refreshMonthCacheForDate(date)])
    );
  }

  return { created, failed };
}

// ---------------------------------------------------------------------------
// Bulk Sync — Fetch entries for a date range and build preview
// ---------------------------------------------------------------------------

export interface BulkSyncPreview {
  days: Array<{ date: string; preview: SyncPreview }>;
  totalPending: number;
  totalSkipped: number;
  totalErrors: number;
  fetchErrors: string[];
}

export async function syncDateRange(from: string, to: string): Promise<BulkSyncPreview> {
  const days: BulkSyncPreview['days'] = [];
  let totalPending = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Fetch entries for the range from services directly
  const jiraClient = getJiraClient();
  const outlookClient = getOutlookClient();
  const mocoClient = getMocoClient();

  let jiraWorklogs: UnifiedTimeEntry[] = [];
  let outlookEvents: UnifiedTimeEntry[] = [];
  let mocoActivities: UnifiedTimeEntry[] = [];
  const fetchErrors: string[] = [];

  const fetches: Promise<void>[] = [];

  if (jiraClient && connectionsState.jira.isConnected) {
    fetches.push(
      jiraClient
        .getWorklogsForRange(from, to)
        .then((worklogs) => {
          jiraWorklogs = worklogs.map((w) => mapJiraWorklog(w, jiraClient));
        })
        .catch((e) => {
          fetchErrors.push(`Jira: ${e instanceof Error ? e.message : 'Failed to fetch worklogs'}`);
          logger.error('Bulk sync: Failed to fetch Jira worklogs', e);
        })
    );
  }

  if (outlookClient && connectionsState.outlook.isConnected) {
    fetches.push(
      outlookClient
        .getCalendarEvents(from, to)
        .then((events) => {
          outlookEvents = events.map(mapOutlookEvent);
        })
        .catch((e) => {
          fetchErrors.push(`Outlook: ${e instanceof Error ? e.message : 'Failed to fetch events'}`);
          logger.error('Bulk sync: Failed to fetch Outlook events', e);
        })
    );
  }

  if (mocoClient && connectionsState.moco.isConnected) {
    fetches.push(
      mocoClient
        .getActivities(from, to)
        .then((activities) => {
          mocoActivities = activities.map(mapMocoActivity);
        })
        .catch((e) => {
          fetchErrors.push(
            `Moco: ${e instanceof Error ? e.message : 'Failed to fetch activities'}`
          );
          logger.error('Bulk sync: Failed to fetch Moco activities', e);
        })
    );
  }

  await Promise.allSettled(fetches);

  // Process day by day
  let current = from;
  while (current <= to) {
    const date = current;

    const dayJira = jiraWorklogs.filter((e) => e.date === date);
    const dayOutlook = outlookEvents.filter((e) => e.date === date);
    const dayMoco = mocoActivities.filter((e) => e.date === date);

    const preview = buildPreview([...dayJira, ...dayOutlook], dayMoco);

    if (preview.pending.length > 0 || preview.errors.length > 0) {
      days.push({ date, preview });
    }

    totalPending += preview.pending.length;
    totalSkipped += preview.skipped.length;
    totalErrors += preview.errors.length;

    current = addDays(current, 1);
  }

  return { days, totalPending, totalSkipped, totalErrors, fetchErrors };
}

// ---------------------------------------------------------------------------
// Change Detection — Find synced entries where hours have changed
// ---------------------------------------------------------------------------

export interface HoursChange {
  syncRecord: SyncRecord;
  currentHours: number;
  syncedHours: number;
  sourceKey: string;
  date: string;
}

export function detectHoursChanges(
  jiraEntries: UnifiedTimeEntry[],
  outlookEntries: UnifiedTimeEntry[]
): HoursChange[] {
  const changes: HoursChange[] = [];
  const sourceEntries = [...jiraEntries, ...outlookEntries];

  for (const entry of sourceEntries) {
    const sourceId = getSourceId(entry);
    const sourceType = entry.source as 'jira' | 'outlook';

    const record = getSyncRecord(sourceType, sourceId);
    if (!record) continue;

    const diff = Math.abs(entry.hours - record.hours);
    if (diff >= 0.01) {
      changes.push({
        syncRecord: record,
        currentHours: entry.hours,
        syncedHours: record.hours,
        sourceKey: record.sourceKey,
        date: record.mocoDate
      });
    }
  }

  return changes;
}
