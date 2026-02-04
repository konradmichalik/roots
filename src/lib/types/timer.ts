/**
 * Timer status
 */
export type TimerStatus = 'idle' | 'running' | 'paused';

/**
 * Pre-configured Moco booking for the timer
 */
export interface TimerMocoBooking {
  projectId: number;
  taskId: number;
  projectName: string;
  taskName: string;
  customerName: string;
  description?: string;
}

/**
 * Active timer state
 */
export interface TimerState {
  status: TimerStatus;
  startedAt: string | null; // ISO timestamp
  pausedAt: string | null; // ISO timestamp when paused
  accumulatedSeconds: number; // Time accumulated before current run
  mocoBooking: TimerMocoBooking | null; // Pre-configured booking
  note: string; // Working note/description
}

/**
 * Draft entry (unsaved timer result)
 */
export interface DraftEntry {
  id: string;
  createdAt: string; // ISO timestamp
  date: string; // YYYY-MM-DD
  hours: number; // Decimal hours
  note: string;
  mocoBooking: TimerMocoBooking | null;
}
