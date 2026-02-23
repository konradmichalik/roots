# Personio Service

API client for [Personio](https://www.personio.de/) HR system (absences and work schedules).

## Authentication

- **Method**: Client credentials (OAuth2-like)
- **Endpoint**: `POST /v1/auth` with `client_id` + `client_secret`
- **Token**: Bearer token, valid for 24h
- **Auto-refresh**: Automatically re-authenticates 5min before expiry

## Connection Config

```typescript
interface PersonioConnectionConfig {
  clientId: string;      // Personio API Client ID
  clientSecret: string;  // Personio API Client Secret
  email: string;         // Employee email (for identification)
  employeeId?: number;   // Automatically set during testConnection()
}
```

## Client Methods

| Method | Description |
|--------|-------------|
| `testConnection()` | Authenticate + find employee by email |
| `findCurrentEmployee()` | Employee search via `/v1/company/employees` |
| `getTimeOffs(from, to)` | Approved absences in date range |
| `getAbsenceBalance()` | Remaining vacation days and other absence balances |
| `getWorkSchedule(employee)` | Weekly work hours from work schedule |

## Data Flow

Personio does **not** provide time entries. Instead it provides:

1. **Absences** (`getTimeOffs`) — Stored as `PersonioAbsence` in the `absences` store
2. **Work schedule** (`getWorkSchedule`) — Overwrites `settings.weekdayHours` (required hours per weekday)

## Absence Type Mapping

`mapTimeOffToAbsence()` converts Personio `TimeOff` to internal `PersonioAbsence`:

| Personio Type (name) | Internal Type |
|----------------------|---------------|
| "Urlaub", "Vacation", "Holiday" | `vacation` |
| "Krank", "Sick", "Illness" | `sick` |
| "Feiertag", "Public Holiday" | `public_holiday` |
| "Sonderurlaub", "Child Sick" | `personal` |
| Other | `other` |

Matching is case-insensitive via keywords in the type name.

## Work Schedule Parsing

`getWorkSchedule()` parses ISO 8601 durations from the Personio work schedule:

```
"PT28800S" → 8.0 hours (28800 seconds / 3600)
"PT0S"     → 0.0 hours (non-working day)
```

Returns a `WeekdayHours` tuple: `[Mon, Tue, Wed, Thu, Fri, Sat, Sun]`

## Notes

- **Approved only**: Only time-offs with `status === 'approved'` are returned
- **Employee ID**: Automatically determined from email during connection test
- **CORS proxy**: Uses its own proxy path (`/personio`)
- **Token persistence**: Token is stored and reused on restart
