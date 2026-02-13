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
 * Get all working days (Mon-Fri) in the month containing the given date
 */
export function getMonthWorkingDays(dateStr: string): string[] {
  const start = getMonthStart(dateStr);
  const end = getMonthEnd(dateStr);
  const days: string[] = [];
  let current = start;
  while (current <= end) {
    const day = parseDate(current).getDay();
    if (day !== 0 && day !== 6) days.push(current);
    current = addDays(current, 1);
  }
  return days;
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
  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return dateStr || '–';
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
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
 * Format relative time (e.g., "just now", "2m ago", "1h ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format datetime for tooltip (e.g., "Jan 15, 2025, 2:30 PM")
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
