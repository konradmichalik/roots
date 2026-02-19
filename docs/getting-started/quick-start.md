---
title: Quick Start
description: Get up and running in 5 minutes
---

# Quick Start

After installation, three steps are needed to start using roots productively.

## 1. Launch roots

Start the desktop app or the dev server (`npm run tauri:dev`).

## 2. Connect a Service

Click the **Connect** button in one of the source columns (Moco, Jira, Outlook) or open the Connection Manager from the settings menu.

Each service requires different credentials:

| Service | What you need |
|---------|---------------|
| **Moco** | Domain + API Key |
| **Jira Cloud** | URL + Email + API Token |
| **Jira Server** | URL + PAT or Username/Password |
| **Outlook** | Azure Client ID + Tenant ID |
| **Personio** | Client ID + Secret + Email |

::: tip
Step-by-step instructions for each service are available under [Connections](/connections/).
:::

## 3. Use the Timeline

After a successful connection roots automatically loads data for the current day. Navigate through days using the arrow buttons or the calendar sidebar.

- **Click an entry** to open the context menu (edit, delete)
- **Hover over an entry** to highlight matched entries in other columns
- **Target/actual bar** in the header shows the current balance per day

## Next Steps

- [Connect Moco](/connections/moco) — set up time booking
- [Connect Jira](/connections/jira) — import worklogs
- [Connect Outlook](/connections/outlook) — sync your calendar
- [Connect Personio](/connections/personio) — absences and work schedule
