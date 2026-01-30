<script lang="ts">
  import type { ReconciliationSummary } from '../../types';
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';

  let { summary }: { summary: ReconciliationSummary } = $props();

  let fmt = $derived(settingsState.hoursFormat);
  let diffClass = $derived(getBalanceClass(summary.totalHoursDiff));
</script>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
  <div class="rounded-lg border border-border bg-card p-3 text-center">
    <div class="text-2xl font-bold text-foreground">{summary.matchRate}%</div>
    <div class="text-xs text-muted-foreground">Match-Rate</div>
  </div>

  <div class="rounded-lg border border-border bg-card p-3 text-center">
    <div class="text-2xl font-bold text-foreground">{summary.totalMatched}</div>
    <div class="text-xs text-muted-foreground">Zugeordnet</div>
  </div>

  <div class="rounded-lg border border-border bg-card p-3 text-center">
    <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.totalJiraOnly}</div>
    <div class="text-xs text-muted-foreground">Nur Jira</div>
  </div>

  <div class="rounded-lg border border-border bg-card p-3 text-center">
    <div class="flex items-baseline justify-center gap-1.5">
      <span class="text-sm font-mono text-foreground">
        Moco {formatHours(summary.totalMocoHours, fmt)}
      </span>
      <span class="text-xs text-muted-foreground">vs</span>
      <span class="text-sm font-mono text-foreground">
        Jira {formatHours(summary.totalJiraHours, fmt)}
      </span>
    </div>
    <div class="text-xs font-mono {diffClass} mt-0.5">
      {formatBalance(summary.totalHoursDiff, fmt)}
    </div>
  </div>
</div>
