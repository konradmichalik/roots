import type { ViewMode } from '../types';
import {
  today,
  addDays,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getWeekNumber,
  formatDateRange
} from '../utils/date-helpers';
import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';

export const dateNavState = $state({
  selectedDate: today(),
  viewMode: 'week' as ViewMode
});

export async function initializeDateNavigation(): Promise<void> {
  const savedView = await getStorageItemAsync<ViewMode>(STORAGE_KEYS.DATE_NAV_VIEW);
  if (savedView && ['week', 'day', 'month'].includes(savedView)) {
    dateNavState.viewMode = savedView;
  }
  logger.store('dateNavigation', 'Initialized', {
    date: dateNavState.selectedDate,
    view: dateNavState.viewMode
  });
}

export function setDate(date: string): void {
  dateNavState.selectedDate = date;
  logger.store('dateNavigation', 'Date changed', { date });
}

export function setViewMode(mode: ViewMode): void {
  dateNavState.viewMode = mode;
  saveStorage(STORAGE_KEYS.DATE_NAV_VIEW, mode);
  logger.store('dateNavigation', 'View mode changed', { mode });
}

export function navigateForward(): void {
  const { viewMode, selectedDate } = dateNavState;
  if (viewMode === 'week') {
    dateNavState.selectedDate = addDays(selectedDate, 7);
  } else if (viewMode === 'day') {
    dateNavState.selectedDate = addDays(selectedDate, 1);
  } else {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() + 1);
    dateNavState.selectedDate = date.toISOString().split('T')[0];
  }
}

export function navigateBackward(): void {
  const { viewMode, selectedDate } = dateNavState;
  if (viewMode === 'week') {
    dateNavState.selectedDate = addDays(selectedDate, -7);
  } else if (viewMode === 'day') {
    dateNavState.selectedDate = addDays(selectedDate, -1);
  } else {
    const date = new Date(selectedDate);
    date.setMonth(date.getMonth() - 1);
    dateNavState.selectedDate = date.toISOString().split('T')[0];
  }
}

export function goToToday(): void {
  dateNavState.selectedDate = today();
}

export function getDateRange(): { from: string; to: string } {
  const { viewMode, selectedDate } = dateNavState;
  if (viewMode === 'week') {
    return { from: getWeekStart(selectedDate), to: getWeekEnd(selectedDate) };
  } else if (viewMode === 'day') {
    return { from: selectedDate, to: selectedDate };
  } else {
    return { from: getMonthStart(selectedDate), to: getMonthEnd(selectedDate) };
  }
}

export function getDisplayLabel(): string {
  const { viewMode, selectedDate } = dateNavState;
  if (viewMode === 'week') {
    const start = getWeekStart(selectedDate);
    const end = getWeekEnd(selectedDate);
    const wn = getWeekNumber(selectedDate);
    return `KW ${wn} \u2014 ${formatDateRange(start, end)}`;
  } else if (viewMode === 'day') {
    const date = new Date(selectedDate);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } else {
    const date = new Date(selectedDate);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }
}
