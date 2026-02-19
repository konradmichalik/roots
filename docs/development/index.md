---
title: Architecture
description: Technical overview of the roots codebase
---

# Architecture

roots is a **Svelte 5 + Tauri 2** application. The frontend handles all business logic — the Tauri backend is minimal (plugin registration only, no custom Rust commands).

## High-Level Overview

```
┌─────────────────────────────────────────────────┐
│                   Components                     │
│  (Timeline, Sidebar, Connection Forms, Timer)    │
├─────────────────────────────────────────────────┤
│                    Stores                        │
│  (connections, timeEntries, settings, absences)  │
├─────────────────────────────────────────────────┤
│                  API Clients                     │
│  (MocoClient, JiraClient, OutlookClient, ...)   │
├─────────────────────────────────────────────────┤
│              Platform Abstraction                │
│  (getPlatformFetch, storage, oauth-manager)      │
├─────────────────────────────────────────────────┤
│           Tauri (Desktop) │ Browser (Dev)        │
│  plugin-http, plugin-store │ fetch, localStorage │
└─────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── lib/
│   ├── api/              # API clients (one per service)
│   │   ├── base-client.ts        # Abstract base class
│   │   ├── moco-client.ts
│   │   ├── jira-worklog-client.ts
│   │   ├── jira-cloud-worklog.ts
│   │   ├── jira-server-worklog.ts
│   │   ├── outlook-client.ts
│   │   ├── oauth-manager.ts
│   │   ├── personio-client.ts
│   │   └── index.ts              # Factory functions
│   ├── stores/           # Svelte 5 rune-based stores
│   │   ├── connections.svelte.ts
│   │   ├── timeEntries.svelte.ts
│   │   ├── settings.svelte.ts
│   │   ├── absences.svelte.ts
│   │   ├── favorites.svelte.ts
│   │   ├── timer.svelte.ts
│   │   └── ...
│   ├── types/            # TypeScript types per domain
│   │   ├── moco.ts
│   │   ├── jira.ts
│   │   ├── outlook.ts
│   │   ├── personio.ts
│   │   ├── unified.ts
│   │   ├── connections.ts
│   │   └── index.ts
│   ├── components/       # Svelte components by feature
│   │   ├── timeline/
│   │   ├── sidebar/
│   │   ├── connection/
│   │   ├── entries/
│   │   ├── timer/
│   │   ├── common/
│   │   └── ui/           # shadcn-svelte primitives
│   └── utils/            # Shared utilities
│       ├── date-helpers.ts
│       ├── time-format.ts
│       ├── storage.ts
│       ├── logger.ts
│       └── retry.ts
├── App.svelte
└── main.ts
```

## Key Conventions

- **Svelte 5 runes only** — `$state`, `$derived`, `$props`, `$effect`. No legacy reactive statements.
- **Date strings** — all dates as `YYYY-MM-DD` strings, never `Date` objects.
- **Path alias** — `$lib` maps to `src/lib/`.
- **Styling** — Tailwind CSS v4 with Nord palette design tokens (`--ds-*`).
- **No custom Rust code** — Tauri backend only registers plugins.

## Data Flow

```
Services (Moco, Jira, Outlook)
  → API Clients (fetch data)
    → UnifiedTimeEntry mapping
      → timeEntries store (month-based cache, 5-min TTL)
        → Components

Personio
  → PersonioClient
    → absences store + settings store (weekday hours)
```

All service responses are normalized into a common `UnifiedTimeEntry` type before reaching the stores. This allows the timeline to render entries identically regardless of source.
