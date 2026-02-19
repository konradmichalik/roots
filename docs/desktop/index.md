---
title: Desktop App
description: Roots as a native macOS application
---

# Desktop App

Roots is built with [Tauri 2](https://tauri.app/) and runs as a native macOS application. The desktop version is the recommended way to use Roots.

## Why Desktop?

- **No CORS proxy** — connects directly to service APIs
- **Native performance** — lightweight Rust backend
- **OAuth deep linking** — `roots://` protocol for seamless Microsoft sign-in
- **Persistent storage** — credentials stored in Tauri's secure store
- **Small footprint** — typically under 15 MB

## Installation

### Homebrew (recommended)

```bash
brew tap konradmichalik/tap
brew install --cask roots
```

Update with `brew upgrade --cask roots`.

### Manual Download

1. Download from [GitHub Releases](https://github.com/konradmichalik/roots/releases/latest)
2. Open the `.dmg` and drag to Applications
3. First launch: right-click → "Open" to bypass Gatekeeper

::: warning macOS Gatekeeper
Since Roots is not notarized through Apple, macOS will warn you on first launch. Right-click the app and select "Open" to allow it.
:::

## Building from Source

Prerequisites: Node.js 18+ and Rust toolchain.

```bash
git clone https://github.com/konradmichalik/roots.git
cd roots
npm install
npm run tauri:build
```

The built app is located in `src-tauri/target/release/bundle/`.

## Tauri Plugins

The desktop app uses these Tauri plugins:

| Plugin | Purpose |
|--------|---------|
| `plugin-http` | HTTP requests without CORS restrictions |
| `plugin-store` | Persistent key-value storage |
| `plugin-shell` | Open external URLs in the browser |
| `plugin-deep-link` | Handle `roots://` OAuth callbacks |
