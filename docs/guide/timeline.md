---
title: Timeline
description: The day view explained
---

# Timeline

The timeline is roots' main interface. It shows your work time across all connected services in a day view with parallel columns.

![Day View with Outlook, Moco and Jira columns](/images/roots-overview.jpg)

## Day View

The day view displays entries in columns — one per connected service. Each card shows:

- **Title** — project name, issue key or event subject
- **Duration** — time in decimal hours
- **Time range** — start and end time (where available)
- **Description** — entry comment or event details

### Interactions

- **Click** an entry to open the context menu (edit, delete, view in source)
- **Hover** to highlight matched entries across columns — entries with the same ticket key or overlapping time are connected visually

![Cross-source matching between Moco and Jira](/images/roots-highlight.jpg)
- **Right-click** for quick actions

### Entry Cards

Cards are color-coded by service and show action icons on hover:

- **Pencil** — edit the entry (Moco, Jira)
- **Plus** — book an Outlook event as a Moco entry
- **Link** — open the entry in the source application

## Presence Bar

When Moco is connected, a presence progress bar appears below the header. It visualizes your working time for the day:

![Presence bar with tooltip showing time slots and gaps](/images/roots-prescence-bar.jpg)

- **Green segments** — time covered by booked entries
- **Red segments** — presence time not yet booked
- **Gray segments** — breaks/gaps between presence slots
- **Now marker** — shows the current time on today's bar

Click the presence bar to open the Presence Modal where you can add, edit or delete time slots and toggle Home Office mode.

::: tip
The bar also shows a projected end time when your presence is still open (clock-in without clock-out).
:::

## Sidebar Stats

![Sidebar with calendar and statistics](/images/roots-sidebar.jpg)

The sidebar shows summary statistics for the current week and month:

- **Week balance** — booked vs. target hours (Mon–Fri), with an "until yesterday" breakdown
- **Month balance** — booked vs. target hours for all working days, with progress bar

Click the sidebar stats to open the full [Statistics](/guide/stats) modal.

## Navigation

- **Arrow buttons** in the header to go forward/backward
- **Calendar sidebar** for date picking
- **Today button** to jump back to the current date

## Caching

Time entries are cached for 5 minutes per month. Pull to refresh or navigate away and back to trigger a fresh load.
