# Style Guide (Canopy & Roots)

## Tech Stack
- **Svelte 5** mit Runes (`$state`, `$derived`, `$effect`)
- **Tailwind CSS v4** (Utility-First)
- **bits-ui** (Headless Primitives) + **shadcn-svelte** (gestylte Wrapper)
- **tailwind-variants** (`tv()`) für Komponenten-Varianten
- **cn()** aus `$lib/utils` für Class Merging (`clsx` + `tailwind-merge`)

## Farbsystem (Nord-Palette)

| Token | Light | Dark | Verwendung |
|-------|-------|------|------------|
| `--ds-text` | `#2e3440` | `#d8dee9` | Primary Text |
| `--ds-text-subtle` | `#434c5e` | `#c8ced9` | Secondary Text |
| `--ds-text-brand` | `#5e81ac` | `#88c0d0` | Links, Akzente |
| `--ds-text-danger` | `#bf616a` | `#bf616a` | Fehler |
| `--ds-text-success` | `#7b9e64` | `#a3be8c` | Erfolg |
| `--ds-text-warning` | `#d08770` | `#ebcb8b` | Warnung |
| `--ds-surface` | `#f5f7fa` | `#2e3440` | Background |
| `--ds-surface-raised` | `#ffffff` | `#3b4252` | Cards |
| `--ds-surface-sunken` | `#eceff4` | `#272c36` | Inputs |
| `--ds-border` | `#2e344020` | `#4c566a40` | Subtle Border |
| `--ds-border-focused` | `#88c0d0` | `#88c0d0` | Focus Ring |

## Design Tokens

Immer `--ds-*` Tokens verwenden, nie hardcoded Farben:

| Token | Verwendung |
|-------|------------|
| `text` / `text-subtle` / `text-subtlest` | Text Hierarchie |
| `text-brand` | Links, Akzente |
| `text-danger` / `text-success` / `text-warning` | Semantisch |
| `surface` / `surface-raised` / `surface-sunken` | Backgrounds |
| `border` / `border-bold` / `border-focused` | Borders |

```svelte
<!-- DO -->
<div class="bg-surface text-text border-border">
<span class="text-text-brand hover:underline">Link</span>

<!-- DON'T -->
<div class="bg-[#2e3440] text-[#d8dee9]">
```

## Komponenten

### Imports
```svelte
<!-- shadcn-svelte (bevorzugt) -->
import { Button } from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';

<!-- Icons -->
import { Settings, X } from '@lucide/svelte';
```

### Buttons
| Variant | Verwendung |
|---------|------------|
| `default` | Primäre Aktionen |
| `secondary` | Sekundäre Aktionen |
| `destructive` | Löschen, gefährlich |
| `ghost` | Toolbar, kompakt |
| `link` | Inline Links |

| Size | Classes |
|------|---------|
| `sm` | `h-8 px-3` |
| `default` | `h-9 px-4` |
| `lg` | `h-10 px-6` |
| `icon` | `size-9` |

### Inputs
```svelte
<Input class="h-9 rounded-md" placeholder="..." />
```

### Cards
```svelte
<div class="rounded-xl border bg-card p-6 shadow-sm">
```

### List Items
```svelte
<button class="flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-accent transition-colors">
```

## Spacing & Layout

| Wert | Pixel | Verwendung |
|------|-------|------------|
| `gap-2` | 8px | Kleine Abstände |
| `gap-3` | 12px | Kompakt |
| `gap-4` | 16px | Standard |
| `p-4` | 16px | Standard Padding |
| `p-6` | 24px | Card Padding |

## Border Radius

| Element | Klasse |
|---------|--------|
| Buttons, Inputs | `rounded-md` (4px) |
| Cards, Modals | `rounded-xl` (12-16px) |
| Badges, Pills | `rounded-full` |

## Shadows

| Klasse | Verwendung |
|--------|------------|
| `shadow-sm` | Cards |
| `shadow-md` | Dropdowns, Tooltips |
| `shadow-lg` | Modals |

## Transitions

```svelte
<!-- Standard -->
<button class="transition-colors">
<div class="transition-all duration-150">
```

## Focus States

```svelte
<button class="focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">

<input class="focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
```

## Icons (Lucide)

```svelte
<Settings class="size-4" />           <!-- Standard: 16px -->
<Settings class="size-5" />           <!-- Medium: 20px -->

<!-- Clickable Icon -->
<button class="rounded p-0.5 hover:bg-surface-hovered transition-colors">
  <X class="size-4 text-text-subtle hover:text-text" />
</button>
```

## Typography

| Klasse | Verwendung |
|--------|------------|
| `text-xs` | Metadata, Timestamps |
| `text-sm` | Body, Buttons, Inputs |
| `text-base` | Headings (klein) |
| `font-medium` | Labels, Buttons |
| `font-semibold` | Headings |

## tailwind-variants

```typescript
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'rounded-md font-medium transition-colors',
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      ghost: 'hover:bg-accent',
    },
    size: {
      sm: 'h-8 px-3',
      default: 'h-9 px-4',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
```

## Checkliste

- [ ] Design Tokens (`--ds-*`) statt hardcoded Farben
- [ ] `cn()` für dynamische Classes
- [ ] `transition-colors` für Hover/Focus
- [ ] `focus-visible:ring-*` für Focus States
- [ ] Icons: `size-4` (Standard)
- [ ] Disabled: `disabled:opacity-50 disabled:pointer-events-none`
- [ ] Komponenten aus `$lib/components/ui/` verwenden
