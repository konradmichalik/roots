---
title: Moco
description: Connect Roots to your Moco account
---

# Moco

Moco is Roots' primary time tracking service. It provides time entries, project data and attendance records.

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

### 2. Connect in Roots

1. Open the Connection Manager
2. Select the **Moco** tab
3. Enter your domain (just the subdomain, without `.mocoapp.com`)
4. Paste the API key
5. Click **Connect**

Roots validates the connection by calling the Moco session endpoint. On success you'll see a green checkmark.

## What Roots Fetches

| Data | Endpoint | Description |
|------|----------|-------------|
| Time entries | `/api/v1/activities` | Your booked hours per day |
| Projects | `/api/v1/projects/assigned` | Projects and tasks assigned to you |
| Presences | `/api/v1/users/presences` | Attendance / clock-in records |

## Features

- **View & edit** time entries directly in Roots
- **Create new entries** via the timer or quick-booking
- **Delete entries** from the context menu
- **Presence tracking** with start/end times

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
