---
layout: home

hero:
  name: roots
  text: Work Time Overview
  tagline: Moco, Jira, Outlook and Personio in a unified timeline
  image:
    src: /logo-sm.svg
    alt: roots Logo
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: Set Up Connections
      link: /connections/

features:
  - icon: ⏱️
    title: Unified Timeline
    details: Day, week and month views with time entries from all connected services side by side.
    link: /guide/timeline
  - icon: 🔗
    title: Multi-Service
    details: Connect Moco, Jira (Cloud & Server), Outlook and Personio simultaneously.
    link: /connections/
  - icon: 🎯
    title: Cross-Source Matching
    details: Confidence-based matching highlights which entries from different sources belong together.
    link: /guide/timeline
  - icon: 📅
    title: Personio Sync
    details: Automatic import of work schedule, absences and weekly hours.
    link: /connections/personio
  - icon: 🖥️
    title: Native Desktop App
    details: Lightweight Tauri app with direct API access — no CORS proxy needed.
    link: /desktop/
  - icon: 🌗
    title: Dark Mode
    details: Light and dark theme powered by the Nord color palette.
---

<div class="app-preview">
  <img class="light-only" src="/images/roots-light.jpg" alt="roots — Unified Work Time Overview (Light Mode)" />
  <img class="dark-only" src="/images/roots-dark.jpg" alt="roots — Unified Work Time Overview (Dark Mode)" />
</div>

<style>
.app-preview {
  margin: 2rem auto 3rem;
  max-width: 1152px;
  padding: 0 24px;
}
.app-preview img {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--vp-c-border);
}
html.dark .light-only { display: none; }
html:not(.dark) .dark-only { display: none; }
</style>

## Supported Services

| Service | Authentication | Provides |
|---------|----------------|----------|
| **Moco** | API Key | Time entries, projects, presences |
| **Jira Cloud** | Email + API Token | Worklogs |
| **Jira Server** | Username/Password or PAT | Worklogs |
| **Outlook** | OAuth 2.0 (PKCE) | Calendar events |
| **Personio** | Client ID + Secret | Absences, work schedule |

## Tech Stack

- [Svelte 5](https://svelte.dev/) with TypeScript and Runes
- [Tauri 2](https://tauri.app/) as native desktop runtime
- [Tailwind CSS v4](https://tailwindcss.com/) and [shadcn-svelte](https://www.shadcn-svelte.com/)
