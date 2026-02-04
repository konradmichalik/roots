import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata, OutlookMetadata } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchResult {
  sortedMoco: UnifiedTimeEntry[];
  sortedJira: UnifiedTimeEntry[];
  sortedOutlook: UnifiedTimeEntry[];
  entryGroupMap: Map<string, string>; // entryId -> groupId (ticket key or outlook event id)
}

// ---------------------------------------------------------------------------
// Shared hover state
// ---------------------------------------------------------------------------

export const matchHoverState = $state({
  hoveredGroupId: null as string | null
});

export function setHoveredGroup(groupId: string): void {
  matchHoverState.hoveredGroupId = groupId;
}

export function clearHoveredGroup(): void {
  matchHoverState.hoveredGroupId = null;
}

// ---------------------------------------------------------------------------
// Matching algorithm
// ---------------------------------------------------------------------------

export function buildMatchResult(
  mocoEntries: UnifiedTimeEntry[],
  jiraEntries: UnifiedTimeEntry[],
  outlookEntries: UnifiedTimeEntry[] = []
): MatchResult {
  const entryGroupMap = new Map<string, string>();
  const sortedMoco: UnifiedTimeEntry[] = [];
  const sortedJira: UnifiedTimeEntry[] = [];
  const sortedOutlook: UnifiedTimeEntry[] = [];
  const usedMocoIds = new Set<string>();
  const usedJiraIds = new Set<string>();
  const usedOutlookIds = new Set<string>();

  // --- Jira <-> Moco matching (by ticket key) ---
  const mocoByTicketKey = groupByTicketKey(mocoEntries, 'moco');
  const jiraByKey = groupByTicketKey(jiraEntries, 'jira');

  const matchedJiraKeys = [...mocoByTicketKey.keys()].filter((k) => jiraByKey.has(k));
  matchedJiraKeys.sort();

  for (const key of matchedJiraKeys) {
    const mocoGroup = mocoByTicketKey.get(key)!;
    const jiraGroup = jiraByKey.get(key)!;

    mocoGroup.sort((a, b) => b.hours - a.hours);
    jiraGroup.sort((a, b) => b.hours - a.hours);

    for (const entry of mocoGroup) {
      sortedMoco.push(entry);
      entryGroupMap.set(entry.id, `jira:${key}`);
      usedMocoIds.add(entry.id);
    }
    for (const entry of jiraGroup) {
      sortedJira.push(entry);
      entryGroupMap.set(entry.id, `jira:${key}`);
      usedJiraIds.add(entry.id);
    }
  }

  // --- Outlook <-> Moco matching (by remote_service='outlook' and remote_id=eventId) ---
  const mocoByOutlookId = groupMocoByOutlookId(mocoEntries);
  const outlookById = groupOutlookById(outlookEntries);

  const matchedOutlookIds = [...mocoByOutlookId.keys()].filter((id) => outlookById.has(id));
  matchedOutlookIds.sort();

  for (const eventId of matchedOutlookIds) {
    const mocoGroup = mocoByOutlookId.get(eventId)!;
    const outlookGroup = outlookById.get(eventId)!;
    const groupKey = `outlook:${eventId}`;

    mocoGroup.sort((a, b) => b.hours - a.hours);
    outlookGroup.sort((a, b) => b.hours - a.hours);

    for (const entry of mocoGroup) {
      if (!usedMocoIds.has(entry.id)) {
        sortedMoco.push(entry);
        usedMocoIds.add(entry.id);
      }
      entryGroupMap.set(entry.id, groupKey);
    }
    for (const entry of outlookGroup) {
      sortedOutlook.push(entry);
      entryGroupMap.set(entry.id, groupKey);
      usedOutlookIds.add(entry.id);
    }
  }

  // Append unmatched entries at the bottom
  for (const entry of mocoEntries) {
    if (!usedMocoIds.has(entry.id)) {
      sortedMoco.push(entry);
    }
  }
  for (const entry of jiraEntries) {
    if (!usedJiraIds.has(entry.id)) {
      sortedJira.push(entry);
    }
  }
  for (const entry of outlookEntries) {
    if (!usedOutlookIds.has(entry.id)) {
      sortedOutlook.push(entry);
    }
  }

  return { sortedMoco, sortedJira, sortedOutlook, entryGroupMap };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByTicketKey(
  entries: UnifiedTimeEntry[],
  source: 'moco' | 'jira'
): Map<string, UnifiedTimeEntry[]> {
  const map = new Map<string, UnifiedTimeEntry[]>();
  for (const entry of entries) {
    const key = getTicketKey(entry, source);
    if (!key) continue;
    const group = map.get(key);
    if (group) {
      group.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }
  return map;
}

function getTicketKey(entry: UnifiedTimeEntry, source: 'moco' | 'jira'): string | null {
  if (source === 'moco') {
    return (entry.metadata as MocoMetadata).remoteTicketKey ?? null;
  }
  if (source === 'jira') {
    return (entry.metadata as JiraMetadata).issueKey ?? null;
  }
  return null;
}

function groupMocoByOutlookId(entries: UnifiedTimeEntry[]): Map<string, UnifiedTimeEntry[]> {
  const map = new Map<string, UnifiedTimeEntry[]>();
  for (const entry of entries) {
    const meta = entry.metadata as MocoMetadata;
    if (meta.remoteService === 'outlook' && meta.remoteId) {
      const group = map.get(meta.remoteId);
      if (group) {
        group.push(entry);
      } else {
        map.set(meta.remoteId, [entry]);
      }
    }
  }
  return map;
}

function groupOutlookById(entries: UnifiedTimeEntry[]): Map<string, UnifiedTimeEntry[]> {
  const map = new Map<string, UnifiedTimeEntry[]>();
  for (const entry of entries) {
    const meta = entry.metadata as OutlookMetadata;
    const group = map.get(meta.eventId);
    if (group) {
      group.push(entry);
    } else {
      map.set(meta.eventId, [entry]);
    }
  }
  return map;
}
