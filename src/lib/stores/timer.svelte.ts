import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import { today } from '../utils/date-helpers';
import { secondsToHours } from '../utils/time-format';
import type { TimerState, TimerMocoBooking, DraftEntry } from '../types';

// ============ Initial State ============

const initialTimerState: TimerState = {
  status: 'idle',
  startedAt: null,
  pausedAt: null,
  accumulatedSeconds: 0,
  mocoBooking: null,
  note: ''
};

// ============ Reactive State ============

export const timerState = $state<TimerState>({ ...initialTimerState });

export const draftsState = $state<{ drafts: DraftEntry[] }>({
  drafts: []
});

// State for pending Moco modal (survives component unmount)
export const pendingMocoModal = $state<{
  show: boolean;
  prefill: { date: string; hours: number; description?: string } | null;
}>({
  show: false,
  prefill: null
});

export function openPendingMocoModal(prefill: { date: string; hours: number; description?: string }): void {
  pendingMocoModal.prefill = prefill;
  pendingMocoModal.show = true;
}

export function closePendingMocoModal(): void {
  pendingMocoModal.show = false;
  pendingMocoModal.prefill = null;
}

// ============ Initialization ============

export async function initializeTimer(): Promise<void> {
  // Restore timer state
  const storedTimer = await getStorageItemAsync<TimerState>(STORAGE_KEYS.TIMER);
  if (storedTimer) {
    Object.assign(timerState, storedTimer);
    logger.store('timer', 'Restored timer state', { status: timerState.status });
  }

  // Restore drafts
  const storedDrafts = await getStorageItemAsync<DraftEntry[]>(STORAGE_KEYS.DRAFTS);
  if (storedDrafts) {
    draftsState.drafts = storedDrafts;
  }

  logger.store('timer', 'Initialized', {
    status: timerState.status,
    draftsCount: draftsState.drafts.length
  });
}

// ============ Persistence ============

function persistTimer(): void {
  saveStorage(STORAGE_KEYS.TIMER, { ...timerState });
}

function persistDrafts(): void {
  saveStorage(STORAGE_KEYS.DRAFTS, draftsState.drafts);
}

// ============ Timer Controls ============

/**
 * Start the timer with optional pre-configured Moco booking
 */
export function startTimer(booking?: TimerMocoBooking): void {
  timerState.status = 'running';
  timerState.startedAt = new Date().toISOString();
  timerState.pausedAt = null;
  timerState.accumulatedSeconds = 0;
  timerState.mocoBooking = booking ?? null;
  timerState.note = booking?.description ?? '';

  persistTimer();
  logger.store('timer', 'Started', {
    hasBooking: !!booking,
    project: booking?.projectName
  });
}

/**
 * Pause the running timer
 */
export function pauseTimer(): void {
  if (timerState.status !== 'running') return;

  // Calculate and accumulate elapsed time
  const elapsed = calculateElapsedSinceStart();
  timerState.accumulatedSeconds += elapsed;
  timerState.status = 'paused';
  timerState.pausedAt = new Date().toISOString();
  timerState.startedAt = null;

  persistTimer();
  logger.store('timer', 'Paused', { accumulated: timerState.accumulatedSeconds });
}

/**
 * Resume the paused timer
 */
export function resumeTimer(): void {
  if (timerState.status !== 'paused') return;

  timerState.status = 'running';
  timerState.startedAt = new Date().toISOString();
  timerState.pausedAt = null;

  persistTimer();
  logger.store('timer', 'Resumed');
}

/**
 * Stop the timer and return elapsed seconds
 */
export function stopTimer(): number {
  const totalSeconds = getElapsedSeconds();

  // Reset timer state
  timerState.status = 'idle';
  timerState.startedAt = null;
  timerState.pausedAt = null;
  timerState.accumulatedSeconds = 0;

  persistTimer();
  logger.store('timer', 'Stopped', { totalSeconds });

  return totalSeconds;
}

/**
 * Reset timer without returning elapsed time
 */
export function resetTimer(): void {
  Object.assign(timerState, { ...initialTimerState });
  persistTimer();
  logger.store('timer', 'Reset');
}

/**
 * Update the timer note
 */
export function setTimerNote(note: string): void {
  timerState.note = note;
  persistTimer();
}

/**
 * Clear the pre-configured booking
 */
export function clearTimerBooking(): void {
  timerState.mocoBooking = null;
  persistTimer();
}

// ============ Time Calculations ============

/**
 * Calculate seconds elapsed since startedAt
 */
function calculateElapsedSinceStart(): number {
  if (!timerState.startedAt) return 0;
  const start = new Date(timerState.startedAt).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

/**
 * Get total elapsed seconds (accumulated + current run)
 */
export function getElapsedSeconds(): number {
  if (timerState.status === 'idle') {
    return 0;
  }

  if (timerState.status === 'paused') {
    return timerState.accumulatedSeconds;
  }

  // Running: accumulated + time since start
  return timerState.accumulatedSeconds + calculateElapsedSinceStart();
}

/**
 * Format elapsed seconds as HH:MM:SS
 */
export function formatElapsedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============ Draft Management ============

/**
 * Add a new draft entry
 */
export function addDraft(data: {
  hours: number;
  note: string;
  mocoBooking: TimerMocoBooking | null;
  date?: string;
}): DraftEntry {
  const draft: DraftEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    date: data.date ?? today(),
    hours: data.hours,
    note: data.note,
    mocoBooking: data.mocoBooking
  };

  draftsState.drafts = [...draftsState.drafts, draft];
  persistDrafts();
  logger.store('timer', 'Draft added', { id: draft.id, hours: draft.hours });

  return draft;
}

/**
 * Create draft from current timer state
 */
export function createDraftFromTimer(): DraftEntry | null {
  const seconds = stopTimer();
  if (seconds < 60) {
    // Don't create draft for less than 1 minute
    logger.store('timer', 'Skipped draft (too short)', { seconds });
    return null;
  }

  const hours = secondsToHours(seconds);
  return addDraft({
    hours,
    note: timerState.note,
    mocoBooking: timerState.mocoBooking
  });
}

/**
 * Update an existing draft
 */
export function updateDraft(
  id: string,
  updates: Partial<Omit<DraftEntry, 'id' | 'createdAt'>>
): void {
  draftsState.drafts = draftsState.drafts.map((d) => (d.id === id ? { ...d, ...updates } : d));
  persistDrafts();
  logger.store('timer', 'Draft updated', { id });
}

/**
 * Remove a draft entry
 */
export function removeDraft(id: string): void {
  draftsState.drafts = draftsState.drafts.filter((d) => d.id !== id);
  persistDrafts();
  logger.store('timer', 'Draft removed', { id });
}

/**
 * Get all drafts sorted by date (newest first)
 */
export function getSortedDrafts(): DraftEntry[] {
  return [...draftsState.drafts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get drafts for a specific date
 */
export function getDraftsForDate(date: string): DraftEntry[] {
  return draftsState.drafts.filter((d) => d.date === date);
}

/**
 * Get total draft count
 */
export function getDraftsCount(): number {
  return draftsState.drafts.length;
}

/**
 * Clear all drafts
 */
export function clearAllDrafts(): void {
  draftsState.drafts = [];
  persistDrafts();
  logger.store('timer', 'All drafts cleared');
}
