---
title: Jira
description: Connect roots to Jira Cloud or Jira Server
---

# Jira

roots supports both **Jira Cloud** and **Jira Server / Data Center**. It imports worklogs — the time you've logged on Jira issues.

## Jira Cloud

### What You Need

| Setting | Value |
|---------|-------|
| **Base URL** | `your-domain.atlassian.net` |
| **Email** | Your Atlassian account email |
| **API Token** | Token from Atlassian account settings |

### Creating an API Token

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Enter a label (e.g. "roots")
4. Copy the generated token

::: warning
The token is shown only once. Store it securely before closing the dialog.
:::

### Connect in roots

1. Open the Connection Manager
2. Select the **Jira** tab
3. Choose **Cloud** as instance type
4. Enter your Atlassian URL (e.g. `company.atlassian.net`)
5. Enter your email and paste the API token
6. Click **Connect**

---

## Jira Server / Data Center

### What You Need

| Setting | Value |
|---------|-------|
| **Base URL** | `https://jira.your-company.com` |
| **Auth method** | Personal Access Token (PAT) **or** Username + Password |

### Option A: Personal Access Token (recommended)

1. Log in to your Jira Server instance
2. Go to **Profile** → **Personal Access Tokens**
3. Click **Create token**
4. Set a name and optional expiration date
5. Copy the token

### Option B: Basic Authentication

Use your Jira username and password. This method is less secure and may not work if your organization enforces SSO.

::: tip
PAT authentication is recommended over username/password for better security and compatibility.
:::

### Connect in roots

1. Open the Connection Manager
2. Select the **Jira** tab
3. Choose **Server / Data Center** as instance type
4. Enter the full base URL of your Jira instance
5. Select auth method (PAT or Basic) and enter credentials
6. Click **Connect**

---

## What roots Fetches

| Data | Description |
|------|-------------|
| Worklogs | Time logged by you on any issue within the selected date range |
| Issue metadata | Issue key, summary, type and project (for display context) |

roots uses JQL to find issues with worklogs in the selected date range, then filters for your entries.

## Features

- **View** worklogs with issue key, summary and time spent
- **Create, edit and delete** worklogs directly from roots
- **Issue link** — click an issue key to open it in Jira

## Troubleshooting

### "Authentication failed"

- **Cloud**: Verify email matches your Atlassian account. Regenerate the API token if expired.
- **Server**: Check that PATs are enabled by your admin. For basic auth, verify your username (not email).

### "No worklogs found"

- roots only shows worklogs authored by **you**. Entries from other users are filtered out.
- Check that you have worklogs for the selected date — roots searches by `worklogDate`, not issue creation date.

### Rate limiting (429)

- Jira Cloud has API rate limits. roots retries automatically with exponential backoff.
- If persistent, reduce the date range or wait a few minutes.
