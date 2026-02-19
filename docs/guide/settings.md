---
title: Settings
description: Configure roots to your preferences
---

# Settings

## Weekly Hours

Define your expected working hours per weekday. This is used to calculate the target/actual comparison in the timeline.

| Setting | Default |
|---------|---------|
| Monday – Friday | 8.0 h |
| Saturday – Sunday | 0.0 h |

::: info
When Personio is connected, weekly hours are synced automatically from your work schedule and manual editing is disabled.
:::

## Absences

Mark days as absent (vacation, sick, etc.) to adjust the daily target to zero. This prevents those days from showing as "under-booked."

::: info
When Personio is connected, absences are imported automatically and manual editing is disabled.
:::

## Presence Management

When Moco is connected, roots tracks your working time (clock-in/clock-out) via the [Presence Bar](/guide/timeline#presence-bar) in the timeline header. Click the bar to open the Presence Modal where you can:

- **Add time slots** — enter start and end times for a working period
- **Edit time slots** — adjust start/end times of existing entries
- **Delete time slots** — remove individual presence entries
- **Toggle Home Office** — mark the day as home office or office

![Presence modal with time slots and Home Office toggle](/images/roots-prescence-modal.jpg)

Presence data is cached for 5 minutes with the same TTL as time entries.

## Auto-Refresh

Configure automatic data refresh to keep the timeline up to date without manual reloading.

| Interval | Description |
|----------|-------------|
| **Off** | No automatic refresh (default) |
| **5 min** | Refresh every 5 minutes |
| **30 min** | Refresh every 30 minutes |
| **1 hour** | Refresh every hour |

Auto-refresh reloads the current day's entries from all connected services. It skips the refresh if data is already loading.

## Theme

roots supports light and dark themes. The theme follows your system preference by default and can be overridden in settings.

| Light | Dark |
|-------|------|
| ![Light Mode](/images/roots-light.jpg) | ![Dark Mode](/images/roots-dark.jpg) |

## Data Storage

All data is stored locally:

| Data | Desktop | Browser |
|------|---------|---------|
| Credentials | Tauri secure store | localStorage |
| Settings | Tauri secure store | localStorage |
| Cached entries | In-memory (per session) | In-memory (per session) |
| Timer state | Tauri secure store | localStorage |
| Drafts | Tauri secure store | localStorage |
| Presence cache | Tauri secure store | localStorage |

Storage keys are prefixed with `roots:` to avoid conflicts.

## Clearing Data

To reset roots to its initial state, disconnect all services and clear the browser storage (or delete `settings.json` from the Tauri data directory).
