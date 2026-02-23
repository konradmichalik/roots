# Jira Service

API client for Jira Cloud and Jira Server/Data Center worklogs.

## Architecture

```
JiraWorklogClient (abstract)     # Shared logic
├── JiraCloudWorklogClient       # Jira Cloud (API v3)
└── JiraServerWorklogClient      # Jira Server/DC (API v2)
```

The factory function `createJiraWorklogClient()` automatically creates the correct implementation based on `instanceType`.

## Authentication

### Jira Cloud
- **Method**: Basic Auth (Base64-encoded)
- **Credentials**: Email + API Token
- **Header**: `Authorization: Basic {base64(email:token)}`
- **API Version**: v3

### Jira Server / Data Center
- **Method**: Basic Auth OR Personal Access Token (PAT)
- **Basic**: `Authorization: Basic {base64(username:password)}`
- **PAT**: `Authorization: Bearer {token}`
- **API Version**: v2

Both send `X-Atlassian-Token: no-check` (CSRF protection).

## Connection Config

```typescript
interface JiraConnectionConfig {
  instanceType: 'cloud' | 'server';
  baseUrl: string;                    // e.g. "https://company.atlassian.net"
  credentials: JiraCredentials;       // Cloud or Server credentials
  proxyUrl?: string;                  // Optional, default: localhost:3002/jira
}
```

## Client Methods

| Method | Description |
|--------|-------------|
| `testConnection()` | Test connection via `/myself` endpoint |
| `getWorklogsForRange(from, to)` | All own worklogs in date range |
| `createWorklog(issueKey, payload)` | Create worklog on issue |
| `updateWorklog(issueKey, worklogId, payload)` | Update worklog |
| `deleteWorklog(issueKey, worklogId)` | Delete worklog |
| `extractWorklogComment(comment)` | Extract comment from string or ADF |

## Worklog Retrieval (Pagination)

1. JQL search: `worklogDate >= "from" AND worklogDate <= "to"` (paginated, 50 issues per page)
2. Per issue: Use inline worklogs if complete, otherwise fetch separately (`/issue/{key}/worklog`)
3. Filter by current user and date range

## ADF (Atlassian Document Format)

Jira Cloud v3 uses ADF for comments:

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    { "type": "paragraph", "content": [{ "type": "text", "text": "Comment" }] }
  ]
}
```

- **Cloud**: String comments are automatically converted to ADF
- **Server**: Comments remain as plain text

## User Identification

- **Cloud**: `accountId` (unique, privacy-compliant)
- **Server**: `key` or `name` (fallback chain)
