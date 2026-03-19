import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import { isDemoMode } from '../utils/demo-data';
import type { Favorite } from '../types';

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
  if (isDemoMode()) return;
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

/**
 * @deprecated Event-favorites have been replaced by Rules.
 * Kept for backward compatibility — always returns undefined after migration.
 */
export function findMatchingFavorite(_eventTitle: string): Favorite | undefined {
  return undefined;
}

export function reorderFavorites(orderedIds: string[]): void {
  const maxNewOrder = orderedIds.length;
  favoritesState.favorites = favoritesState.favorites.map((f) => {
    const newOrder = orderedIds.indexOf(f.id);
    if (newOrder !== -1) {
      return { ...f, sortOrder: newOrder };
    }
    return { ...f, sortOrder: f.sortOrder + maxNewOrder };
  });
  persist();
  logger.store('favorites', 'Reordered', { count: orderedIds.length });
}
