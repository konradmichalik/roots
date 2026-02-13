---
title: Features Overview
description: What Roots can do
---

# Features

Roots combines work time data from multiple services into a single interface. Here's what you can do with it.

## Core Features

### Unified Timeline

The main view shows time entries from all connected services in parallel columns. Each service gets its own column — Moco, Jira and Outlook entries are displayed side by side for easy comparison.

### Cross-Source Matching

Roots automatically detects entries that likely refer to the same work across different services. When you hover over an entry, matched entries in other columns are highlighted. Matching uses confidence scores based on time overlap and description similarity.

### Target/Actual Comparison

The header shows a progress bar for each day, comparing booked hours against your daily target (derived from Personio work schedule or manual settings).

### Favorites

Pin frequently used project/task combinations as favorites for one-click booking. Favorites support drag-and-drop reordering.

### Timer

Start a timer to track work in real-time. When you stop the timer, Roots creates a Moco time entry automatically.

## Views

| View | Description |
|------|-------------|
| **Day** | Detailed column view with all entries |
| **Week** | Daily summary bars with totals |
| **Month** | Calendar overview with daily hours |

## Data Sources

| Service | Entries | Edit | Create | Delete |
|---------|---------|------|--------|--------|
| **Moco** | Time entries | Yes | Yes | Yes |
| **Jira** | Worklogs | Yes | Yes | Yes |
| **Outlook** | Calendar events | No | No | No |
| **Personio** | Absences | No | No | No |

Outlook events and Personio absences are read-only — they provide context but cannot be modified from Roots.
