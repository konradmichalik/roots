---
title: Connections Overview
description: How to connect Roots to your services
---

# Connections

Roots supports four services. Each one is optional — connect whichever ones you use.

## Supported Services

| Service | Auth Method | What it provides | Required? |
|---------|-------------|------------------|-----------|
| [Moco](/connections/moco) | API Key | Time entries, projects, presences | No |
| [Jira](/connections/jira) | Email + Token (Cloud) or PAT (Server) | Worklogs | No |
| [Outlook](/connections/outlook) | OAuth 2.0 (PKCE) | Calendar events | No |
| [Personio](/connections/personio) | Client ID + Secret | Absences, work schedule | No |

## Connection Manager

Open the Connection Manager via the settings icon in the top bar or by clicking the **Connect** button in an empty source column.

Each service has its own form. After entering credentials Roots tests the connection immediately — a green checkmark confirms success.

## Credential Storage

All credentials are stored locally on your device:

- **Desktop app**: Persisted in Tauri's secure store (`settings.json`)
- **Browser mode**: Stored in `localStorage`

::: info
Credentials never leave your machine. Roots communicates directly with each service API — there is no intermediary server.
:::

## Disconnecting

Each service can be disconnected individually from the Connection Manager. Disconnecting clears the stored credentials and removes cached data for that service.
