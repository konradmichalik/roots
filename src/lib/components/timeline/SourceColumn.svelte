<script lang="ts">
  import type { UnifiedTimeEntry } from '../../types';
  import type { Snippet } from 'svelte';
  import TimeEntryCard from '../entries/TimeEntryCard.svelte';
  import { formatHours } from '../../utils/time-format';
  import Calendar from '@lucide/svelte/icons/calendar';

  let {
    source,
    entries,
    loading = false,
    emphasized = false,
    entryGroupMap,
    headerAction
  }: {
    source: 'moco' | 'jira' | 'outlook';
    entries: UnifiedTimeEntry[];
    loading?: boolean;
    emphasized?: boolean;
    entryGroupMap?: Map<string, string>;
    headerAction?: Snippet;
  } = $props();

  const LABELS: Record<string, string> = {
    moco: 'Moco',
    jira: 'Jira',
    outlook: 'Outlook'
  };

  const LOGOS: Record<string, string> = {
    moco: '/logos/moco.svg',
    jira: '/logos/jira.svg',
    outlook: '/logos/outlook.svg'
  };

  // Map sources to styleguide color classes
  const SOURCE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    moco: {
      bg: 'bg-success/10',
      border: 'border-l-success',
      text: 'text-success-text'
    },
    jira: {
      bg: 'bg-brand/10',
      border: 'border-l-brand',
      text: 'text-brand-text'
    },
    outlook: {
      bg: 'bg-warning/10',
      border: 'border-l-warning',
      text: 'text-warning-text'
    }
  };

  let colorClasses = $derived(SOURCE_COLORS[source]);
  let total = $derived(entries.reduce((sum, e) => sum + e.hours, 0));
  let label = $derived(LABELS[source]);
</script>

<div
  class="flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-200
    {emphasized ? 'shadow-lg ring-1 ring-border z-10' : 'shadow-sm opacity-95'}"
>
  <!-- Source header -->
  <div class="px-4 py-3 border-b border-border {colorClasses.bg}">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img
          src={LOGOS[source]}
          alt={label}
          class="size-4 opacity-50 grayscale dark:invert dark:opacity-40"
        />
        <span class="text-sm font-semibold text-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-mono text-sm font-medium text-foreground">
          {formatHours(total)}
        </span>
        {#if headerAction}
          {@render headerAction()}
        {/if}
      </div>
    </div>
  </div>

  <!-- Entry list -->
  <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
    {#if loading && entries.length === 0}
      {#each { length: 3 } as _, i (i)}
        <div
          class="animate-pulse rounded-xl border border-border {colorClasses.border} border-l-[3px] bg-card p-3 pl-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="h-3.5 rounded bg-muted-foreground/15 w-3/4 mb-1.5"></div>
              <div class="h-3 rounded bg-muted-foreground/10 w-1/2"></div>
            </div>
            <div class="h-4 w-10 rounded bg-muted-foreground/15"></div>
          </div>
        </div>
      {/each}
    {:else}
      {#each entries as entry (entry.id)}
        <TimeEntryCard {entry} matchGroupId={entryGroupMap?.get(entry.id)} />
      {/each}
      {#if entries.length === 0}
        <div class="flex flex-col items-center gap-2 py-8 text-center">
          <Calendar class="size-6 text-muted-foreground/30" strokeWidth={1.5} />
          <p class="text-xs text-muted-foreground/50">No entries</p>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Footer -->
  <div class="border-t border-border bg-muted/20 px-3 py-1 flex items-center">
    <span class="text-[10px] text-muted-foreground leading-none">
      {entries.length}
      {entries.length === 1 ? 'entry' : 'entries'}
    </span>
  </div>
</div>
