<script lang="ts">
  import type { UnifiedTimeEntry } from '../../types';
  import type { Snippet } from 'svelte';
  import TimeEntryCard from '../entries/TimeEntryCard.svelte';
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { getSourceColor } from '../../stores/settings.svelte';

  let { source, entries, loading = false, emphasized = false, entryGroupMap, dayTarget, headerAction }: {
    source: 'moco' | 'jira' | 'outlook';
    entries: UnifiedTimeEntry[];
    loading?: boolean;
    emphasized?: boolean;
    entryGroupMap?: Map<string, string>;
    dayTarget?: { requiredHours: number };
    headerAction?: Snippet;
  } = $props();

  const LABELS: Record<string, string> = {
    moco: 'Moco',
    jira: 'Jira',
    outlook: 'Outlook'
  };

  const LOGOS: Record<string, string> = {
    moco: '/moco.svg',
    jira: '/jira.svg',
    outlook: '/icons8-outlook.svg'
  };

  let sourceColor = $derived(getSourceColor(source));
  let total = $derived(entries.reduce((sum, e) => sum + e.hours, 0));
  let label = $derived(LABELS[source]);
  let balance = $derived(dayTarget ? total - dayTarget.requiredHours : null);
  let isFullyBooked = $derived(balance !== null && balance >= -0.01);
</script>

<div
  class="flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-200
    {emphasized ? 'shadow-lg ring-1 ring-border z-10' : 'shadow-sm opacity-95'}"
>
  <!-- Source header -->
  <div
    class="px-4 py-3 border-b border-border"
    style="background: linear-gradient(to right, {sourceColor}10, transparent)"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img
          src={LOGOS[source]}
          alt={label}
          class="h-4 w-auto opacity-30 grayscale dark:invert dark:opacity-25"
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
      {#each { length: 3 } as _}
        <div class="animate-pulse rounded-xl border border-border bg-card p-3">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-1.5">
                <div class="h-2 w-2 rounded-full bg-muted-foreground/20"></div>
                <div class="h-3.5 rounded bg-muted-foreground/15 w-3/4"></div>
              </div>
              <div class="h-3 rounded bg-muted-foreground/10 w-1/2 ml-3.5"></div>
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
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <p class="text-xs text-muted-foreground/50">No entries</p>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Footer -->
  <div class="border-t border-border bg-muted/20 px-4 py-2">
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted-foreground">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </span>
      {#if dayTarget && dayTarget.requiredHours > 0}
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">
            {formatHours(total)} / {formatHours(dayTarget.requiredHours)}
          </span>
          <span class="text-xs font-mono font-medium {getBalanceClass(balance ?? 0)}">
            {formatBalance(balance ?? 0)}
          </span>
          {#if isFullyBooked}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
