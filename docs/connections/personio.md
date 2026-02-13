---
title: Personio
description: Connect Roots to Personio for absences and work schedule
---

# Personio

Personio provides **absences** (vacation, sick leave, etc.) and your **work schedule** (weekly hours per day). Unlike the other services, Personio does not provide time entries — it supplements the timeline with context.

## What You Need

| Setting | Value |
|---------|-------|
| **Client ID** | Personio API client ID |
| **Client Secret** | Personio API client secret |
| **Email** | Your Personio employee email (must match exactly) |

## Step-by-Step

### 1. Create API Credentials

::: info
API credentials are managed by your Personio administrator. If you don't have access, ask your HR or IT team.
:::

1. Log in to Personio as an admin
2. Go to **Settings** → **Integrations** → **API Credentials**
3. Click **Generate new credentials**
4. Set the required permissions:
   - **Employees**: Read
   - **Absences**: Read
5. Copy the **Client ID** and **Client Secret**

::: warning
The Client Secret is shown only once. Store it securely.
:::

### 2. Connect in Roots

1. Open the Connection Manager
2. Select the **Personio** tab
3. Enter Client ID and Client Secret
4. Enter **your employee email** — this must match the email in your Personio profile exactly
5. Click **Connect**

Roots authenticates with the Personio API, looks up your employee record by email, and reads your work schedule.

## What Roots Fetches

| Data | Description |
|------|-------------|
| **Absences** | Approved time-offs (vacation, sick, public holiday, etc.) |
| **Work schedule** | Your contracted hours per weekday (e.g. Mon–Fri 8h) |
| **Absence balance** | Remaining vacation days |

## Automatic Settings Sync

When Personio is connected, Roots automatically:

- **Updates weekly hours** from your work schedule (e.g. 8h Mon–Fri, 0h Sat–Sun)
- **Marks absence days** in the calendar and timeline
- **Disables manual editing** of weekly hours and absences (Personio is the source of truth)

::: tip
If you disconnect Personio, manual editing of hours and absences is re-enabled.
:::

## Absence Types

Roots maps Personio absence types to visual indicators:

| Type | Display |
|------|---------|
| Vacation | Highlighted in calendar |
| Sick leave | Highlighted in calendar |
| Public holiday | Highlighted in calendar |
| Personal time off | Highlighted in calendar |
| Other | Highlighted in calendar |

## Troubleshooting

### "Employee not found"

- The email you entered must **exactly** match your Personio profile email (case-sensitive)
- Ask your admin to verify which email is on your Personio employee record

### "Authentication failed"

- Verify Client ID and Client Secret are correct
- Check that the API credentials have **Employee** and **Absence** read permissions
- API credentials may have been revoked — ask your admin to regenerate them

### "Absences not showing"

- Only **approved** absences are imported. Pending requests are not shown.
- Check the date range — Personio returns absences for the queried period only.
