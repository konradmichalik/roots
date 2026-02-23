# Services

Service modules for the external API integrations of Roots.

## Structure

```
services/
├── base-client.ts       # Abstract base class for API clients
├── validate.ts          # Zod validation for API responses
├── index.ts             # Factory functions + re-exports
│
├── moco/                # Moco time tracking
├── jira/                # Jira Cloud & Server worklogs
├── outlook/             # Microsoft Outlook calendar (OAuth2)
└── personio/            # Personio HR (absences, work schedules)
```

## Per-Service Layout

Each service folder follows the same pattern:

| File | Contents |
|------|----------|
| `client.ts` | API client class(es) |
| `types.ts` | TypeScript interfaces for API data + connection config |
| `schemas.ts` | Zod schemas for runtime validation |
| `index.ts` | Barrel export |
| `README.md` | Service-specific documentation |

## Factory Functions

Clients are created via factory functions (`services/index.ts`):

```typescript
import {
  createMocoClient,
  createJiraWorklogClient,
  createOutlookClient,
  createPersonioClient
} from '$lib/services';
```

## Base Client

`ApiClient` (`base-client.ts`) provides:

- **Platform-aware fetch**: Tauri `plugin-http` vs. browser `fetch` via CORS proxy
- **Automatic auth headers**: Each client implements `getAuthHeaders()`
- **Timeout & error handling**: Configurable, with `ApiError` class
- **Proxy support**: `X-Service-Base-Url` header for browser mode

## Validation

`validateResponse()` (`validate.ts`) validates API responses against Zod schemas.
On validation failure a warning is logged, but the data is returned as-is
(graceful degradation for unexpected API changes).

## Adding a New Service

1. Create folder `services/<name>/`
2. Create `types.ts` with connection config and API interfaces
3. Create `schemas.ts` with Zod schemas for API responses
4. Create `client.ts` with client class (extends `ApiClient` or standalone)
5. Create `index.ts` barrel export
6. Create `README.md` with service documentation
7. Add factory function to `services/index.ts`
8. Re-export connection config type in `types/index.ts`
9. Add connection logic to `stores/connections.svelte.ts`

## Dependencies

```
Components → Stores → Services → External APIs
                         ↓
                     utils/ (logger, storage, retry)
                     types/ (shared: UnifiedTimeEntry, DayOverview, etc.)
```

Stores import services via `$lib/services`.
Components never call API clients directly.
