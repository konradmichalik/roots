/**
 * Get ISO date string (YYYY-MM-DD) from a Date object
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object (local timezone)
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today as YYYY-MM-DD
 */
export function today(): string {
  return toDateString(new Date());
}

/**
 * Add days to a date string
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/**
 * Get the Monday of the week containing the given date
 */
export function getWeekStart(dateStr: string): string {
  const date = parseDate(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1, Sunday = 0 -> go back
  date.setDate(date.getDate() + diff);
  return toDateString(date);
}

/**
 * Get the Friday of the week containing the given date
 */
export function getWeekEnd(dateStr: string): string {
  const start = getWeekStart(dateStr);
  return addDays(start, 4);
}


/**
 * Get all dates (Mon-Fri) in the week containing the given date
 */
export function getWeekDates(dateStr: string): string[] {
  const start = getWeekStart(dateStr);
  return Array.from({ length: 5 }, (_, i) => addDays(start, i));
}

/**
 * Get all dates (Mon-Sun) in the week containing the given date
 */
export function getFullWeekDates(dateStr: string): string[] {
  const start = getWeekStart(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Get the first day of the month
 */
export function getMonthStart(dateStr: string): string {
  const date = parseDate(dateStr);
  return toDateString(new Date(date.getFullYear(), date.getMonth(), 1));
}

/**
 * Get the last day of the month
 */
export function getMonthEnd(dateStr: string): string {
  const date = parseDate(dateStr);
  return toDateString(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateStr: string): boolean {
  const day = parseDate(dateStr).getDay();
  return day === 0 || day === 6;
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === today();
}


/**
 * Get day of week index (0 = Monday, 6 = Sunday)
 */
export function getDayOfWeekIndex(dateStr: string): number {
  const day = parseDate(dateStr).getDay();
  return day === 0 ? 6 : day - 1; // Convert Sun=0..Sat=6 to Mon=0..Sun=6
}


/**
 * Format date for display (e.g., "Jan 15")
 */
export function formatDateShort(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/**
 * Format date for display (e.g., "January 15, 2025")
 */
export function formatDateLong(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format a date range (e.g., "Jan 13 - Jan 17, 2025")
 */
export function formatDateRange(startStr: string, endStr: string): string {
  const start = parseDate(startStr);
  const end = parseDate(endStr);

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const startFormatted = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endFormatted = end.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return `${startFormatted} - ${endFormatted}`;
  }

  const startFormatted = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const endFormatted = end.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Check if two date strings are the same date
 */
export function isSameDate(a: string, b: string): boolean {
  return a === b;
}

/**
 * Check if date a is before date b
 */
export function isBefore(a: string, b: string): boolean {
  return a < b;
}

/**
 * Check if date a is after date b
 */
export function isAfter(a: string, b: string): boolean {
  return a > b;
}

/**
 * Check if a date falls within a range (inclusive)
 */
export function isInRange(dateStr: string, startStr: string, endStr: string): boolean {
  return dateStr >= startStr && dateStr <= endStr;
}
