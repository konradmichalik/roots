# AGENTS.md

## Project overview

Roots is a Svelte 5 and Tauri 2 desktop app that aggregates work time from Moco, Jira (Cloud and Server), Outlook and Personio into one unified timeline. It also runs in the browser through a small CORS proxy.

- Node 20 in CI, Rust stable for the Tauri backend
- Tailwind CSS v4, `bits-ui` primitives, shadcn-svelte wrappers, `@lucide/svelte` icons
- `README.md` covers the product, `STYLEGUIDE.md` the design tokens, `docs/` the VitePress documentation site

## Structure

- `src/lib/services/`: one folder per external service (`moco`, `jira`, `outlook`, `personio`), each with `client.ts`, `types.ts`, `schemas.ts`, `index.ts` and a `README.md`. `base-client.ts` holds the abstract `ApiClient` with platform-aware fetch, factories live in `services/index.ts`
- `src/lib/stores/*.svelte.ts`: Svelte 5 rune-based stores (`connections`, `timeEntries`, `settings`, `absences`, `favorites`, `presences`, `timer`, `rules`, and others)
- `src/lib/types/`: shared cross-cutting types, barrel-exported via `index.ts`. Service-specific types live in `services/*/types.ts`
- `src/lib/components/`: organized by feature (`timeline`, `sidebar`, `settings`, `connection`, `entries`, `timer`, `moco`, `jira`, `absences`, `favorites`, `stats`, `screens`, and more). UI primitives are in `ui/` (shadcn-svelte)
- `src/lib/utils/`: date helpers, time formatting, `storage.ts`, logger, retry, Jira issue parser, booking suggestions
- `src-tauri/`: Rust backend (Tauri plugins `http`, `store`, `shell`, plus a few commands in `src/`)
- `proxy/`: CORS proxy for browser mode (`server.js`, port 3002)
- `scripts/`: `release.js`, `sync-version.js`
- `docs/`: VitePress site

Data flow: services, API clients, `UnifiedTimeEntry` mapping, `timeEntries` store (month-based cache with 5 minute TTL), components. Personio feeds the absences and settings stores (work schedule, weekday hours), and it provides no time entries. Public holidays come from Moco's `/schedules` endpoint.

## Development commands

```bash
npm run dev            # Vite dev server (browser mode, needs the proxy)
npm run tauri:dev      # Tauri desktop dev (Rust and Vite)
npm run build          # Vite production build
npm run tauri:build    # Tauri desktop production build
npm run release        # bump version, sync tauri config, tag and push
npm run docs:dev       # VitePress dev server
```

Browser mode requires the CORS proxy: `cd proxy && node server.js`. Requests carry the real service URL in the `X-Service-Base-Url` header. In Tauri mode requests go directly to the service through `@tauri-apps/plugin-http`.

## Testing

```bash
npm run test           # vitest run (node environment, $lib alias)
cd src-tauri && cargo test
```

CI (`.github/workflows/lint.yml`, on pushes to `main` and pull requests) runs both suites after the lint steps.

## Code style and linting

```bash
npm run check          # svelte-check and tsc (tsconfig.app.json, tsconfig.node.json)
npm run lint           # ESLint on src/
npm run lint:fix
npm run format:check   # Prettier on src/
npm run format
```

CI runs `format:check`, `lint`, `check`, `test` and `cargo test`. Prettier: single quotes, semicolons, 2 spaces, print width 100, no trailing commas.

Conventions:

- Svelte 5 runes only (`$state`, `$derived`, `$props`, `$effect`). No `$:` statements, no `writable` or `readable` stores
- `$lib` maps to `src/lib/`
- Dates are `YYYY-MM-DD` strings, never `Date` objects. Use `date-helpers.ts`
- Class merging with `cn()` from `$lib/utils`, component variants with `tv()` from `tailwind-variants`. Design tokens are `--ds-*` CSS custom properties (Nord palette), see `STYLEGUIDE.md`
- Vite injects the globals `__APP_VERSION__`, `__APP_NAME__`, `__BUILD_DATE__`
- Version lives in `package.json` and is synced to `src-tauri/tauri.conf.json` by `scripts/sync-version.js`

Store pattern: an exported `$state` object, an async `initialize*()` function that hydrates from storage, action functions that mutate state and persist, and `$derived` selectors.

```typescript
export const fooState = $state<FooState>({ ... });
export async function initializeFoo(): Promise<void> { /* hydrate from storage */ }
export function updateFoo(partial: Partial<FooState>): void {
  Object.assign(fooState, partial);
  saveStorage(STORAGE_KEYS.FOO, fooState);
}
```

API client pattern: extend `ApiClient`, implement `getAuthHeaders()`, `serviceName` and `testConnection()`, then add domain methods.

Storage: `storage.ts` uses Tauri `plugin-store` (persisted to `settings.json`) with a `localStorage` fallback decided by `isTauri()`. All keys live in `STORAGE_KEYS` and are prefixed with `roots:`.

Jira supports several simultaneous connections (Cloud and Server). `connectionsState.jiraConnections` is a registry keyed by connection ID, `JiraMetadata.connectionId` traces each worklog to its instance, and fetching uses `Promise.allSettled()` so one failing connection does not block the others. Cloud uses `/rest/api/3/search/jql` with token pagination, Server uses `/rest/api/2/search` with offset pagination.

## Git workflow

- Commit format: `<type>: <description>` with `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`
- No co-author trailers
- Pushes to `main` deploy to Vercel and rebuild the docs. Tags matching `v*` trigger the release build
