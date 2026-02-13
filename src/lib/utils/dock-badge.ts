import { isTauri } from './storage';

/**
 * Format seconds into a compact badge label: "H:MM"
 */
export function formatBadgeTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Set the macOS dock badge label. No-op in browser mode.
 */
export async function setDockBadge(label: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setBadgeLabel(label);
  } catch {
    // Silently ignore — unsupported platform or permission issue
  }
}

/**
 * Clear the macOS dock badge. No-op in browser mode.
 */
export async function clearDockBadge(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setBadgeLabel();
  } catch {
    // Silently ignore
  }
}
