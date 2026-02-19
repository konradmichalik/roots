---
title: Outlook
description: Connect roots to Microsoft Outlook via OAuth 2.0
---

# Outlook

roots connects to Outlook (Microsoft 365) via the **Microsoft Graph API** using OAuth 2.0 with PKCE. It imports your calendar events so you can compare meetings against booked time.

## Prerequisites

You need an **Azure App Registration**. This is a one-time setup performed by you or your IT admin.

### Creating an Azure App Registration

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **New registration**
3. Fill in:
   - **Name**: `roots` (or any name)
   - **Supported account types**: "Accounts in this organizational directory only" (single tenant)
   - **Redirect URI**:
     - Platform: **Single-page application (SPA)**
     - URI: `http://localhost:1420` (for dev) or `roots://oauth/callback` (for desktop)
4. Click **Register**
5. Copy the **Application (client) ID** and **Directory (tenant) ID** from the overview page

### Required API Permissions

On the app registration page, go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**:

| Permission | Purpose |
|------------|---------|
| `Calendars.Read` | Read your calendar events |
| `User.Read` | Identify the signed-in user |
| `offline_access` | Keep the session alive with refresh tokens |

::: tip
These are **delegated** permissions — they only access data of the signed-in user, not other accounts.
:::

### Redirect URIs

Add both redirect URIs to your app registration to support desktop and browser mode:

| Mode | Redirect URI |
|------|-------------|
| Desktop (Tauri) | `roots://oauth/callback` |
| Browser (dev) | `http://localhost:1420` |

---

## What You Need

| Setting | Value |
|---------|-------|
| **Client ID** | Application (client) ID from Azure |
| **Tenant ID** | Directory (tenant) ID from Azure |

## Connect in roots

1. Open the Connection Manager
2. Select the **Outlook** tab
3. Paste your **Client ID** and **Tenant ID**
4. Click **Sign in with Microsoft**
5. A browser window opens — sign in with your Microsoft account
6. Grant the requested permissions
7. You're redirected back to roots — the connection is established

::: info
roots uses the **PKCE** (Proof Key for Code Exchange) flow. No client secret is needed — the flow is secure for public clients like desktop apps.
:::

## Token Management

- **Access tokens** expire after ~1 hour and are refreshed automatically
- **Refresh tokens** are stored locally and used to obtain new access tokens
- If the refresh token expires, you'll be prompted to sign in again

## What roots Fetches

| Data | Endpoint | Description |
|------|----------|-------------|
| Calendar events | `/me/calendarView` | Events in the selected date range |

roots automatically filters out:

- Events marked as **Free** (transparent)
- Events you have **Declined**

## Features

- **View** calendar events with subject, time and duration
- **Online meeting indicator** for Teams/Zoom meetings
- **Quick book** — create a Moco entry directly from an Outlook event

## Troubleshooting

### "Sign-in failed"

- Verify the Client ID and Tenant ID are correct (UUID format)
- Check that the redirect URI is registered in Azure (exact match required)
- Ensure the required API permissions have been granted

### "Session expired"

- Click **Re-authenticate** in the Connection Manager
- If persistent, remove the app from [My Apps](https://myapps.microsoft.com/) and reconnect

### "No events found"

- roots only shows events from your **default calendar**
- All-day events, free time slots and declined events are filtered out
