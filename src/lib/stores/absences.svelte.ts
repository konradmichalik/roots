import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import type { ManualAbsence, AbsenceType, PersonioAbsence } from '../types';
import { getPersonioClient } from './connections.svelte';
import { connectionsState } from './connections.svelte';
import { mapTimeOffToAbsence } from '../api/personio-client';

export const absencesState = $state<{
  absences: ManualAbsence[];
  personioAbsences: PersonioAbsence[];
}>({
  absences: [],
  personioAbsences: []
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

export function updateAbsence(
  id: string,
  data: {
    type: AbsenceType;
    startDate: string;
    endDate: string;
    halfDay: boolean;
    note?: string;
  }
): void {
  absencesState.absences = absencesState.absences.map((a) => (a.id === id ? { ...a, ...data } : a));
  persist();
  logger.store('absences', 'Updated', { id, type: data.type });
}

export function removeAbsence(id: string): void {
  absencesState.absences = absencesState.absences.filter((a) => a.id !== id);
  persist();
  logger.store('absences', 'Removed', { id });
}

export async function fetchPersonioAbsences(from: string, to: string): Promise<void> {
  if (!connectionsState.personio.isConnected) return;

  const client = getPersonioClient();
  if (!client) return;

  try {
    const timeOffs = await client.getTimeOffs(from, to);
    absencesState.personioAbsences = timeOffs.map(mapTimeOffToAbsence);
    logger.store('absences', 'Loaded Personio absences', {
      count: absencesState.personioAbsences.length
    });
  } catch (error) {
    logger.error('Failed to fetch Personio absences', error);
  }
}

export function getAbsenceForDate(
  date: string
): ManualAbsence | PersonioAbsence | undefined {
  // Personio absences take precedence
  const personio = absencesState.personioAbsences.find(
    (a) => date >= a.startDate && date <= a.endDate
  );
  if (personio) return personio;

  return absencesState.absences.find((a) => date >= a.startDate && date <= a.endDate);
}

export function getAbsencesInRange(
  from: string,
  to: string
): (ManualAbsence | PersonioAbsence)[] {
  const personioMatches = absencesState.personioAbsences.filter(
    (a) => a.startDate <= to && a.endDate >= from
  );
  const manualMatches = absencesState.absences.filter(
    (a) => a.startDate <= to && a.endDate >= from
  );
  return [...personioMatches, ...manualMatches];
}
