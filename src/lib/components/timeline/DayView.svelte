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
  import { connectionsState, isJiraConnected } from '../../stores/connections.svelte';
  import { formatHours, formatBalance } from '../../utils/time-format';
  import { buildMatchResult } from '../../stores/entryMatching.svelte';
  import ConnectionManager from '../connection/ConnectionManager.svelte';
  import SyncPreviewDialog from '../rules/SyncPreviewDialog.svelte';
  import { rulesState, getStaleRules, findMatchingRules } from '../../stores/rules.svelte';
  import { syncDay, detectHoursChanges } from '../../stores/ruleSync.svelte';
  import { isSynced } from '../../stores/syncRecords.svelte';
  import type { SyncPreview, UnifiedTimeEntry } from '../../types';
  import { buildMocoPrefill, type MocoPrefill } from '../../utils/moco-prefill';
  import Clock from '@lucide/svelte/icons/clock';
  import Plus from '@lucide/svelte/icons/plus';
  import Zap from '@lucide/svelte/icons/zap';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';

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

  let showOutlook = $derived(connectionsState.outlook.isConnected);
  let showJira = $derived(isJiraConnected());

  // Rules sync
  let hasRules = $derived(rulesState.rules.length > 0 && connectionsState.moco.isConnected);
  let showSyncPreview = $state(false);
  let syncPreview = $state<SyncPreview | null>(null);
  let isBuildingPreview = $state(false);
  let staleRules = $derived(getStaleRules());

  // Count pending entries (matched by rules but not yet synced)
  let pendingCount = $derived.by(() => {
    if (!hasRules) return 0;
    const sourceEntries: UnifiedTimeEntry[] = [...entries.jira, ...entries.outlook];
    let count = 0;
    for (const entry of sourceEntries) {
      if (entry.hours <= 0) continue;
      const rules = findMatchingRules(entry);
      if (rules.length === 0) continue;
      const sourceId =
        entry.metadata.source === 'jira'
          ? entry.metadata.worklogId
          : entry.metadata.source === 'outlook'
            ? entry.metadata.eventId
            : entry.id;
      if (!isSynced(entry.source as 'jira' | 'outlook', sourceId)) {
        count++;
      }
    }
    return count;
  });

  // Change detection: find synced entries where hours have changed
  let hoursChanges = $derived.by(() => {
    if (!hasRules) return [];
    return detectHoursChanges(entries.jira, entries.outlook);
  });

  async function handleApplyRules(): Promise<void> {
    isBuildingPreview = true;
    try {
      syncPreview = await syncDay(dateNavState.selectedDate, { dryRun: true });
      showSyncPreview = true;
    } finally {
      isBuildingPreview = false;
    }
  }

  // Drag & drop: Jira/Outlook entry dropped onto Moco column
  let showDropModal = $state(false);
  let dropPrefill = $state<MocoPrefill>({});

  function handleEntryDrop(droppedEntry: UnifiedTimeEntry): void {
    dropPrefill = buildMocoPrefill(droppedEntry);
    showDropModal = true;
  }

  let gridCols = $derived.by(() => {
    if (showOutlook && showJira) return 'grid-cols-[1fr_1.4fr_1fr]';
    if (showOutlook) return 'grid-cols-[1fr_1.4fr]';
    if (showJira) return 'grid-cols-[1.4fr_1fr]';
    return 'grid-cols-1 max-w-2xl mx-auto';
  });
</script>

<div class="mx-auto max-w-6xl space-y-3">
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
      {#if connectionsState.moco.isConnected}
        <PresenceModal date={dateNavState.selectedDate}>
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
          {:else}
            <!-- Placeholder with add presence button when no presence -->
            <button
              class="flex items-center justify-center gap-1.5 w-full h-6 rounded-lg border border-dashed border-border/50
                text-muted-foreground/50 hover:border-border hover:text-muted-foreground hover:bg-accent/30
                transition-colors text-[10px]"
            >
              <Clock class="size-3" />
              <span>Add working time</span>
            </button>
          {/if}
        </PresenceModal>
      {/if}
    </div>

    <!-- Apply Rules button + hours change indicator -->
    {#if hasRules}
      <div class="flex items-center gap-1 shrink-0">
        {#if hoursChanges.length > 0}
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <span
                  class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-discovery-subtle text-discovery-text"
                >
                  <TriangleAlert class="size-3 mr-0.5" />
                  {hoursChanges.length}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" sideOffset={4}>
                <div class="text-xs space-y-1">
                  <p class="font-medium">
                    {hoursChanges.length} synced {hoursChanges.length === 1
                      ? 'entry has'
                      : 'entries have'} changed hours
                  </p>
                  {#each hoursChanges.slice(0, 5) as change (change.sourceKey)}
                    <p class="text-[10px] opacity-80">
                      {change.sourceKey}: {formatHours(change.syncedHours)} → {formatHours(
                        change.currentHours
                      )}
                    </p>
                  {/each}
                  {#if hoursChanges.length > 5}
                    <p class="text-[10px] opacity-60">+{hoursChanges.length - 5} more</p>
                  {/if}
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        {/if}
        {#if staleRules.length > 0}
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <span
                  class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-warning-subtle text-warning-text"
                >
                  <AlertTriangle class="size-3 mr-0.5" />
                  {staleRules.length}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" sideOffset={4}>
                {staleRules.length} rule{staleRules.length !== 1 ? 's' : ''} with unavailable targets
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        {/if}
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                type="button"
                onclick={handleApplyRules}
                disabled={isBuildingPreview}
                class="relative rounded-lg p-1.5 transition-colors duration-150
                  {pendingCount > 0
                  ? 'text-warning hover:text-warning hover:bg-warning/10'
                  : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label="Apply Rules"
              >
                {#if isBuildingPreview}
                  <LoaderCircle class="size-4 animate-spin" />
                {:else}
                  <Zap class="size-4" />
                {/if}
                {#if pendingCount > 0}
                  <span
                    class="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-4 px-0.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
                  >
                    {pendingCount}
                  </span>
                {/if}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>
              {pendingCount > 0 ? `Apply Rules (${pendingCount} pending)` : 'Apply Rules'}
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    {/if}

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
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono font-medium cursor-default border
                {displayBalance < -0.01
                ? 'bg-danger-subtle text-danger-text border-danger/20'
                : displayBalance > 0.01
                  ? 'bg-discovery-subtle text-discovery-text border-discovery/20'
                  : 'bg-success-subtle text-success-text border-success/20'}"
            >
              {#if Math.abs(displayBalance) <= 0.01 && overview.totals.actual > 0}
                Done
              {:else}
                {formatBalance(displayBalance)}
              {/if}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>
            Balance vs. {overview.presence ? 'presence time' : 'daily target'}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  </div>

  <!-- Dynamic column layout based on connected services -->
  <div class="grid {gridCols} gap-4 items-start" style="min-height: 60vh;">
    <!-- Outlook Calendar (only when connected) -->
    {#if showOutlook}
      <SourceColumn
        source="outlook"
        entries={matchResult.sortedOutlook}
        loading={timeEntriesState.loading.outlook}
        error={timeEntriesState.errors.outlook}
        onretry={retryFetch}
        entryGroupMap={matchResult.entryGroupMap}
      />
    {/if}

    <!-- Moco (always visible) -->
    {#if connectionsState.moco.isConnected}
      <SourceColumn
        source="moco"
        entries={matchResult.sortedMoco}
        loading={timeEntriesState.loading.moco}
        error={timeEntriesState.errors.moco}
        onretry={retryFetch}
        entryGroupMap={matchResult.entryGroupMap}
        ondrop={handleEntryDrop}
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

    <!-- Jira Worklogs (only when connected) -->
    {#if showJira}
      <SourceColumn
        source="jira"
        entries={matchResult.sortedJira}
        loading={timeEntriesState.loading.jira}
        error={timeEntriesState.errors.jira}
        onretry={retryFetch}
        entryGroupMap={matchResult.entryGroupMap}
      />
    {/if}
  </div>
</div>

<!-- Moco Create Modal (from drag & drop) -->
{#if showDropModal && connectionsState.moco.isConnected}
  <MocoEntryModal
    mode="create"
    prefill={dropPrefill}
    defaultOpen={true}
    onClose={() => {
      showDropModal = false;
      dropPrefill = {};
    }}
  />
{/if}

<!-- Sync Preview Dialog -->
{#if showSyncPreview && syncPreview}
  <SyncPreviewDialog
    preview={syncPreview}
    defaultOpen={true}
    onClose={() => {
      showSyncPreview = false;
      syncPreview = null;
    }}
  />
{/if}
