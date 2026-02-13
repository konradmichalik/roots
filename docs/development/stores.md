---
title: Stores
description: Svelte 5 rune-based state management
---

# Stores

Roots uses Svelte 5 rune-based stores instead of the legacy `writable`/`readable` pattern. All stores follow the same structure.

## Store Pattern

```typescript
// 1. Exported $state object
export const fooState = $state<FooState>({ ... })

// 2. Async initializer (called at app startup)
export async function initializeFoo(): Promise<void> {
  const stored = await getStorageItemAsync<...>(STORAGE_KEYS.FOO)
  // hydrate state from storage
}

// 3. Action functions (mutate state + persist)
export function updateFoo(partial: Partial<FooState>): void {
  Object.assign(fooState, partial)
  saveStorage(STORAGE_KEYS.FOO, fooState)
}

// 4. Derived selectors
export const derivedValue = $derived(fooState.items.filter(...))
```

## Key Stores

### connections (`connections.svelte.ts`)

Manages the lifecycle of all service connections.

**State per service:**

```typescript
interface ServiceConnectionState {
  service: ServiceType
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastConnected: string | null
  needsReauth: boolean       // for OAuth-based services
}
```

**Functions**: `connectMoco()`, `connectJira()`, `connectOutlook()`, `connectPersonio()`, `disconnect*()`, `handleOAuthCallback()`

Client instances are stored as module-level variables (not in `$state`) since they're not reactive.

### timeEntries (`timeEntries.svelte.ts`)

Fetches and caches unified time entries.

- **Cache key**: year-month (e.g. `2025-03`)
- **TTL**: 5 minutes
- **Data flow**: API clients → mappers → `UnifiedTimeEntry[]` → store

Mappers normalize Moco activities, Jira worklogs and Outlook events into a common shape.

### settings (`settings.svelte.ts`)

User preferences: weekly hours, theme, display options. Persisted to storage on every change.

### absences (`absences.svelte.ts`)

Absence days from Personio or manually entered. Used to adjust daily target hours to zero on absence days.

### favorites (`favorites.svelte.ts`)

Pinned project/task combinations for quick booking. Supports reordering.

### timer (`timer.svelte.ts`)

Running timer state: project, task, start time, elapsed duration.

## Storage

All stores use `storage.ts` for persistence:

| Platform | Backend | Location |
|----------|---------|----------|
| Tauri | `@tauri-apps/plugin-store` | `settings.json` in app data dir |
| Browser | `localStorage` | Browser storage |

`isTauri()` determines the runtime at startup. Keys are prefixed with `roots:` (e.g. `roots:moco_config`). Auto-migration from localStorage to Tauri store happens on first access.
