<script lang="ts">
  import SourceColumn from './SourceColumn.svelte';
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import PresenceProgressBar from '../presence/PresenceProgressBar.svelte';
  import PresenceModal from '../presence/PresenceModal.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import {
    getEntriesForDate,
    getDayOverview,
    timeEntriesState,
    fetchDayEntries
  } from '../../stores/timeEntries.svelte';
  import { getRawPresencesForDate } from '../../stores/presences.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { formatHours, formatBalance } from '../../utils/time-format';
  import { buildMatchResult } from '../../stores/entryMatching.svelte';
  import ConnectionManager from '../connection/ConnectionManager.svelte';
  import Clock from '@lucide/svelte/icons/clock';
  import Plus from '@lucide/svelte/icons/plus';
  import Calendar from '@lucide/svelte/icons/calendar';
  import FileText from '@lucide/svelte/icons/file-text';

  let entries = $derived(getEntriesForDate(dateNavState.selectedDate));
  let matchResult = $derived(buildMatchResult(entries.moco, entries.jira, entries.outlook));
  let overview = $derived(getDayOverview(dateNavState.selectedDate));
  let rawPresences = $derived(getRawPresencesForDate(dateNavState.selectedDate));
  let hasPresence = $derived(rawPresences.length > 0);
  let isLoadingMoco = $derived(timeEntriesState.loading.moco);

  function retryFetch() {
    fetchDayEntries(dateNavState.selectedDate);
  }
  let displayBalance = $derived(
    overview.presence ? (overview.presenceBalance ?? 0) : overview.balance
  );
  let displayTarget = $derived(overview.presence?.hours ?? overview.requiredHours);
</script>

<div class="mx-auto max-w-6xl space-y-4">
  <!-- Day header with presence bar -->
  <div class="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
    <!-- Absence badge (if any) -->
    {#if overview.manualAbsence}
      <span
        class="inline-flex items-center justify-center h-5 px-2 text-[10px] font-medium rounded-full bg-information-subtle text-brand-text whitespace-nowrap shrink-0"
      >
        {overview.manualAbsence.type === 'vacation'
          ? 'Vacation'
          : overview.manualAbsence.type === 'sick'
            ? 'Sick'
            : overview.manualAbsence.type === 'public_holiday'
              ? 'Holiday'
              : overview.manualAbsence.type === 'personal'
                ? 'Personal'
                : 'Absence'}{overview.manualAbsence.halfDay ? ' (½)' : ''}
      </span>
    {/if}

    <!-- Presence progress bar (or empty placeholder for alignment) -->
    <div class="flex-1 min-w-0 -mt-0.5">
      {#if hasPresence && isLoadingMoco}
        <!-- Loading skeleton while fetching booked hours -->
        <div class="flex items-center gap-2">
          <Skeleton class="h-3 w-10" />
          <Skeleton class="h-1.5 flex-1 rounded-full" />
          <Skeleton class="h-3 w-10" />
        </div>
      {:else if hasPresence}
        <PresenceProgressBar
          date={dateNavState.selectedDate}
          targetHours={overview.requiredHours}
          bookedHours={overview.totals.actual}
        />
      {:else if connectionsState.moco.isConnected}
        <!-- Placeholder with add presence button when no presence -->
        <PresenceModal date={dateNavState.selectedDate}>
          <button
            class="flex items-center justify-center gap-1.5 w-full h-6 rounded-lg border border-dashed border-border/50
              text-muted-foreground/50 hover:border-border hover:text-muted-foreground hover:bg-accent/30
              transition-colors text-[10px]"
          >
            <Clock class="size-3" />
            <span>Add working time</span>
          </button>
        </PresenceModal>
      {/if}
    </div>

    <!-- Right: Hours and balance (visually separated) -->
    <div
      class="flex items-center gap-2 shrink-0 pl-2 border-l border-border"
      aria-live="polite"
      aria-atomic="true"
    >
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <span class="font-mono text-sm text-foreground cursor-default">
              {formatHours(overview.totals.actual)}
              <span class="text-muted-foreground/50"> / </span>
              <span class="text-muted-foreground">{formatHours(displayTarget)}</span>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>
            <div class="text-xs space-y-1">
              <div class="flex items-center justify-between gap-4">
                <span class="text-muted-foreground">Booked:</span>
                <span class="font-mono font-medium">{formatHours(overview.totals.actual)}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="text-muted-foreground"
                  >{overview.presence ? 'Presence:' : 'Target:'}</span
                >
                <span class="font-mono font-medium">{formatHours(displayTarget)}</span>
              </div>
              {#if overview.requiredHours !== displayTarget}
                <div class="flex items-center justify-between gap-4 opacity-60">
                  <span class="text-muted-foreground">Daily target:</span>
                  <span class="font-mono">{formatHours(overview.requiredHours)}</span>
                </div>
              {/if}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-mono font-medium cursor-default
                {displayBalance >= -0.01
                ? 'bg-success-subtle text-success-text'
                : 'bg-danger-subtle text-danger-text'}"
            >
              {formatBalance(displayBalance)}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>
            Balance vs. {overview.presence ? 'presence time' : 'daily target'}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  </div>

  <!-- Three-column layout: Outlook | Moco (emphasized) | Jira -->
  <div class="grid grid-cols-[1fr_1.4fr_1fr] gap-4 items-start" style="min-height: 60vh;">
    <!-- Left: Outlook Calendar -->
    {#if connectionsState.outlook.isConnected}
      <SourceColumn
        source="outlook"
        entries={matchResult.sortedOutlook}
        loading={timeEntriesState.loading.outlook}
        error={timeEntriesState.errors.outlook}
        onretry={retryFetch}
        entryGroupMap={matchResult.entryGroupMap}
      />
    {:else}
      <ConnectionManager>
        <button
          class="w-full rounded-xl border border-dashed border-border/50 p-6 text-center flex flex-col items-center gap-2 opacity-50
            hover:opacity-80 hover:border-border hover:bg-accent/30 transition-all duration-150 cursor-pointer"
        >
          <Calendar class="size-6 text-muted-foreground/30" strokeWidth={1.5} />
          <p class="text-xs text-muted-foreground/50">Connect Outlook</p>
        </button>
      </ConnectionManager>
    {/if}

    <!-- Center: Moco (emphasized) -->
    {#if connectionsState.moco.isConnected}
      <SourceColumn
        source="moco"
        entries={matchResult.sortedMoco}
        loading={timeEntriesState.loading.moco}
        error={timeEntriesState.errors.moco}
        onretry={retryFetch}
        emphasized
        entryGroupMap={matchResult.entryGroupMap}
      >
        {#snippet headerAction()}
          <MocoEntryModal mode="create" prefill={{ date: dateNavState.selectedDate }}>
            <button
              class="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150
                focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              title="New Moco entry"
              aria-label="New Moco entry"
            >
              <Plus class="size-4" />
            </button>
          </MocoEntryModal>
        {/snippet}
      </SourceColumn>
    {:else}
      <ConnectionManager>
        <button
          class="w-full rounded-xl border border-dashed border-border/50 p-6 text-center flex flex-col items-center gap-2 opacity-50
            hover:opacity-80 hover:border-border hover:bg-accent/30 transition-all duration-150 cursor-pointer"
        >
          <Clock class="size-6 text-muted-foreground/30" strokeWidth={1.5} />
          <p class="text-xs text-muted-foreground/50">Connect Moco</p>
        </button>
      </ConnectionManager>
    {/if}

    <!-- Right: Jira Worklogs -->
    {#if connectionsState.jira.isConnected}
      <SourceColumn
        source="jira"
        entries={matchResult.sortedJira}
        loading={timeEntriesState.loading.jira}
        error={timeEntriesState.errors.jira}
        onretry={retryFetch}
        entryGroupMap={matchResult.entryGroupMap}
      />
    {:else}
      <ConnectionManager>
        <button
          class="w-full rounded-xl border border-dashed border-border/50 p-6 text-center flex flex-col items-center gap-2 opacity-50
            hover:opacity-80 hover:border-border hover:bg-accent/30 transition-all duration-150 cursor-pointer"
        >
          <FileText class="size-6 text-muted-foreground/30" strokeWidth={1.5} />
          <p class="text-xs text-muted-foreground/50">Connect Jira</p>
        </button>
      </ConnectionManager>
    {/if}
  </div>
</div>
