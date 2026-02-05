import type { MocoPresence, MocoCreatePresence, MocoUpdatePresence } from '../types';
import type { DayPresence } from '../types/unified';
import { getMocoClient } from './connections.svelte';
import { connectionsState } from './connections.svelte';
import { logger } from '../utils/logger';
import { toast } from './toast.svelte';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface PresenceCache {
  byDate: Record<string, MocoPresence[]>;
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

    const byDate: Record<string, MocoPresence[]> = {};
    for (const presence of presences) {
      const existing = byDate[presence.date] ?? [];
      byDate[presence.date] = [...existing, presence];
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
 * Subtracts break time if provided.
 */
function calculatePresenceHours(from: string, to: string | null, breakMinutes?: number): number {
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

  const breakHours = (breakMinutes ?? 0) / 60;
  return Math.max(0, (toMinutes - fromMinutes) / 60 - breakHours);
}

/**
 * Get aggregated presence for a specific date.
 * Returns null if no presence exists for that date.
 */
export function getPresenceForDate(date: string): DayPresence | null {
  const presences = presencesState.cache?.byDate[date];
  if (!presences || presences.length === 0) return null;

  // Sum hours across all presences for the day (including break deductions)
  const totalHours = presences.reduce(
    (sum, p) => sum + calculatePresenceHours(p.from, p.to, p.break),
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
 * Get raw presences (individual time slots) for a specific date.
 * Useful for showing detailed breakdown including gaps/breaks.
 */
export function getRawPresencesForDate(date: string): MocoPresence[] {
  const presences = presencesState.cache?.byDate[date];
  if (!presences || presences.length === 0) return [];

  // Sort by start time
  return [...presences].sort((a, b) => a.from.localeCompare(b.from));
}

/**
 * Invalidate the presence cache (e.g. after date range change).
 */
export function invalidatePresenceCache(): void {
  presencesState.cache = null;
  logger.store('presences', 'Cache invalidated');
}

/**
 * Create a new presence entry
 */
export async function createPresence(data: MocoCreatePresence): Promise<boolean> {
  if (!connectionsState.moco.isConnected) return false;

  const client = getMocoClient();
  if (!client) return false;

  try {
    const newPresence = await client.createPresence(data);
    logger.store('presences', `Created presence for ${data.date}`);

    // Update cache with new presence (create new reference for reactivity)
    if (presencesState.cache) {
      const existing = presencesState.cache.byDate[data.date] ?? [];
      presencesState.cache = {
        ...presencesState.cache,
        byDate: {
          ...presencesState.cache.byDate,
          [data.date]: [...existing, newPresence]
        }
      };
    }

    toast.success('Presence created');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create presence';
    logger.error('Failed to create presence', error);
    toast.error(message);
    return false;
  }
}

/**
 * Update an existing presence entry
 */
export async function updatePresence(
  id: number,
  date: string,
  data: MocoUpdatePresence
): Promise<boolean> {
  if (!connectionsState.moco.isConnected) return false;

  const client = getMocoClient();
  if (!client) return false;

  try {
    const updatedPresence = await client.updatePresence(id, data);
    logger.store('presences', `Updated presence ${id}`);

    // Update cache (create new reference for reactivity)
    if (presencesState.cache) {
      const existing = presencesState.cache.byDate[date] ?? [];
      const updated = existing.map((p) => (p.id === id ? updatedPresence : p));
      presencesState.cache = {
        ...presencesState.cache,
        byDate: {
          ...presencesState.cache.byDate,
          [date]: updated
        }
      };
    }

    toast.success('Presence updated');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update presence';
    logger.error('Failed to update presence', error);
    toast.error(message);
    return false;
  }
}

/**
 * Delete a presence entry
 */
export async function deletePresence(id: number, date: string): Promise<boolean> {
  if (!connectionsState.moco.isConnected) return false;

  const client = getMocoClient();
  if (!client) return false;

  try {
    await client.deletePresence(id);
    logger.store('presences', `Deleted presence ${id}`);

    // Update cache (create new reference for reactivity)
    if (presencesState.cache) {
      const existing = presencesState.cache.byDate[date] ?? [];
      const filtered = existing.filter((p) => p.id !== id);
      const { [date]: _, ...restByDate } = presencesState.cache.byDate;
      presencesState.cache = {
        ...presencesState.cache,
        byDate: filtered.length === 0 ? restByDate : { ...restByDate, [date]: filtered }
      };
    }

    toast.success('Presence deleted');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete presence';
    logger.error('Failed to delete presence', error);
    toast.error(message);
    return false;
  }
}
