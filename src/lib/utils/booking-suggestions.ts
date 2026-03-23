import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata } from '../types';
import { addDays, getMonthStart } from './date-helpers';

export interface BookingSuggestion {
  projectId: number;
  taskId: number;
  projectName: string;
  taskName: string;
  customerName: string;
  matchSource: 'jira' | 'outlook';
  matchedEntryDate: string;
}

interface MonthCacheEntry {
  mocoEntries: UnifiedTimeEntry[];
  lastFetched: number;
}

/**
 * Find a booking suggestion by scanning recent Moco entries (7 days back).
 * - Jira: matches by project key prefix against remoteTicketKey
 * - Outlook: matches by title substring (min 4 chars)
 * Returns the most recent match, or null.
 */
export function findBookingSuggestion(
  entry: UnifiedTimeEntry,
  cache: Record<string, MonthCacheEntry>
): BookingSuggestion | null {
  if (entry.source !== 'jira' && entry.source !== 'outlook') return null;

  const lookbackStart = addDays(entry.date, -7);
  const mocoEntries = collectMocoEntries(cache, lookbackStart, entry.date);

  if (mocoEntries.length === 0) return null;

  const matcher =
    entry.source === 'jira'
      ? buildJiraMatcher(entry)
      : buildOutlookMatcher(entry);

  if (!matcher) return null;

  // Sort by date descending to find most recent match first
  const sorted = [...mocoEntries].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  for (const moco of sorted) {
    if (matcher(moco)) {
      const meta = moco.metadata as MocoMetadata;
      return {
        projectId: meta.projectId,
        taskId: meta.taskId,
        projectName: meta.projectName,
        taskName: meta.taskName,
        customerName: meta.customerName,
        matchSource: entry.source as 'jira' | 'outlook',
        matchedEntryDate: moco.date
      };
    }
  }

  return null;
}

function collectMocoEntries(
  cache: Record<string, MonthCacheEntry>,
  from: string,
  to: string
): UnifiedTimeEntry[] {
  const monthKeys = new Set<string>();
  monthKeys.add(getMonthStart(from));
  monthKeys.add(getMonthStart(to));

  const entries: UnifiedTimeEntry[] = [];
  for (const key of monthKeys) {
    const cached = cache[key];
    if (!cached) continue;
    for (const e of cached.mocoEntries) {
      if (e.date >= from && e.date <= to) {
        entries.push(e);
      }
    }
  }
  return entries;
}

function buildJiraMatcher(
  entry: UnifiedTimeEntry
): ((moco: UnifiedTimeEntry) => boolean) | null {
  const jiraMeta = entry.metadata as JiraMetadata;
  const projectKey = jiraMeta.projectKey ?? jiraMeta.issueKey?.split('-')[0];
  if (!projectKey) return null;

  const prefix = projectKey.toUpperCase() + '-';

  return (moco) => {
    const meta = moco.metadata as MocoMetadata;
    const ticket = meta.remoteTicketKey?.toUpperCase();
    return !!ticket && ticket.startsWith(prefix);
  };
}

function buildOutlookMatcher(
  entry: UnifiedTimeEntry
): ((moco: UnifiedTimeEntry) => boolean) | null {
  const title = entry.title?.trim().toLowerCase();
  if (!title || title.length < 4) return null;

  return (moco) => {
    const mocoTitle = moco.title?.toLowerCase() ?? '';
    const mocoDesc = moco.description?.toLowerCase() ?? '';
    return mocoTitle.includes(title) || mocoDesc.includes(title);
  };
}
