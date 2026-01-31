import type { MocoPresence } from '../types';
import type { DayPresence } from '../types/unified';
import { getMocoClient } from './connections.svelte';
import { connectionsState } from './connections.svelte';
import { logger } from '../utils/logger';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface PresenceCache {
  byDate: Map<string, MocoPresence[]>;
  lastFetched: number;
  from: string;
  to: string;
}

export const presencesState = $state<{
  cache: PresenceCache | null;
  loading: boolean;
  error: string | null;
}>({
  cache: null,
  loading: false,
  error: null
});

/**
 * Fetch presences for a date range with TTL-based caching.
 */
export async function fetchPresences(from: string, to: string): Promise<void> {
  if (!connectionsState.moco.isConnected) return;

  const client = getMocoClient();
  if (!client) return;

  // Check if cache is valid and covers the requested range
  if (presencesState.cache) {
    const cacheAge = Date.now() - presencesState.cache.lastFetched;
    const coversRange = presencesState.cache.from <= from && presencesState.cache.to >= to;

    if (cacheAge < CACHE_TTL && coversRange) {
      return;
    }
  }

  presencesState.loading = true;
  presencesState.error = null;

  try {
    const presences = await client.getPresences(from, to);

    const byDate = new Map<string, MocoPresence[]>();
    for (const presence of presences) {
      const existing = byDate.get(presence.date) ?? [];
      byDate.set(presence.date, [...existing, presence]);
    }

    presencesState.cache = { byDate, lastFetched: Date.now(), from, to };
    logger.store('presences', `Loaded ${presences.length} presences for ${from} to ${to}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch presences';
    presencesState.error = message;
    logger.error('Failed to fetch presences', error);
  } finally {
    presencesState.loading = false;
  }
}

/**
 * Calculate decimal hours from "HH:MM" time strings.
 * If `to` is null (open presence), uses current time.
 */
function calculatePresenceHours(from: string, to: string | null): number {
  const [fromH, fromM] = from.split(':').map(Number);
  const fromMinutes = fromH * 60 + fromM;

  let toMinutes: number;
  if (to) {
    const [toH, toM] = to.split(':').map(Number);
    toMinutes = toH * 60 + toM;
  } else {
    const now = new Date();
    toMinutes = now.getHours() * 60 + now.getMinutes();
  }

  return Math.max(0, (toMinutes - fromMinutes) / 60);
}

/**
 * Get aggregated presence for a specific date.
 * Returns null if no presence exists for that date.
 */
export function getPresenceForDate(date: string): DayPresence | null {
  const presences = presencesState.cache?.byDate.get(date);
  if (!presences || presences.length === 0) return null;

  // Sum hours across all presences for the day
  const totalHours = presences.reduce(
    (sum, p) => sum + calculatePresenceHours(p.from, p.to),
    0
  );

  // Use earliest from and latest to for the display range
  const sortedByFrom = [...presences].sort((a, b) => a.from.localeCompare(b.from));
  const earliestFrom = sortedByFrom[0].from;
  const lastPresence = sortedByFrom[sortedByFrom.length - 1];
  const latestTo = lastPresence.to;

  const anyHomeOffice = presences.some((p) => p.is_home_office);

  return {
    from: earliestFrom,
    to: latestTo,
    hours: totalHours,
    isHomeOffice: anyHomeOffice
  };
}

/**
 * Invalidate the presence cache (e.g. after date range change).
 */
export function invalidatePresenceCache(): void {
  presencesState.cache = null;
  logger.store('presences', 'Cache invalidated');
}
