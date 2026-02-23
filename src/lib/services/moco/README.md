# Moco Service

API client for [Moco](https://www.mocoapp.com/) time tracking and attendance.

## Authentication

- **Method**: API Key (token-based)
- **Header**: `Authorization: Token token={apiKey}`
- **Base URL**: `https://{domain}.mocoapp.com/api/v1`

## Connection Config

```typescript
interface MocoConnectionConfig {
  domain: string; // e.g. "company" -> company.mocoapp.com
  apiKey: string; // Personal API key from Moco profile
}
```

## Client

`MocoClient` extends `ApiClient` and provides:

### Time Entries (Activities)

| Method                     | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `getActivities(from, to)`  | Time entries for date range (filtered by current user) |
| `createActivity(data)`     | Create a new time entry                                |
| `updateActivity(id, data)` | Update a time entry                                    |
| `deleteActivity(id)`       | Delete a time entry                                    |

### Projects & Tasks

| Method                        | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `getAssignedProjects()`       | Projects assigned to the user (incl. tasks) |
| `getProjectTasks(projectId)`  | Tasks for a project with budget info        |
| `getProjectReport(projectId)` | Budget/hours report per task                |

### Attendance (Presences)

| Method                     | Description                       |
| -------------------------- | --------------------------------- |
| `getPresences(from, to)`   | Attendance entries for date range |
| `createPresence(data)`     | Create a new attendance entry     |
| `updatePresence(id, data)` | Update an attendance entry        |
| `deletePresence(id)`       | Delete an attendance entry        |

## Types

- `MocoActivity` — Time entry with project, task, customer, hours
- `MocoProjectAssigned` — Assigned project with tasks and contract
- `MocoPresence` — Attendance record (from/to, home office, break)
- `MocoProjectReport` — Budget report with costs per task

## Notes

- **User filtering**: `currentUserId` is set during `testConnection()` and automatically applied to all queries
- **Remote tickets**: Activities can contain `remote_service`/`remote_id` (link to Jira etc.)
- **Billable flag**: Available at both project and task level
