import type { Theme } from '../types';
import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';

export const themeState = $state({
  theme: 'system' as Theme,
  resolvedTheme: 'light' as 'light' | 'dark'
});

let mediaQuery: MediaQueryList | null = null;

export async function initializeTheme(): Promise<void> {
  const stored = await getStorageItemAsync<Theme>(STORAGE_KEYS.THEME);
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    themeState.theme = stored;
  }

  if (typeof window !== 'undefined') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);
  }

  updateResolvedTheme();
  applyTheme();

  logger.store('theme', 'Initialized', {
    theme: themeState.theme,
    resolvedTheme: themeState.resolvedTheme
  });
}

function handleSystemChange(e: MediaQueryListEvent): void {
  if (themeState.theme === 'system') {
    themeState.resolvedTheme = e.matches ? 'dark' : 'light';
    applyTheme();
  }
}

function updateResolvedTheme(): void {
  if (themeState.theme === 'system') {
    themeState.resolvedTheme = mediaQuery?.matches ? 'dark' : 'light';
  } else {
    themeState.resolvedTheme = themeState.theme;
  }
}

function applyTheme(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-color-mode', themeState.resolvedTheme);
    if (themeState.resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

export function setTheme(newTheme: Theme): void {
  themeState.theme = newTheme;
  updateResolvedTheme();
  applyTheme();
  saveStorage(STORAGE_KEYS.THEME, themeState.theme);
}

export function toggleTheme(): void {
  const newTheme = themeState.resolvedTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

export function isDarkMode(): boolean {
  return themeState.resolvedTheme === 'dark';
}

export function cleanupTheme(): void {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', handleSystemChange);
  }
}
