<p align="center">
  <img src="roots-logo.svg" alt="Roots Logo" width="200" />
</p>

<h1 align="center">roots</h1>

<p align="center">
  <strong>Unified work time overview across Moco, Jira, Outlook and Personio</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Svelte-5-ff3e00?logo=svelte" alt="Svelte 5" />
  <img src="https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss" alt="Tailwind CSS" />
</p>

---

Roots aggregates your work time from multiple services into a single desktop app. It pulls data from Moco, Jira, Outlook and Personio, then reconciles and displays everything in day, week and month views.

## Features

- **Multi-Service Integration** - Connect Moco, Jira (Cloud & Server), Outlook and Personio
- **Unified Timeline** - Day, week and month views across all services
- **Reconciliation** - Confidence-based matching and comparison between services
- **Native Desktop App** - Lightweight Tauri app, no browser CORS issues
- **Dark Mode** - Light and dark theme support

## Quick Start

```bash
git clone https://github.com/konradmichalik/roots.git
cd roots
npm install
```

### Development (Browser)

```bash
# Start the CORS proxy (required for browser mode)
cd proxy && npm install && node server.js &

# Start the dev server
npm run dev
```

### Development (Desktop)

```bash
npm run tauri:dev
```

## Requirements

- Node.js 18+
- Rust toolchain (for Tauri builds)
- One or more of: Moco, Jira, Outlook account

## Supported Services

| Service | Auth Method |
|---------|------------|
| **Moco** | API Key |
| **Jira Cloud** | Email + API Token |
| **Jira Server** | Username/Password or PAT |
| **Outlook** | OAuth2 |
| **Personio** | API Credentials (planned) |

## Tech Stack

- **[Svelte 5](https://svelte.dev/)** with TypeScript and Runes
- **[Tauri 2](https://tauri.app/)** for native desktop runtime
- **[Tailwind CSS v4](https://tailwindcss.com/)** for styling
- **[shadcn-svelte](https://www.shadcn-svelte.com/)** UI components

## Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run tauri:dev` | Desktop app development |
| `npm run tauri:build` | Build native app bundle |
| `npm run check` | TypeScript type checking |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier formatting |

## License

MIT
