# Time-Based Outlook Event Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Outlook events with matching rules become sync-eligible only after their endTime has passed, with proactive toast notifications for manual rules and automatic execution for auto-sync rules.

**Architecture:** New `eventSyncWatcher` store polls every 60s to detect ended Outlook events. The existing `buildPreview()` gains a time-based filter (`not_ended`). The toast system is extended with persistent, actionable toasts. The watcher manages toast lifecycle and auto-sync execution from `MainLayout`.

**Tech Stack:** Svelte 5 runes, TypeScript, existing toast/ruleSync/rules stores

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/types/syncRecords.ts` | Modify | Add `'not_ended'` to `SkippedEntry.reason` |
| `src/lib/stores/toast.svelte.ts` | Modify | Add `persistent`, `actionLabel`, `onAction` + `updateToast()` |
| `src/lib/components/common/ToastContainer.svelte` | Modify | Render action button, skip auto-dismiss for persistent |
| `src/lib/utils/date-helpers.ts` | Modify | Add `isOutlookEventEnded()` helper |
| `src/lib/stores/ruleSync.svelte.ts` | Modify | Time filter in `buildPreview()` |
| `src/lib/components/timeline/DayView.svelte` | Modify | Time filter in `pendingCount` |
| `src/lib/stores/eventSyncWatcher.svelte.ts` | Create | 60s watcher, toast management, auto-sync |
| `src/lib/components/layout/MainLayout.svelte` | Modify | Start/stop watcher, render SyncPreviewDialog |
| `src/lib/components/rules/OutlookSourceForm.svelte` | Modify | Add hint text |

---

### Task 1: Extend SkippedEntry reason type

**Files:**
- Modify: `src/lib/types/syncRecords.ts:31`

- [ ] **Step 1: Add `'not_ended'` to the reason union**

In `src/lib/types/syncRecords.ts`, change line 31 from:

```typescript
  reason: 'already_synced' | 'zero_hours' | 'moco_remote_exists';
```

to:

```typescript
  reason: 'already_synced' | 'zero_hours' | 'moco_remote_exists' | 'not_ended';
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors (the new union member is additive)

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/syncRecords.ts
git commit -m "feat: add 'not_ended' skip reason for time-based sync"
```

---

### Task 2: Add `isOutlookEventEnded()` helper

**Files:**
- Modify: `src/lib/utils/date-helpers.ts`

- [ ] **Step 1: Add the helper function**

Add at the end of `src/lib/utils/date-helpers.ts`:

```typescript
/**
 * Check whether an Outlook event has ended based on its endTime.
 * All-day events are considered ended at 23:59 of their date.
 * Past dates are always considered ended.
 */
export function isOutlookEventEnded(
  eventDate: string,
  endTime: string | undefined,
  isAllDay: boolean
): boolean {
  const now = new Date();
  const todayStr = toDateString(now);

  // Past dates: always ended
  if (eventDate < todayStr) return true;

  // Future dates: never ended
  if (eventDate > todayStr) return false;

  // Today: check time
  if (isAllDay) {
    // All-day events end at 23:59
    return now.getHours() >= 23 && now.getMinutes() >= 59;
  }

  if (!endTime) return true; // No endTime → treat as ended

  const [hours, minutes] = endTime.split(':').map(Number);
  return now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes);
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/date-helpers.ts
git commit -m "feat: add isOutlookEventEnded helper for time-based sync"
```

---

### Task 3: Add time filter to `buildPreview()`

**Files:**
- Modify: `src/lib/stores/ruleSync.svelte.ts:92-160`

- [ ] **Step 1: Import the helper**

In `src/lib/stores/ruleSync.svelte.ts`, add `isOutlookEventEnded` to the `date-helpers` import (line 32):

```typescript
import { addDays, isOutlookEventEnded } from '../utils/date-helpers';
```

- [ ] **Step 2: Add `not_ended` check in `buildPreview()`**

In the `for (const entry of sourceEntries)` loop, after the zero-hours check (after line 117, before the `autoOnly` check on line 119), add:

```typescript
    // Outlook events: skip if not yet ended
    if (entry.metadata.source === 'outlook') {
      const meta = entry.metadata as OutlookMetadata;
      if (!isOutlookEventEnded(entry.date, entry.endTime, meta.isAllDay)) {
        skipped.push({ sourceEntry: entry, reason: 'not_ended' });
        continue;
      }
    }
```

- [ ] **Step 3: Add `OutlookMetadata` to the import if not present**

Check line 2 — `OutlookMetadata` is already imported. No change needed.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/ruleSync.svelte.ts
git commit -m "feat: filter future Outlook events from sync preview"
```

---

### Task 4: Add time filter to DayView `pendingCount`

**Files:**
- Modify: `src/lib/components/timeline/DayView.svelte:59-79`

- [ ] **Step 1: Import `isOutlookEventEnded`**

Add to the existing imports from `../../utils/date-helpers` (currently no import from there — add a new line):

```typescript
import { isOutlookEventEnded } from '../../utils/date-helpers';
```

- [ ] **Step 2: Add time filter in the pendingCount loop**

In the `pendingCount` derived block, after the `if (entry.hours <= 0) continue;` check (line 70), add:

```typescript
      // Skip future Outlook events
      if (entry.metadata.source === 'outlook') {
        const meta = entry.metadata as OutlookMetadata;
        if (!isOutlookEventEnded(entry.date, entry.endTime, meta.isAllDay)) continue;
      }
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/timeline/DayView.svelte
git commit -m "feat: exclude future Outlook events from pending count"
```

---

### Task 5: Extend toast system with persistent + actionable toasts

**Files:**
- Modify: `src/lib/stores/toast.svelte.ts`

- [ ] **Step 1: Extend the Toast interface and add `updateToast()`**

Replace the full content of `src/lib/stores/toast.svelte.ts` with:

```typescript
export type ToastType = 'success' | 'error' | 'info' | 'action';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  persistent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

const TOAST_DURATION = 3000;

export const toastState = $state<{ toasts: Toast[] }>({
  toasts: []
});

export function showToast(type: ToastType, message: string, options?: Partial<Pick<Toast, 'persistent' | 'actionLabel' | 'onAction'>>): string {
  const id = crypto.randomUUID();
  const newToast: Toast = { id, type, message, ...options };

  toastState.toasts = [...toastState.toasts, newToast];

  if (!newToast.persistent) {
    setTimeout(() => {
      dismissToast(id);
    }, TOAST_DURATION);
  }

  return id;
}

export function updateToast(id: string, message: string): void {
  toastState.toasts = toastState.toasts.map((t) =>
    t.id === id ? { ...t, message } : t
  );
}

export function dismissToast(id: string): void {
  toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
}

// Convenience functions
export const toast = {
  success: (message: string) => showToast('success', message),
  error: (message: string) => showToast('error', message),
  info: (message: string) => showToast('info', message),
  action: (message: string, actionLabel: string, onAction: () => void) =>
    showToast('action', message, { persistent: true, actionLabel, onAction })
};
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/toast.svelte.ts
git commit -m "feat: add persistent actionable toast support"
```

---

### Task 6: Update ToastContainer for persistent + action toasts

**Files:**
- Modify: `src/lib/components/common/ToastContainer.svelte`

- [ ] **Step 1: Replace the full component**

Replace the full content of `src/lib/components/common/ToastContainer.svelte` with:

```svelte
<script lang="ts">
  import { toastState, dismissToast, type ToastType } from '../../stores/toast.svelte';
  import CheckCircle from '@lucide/svelte/icons/check-circle';
  import XCircle from '@lucide/svelte/icons/x-circle';
  import Info from '@lucide/svelte/icons/info';
  import Calendar from '@lucide/svelte/icons/calendar';
  import X from '@lucide/svelte/icons/x';

  const TYPE_STYLES: Record<ToastType, string> = {
    success: 'border-success text-success-text',
    error: 'border-danger text-danger-text',
    info: 'border-primary text-primary',
    action: 'border-source-outlook text-source-outlook-text'
  };

  const TYPE_ICONS: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    action: Calendar
  };
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
  {#each toastState.toasts as toast (toast.id)}
    {@const IconComponent = TYPE_ICONS[toast.type]}
    <div
      class="flex items-center gap-3 rounded-lg border-1 bg-card px-4 py-3 shadow-lg animate-in slide-in-from-right-5 fade-in duration-200 {TYPE_STYLES[
        toast.type
      ]}"
      role="alert"
    >
      <IconComponent class="size-5 flex-shrink-0" />
      <span class="text-sm font-medium text-foreground">{toast.message}</span>
      {#if toast.actionLabel && toast.onAction}
        <button
          onclick={() => toast.onAction?.()}
          class="ml-1 rounded-md bg-source-outlook-subtle px-2.5 py-1 text-xs font-semibold text-source-outlook-text hover:bg-source-outlook/20 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none whitespace-nowrap"
        >
          {toast.actionLabel}
        </button>
      {/if}
      <button
        onclick={() => dismissToast(toast.id)}
        class="ml-2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>
  {/each}
</div>
```

- [ ] **Step 2: Run type check and dev server**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/common/ToastContainer.svelte
git commit -m "feat: render action button and persistent toasts in ToastContainer"
```

---

### Task 7: Create the Event Sync Watcher store

**Files:**
- Create: `src/lib/stores/eventSyncWatcher.svelte.ts`

- [ ] **Step 1: Create the watcher store**

Create `src/lib/stores/eventSyncWatcher.svelte.ts`:

```typescript
import type { OutlookMetadata, SyncPreview, UnifiedTimeEntry } from '../types';
import { timeEntriesState } from './timeEntries.svelte';
import { findMatchingRules } from './rules.svelte';
import { isSynced } from './syncRecords.svelte';
import { isDismissed } from './dismissedEvents.svelte';
import { getSourceId, syncDay, executeSyncCandidates } from './ruleSync.svelte';
import { showToast, updateToast, dismissToast, toast } from './toast.svelte';
import { isOutlookEventEnded } from '../utils/date-helpers';
import { today } from '../utils/date-helpers';
import { logger } from '../utils/logger';

const POLL_INTERVAL = 60_000; // 60 seconds

interface WatcherState {
  notifiedEventIds: Set<string>;
  toastId: string | null;
  intervalId: ReturnType<typeof setInterval> | null;
  lastDate: string;
  syncPreview: SyncPreview | null;
  showSyncPreview: boolean;
}

export const watcherState = $state<WatcherState>({
  notifiedEventIds: new Set(),
  toastId: null,
  intervalId: null,
  lastDate: '',
  syncPreview: null,
  showSyncPreview: false
});

/**
 * Get ended Outlook events that have matching rules and are not yet synced.
 */
function getEndedUnsyncedOutlookEntries(): UnifiedTimeEntry[] {
  const todayStr = today();
  const outlookEntries = timeEntriesState.outlookEvents.filter((e) => e.date === todayStr);

  return outlookEntries.filter((entry) => {
    const meta = entry.metadata as OutlookMetadata;

    if (isDismissed(meta.eventId, entry.date)) return false;
    if (!isOutlookEventEnded(entry.date, entry.endTime, meta.isAllDay)) return false;
    if (findMatchingRules(entry).length === 0) return false;

    const sourceId = getSourceId(entry);
    if (isSynced('outlook', sourceId)) return false;

    return true;
  });
}

/**
 * Core tick: check for newly ended events, auto-sync or notify.
 */
async function tick(): Promise<void> {
  const todayStr = today();

  // Reset on date change
  if (watcherState.lastDate !== todayStr) {
    watcherState.notifiedEventIds = new Set();
    if (watcherState.toastId) {
      dismissToast(watcherState.toastId);
      watcherState.toastId = null;
    }
    watcherState.lastDate = todayStr;
  }

  const endedEntries = getEndedUnsyncedOutlookEntries();
  if (endedEntries.length === 0) {
    // All synced or dismissed — clean up toast
    if (watcherState.toastId) {
      dismissToast(watcherState.toastId);
      watcherState.toastId = null;
    }
    return;
  }

  // Separate auto-sync vs manual entries
  const autoSyncEntries: UnifiedTimeEntry[] = [];
  const manualEntries: UnifiedTimeEntry[] = [];

  for (const entry of endedEntries) {
    const rules = findMatchingRules(entry);
    const rule = rules[0];
    if (rule.autoSync) {
      autoSyncEntries.push(entry);
    } else {
      manualEntries.push(entry);
    }
  }

  // Execute auto-sync for new entries
  const newAutoEntries = autoSyncEntries.filter(
    (e) => !watcherState.notifiedEventIds.has((e.metadata as OutlookMetadata).eventId)
  );
  if (newAutoEntries.length > 0) {
    try {
      const preview = await syncDay(todayStr, { autoOnly: true });
      if (preview.pending.length > 0) {
        const result = await executeSyncCandidates(preview.pending, true);
        if (result.created.length > 0) {
          toast.success(`${result.created.length} Outlook-${result.created.length === 1 ? 'Termin' : 'Termine'} automatisch gesynced`);
        }
        if (result.failed.length > 0) {
          toast.error(`${result.failed.length} Auto-Sync fehlgeschlagen`);
        }
      }
    } catch (error) {
      logger.error('eventSyncWatcher: Auto-sync failed', error);
    }
    for (const entry of newAutoEntries) {
      watcherState.notifiedEventIds.add((entry.metadata as OutlookMetadata).eventId);
    }
  }

  // Handle manual entries — show or update persistent toast
  const newManualEntries = manualEntries.filter(
    (e) => !watcherState.notifiedEventIds.has((e.metadata as OutlookMetadata).eventId)
  );

  // Mark all manual entries as notified
  for (const entry of newManualEntries) {
    watcherState.notifiedEventIds.add((entry.metadata as OutlookMetadata).eventId);
  }

  // Count total unsynced manual entries (not just new ones)
  const totalManualPending = manualEntries.length;

  if (totalManualPending === 0) {
    if (watcherState.toastId) {
      dismissToast(watcherState.toastId);
      watcherState.toastId = null;
    }
    return;
  }

  const message =
    totalManualPending === 1
      ? '1 Outlook-Termin bereit zum Syncen'
      : `${totalManualPending} Outlook-Termine bereit zum Syncen`;

  if (watcherState.toastId) {
    updateToast(watcherState.toastId, message);
  } else {
    watcherState.toastId = showToast('action', message, {
      persistent: true,
      actionLabel: 'Syncen',
      onAction: () => openPendingSyncPreview()
    });
  }
}

/**
 * Build a sync preview for ended Outlook events and open the dialog.
 */
async function openPendingSyncPreview(): Promise<void> {
  try {
    const preview = await syncDay(today());
    // Filter to only Outlook entries
    const outlookPreview: SyncPreview = {
      ...preview,
      pending: preview.pending.filter((c) => c.sourceEntry.metadata.source === 'outlook')
    };
    watcherState.syncPreview = outlookPreview;
    watcherState.showSyncPreview = true;
  } catch (error) {
    logger.error('eventSyncWatcher: Failed to build preview', error);
    toast.error('Sync-Vorschau konnte nicht erstellt werden');
  }
}

/**
 * Called when the SyncPreviewDialog is closed (after sync or cancel).
 * Re-checks pending count and cleans up toast if needed.
 */
export function handleWatcherSyncClose(): void {
  watcherState.showSyncPreview = false;
  watcherState.syncPreview = null;

  // Re-evaluate: if everything is synced, dismiss toast
  const remaining = getEndedUnsyncedOutlookEntries().filter((entry) => {
    const rules = findMatchingRules(entry);
    return rules.length > 0 && !rules[0].autoSync;
  });

  if (remaining.length === 0 && watcherState.toastId) {
    dismissToast(watcherState.toastId);
    watcherState.toastId = null;
  } else if (remaining.length > 0 && watcherState.toastId) {
    const message =
      remaining.length === 1
        ? '1 Outlook-Termin bereit zum Syncen'
        : `${remaining.length} Outlook-Termine bereit zum Syncen`;
    updateToast(watcherState.toastId, message);
  }
}

export function startWatcher(): void {
  if (watcherState.intervalId) return; // Already running
  watcherState.lastDate = today();

  // Initial tick after short delay (let stores initialize)
  setTimeout(() => tick(), 3000);

  watcherState.intervalId = setInterval(() => tick(), POLL_INTERVAL);
  logger.store('eventSyncWatcher', 'Watcher started (60s interval)');
}

export function stopWatcher(): void {
  if (watcherState.intervalId) {
    clearInterval(watcherState.intervalId);
    watcherState.intervalId = null;
  }
  if (watcherState.toastId) {
    dismissToast(watcherState.toastId);
    watcherState.toastId = null;
  }
  logger.store('eventSyncWatcher', 'Watcher stopped');
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/eventSyncWatcher.svelte.ts
git commit -m "feat: add event sync watcher for time-based Outlook sync"
```

---

### Task 8: Integrate watcher in MainLayout

**Files:**
- Modify: `src/lib/components/layout/MainLayout.svelte`

- [ ] **Step 1: Add imports**

Add these imports to the `<script>` block in `MainLayout.svelte`:

```typescript
import { startWatcher, stopWatcher, watcherState, handleWatcherSyncClose } from '../../stores/eventSyncWatcher.svelte';
import SyncPreviewDialog from '../rules/SyncPreviewDialog.svelte';
```

- [ ] **Step 2: Start/stop watcher in onMount**

In the `onMount` callback, after `initializeAutoRefresh();` (line 72), add:

```typescript
    startWatcher();
```

In the return cleanup function (currently lines 99-102), add `stopWatcher()`:

```typescript
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupAutoRefresh();
      stopWatcher();
    };
```

- [ ] **Step 3: Add SyncPreviewDialog for watcher**

Before the closing `</div>` at the end of the template (before line 155), after the `<MorningModal>`, add:

```svelte
  {#if watcherState.syncPreview && watcherState.showSyncPreview}
    <SyncPreviewDialog
      preview={watcherState.syncPreview}
      defaultOpen={true}
      onClose={handleWatcherSyncClose}
    />
  {/if}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/layout/MainLayout.svelte
git commit -m "feat: integrate event sync watcher in MainLayout"
```

---

### Task 9: Add hint to OutlookSourceForm

**Files:**
- Modify: `src/lib/components/rules/OutlookSourceForm.svelte`

- [ ] **Step 1: Add Clock icon import**

Add to the imports in the `<script>` block:

```typescript
import Clock from '@lucide/svelte/icons/clock';
```

- [ ] **Step 2: Add hint text**

After the existing info paragraph (line 21, closing `</p>`), add:

```svelte
  <p class="text-xs text-muted-foreground flex items-center gap-1">
    <Clock class="size-3 flex-shrink-0" />
    Sync happens after the event ends — future events won't be synced yet.
  </p>
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/rules/OutlookSourceForm.svelte
git commit -m "feat: add time-based sync hint to Outlook rule editor"
```

---

### Task 10: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify time filter in sync preview**

Navigate to today's date. If there are Outlook events with matching rules that haven't ended yet, they should NOT appear in the "Apply Rules" sync preview or the pending count badge.

- [ ] **Step 3: Verify persistent toast**

Wait for an Outlook event to end (or temporarily adjust `isOutlookEventEnded` to return `true`). Within 60 seconds, a persistent toast should appear with "X Outlook-Termine bereit zum Syncen" and a "Syncen" button. The toast should NOT auto-dismiss.

- [ ] **Step 4: Verify toast action**

Click "Syncen" on the toast. The SyncPreviewDialog should open showing only ended Outlook entries. After syncing, the toast should disappear.

- [ ] **Step 5: Verify dismiss**

Trigger the toast again. Click the X dismiss button. The toast should disappear and not reappear for the same events.

- [ ] **Step 6: Verify rule editor hint**

Open the rule editor, select Outlook as source type. Below "Events matching this pattern will be transferred." there should be a second line with a clock icon: "Sync happens after the event ends — future events won't be synced yet."

- [ ] **Step 7: Run full checks**

Run: `npm run check && npm run lint`
Expected: All pass

- [ ] **Step 8: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address smoke test findings for time-based sync"
```
