import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import type { ManualAbsence, AbsenceType, PersonioAbsence, PersonioAbsenceBalance } from '../types';
import { getPersonioClient } from './connections.svelte';
import { connectionsState } from './connections.svelte';
import { mapTimeOffToAbsence } from '../api/personio-client';

export const absencesState = $state<{
  absences: ManualAbsence[];
  personioAbsences: PersonioAbsence[];
  absenceBalances: PersonioAbsenceBalance[];
  yearVacationDaysTaken: number;
}>({
  absences: [],
  personioAbsences: [],
  absenceBalances: [],
  yearVacationDaysTaken: 0
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

  // Fetch balances alongside absences (only on first call per session)
  if (absencesState.absenceBalances.length === 0) {
    fetchAbsenceBalances();
  }
}

export async function fetchAbsenceBalances(): Promise<void> {
  if (!connectionsState.personio.isConnected) return;

  const client = getPersonioClient();
  if (!client) return;

  try {
    absencesState.absenceBalances = await client.getAbsenceBalance();
    logger.store('absences', 'Loaded Personio absence balances', {
      count: absencesState.absenceBalances.length
    });
  } catch (error) {
    logger.error('Failed to fetch Personio absence balances', error);
  }

  // Fetch full year time-offs to count taken vacation days
  try {
    const year = new Date().getFullYear();
    const yearTimeOffs = await client.getTimeOffs(`${year}-01-01`, `${year}-12-31`);
    const yearAbsences = yearTimeOffs.map(mapTimeOffToAbsence);

    const yearPrefix = String(year);
    const vacationAbsences = yearAbsences.filter(
      (a) => a.type === 'vacation' && a.startDate.startsWith(yearPrefix)
    );
    absencesState.yearVacationDaysTaken = vacationAbsences.reduce((sum, a) => sum + a.daysCount, 0);
    logger.store('absences', 'Counted vacation days taken this year', {
      taken: absencesState.yearVacationDaysTaken
    });
  } catch (error) {
    logger.error('Failed to fetch year time-offs for vacation count', error);
  }
}

/** Returns { entitlement, taken, remaining } for vacation, or undefined if no data. */
export function getVacationSummary():
  | { entitlement: number; taken: number; remaining: number }
  | undefined {
  const balance = absencesState.absenceBalances.find((b) => {
    const n = b.name.toLowerCase();
    return n.includes('urlaub') || n.includes('vacation');
  });
  if (!balance) return undefined;

  const taken = absencesState.yearVacationDaysTaken;
  return {
    entitlement: balance.balance,
    taken,
    remaining: balance.balance - taken
  };
}

export function getAbsenceForDate(date: string): ManualAbsence | PersonioAbsence | undefined {
  // Personio absences take precedence
  const personio = absencesState.personioAbsences.find(
    (a) => date >= a.startDate && date <= a.endDate
  );
  if (personio) return personio;

  return absencesState.absences.find((a) => date >= a.startDate && date <= a.endDate);
}

export function getAbsencesInRange(from: string, to: string): (ManualAbsence | PersonioAbsence)[] {
  const personioMatches = absencesState.personioAbsences.filter(
    (a) => a.startDate <= to && a.endDate >= from
  );
  const manualMatches = absencesState.absences.filter(
    (a) => a.startDate <= to && a.endDate >= from
  );
  return [...personioMatches, ...manualMatches];
}
