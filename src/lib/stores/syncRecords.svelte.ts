import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import { isDemoMode } from '../utils/demo-data';
import type { SyncRecord } from '../types';

export const syncRecordsState = $state<{ records: SyncRecord[] }>({
  records: []
});

export async function initializeSyncRecords(): Promise<void> {
  const stored = await getStorageItemAsync<SyncRecord[]>(STORAGE_KEYS.SYNC_RECORDS);
  if (stored) {
    syncRecordsState.records = stored;
  }

  // Prune records older than 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  pruneOldRecords(sixMonthsAgo.toISOString());

  logger.store('syncRecords', 'Initialized', { count: syncRecordsState.records.length });
}

function persist(): void {
  if (isDemoMode()) return;
  saveStorage(STORAGE_KEYS.SYNC_RECORDS, syncRecordsState.records);
}

// ---------------------------------------------------------------------------
// Dedup
// ---------------------------------------------------------------------------

export function isSynced(sourceType: string, sourceId: string): boolean {
  return syncRecordsState.records.some(
    (r) => r.sourceType === sourceType && r.sourceId === sourceId && r.status === 'success'
  );
}

export function getSyncRecord(sourceType: string, sourceId: string): SyncRecord | undefined {
  return syncRecordsState.records.find(
    (r) => r.sourceType === sourceType && r.sourceId === sourceId && r.status === 'success'
  );
}

export function getSyncRecordByActivityId(mocoActivityId: number): SyncRecord | undefined {
  return syncRecordsState.records.find(
    (r) => r.mocoActivityId === mocoActivityId && r.status === 'success'
  );
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function addSyncRecord(data: Omit<SyncRecord, 'id' | 'syncedAt'>): SyncRecord {
  const record: SyncRecord = {
    ...data,
    id: crypto.randomUUID(),
    syncedAt: new Date().toISOString()
  };

  syncRecordsState.records = [...syncRecordsState.records, record];
  persist();
  logger.store('syncRecords', 'Added', {
    id: record.id,
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    status: record.status
  });
  return record;
}

export function removeSyncRecord(id: string): void {
  syncRecordsState.records = syncRecordsState.records.filter((r) => r.id !== id);
  persist();
  logger.store('syncRecords', 'Removed', { id });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getSyncRecordsForDate(date: string): SyncRecord[] {
  return syncRecordsState.records.filter((r) => r.mocoDate === date);
}

export function getSyncRecordsForRule(ruleId: string): SyncRecord[] {
  return syncRecordsState.records.filter((r) => r.ruleId === ruleId);
}

export function getLastSyncForRule(ruleId: string): { date: string; count: number } | null {
  const ruleRecords = syncRecordsState.records
    .filter((r) => r.ruleId === ruleId && r.status === 'success')
    .sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));

  if (ruleRecords.length === 0) return null;

  const lastDate = ruleRecords[0].mocoDate;
  const countOnDate = ruleRecords.filter((r) => r.mocoDate === lastDate).length;

  return { date: lastDate, count: countOnDate };
}

export function getSyncCountForRule(ruleId: string): number {
  return syncRecordsState.records.filter((r) => r.ruleId === ruleId && r.status === 'success')
    .length;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface RuleAnalytics {
  ruleId: string;
  totalSynced: number;
  totalFailed: number;
  totalHours: number;
  byMonth: Array<{ month: string; count: number; hours: number }>;
  lastSyncDate: string | null;
}

export function getRuleAnalytics(ruleId: string): RuleAnalytics {
  const ruleRecords = syncRecordsState.records.filter((r) => r.ruleId === ruleId);
  const successRecords = ruleRecords.filter((r) => r.status === 'success');
  const failedRecords = ruleRecords.filter((r) => r.status === 'failed');

  // Group by month (YYYY-MM)
  const monthMap = new Map<string, { count: number; hours: number }>();
  for (const r of successRecords) {
    const month = r.mocoDate.slice(0, 7); // YYYY-MM
    const existing = monthMap.get(month) ?? { count: 0, hours: 0 };
    monthMap.set(month, { count: existing.count + 1, hours: existing.hours + r.hours });
  }

  const byMonth = [...monthMap.entries()]
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const sorted = successRecords.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));

  return {
    ruleId,
    totalSynced: successRecords.length,
    totalFailed: failedRecords.length,
    totalHours: successRecords.reduce((sum, r) => sum + r.hours, 0),
    byMonth,
    lastSyncDate: sorted.length > 0 ? sorted[0].mocoDate : null
  };
}

export function getAllAnalytics(): Map<string, RuleAnalytics> {
  const ruleIds = new Set(syncRecordsState.records.map((r) => r.ruleId));
  const result = new Map<string, RuleAnalytics>();
  for (const ruleId of ruleIds) {
    result.set(ruleId, getRuleAnalytics(ruleId));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export function pruneOldRecords(olderThan: string): void {
  const before = syncRecordsState.records.length;
  syncRecordsState.records = syncRecordsState.records.filter((r) => r.syncedAt >= olderThan);
  const pruned = before - syncRecordsState.records.length;
  if (pruned > 0) {
    persist();
    logger.store('syncRecords', 'Pruned old records', { pruned });
  }
}
