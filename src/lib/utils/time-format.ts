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
 * Convert seconds to decimal hours
 */
export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
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

