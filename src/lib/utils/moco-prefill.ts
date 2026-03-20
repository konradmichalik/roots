import type { UnifiedTimeEntry, JiraMetadata } from '../types';
import { findMatchingFavorite } from '../stores/favorites.svelte';

export interface MocoPrefill {
  date?: string;
  hours?: number;
  description?: string;
  projectId?: number;
  taskId?: number;
  remoteService?: string;
  remoteId?: string;
}

/**
 * Build prefill data for the Moco create modal from a Jira or Outlook entry.
 * Applies favorite matching for Outlook and Jira issue key formatting.
 */
export function buildMocoPrefill(entry: UnifiedTimeEntry): MocoPrefill {
  const jiraMeta = entry.metadata.source === 'jira' ? (entry.metadata as JiraMetadata) : null;
  const matchedFavorite =
    entry.source === 'outlook' ? findMatchingFavorite(entry.title) : undefined;

  return {
    date: entry.date,
    hours: matchedFavorite?.defaultHours ?? entry.hours,
    description:
      matchedFavorite?.description ??
      (jiraMeta
        ? `#${jiraMeta.issueKey} ${entry.description ?? jiraMeta.issueSummary}`
        : entry.title),
    projectId: matchedFavorite?.projectId,
    taskId: matchedFavorite?.taskId,
    remoteService: jiraMeta ? 'jira' : undefined,
    remoteId: jiraMeta?.issueKey
  };
}
