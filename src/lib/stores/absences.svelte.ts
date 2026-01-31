import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import type { ManualAbsence, AbsenceType } from '../types';

export const absencesState = $state<{ absences: ManualAbsence[] }>({
  absences: []
});

export async function initializeAbsences(): Promise<void> {
  const stored = await getStorageItemAsync<ManualAbsence[]>(STORAGE_KEYS.ABSENCES);
  if (stored) {
    absencesState.absences = stored;
  }
  logger.store('absences', 'Initialized', { count: absencesState.absences.length });
}

function persist(): void {
  saveStorage(STORAGE_KEYS.ABSENCES, absencesState.absences);
}

export function addAbsence(data: {
  type: AbsenceType;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  note?: string;
}): ManualAbsence {
  const absence: ManualAbsence = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  absencesState.absences = [...absencesState.absences, absence];
  persist();
  logger.store('absences', 'Added', { id: absence.id, type: absence.type });
  return absence;
}

export function removeAbsence(id: string): void {
  absencesState.absences = absencesState.absences.filter((a) => a.id !== id);
  persist();
  logger.store('absences', 'Removed', { id });
}

export function getAbsenceForDate(date: string): ManualAbsence | undefined {
  return absencesState.absences.find((a) => date >= a.startDate && date <= a.endDate);
}

export function getAbsencesInRange(from: string, to: string): ManualAbsence[] {
  return absencesState.absences.filter((a) => a.startDate <= to && a.endDate >= from);
}
