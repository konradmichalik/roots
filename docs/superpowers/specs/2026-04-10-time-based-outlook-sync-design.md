# Time-Based Outlook Event Sync

**Date:** 2026-04-10
**Status:** Approved

## Problem

Outlook events with matching rules are currently sync-eligible as soon as they appear in the day's entries — even if the meeting hasn't happened yet. This leads to premature syncing and clutters the sync preview with future events.

## Solution

Outlook events become sync-eligible only after their `endTime` has passed. A background watcher detects newly ended events and:
- **Auto-sync rules:** Executes sync immediately.
- **Manual rules:** Shows a persistent, actionable toast prompting the user to sync.

## Core Principle

**No Outlook event is synced before it ends.** This applies uniformly across:
- `buildPreview()` (skip reason `'not_ended'`)
- DayView `pendingCount`
- BulkSyncDialog (for today's date)
- Auto-sync execution
- Manual sync toast trigger

All-day events are considered ended at 23:59 of their date.

## Components

### 1. Time Filter in `buildPreview()`

**File:** `src/lib/stores/ruleSync.svelte.ts`

Add a check after rule matching for Outlook entries: if the entry has an `endTime` and it's in the future, skip with reason `'not_ended'`. For all-day events (`isAllDay`), treat end-of-day (23:59) as the threshold.

The same logic applies to `pendingCount` in `DayView.svelte`.

### 2. Event Sync Watcher Store

**New file:** `src/lib/stores/eventSyncWatcher.svelte.ts`

**Responsibility:** Poll every 60 seconds, detect newly ended Outlook events with matching rules, and trigger sync or notification.

**State:**
- `notifiedEventIds: Set<string>` — events already processed this session. Resets on date change.
- `pendingSyncCount: number` — count of ended, unsynced events with manual rules.
- `intervalId: ReturnType<typeof setInterval> | null` — polling handle.

**Tick logic (every 60s):**
1. Get Outlook entries for the current date from `timeEntriesState`.
2. Filter to: `endTime < now` AND `findMatchingRules().length > 0` AND `!isSynced()` AND `!isDismissed()` AND `!notifiedEventIds.has(eventId)`.
3. For new ended events:
   - Add to `notifiedEventIds`.
   - **Auto-sync rules:** Build payload via `buildMocoPayload()`, execute via `executeSyncCandidates()`. Show success/error toast.
   - **Manual rules:** Update `pendingSyncCount`. Show or update persistent toast.
4. Recompute `pendingSyncCount` (total unsynced ended events with manual rules, not just new ones) to handle cases where user synced manually.
5. If `pendingSyncCount` drops to 0, dismiss the persistent toast.

**Lifecycle:**
- `startWatcher()` — called in `MainLayout.svelte` after store initialization.
- `stopWatcher()` — cleanup on unmount.
- Resets `notifiedEventIds` on date change (midnight or navigation).

### 3. Persistent Actionable Toast

**Files:** `src/lib/stores/toast.svelte.ts`, `src/lib/components/common/ToastContainer.svelte`

**Toast interface extension:**
```typescript
interface Toast {
  id: string;
  type: ToastType;
  message: string;
  persistent?: boolean;       // no auto-dismiss
  actionLabel?: string;       // button text
  onAction?: () => void;      // button callback
}
```

**New functions:**
- `updateToast(id: string, message: string)` — updates an existing toast's message (for count changes).
- Persistent toasts skip the `setTimeout` auto-dismiss.

**ToastContainer changes:**
- Render action button (`actionLabel` + `onAction`) between message and dismiss button.
- Styling for action type: `border-source-outlook` with `Calendar` icon (Lucide).

**Behavior:**
- The watcher holds a reference to the toast ID to update the message ("1 Termin bereit" -> "3 Termine bereit").
- Dismiss (X) removes the toast. The watcher does NOT re-show it for already-notified events — only new endings trigger a new toast.
- Action button calls `openPendingSyncPreview()` on the watcher, which builds a `SyncPreview` and opens the dialog.

### 4. SyncPreviewDialog Integration

**File:** `src/lib/components/layout/MainLayout.svelte`

The watcher exposes reactive state:
- `watcherSyncPreview: SyncPreview | null`
- `showWatcherSyncPreview: boolean`

`MainLayout` renders a `SyncPreviewDialog` bound to this state. The toast action callback sets `showWatcherSyncPreview = true` after building the preview via `syncDay()` filtered to ended Outlook events only.

### 5. Rule Editor Hint

**File:** `src/lib/components/rules/OutlookSourceForm.svelte`

Add below the existing info text ("Events matching this pattern will be transferred."):

```
Sync happens after the event ends — future events won't be synced yet.
```

Styled as `text-xs text-muted-foreground` with a `Clock` icon.

## Affected Files

| File | Change |
|------|--------|
| `src/lib/stores/toast.svelte.ts` | `persistent`, `actionLabel`, `onAction` fields + `updateToast()` |
| `src/lib/components/common/ToastContainer.svelte` | Action button, persistent toast support |
| **New:** `src/lib/stores/eventSyncWatcher.svelte.ts` | 60s polling, ended-event detection, toast management, auto-sync |
| `src/lib/stores/ruleSync.svelte.ts` | `buildPreview()` skip reason `'not_ended'` for future Outlook events |
| `src/lib/components/timeline/DayView.svelte` | `pendingCount` time filter |
| `src/lib/components/rules/OutlookSourceForm.svelte` | Hint text about time-based sync |
| `src/lib/components/layout/MainLayout.svelte` | Start/stop watcher + SyncPreviewDialog for watcher |
| `src/lib/types/unified.ts` or `src/lib/types/index.ts` | `SkipReason` union extended with `'not_ended'` |

## Not in Scope

- No changes to `autoRefresh` (watcher has its own interval).
- No changes to BulkSyncDialog UI (time filter applies via `buildPreview`).
- No changes to Jira rules (Jira worklogs don't have predictable end times).
- No new settings toggle (feature activates when Outlook rules exist).
