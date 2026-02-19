---
title: Moco
description: Connect roots to your Moco account
---

# Moco

Moco is roots' primary time tracking service. It provides time entries, project data and attendance records.

## What You Need

| Setting | Value |
|---------|-------|
| **Domain** | Your Moco subdomain (e.g. `mycompany`) |
| **API Key** | Personal API token from your Moco profile |

## Step-by-Step

### 1. Find Your API Key

1. Log in to your Moco account (`https://<domain>.mocoapp.com`)
2. Click your avatar in the top-right corner
3. Go to **Profile**
4. Navigate to **Integrations** (or **API**)
5. Copy your **Personal API Key**

::: warning Keep your key safe
The API key grants full access to your Moco account. Do not share it.
:::

### 2. Connect in roots

1. Open the Connection Manager
2. Select the **Moco** tab
3. Enter your domain (just the subdomain, without `.mocoapp.com`)
4. Paste the API key
5. Click **Connect**

roots validates the connection by calling the Moco session endpoint. On success you'll see a green checkmark.

## What roots Fetches

| Data | Endpoint | Description |
|------|----------|-------------|
| Time entries | `/api/v1/activities` | Your booked hours per day |
| Projects | `/api/v1/projects/assigned` | Projects and tasks assigned to you |
| Project tasks | `/api/v1/projects/{id}/tasks` | Tasks within a project |
| Project reports | `/api/v1/projects/{id}` | Project details and report data |
| Presences | `/api/v1/users/presences` | Attendance / clock-in records |

## Features

### Time Entries

- **View & edit** time entries directly in roots
- **Create new entries** via the timer, quick-booking or from Outlook events
- **Delete entries** from the context menu
- **Save as draft** when stopping the timer for later booking

### Presence Management

Full CRUD operations for Moco presences (clock-in/clock-out):

- **View** presence times in the [Presence Bar](/guide/timeline#presence-bar)
- **Create** new time slots with start/end times
- **Edit** existing time slots
- **Delete** individual presence entries
- **Toggle Home Office** mode for the day

Presences are displayed as a progress bar in the timeline header, showing booked vs. unbooked time, breaks and a live "now" marker.

## Troubleshooting

### "Authentication failed"

- Verify your API key is still valid (regenerate if needed)
- Check that the domain matches your Moco URL exactly

### "Network error"

- In browser mode: ensure the CORS proxy is running (`cd proxy && node server.js`)
- The desktop app connects directly — no proxy needed

### Entries not loading

- Moco data is cached for 5 minutes. Pull to refresh or wait for the cache to expire.
- Check that you have time entries for the selected date range.
