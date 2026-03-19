import { favoritesState, removeFavorite } from './favorites.svelte';
import { addRule, rulesState } from './rules.svelte';
import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import type { OutlookSourceMatcher } from '../types';
import { DEFAULT_OUTLOOK_TEMPLATE } from '../utils/description-template';

/**
 * Migrates event-favorites (favorites with eventMatch) to Outlook rules.
 * Idempotent: checks a migration flag to prevent re-running.
 */
export async function migrateEventFavoritesToRules(): Promise<void> {
  const migrated = await getStorageItemAsync<boolean>(STORAGE_KEYS.RULES_MIGRATED);
  if (migrated) return;

  const eventFavorites = favoritesState.favorites.filter((f) => f.eventMatch);

  if (eventFavorites.length === 0) {
    saveStorage(STORAGE_KEYS.RULES_MIGRATED, true);
    logger.store('rulesMigration', 'No event-favorites to migrate');
    return;
  }

  logger.store('rulesMigration', 'Starting migration', { count: eventFavorites.length });

  for (const favorite of eventFavorites) {
    if (!favorite.eventMatch) continue;

    const source: OutlookSourceMatcher = {
      type: 'outlook',
      eventPattern: favorite.eventMatch.pattern,
      matchType: favorite.eventMatch.matchType,
      overrideHours:
        favorite.defaultHours && favorite.defaultHours > 0 ? favorite.defaultHours : undefined
    };

    addRule({
      name: favorite.name,
      enabled: true,
      autoSync: false,
      source,
      target: {
        mocoProjectId: favorite.projectId,
        mocoTaskId: favorite.taskId,
        mocoProjectName: favorite.projectName,
        mocoTaskName: favorite.taskName,
        customerName: favorite.customerName
      },
      descriptionTemplate: favorite.description || DEFAULT_OUTLOOK_TEMPLATE
    });

    removeFavorite(favorite.id);

    logger.store('rulesMigration', 'Migrated event-favorite to rule', {
      name: favorite.name,
      pattern: favorite.eventMatch.pattern
    });
  }

  saveStorage(STORAGE_KEYS.RULES_MIGRATED, true);
  logger.store('rulesMigration', 'Migration complete', {
    migrated: eventFavorites.length,
    rulesTotal: rulesState.rules.length
  });
}
