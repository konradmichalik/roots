<script lang="ts">
  import SourceColumn from './SourceColumn.svelte';
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getEntriesForDate, getDayOverview, timeEntriesState } from '../../stores/timeEntries.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { formatDateLong } from '../../utils/date-helpers';
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';
  import { buildMatchResult } from '../../stores/entryMatching.svelte';

  let entries = $derived(getEntriesForDate(dateNavState.selectedDate));
  let matchResult = $derived(buildMatchResult(entries.moco, entries.jira));
  let overview = $derived(getDayOverview(dateNavState.selectedDate));
  let fmt = $derived(settingsState.hoursFormat);
</script>

<div class="mx-auto max-w-6xl space-y-4">
  <!-- Day header -->
  <div class="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
    <span class="text-sm font-medium text-foreground">
      {formatDateLong(dateNavState.selectedDate)}
    </span>
    <div class="flex items-center gap-3 text-sm">
      <span class="text-muted-foreground">
        Actual: <span class="font-mono font-medium text-foreground">{formatHours(overview.totals.actual, fmt)}</span>
      </span>
      <span class="text-muted-foreground">
        Target: <span class="font-mono font-medium text-foreground">{formatHours(overview.requiredHours, fmt)}</span>
      </span>
      {#if overview.presence}
        <span class="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5 text-xs font-medium text-success-text">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {overview.presence.from} – {overview.presence.to ?? 'now'}
          {#if overview.presence.isHomeOffice}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          {/if}
        </span>
      {/if}
      <span class="font-mono font-medium {getBalanceClass(overview.balance)}">
        {formatBalance(overview.balance, fmt)}
      </span>
      {#if overview.manualAbsence}
        <span class="inline-flex items-center gap-1 rounded-full bg-information-subtle px-2 py-0.5 text-xs font-medium text-brand-text">
          {overview.manualAbsence.type === 'vacation' ? 'Vacation'
            : overview.manualAbsence.type === 'sick' ? 'Sick'
            : overview.manualAbsence.type === 'public_holiday' ? 'Holiday'
            : overview.manualAbsence.type === 'personal' ? 'Personal'
            : 'Absence'}{overview.manualAbsence.halfDay ? ' (half day)' : ''}
        </span>
      {/if}
    </div>
  </div>

  <!-- Three-column layout: Outlook | Moco (emphasized) | Jira -->
  <div class="grid grid-cols-[1fr_1.4fr_1fr] gap-4 items-start" style="min-height: 60vh;">
    <!-- Left: Outlook Calendar -->
    {#if connectionsState.outlook.isConnected}
      <SourceColumn source="outlook" entries={entries.outlook} loading={timeEntriesState.loading.outlook} />
    {:else}
      <div class="rounded-xl border border-dashed border-border/50 p-6 text-center flex flex-col items-center gap-2 opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        <p class="text-xs text-muted-foreground/50">Outlook not connected</p>
      </div>
    {/if}

    <!-- Center: Moco (emphasized) -->
    {#if connectionsState.moco.isConnected}
      <SourceColumn source="moco" entries={matchResult.sortedMoco} loading={timeEntriesState.loading.moco} emphasized entryGroupMap={matchResult.entryGroupMap} dayTarget={{ requiredHours: overview.requiredHours }}>
        {#snippet headerAction()}
          <MocoEntryModal mode="create" prefill={{ date: dateNavState.selectedDate }}>
            <button
              class="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
              title="New Moco entry"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
              </svg>
            </button>
          </MocoEntryModal>
        {/snippet}
      </SourceColumn>
    {:else}
      <div class="rounded-xl border border-dashed border-border/50 p-6 text-center flex flex-col items-center gap-2 opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <p class="text-xs text-muted-foreground/50">Moco not connected</p>
      </div>
    {/if}

    <!-- Right: Jira Worklogs -->
    {#if connectionsState.jira.isConnected}
      <SourceColumn source="jira" entries={matchResult.sortedJira} loading={timeEntriesState.loading.jira} entryGroupMap={matchResult.entryGroupMap} />
    {:else}
      <div class="rounded-xl border border-dashed border-border/50 p-6 text-center flex flex-col items-center gap-2 opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
        <p class="text-xs text-muted-foreground/50">Jira not connected</p>
      </div>
    {/if}
  </div>
</div>
