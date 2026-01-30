import type { UnifiedTimeEntry } from './unified';

export type MatchConfidence = 'high' | 'medium';

export type ReconciliationStatus = 'matched' | 'jira-only' | 'moco-only';

export type ReconciliationFilter = 'all' | 'matched' | 'jira-only' | 'moco-only' | 'hours-diff';

export interface ReconciliationMatch {
  id: string;
  issueKey: string | null;
  issueSummary: string | null;
  date: string;
  status: ReconciliationStatus;
  confidence: MatchConfidence | null;
  mocoEntries: UnifiedTimeEntry[];
  jiraEntries: UnifiedTimeEntry[];
  mocoHours: number;
  jiraHours: number;
  hoursDiff: number;
}

export interface ReconciliationSummary {
  totalMatches: number;
  totalMatched: number;
  totalJiraOnly: number;
  totalMocoOnly: number;
  totalMocoHours: number;
  totalJiraHours: number;
  totalHoursDiff: number;
  matchRate: number;
}

export interface ReconciliationResult {
  matches: ReconciliationMatch[];
  summary: ReconciliationSummary;
}
