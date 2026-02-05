import { today, addDays, getMonthStart, getMonthEnd } from '../utils/date-helpers';
import { logger } from '../utils/logger';

export const dateNavState = $state({
  selectedDate: today()
});

export function initializeDateNavigation(): void {
  logger.store('dateNavigation', 'Initialized', {
    date: dateNavState.selectedDate
  });
}

export function setDate(date: string): void {
  dateNavState.selectedDate = date;
  logger.store('dateNavigation', 'Date changed', { date });
}

export function navigateForward(): void {
  dateNavState.selectedDate = addDays(dateNavState.selectedDate, 1);
}

export function navigateBackward(): void {
  dateNavState.selectedDate = addDays(dateNavState.selectedDate, -1);
}

export function goToToday(): void {
  dateNavState.selectedDate = today();
}

export function getDateRange(): { from: string; to: string } {
  const { selectedDate } = dateNavState;
  return {
    from: getMonthStart(selectedDate),
    to: getMonthEnd(selectedDate)
  };
}

export function getDisplayLabel(): string {
  const date = new Date(dateNavState.selectedDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
