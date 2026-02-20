---
title: Installation
description: Install and set up roots
---

# Installation

## Desktop App (recommended)

### Homebrew

The easiest way to install and keep roots up to date:

```bash
brew tap konradmichalik/tap
brew install --cask roots
```

Update with `brew upgrade --cask roots`.

::: tip
Homebrew automatically removes the macOS quarantine attribute — no extra steps needed.
:::

### Manual Download

1. Download the latest version from [GitHub Releases](https://github.com/konradmichalik/roots/releases/latest)
2. Open the `.dmg` file and drag roots into your Applications folder
3. Remove the quarantine attribute so macOS allows the unsigned app:
   ```bash
   xattr -cr /Applications/Roots.app
   ```

::: tip
The desktop app connects directly to service APIs — no CORS proxy required.
:::

## From Source

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust Toolchain](https://www.rust-lang.org/tools/install) (for Tauri builds)

### Setup

```bash
git clone https://github.com/konradmichalik/roots.git
cd roots
npm install
```

### Desktop Mode (Tauri)

```bash
npm run tauri:dev
```

### Browser Mode

Browser mode requires the bundled CORS proxy:

```bash
# Terminal 1: Start the proxy
cd proxy && npm install && node server.js

# Terminal 2: Start the dev server
npm run dev
```

The proxy runs on `localhost:3002` and forwards API requests to the respective services.

::: warning
The CORS proxy is intended for local development only. Use the desktop app in production.
:::

## Production Build

```bash
# Web build
npm run build

# Native desktop build
npm run tauri:build
```
