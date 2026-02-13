---
title: Installation
description: Install and set up Roots
---

# Installation

## Desktop App (recommended)

The easiest way to get started:

1. Download the latest version from [GitHub Releases](https://github.com/konradmichalik/roots/releases/latest)
2. Open the `.dmg` file and drag Roots into your Applications folder
3. On first launch: right-click the app and select "Open" (macOS Gatekeeper)

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
