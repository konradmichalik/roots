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
  <div class="text-center text-muted-foreground py-8">
    Keine Eintraege fuer den aktiven Filter.
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
