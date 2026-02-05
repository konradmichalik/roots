import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import type { Favorite, FavoriteEventMatch } from '../types';

export const favoritesState = $state<{ favorites: Favorite[] }>({
  favorites: []
});

export async function initializeFavorites(): Promise<void> {
  const stored = await getStorageItemAsync<Favorite[]>(STORAGE_KEYS.FAVORITES);
  if (stored) {
    favoritesState.favorites = stored;
  }
  logger.store('favorites', 'Initialized', { count: favoritesState.favorites.length });
}

function persist(): void {
  saveStorage(STORAGE_KEYS.FAVORITES, favoritesState.favorites);
}

export function addFavorite(data: {
  name: string;
  projectId: number;
  taskId: number;
  projectName: string;
  taskName: string;
  customerName: string;
  defaultHours?: number;
  description?: string;
  eventMatch?: FavoriteEventMatch;
}): Favorite {
  const maxOrder = favoritesState.favorites.reduce((max, f) => Math.max(max, f.sortOrder), -1);

  const favorite: Favorite = {
    ...data,
    id: crypto.randomUUID(),
    sortOrder: maxOrder + 1,
    createdAt: new Date().toISOString()
  };

  favoritesState.favorites = [...favoritesState.favorites, favorite];
  persist();
  logger.store('favorites', 'Added', { id: favorite.id, name: favorite.name });
  return favorite;
}

export function updateFavorite(
  id: string,
  updates: Partial<Omit<Favorite, 'id' | 'createdAt'>>
): void {
  favoritesState.favorites = favoritesState.favorites.map((f) =>
    f.id === id ? { ...f, ...updates } : f
  );
  persist();
  logger.store('favorites', 'Updated', { id });
}

export function removeFavorite(id: string): void {
  favoritesState.favorites = favoritesState.favorites.filter((f) => f.id !== id);
  persist();
  logger.store('favorites', 'Removed', { id });
}

export function getSortedFavorites(): Favorite[] {
  return [...favoritesState.favorites].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getRegularFavorites(): Favorite[] {
  return getSortedFavorites().filter((f) => !f.eventMatch);
}

export function getEventFavorites(): Favorite[] {
  return getSortedFavorites().filter((f) => f.eventMatch);
}

export function reorderFavorites(orderedIds: string[]): void {
  const maxNewOrder = orderedIds.length;
  favoritesState.favorites = favoritesState.favorites.map((f) => {
    const newOrder = orderedIds.indexOf(f.id);
    if (newOrder !== -1) {
      return { ...f, sortOrder: newOrder };
    }
    // Offset non-included items to avoid sortOrder conflicts
    return { ...f, sortOrder: f.sortOrder + maxNewOrder };
  });
  persist();
  logger.store('favorites', 'Reordered', { count: orderedIds.length });
}

export function findMatchingFavorite(eventTitle: string): Favorite | undefined {
  const title = eventTitle.toLowerCase();

  return favoritesState.favorites.find((f) => {
    if (!f.eventMatch) return false;
    const pattern = f.eventMatch.pattern.toLowerCase();

    switch (f.eventMatch.matchType) {
      case 'exact':
        return title === pattern;
      case 'startsWith':
        return title.startsWith(pattern);
      case 'contains':
        return title.includes(pattern);
      default:
        return false;
    }
  });
}
