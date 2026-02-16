import { findMatchingFavorite } from '../stores/favorites.svelte';
import { getEntriesForDate } from '../stores/timeEntries.svelte';
import type { Favorite } from '../types';
import type { MocoMetadata, OutlookMetadata } from '../types/unified';

export interface MatchableEvent {
  eventTitle: string;
  eventId: string;
  hours: number;
  favorite: Favorite;
  booked: boolean;
}

/**
 * Find Outlook events for a given date that match an event favorite.
 * Each event is marked as `booked` if a corresponding Moco entry already exists.
 */
export function getMatchableEvents(date: string): MatchableEvent[] {
  const entries = getEntriesForDate(date);

  const bookedEventIds = new Set<string>();
  const bookedDescriptions = new Set<string>();

  for (const mocoEntry of entries.moco) {
    const meta = mocoEntry.metadata as MocoMetadata;
    if (meta.remoteService === 'outlook' && meta.remoteId) {
      bookedEventIds.add(meta.remoteId);
    }
    if (mocoEntry.description?.trim()) {
      bookedDescriptions.add(mocoEntry.description.trim());
    }
  }

  const matches: MatchableEvent[] = [];
  for (const event of entries.outlook) {
    const favorite = findMatchingFavorite(event.title);
    if (!favorite) continue;

    const outlookMeta = event.metadata as OutlookMetadata;
    const booked =
      bookedEventIds.has(outlookMeta.eventId) || bookedDescriptions.has(event.title.trim());

    matches.push({
      eventTitle: event.title,
      eventId: outlookMeta.eventId,
      hours: event.hours || favorite.defaultHours || 0.25,
      favorite,
      booked
    });
  }

  return matches;
}

/**
 * Check whether there are any un-booked matchable events for a date.
 */
export function hasUnbookedMatchableEvents(date: string): boolean {
  return getMatchableEvents(date).some((e) => !e.booked);
}
