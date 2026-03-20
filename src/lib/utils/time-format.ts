/**
 * Format decimal hours to display string
 * e.g., 2.5 -> "2h 30m", 1.0 -> "1h", 0.5 -> "30m"
 */
export function formatHours(hours: number): string {
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  const sign = hours < 0 ? '-' : '';

  if (h === 0 && m === 0) return '0h';
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

/**
 * Format hours as person-days (Personentage).
 * 1 PT = 8h. Returns absolute value with 1 decimal.
 */
export function formatPT(hours: number): string {
  return (Math.abs(hours) / 8).toFixed(1);
}

/**
 * Convert seconds to decimal hours
 */
export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Convert decimal hours to seconds
 */
export function hoursToSeconds(hours: number): number {
  return Math.round(hours * 3600);
}

/**
 * Format a balance value with sign and color hint
 * e.g., 1.5 -> "+1,5h", -0.5 -> "-0,5h"
 */
export function formatBalance(hours: number): string {
  const sign = hours >= 0 ? '+' : '';
  return `${sign}${formatHours(hours)}`;
}

/**
 * Get CSS class for balance coloring
 */
export function getBalanceClass(hours: number): string {
  if (hours > 0.1) return 'text-success-text';
  if (hours < -0.1) return 'text-danger-text';
  return 'text-muted-foreground';
}

/**
 * Convert decimal hours to hh:mm string
 * e.g., 2.5 -> "02:30", 8.25 -> "08:15"
 */
export function hoursToTimeString(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Convert hh:mm string to decimal hours
 * e.g., "02:30" -> 2.5, "08:15" -> 8.25
 */
export function timeStringToHours(timeString: string): number {
  const [hStr, mStr] = timeString.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h + m / 60;
}

/**
 * Validate and normalize a time input string
 * Returns normalized hh:mm or null if invalid
 */
export function normalizeTimeInput(value: string): string | null {
  const trimmed = value.trim();

  // Handle hh:mm or h:mm format
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  // Handle plain number as hours (e.g., "2" -> "02:00")
  if (/^\d{1,2}$/.test(trimmed)) {
    const h = parseInt(trimmed, 10);
    if (h >= 0 && h <= 23) {
      return `${h.toString().padStart(2, '0')}:00`;
    }
  }

  return null;
}
