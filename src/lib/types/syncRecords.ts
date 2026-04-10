import type { Rule } from './rules';
import type { UnifiedTimeEntry } from './unified';
import type { MocoCreateActivity } from '../services/moco/types';

export interface SyncRecord {
  id: string;
  ruleId: string;
  sourceType: 'jira' | 'outlook';
  sourceId: string;
  sourceKey: string;
  mocoActivityId?: number;
  mocoDate: string;
  hours: number;
  description: string;
  syncedAt: string;
  autoSynced: boolean;
  status: 'success' | 'failed';
  errorReason?: string;
  competingRuleIds?: string[];
}

export interface SyncCandidate {
  rule: Rule;
  sourceEntry: UnifiedTimeEntry;
  mocoPayload: MocoCreateActivity;
  competingRuleIds?: string[];
}

export interface SkippedEntry {
  sourceEntry: UnifiedTimeEntry;
  reason: 'already_synced' | 'zero_hours' | 'moco_remote_exists' | 'not_ended';
  existingSyncRecord?: SyncRecord;
}

export interface SyncError {
  sourceEntry: UnifiedTimeEntry;
  rule: Rule;
  reason: string;
}

export interface SyncPreview {
  pending: SyncCandidate[];
  skipped: SkippedEntry[];
  staleRules: Rule[];
  errors: SyncError[];
}

export interface SyncResult {
  created: SyncRecord[];
  failed: SyncRecord[];
}
