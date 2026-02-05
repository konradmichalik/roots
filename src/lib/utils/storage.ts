import { logger } from './logger';

const STORAGE_PREFIX = 'roots:';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

let tauriStorePromise: Promise<import('@tauri-apps/plugin-store').Store> | null = null;

async function getTauriStore(): Promise<import('@tauri-apps/plugin-store').Store> {
  if (!tauriStorePromise) {
    tauriStorePromise = (async () => {
      const { load } = await import('@tauri-apps/plugin-store');
      return load('settings.json', { defaults: {} });
    })();
  }
  return tauriStorePromise;
}

export const STORAGE_KEYS = {
  CONNECTIONS: 'connections',
  THEME: 'theme',
  DATE_NAV_VIEW: 'date-nav-view',
  SETTINGS: 'settings',
  MOCO_CONFIG: 'moco-config',
  JIRA_CONFIG: 'jira-config',
  OUTLOOK_CONFIG: 'outlook-config',
  OUTLOOK_TOKENS: 'outlook-tokens',
  ABSENCES: 'absences',
  FAVORITES: 'favorites',
  AUTO_REFRESH: 'auto-refresh',
  TIMER: 'timer',
  DRAFTS: 'drafts',
  MONTH_CACHE: 'month-cache',
  RECENT_PAIRS: 'recent-pairs'
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export async function getStorageItemAsync<T>(key: StorageKey): Promise<T | null> {
  const fullKey = `${STORAGE_PREFIX}${key}`;

  try {
    if (isTauri()) {
      const store = await getTauriStore();
      const value = await store.get<T>(fullKey);
      if (value !== undefined && value !== null) {
        logger.debug(`Storage (Tauri): loaded "${key}"`);
        return value;
      }

      const localValue = getStorageItem<T>(key);
      if (localValue !== null) {
        await store.set(fullKey, localValue);
        await store.save();
        logger.info(`Storage (Tauri): migrated "${key}" from localStorage`);
        return localValue;
      }

      return null;
    }

    return getStorageItem<T>(key);
  } catch (error) {
    logger.error(`Storage: failed to load "${key}"`, error);
    return null;
  }
}

export async function setStorageItemAsync<T>(key: StorageKey, value: T): Promise<boolean> {
  const fullKey = `${STORAGE_PREFIX}${key}`;

  try {
    if (isTauri()) {
      const store = await getTauriStore();
      await store.set(fullKey, value);
      await store.save();
      logger.debug(`Storage (Tauri): saved "${key}"`);
      return true;
    }

    return setStorageItem(key, value);
  } catch (error) {
    logger.error(`Storage: failed to save "${key}"`, error);
    return false;
  }
}

export async function removeStorageItemAsync(key: StorageKey): Promise<boolean> {
  const fullKey = `${STORAGE_PREFIX}${key}`;

  try {
    if (isTauri()) {
      const store = await getTauriStore();
      await store.delete(fullKey);
      await store.save();
      logger.debug(`Storage (Tauri): removed "${key}"`);
      return true;
    }

    return removeStorageItem(key);
  } catch (error) {
    logger.error(`Storage: failed to remove "${key}"`, error);
    return false;
  }
}

export function saveStorage<T>(key: StorageKey, value: T): void {
  void setStorageItemAsync(key, value);
}

export function removeStorage(key: StorageKey): void {
  void removeStorageItemAsync(key);
}

export function getStorageItem<T>(key: StorageKey): T | null {
  try {
    const fullKey = `${STORAGE_PREFIX}${key}`;
    const item = localStorage.getItem(fullKey);
    if (item === null) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    logger.error(`Storage: failed to load "${key}"`, error);
    return null;
  }
}

export function setStorageItem<T>(key: StorageKey, value: T): boolean {
  try {
    const fullKey = `${STORAGE_PREFIX}${key}`;
    localStorage.setItem(fullKey, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Storage: failed to save "${key}"`, error);
    return false;
  }
}

export function removeStorageItem(key: StorageKey): boolean {
  try {
    const fullKey = `${STORAGE_PREFIX}${key}`;
    localStorage.removeItem(fullKey);
    return true;
  } catch (error) {
    logger.error(`Storage: failed to remove "${key}"`, error);
    return false;
  }
}

export function clearStorage(): boolean {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    logger.info(`Storage: cleared ${keysToRemove.length} items`);
    return true;
  } catch (error) {
    logger.error('Storage: failed to clear', error);
    return false;
  }
}
