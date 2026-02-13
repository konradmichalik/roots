---
title: Settings
description: Configure Roots to your preferences
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

## Theme

Roots supports light and dark themes. The theme follows your system preference by default and can be overridden in settings.

## Data Storage

All data is stored locally:

| Data | Desktop | Browser |
|------|---------|---------|
| Credentials | Tauri secure store | localStorage |
| Settings | Tauri secure store | localStorage |
| Cached entries | In-memory (per session) | In-memory (per session) |

Storage keys are prefixed with `roots:` to avoid conflicts.

## Clearing Data

To reset Roots to its initial state, disconnect all services and clear the browser storage (or delete `settings.json` from the Tauri data directory).
