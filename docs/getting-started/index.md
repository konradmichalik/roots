---
title: Introduction
description: What is roots and what problem does it solve?
---

# Introduction

roots is a desktop application that aggregates work time from multiple tools into a single, unified overview. Instead of switching between Moco, Jira, Outlook and Personio, roots displays all entries side by side in a timeline.

## The Problem

In day-to-day work, time is often tracked across several systems:

- **Moco** for official time booking and invoicing
- **Jira** for worklogs on tickets
- **Outlook** for meetings and calendar events
- **Personio** for absences and work schedules

Without a central tool it's hard to tell whether all hours have been recorded correctly and whether the totals across systems actually match.

## The Solution

roots connects to all four services and displays the data in columns, side by side:

- **Day view** with entries per service
- **Week view** with daily bars and target/actual comparison
- **Month view** with calendar overview

Additionally, roots automatically detects which entries from different sources belong together (cross-source matching).

## Requirements

- At least one account with Moco, Jira, Outlook or Personio
- For the desktop app: macOS (more platforms planned)
- For browser mode: Node.js 18+ (CORS proxy required)
