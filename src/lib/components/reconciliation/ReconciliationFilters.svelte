<script lang="ts">
  import type { ReconciliationFilter, ReconciliationSummary } from '../../types';
  import { reconciliationState, setReconciliationFilter } from '../../stores/reconciliation.svelte';

  let { summary }: { summary: ReconciliationSummary } = $props();

  const filters: { value: ReconciliationFilter; label: string; count?: () => number }[] = [
    { value: 'all', label: 'Alle', count: () => summary.totalMatches },
    { value: 'matched', label: 'Zugeordnet', count: () => summary.totalMatched },
    { value: 'jira-only', label: 'Nur Jira', count: () => summary.totalJiraOnly },
    { value: 'moco-only', label: 'Nur Moco', count: () => summary.totalMocoOnly },
    { value: 'hours-diff', label: 'Stunden-Diff' }
  ];
</script>

<div class="flex flex-wrap gap-1.5">
  {#each filters as filter}
    <button
      onclick={() => setReconciliationFilter(filter.value)}
      class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150
        {reconciliationState.filter === filter.value
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
    >
      {filter.label}
      {#if filter.count}
        <span class="opacity-70">({filter.count()})</span>
      {/if}
    </button>
  {/each}
</div>
