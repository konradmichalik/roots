<script lang="ts">
  import type { ReconciliationMatch } from '../../types';
  import ConfidenceBadge from './ConfidenceBadge.svelte';
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';

  let { match }: { match: ReconciliationMatch } = $props();

  let borderClass = $derived(
    match.status === 'jira-only'
      ? 'border-l-4 border-l-amber-500'
      : match.status === 'moco-only'
        ? 'border-l-4 border-l-emerald-500'
        : ''
  );

  let diffClass = $derived(getBalanceClass(match.hoursDiff));
  let fmt = $derived(settingsState.hoursFormat);
</script>

<div class="rounded-md border border-border bg-card p-3 {borderClass}">
  <!-- Header -->
  <div class="flex items-center justify-between gap-2 mb-2">
    <div class="flex items-center gap-2 min-w-0">
      {#if match.issueKey}
        <span class="text-sm font-mono font-semibold text-foreground">{match.issueKey}</span>
      {/if}
      {#if match.issueSummary}
        <span class="text-sm text-muted-foreground truncate">{match.issueSummary}</span>
      {:else if !match.issueKey}
        <span class="text-sm text-muted-foreground italic">Ohne Jira-Referenz</span>
      {/if}
      {#if match.confidence}
        <ConfidenceBadge confidence={match.confidence} />
      {/if}
    </div>
    {#if match.status === 'matched' && Math.abs(match.hoursDiff) > 0.01}
      <span class="text-xs font-mono font-medium flex-shrink-0 {diffClass}">
        {formatBalance(match.hoursDiff, fmt)}
      </span>
    {/if}
  </div>

  <!-- Two-column comparison -->
  <div class="grid grid-cols-2 gap-3">
    <!-- Moco side -->
    <div class="rounded border border-border/50 bg-background/50 p-2">
      <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Moco</div>
      {#if match.mocoEntries.length > 0}
        {#each match.mocoEntries as entry}
          <div class="text-xs text-foreground truncate">{entry.title}</div>
          {#if entry.description}
            <div class="text-xs text-muted-foreground truncate">{entry.description}</div>
          {/if}
        {/each}
        <div class="text-xs font-mono font-medium text-foreground mt-1">
          {formatHours(match.mocoHours, fmt)}
        </div>
      {:else}
        <div class="text-xs text-muted-foreground italic">Nicht in Moco gebucht</div>
      {/if}
    </div>

    <!-- Jira side -->
    <div class="rounded border border-border/50 bg-background/50 p-2">
      <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Jira</div>
      {#if match.jiraEntries.length > 0}
        {#each match.jiraEntries as entry}
          <div class="text-xs text-foreground truncate">{entry.title}</div>
          {#if entry.description}
            <div class="text-xs text-muted-foreground truncate">{entry.description}</div>
          {/if}
        {/each}
        <div class="text-xs font-mono font-medium text-foreground mt-1">
          {formatHours(match.jiraHours, fmt)}
        </div>
      {:else}
        <div class="text-xs text-muted-foreground italic">Kein Jira-Worklog</div>
      {/if}
    </div>
  </div>
</div>
