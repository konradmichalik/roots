---
title: Timeline
description: Day, week and month views explained
---

# Timeline

The timeline is Roots' main interface. It shows your work time across all connected services.

## Day View

The day view displays entries in columns — one per connected service. Each card shows:

- **Title** — project name, issue key or event subject
- **Duration** — time in decimal hours
- **Time range** — start and end time (where available)
- **Description** — entry comment or event details

### Interactions

- **Click** an entry to open the context menu (edit, delete, view in source)
- **Hover** to highlight matched entries across columns
- **Right-click** for quick actions

### Entry Cards

Cards are color-coded by service and show action icons on hover:

- **Pencil** — edit the entry (Moco, Jira)
- **Plus** — book an Outlook event as a Moco entry
- **Link** — open the entry in the source application

## Week View

Shows one bar per day with the total hours stacked by service. Useful for spotting days where hours are missing or imbalanced.

## Month View

A calendar grid showing daily totals. Days are color-coded:

- **Green** — target hours met
- **Yellow** — partially booked
- **Red** — significantly under target
- **Gray** — weekend or absence

## Navigation

- **Arrow buttons** in the header to go forward/backward
- **Calendar sidebar** for date picking
- **Today button** to jump back to the current date

## Caching

Time entries are cached for 5 minutes per month. Pull to refresh or navigate away and back to trigger a fresh load.
