# Outlook Service

API client for Microsoft Outlook calendar via MS Graph API.

## Authentication

- **Method**: OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- **Header**: `Authorization: Bearer {accessToken}`
- **Endpoint**: MS Graph v1.0 (`https://graph.microsoft.com/v1.0`)

### OAuth Flow

1. `startOAuthFlow()` generates PKCE code verifier + challenge
2. Redirect to Microsoft login (browser) or open system browser (Tauri)
3. Callback with authorization code (`detectOAuthCallback()`)
4. `exchangeCodeForTokens()` exchanges code for access + refresh token
5. Tokens are persisted to storage

### Token Management

- Access tokens expire after ~1h
- Automatic refresh via `ensureFreshTokens()` (5min buffer)
- On 401: single force-refresh + retry
- `TokenRefreshError` with `isPermanent` flag for non-retryable errors
- Refresh with retry logic (3 attempts, exponential backoff)

### Tauri vs. Browser

|              | Tauri                                | Browser                  |
| ------------ | ------------------------------------ | ------------------------ |
| Redirect URI | `roots://oauth/callback` (deep link) | `window.location.origin` |
| Browser      | System browser                       | In-place navigation      |
| Token POST   | Rust command (`http_post_form`)      | `fetch`                  |

PKCE state is stored in `localStorage` (survives navigation and deep-link round-trips).

## Connection Config

```typescript
interface OutlookConnectionConfig {
  clientId: string; // Azure App Registration Client ID
  tenantId: string; // Azure Tenant ID
  redirectUri: string; // Determined automatically per platform
}
```

## Client Methods

| Method                        | Description                    |
| ----------------------------- | ------------------------------ |
| `testConnection()`            | Test connection via `/me`      |
| `getCalendarEvents(from, to)` | Calendar events for date range |

## Event Filtering

Events are filtered:

- `showAs !== 'free'` (only busy/tentative/oof times)
- `responseStatus.response !== 'declined'` (no declined invitations)

Pagination via `@odata.nextLink`.

## Scopes

```
Calendars.Read User.Read offline_access
```

## Retry Logic

- **401**: Token refresh + 1 retry
- **429 / 5xx**: Exponential backoff (max 2 retries), `Retry-After` header is respected

## Files

| File               | Contents                                          |
| ------------------ | ------------------------------------------------- |
| `client.ts`        | `OutlookClient` (MS Graph requests)               |
| `oauth-manager.ts` | OAuth PKCE flow, token refresh, callback handling |
| `types.ts`         | MS Graph types + OAuth token types                |
| `schemas.ts`       | Zod schemas for MS Graph responses                |
