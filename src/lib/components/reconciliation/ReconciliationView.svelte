<script lang="ts">
  import ReconciliationSummaryBar from './ReconciliationSummaryBar.svelte';
  import ReconciliationFilters from './ReconciliationFilters.svelte';
  import ReconciliationTable from './ReconciliationTable.svelte';
  import { timeEntriesState, isAnyLoading } from '../../stores/timeEntries.svelte';
  import { reconciliationState } from '../../stores/reconciliation.svelte';
  import { reconcileEntries } from '../../utils/reconciliation';
  import type { ReconciliationMatch } from '../../types';

  let result = $derived(
    reconcileEntries(timeEntriesState.mocoEntries, timeEntriesState.jiraWorklogs)
  );

  let filteredMatches = $derived(applyFilter(result.matches, reconciliationState.filter));
  let loading = $derived(isAnyLoading());

  function applyFilter(
    matches: ReconciliationMatch[],
    filter: string
  ): ReconciliationMatch[] {
    if (filter === 'all') return matches;
    if (filter === 'hours-diff') return matches.filter((m) => Math.abs(m.hoursDiff) > 0.01);
    return matches.filter((m) => m.status === filter);
  }
</script>

<div class="mx-auto max-w-3xl space-y-4">
  <div class="flex items-center justify-between">
    <h2 class="text-lg font-semibold text-foreground">Moco-Jira Abgleich</h2>
    {#if loading}
      <span class="text-xs text-muted-foreground animate-pulse">Laden...</span>
    {/if}
  </div>

  <ReconciliationSummaryBar summary={result.summary} />
  <ReconciliationFilters summary={result.summary} />
  <ReconciliationTable matches={filteredMatches} />
</div>
