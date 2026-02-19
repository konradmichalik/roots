---
title: Browser vs. Desktop
description: Feature differences between browser and desktop mode
---

# Browser vs. Desktop

roots can run in the browser (via `npm run dev`) or as a native desktop app (via `npm run tauri:dev`). Here's how they compare.

## Feature Comparison

| Feature | Desktop (Tauri) | Browser |
|---------|----------------|---------|
| CORS proxy required | No | Yes |
| HTTP requests | Via `@tauri-apps/plugin-http` | Native `fetch` through proxy |
| Storage | Tauri secure store | `localStorage` |
| OAuth redirect | `roots://oauth/callback` (deep link) | `window.location.origin` |
| Personio connection | Direct | Via CORS proxy |
| Auto-updates | Planned | N/A |
| System tray | Planned | N/A |

## When to Use Which

### Desktop App
- Daily use with all services
- Best experience for Outlook OAuth
- No proxy setup required

### Browser Mode
- During development and debugging
- Quick testing without Rust toolchain
- When contributing to the frontend

## CORS Proxy (Browser Only)

Browser security policies prevent direct API calls to third-party services. The included proxy server forwards requests and adds the necessary CORS headers.

```bash
cd proxy && node server.js
# Runs on localhost:3002
```

The proxy passes the real service URL via the `X-Service-Base-Url` header. It includes a domain whitelist and SSRF protection.

::: warning
The proxy is for local development only. Never expose it to the public internet.
:::
