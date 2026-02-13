---
title: API Clients
description: How the API client layer works
---

# API Clients

All API communication is handled by client classes in `src/lib/api/`. Each client extends a shared base class that provides platform-aware fetch, error handling and retry logic.

## Base Client

`ApiClient` (`base-client.ts`) is the abstract foundation:

```typescript
abstract class ApiClient {
  // Every client must implement:
  protected abstract getAuthHeaders(): Record<string, string>
  protected abstract get serviceName(): string
  abstract testConnection(): Promise<{ success: boolean; error?: string }>

  // Provided by the base:
  protected async request<T>(path, options?): Promise<T>
}
```

### Platform-Aware Fetch

`getPlatformFetch()` resolves the correct fetch implementation at runtime:

| Platform | Fetch | Behavior |
|----------|-------|----------|
| Tauri | `@tauri-apps/plugin-http` | Direct API calls, no CORS |
| Browser | Native `fetch` | Routed through CORS proxy |

In browser mode, the real service URL is passed via the `X-Service-Base-Url` header, and requests go to the proxy's `effectiveBaseUrl`.

### Error Handling

`ApiError` extends `Error` with:

- `status` — HTTP status code
- `isAuthError()` — 401/403
- `isRateLimitError()` — 429
- `isNotFoundError()` — 404

## Service Clients

### MocoClient

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getActivities(from, to)` | `GET /activities` | Time entries for date range |
| `createActivity(data)` | `POST /activities` | Create a time entry |
| `updateActivity(id, data)` | `PATCH /activities/{id}` | Update a time entry |
| `deleteActivity(id)` | `DELETE /activities/{id}` | Delete a time entry |
| `getAssignedProjects()` | `GET /projects/assigned` | User's projects with tasks |
| `getPresences(from, to)` | `GET /users/presences` | Attendance records |

**Auth**: `Authorization: Token token={apiKey}`

### JiraWorklogClient

Abstract base for Jira with two implementations:

| Implementation | API Version | Auth |
|---------------|-------------|------|
| `JiraCloudWorklogClient` | REST API v3 | Basic (email:token) |
| `JiraServerWorklogClient` | REST API v2 | Basic or Bearer PAT |

Shared methods:

| Method | Description |
|--------|-------------|
| `getWorklogsForRange(from, to)` | Fetch user's worklogs via JQL |
| `createWorklog(issueKey, data)` | Add worklog to an issue |
| `updateWorklog(issueKey, id, data)` | Update existing worklog |
| `deleteWorklog(issueKey, id)` | Remove worklog |

The JQL query: `worklogDate >= "YYYY-MM-DD" AND worklogDate <= "YYYY-MM-DD"` with pagination (50 issues per page).

### OutlookClient

Uses the Microsoft Graph API. Auth is handled by `OAuthManager` (PKCE flow).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getCalendarEvents(from, to)` | `GET /me/calendarView` | Calendar events in range |
| `testConnection()` | `GET /me` | Validate token |

**Token management**: Automatic refresh 5 minutes before expiry. Force refresh on 401. Retry on 5xx/429.

### PersonioClient

Two-step auth — first obtains a bearer token, then uses it for subsequent requests.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `authenticate()` | `POST /v1/auth` | Get bearer token (24h lifetime) |
| `getTimeOffs(from, to)` | `GET /v1/company/time-offs` | Approved absences |
| `getAbsenceBalance()` | `GET /v1/company/time-offs` | Vacation days remaining |
| `getWorkSchedule(employee)` | Parsed from employee data | Weekly hours |

## Factory Functions

`src/lib/api/index.ts` exports factory functions that create configured client instances:

```typescript
createMocoClient(config: MocoConnectionConfig): MocoClient
createJiraWorklogClient(config: JiraConnectionConfig): JiraWorklogClient
createOutlookClient(config: OutlookConnectionConfig): OutlookClient
createPersonioClient(config: PersonioConnectionConfig): PersonioClient
```

These are called from the `connections` store when a service is connected.
