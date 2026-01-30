<script lang="ts">
  import type { ReconciliationMatch } from '../../types';
  import ReconciliationRow from './ReconciliationRow.svelte';
  import { formatDateShort, getDayName } from '../../utils/date-helpers';

  let { matches }: { matches: ReconciliationMatch[] } = $props();

  let groupedByDate = $derived(groupByDate(matches));

  function groupByDate(items: ReconciliationMatch[]): { date: string; label: string; matches: ReconciliationMatch[] }[] {
    const groups = new Map<string, ReconciliationMatch[]>();
    for (const m of items) {
      const existing = groups.get(m.date) ?? [];
      groups.set(m.date, [...existing, m]);
    }
    return Array.from(groups.entries()).map(([date, matches]) => ({
      date,
      label: `${getDayName(date)}, ${formatDateShort(date)}`,
      matches
    }));
  }
</script>

{#if matches.length === 0}
  <div class="flex flex-col items-center gap-2 py-12 text-center">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
    </svg>
    <p class="text-sm text-muted-foreground/50">Keine Eintraege fuer den aktiven Filter.</p>
  </div>
{:else}
  <div class="space-y-4">
    {#each groupedByDate as group}
      <div>
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {group.label}
        </h3>
        <div class="space-y-2">
          {#each group.matches as match (match.id)}
            <ReconciliationRow {match} />
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
