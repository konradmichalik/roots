import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchResult {
  sortedMoco: UnifiedTimeEntry[];
  sortedJira: UnifiedTimeEntry[];
  entryGroupMap: Map<string, string>; // entryId -> groupId (ticket key)
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
  jiraEntries: UnifiedTimeEntry[]
): MatchResult {
  const mocoByKey = groupByTicketKey(mocoEntries, 'moco');
  const jiraByKey = groupByTicketKey(jiraEntries, 'jira');

  // Find keys present in both
  const matchedKeys = [...mocoByKey.keys()].filter((k) => jiraByKey.has(k));
  matchedKeys.sort();

  const entryGroupMap = new Map<string, string>();
  const sortedMoco: UnifiedTimeEntry[] = [];
  const sortedJira: UnifiedTimeEntry[] = [];
  const usedMocoIds = new Set<string>();
  const usedJiraIds = new Set<string>();

  for (const key of matchedKeys) {
    const mocoGroup = mocoByKey.get(key)!;
    const jiraGroup = jiraByKey.get(key)!;

    // Sort within each group by hours descending for stable pairing
    mocoGroup.sort((a, b) => b.hours - a.hours);
    jiraGroup.sort((a, b) => b.hours - a.hours);

    for (const entry of mocoGroup) {
      sortedMoco.push(entry);
      entryGroupMap.set(entry.id, key);
      usedMocoIds.add(entry.id);
    }
    for (const entry of jiraGroup) {
      sortedJira.push(entry);
      entryGroupMap.set(entry.id, key);
      usedJiraIds.add(entry.id);
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

  return { sortedMoco, sortedJira, entryGroupMap };
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
