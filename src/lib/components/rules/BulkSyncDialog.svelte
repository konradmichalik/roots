<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import {
    syncDateRange,
    executeSyncCandidates,
    getEntrySourceLabel,
    type BulkSyncPreview
  } from '../../stores/ruleSync.svelte';
  import { toast } from '../../stores/toast.svelte';
  import { formatHours } from '../../utils/time-format';
  import { today, addDays, getWeekStart } from '../../utils/date-helpers';
  import { SvelteSet } from 'svelte/reactivity';
  import Zap from '@lucide/svelte/icons/zap';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import Check from '@lucide/svelte/icons/check';
  import type { Snippet } from 'svelte';

  let {
    children
  }: {
    children?: Snippet;
  } = $props();

  let open = $state(false);

  // Date range selection
  let rangePreset = $state<'last-week' | 'last-2-weeks' | 'custom'>('last-week');
  let customFrom = $state('');
  let customTo = $state('');

  let dateRange = $derived.by(() => {
    const todayStr = today();
    if (rangePreset === 'last-week') {
      const weekStart = getWeekStart(todayStr);
      const lastWeekStart = addDays(weekStart, -7);
      const lastWeekEnd = addDays(lastWeekStart, 4); // Mon-Fri
      return { from: lastWeekStart, to: lastWeekEnd };
    }
    if (rangePreset === 'last-2-weeks') {
      const weekStart = getWeekStart(todayStr);
      const twoWeeksStart = addDays(weekStart, -14);
      const lastWeekEnd = addDays(weekStart, -3); // Last Friday
      return { from: twoWeeksStart, to: lastWeekEnd };
    }
    return { from: customFrom, to: customTo };
  });

  let isValidRange = $derived(dateRange.from && dateRange.to && dateRange.from <= dateRange.to);

  // States
  type Phase = 'select' | 'loading' | 'preview' | 'syncing' | 'done';
  let phase = $state<Phase>('select');
  let bulkPreview = $state<BulkSyncPreview | null>(null);
  let selectedDates = new SvelteSet<string>();
  let syncResultCount = $state({ created: 0, failed: 0 });

  let allCandidates = $derived.by(() => {
    if (!bulkPreview) return [];
    return bulkPreview.days
      .filter((d) => selectedDates.has(d.date))
      .flatMap((d) => d.preview.pending);
  });

  let totalHours = $derived(allCandidates.reduce((sum, c) => sum + c.mocoPayload.hours, 0));

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (isOpen) {
      phase = 'select';
      bulkPreview = null;
      syncResultCount = { created: 0, failed: 0 };
    }
  }

  async function handleFetchPreview(): Promise<void> {
    if (!isValidRange) return;
    phase = 'loading';

    try {
      bulkPreview = await syncDateRange(dateRange.from, dateRange.to);
      selectedDates.clear();
      for (const d of bulkPreview.days) selectedDates.add(d.date);
      phase = 'preview';
    } catch (e) {
      toast.error('Failed to load entries: ' + (e instanceof Error ? e.message : 'Unknown'));
      phase = 'select';
    }
  }

  function toggleDate(date: string): void {
    if (selectedDates.has(date)) selectedDates.delete(date);
    else selectedDates.add(date);
  }

  function toggleAll(): void {
    if (!bulkPreview) return;
    if (selectedDates.size === bulkPreview.days.length) {
      selectedDates.clear();
    } else {
      for (const d of bulkPreview.days) selectedDates.add(d.date);
    }
  }

  async function handleSync(): Promise<void> {
    if (allCandidates.length === 0) return;
    phase = 'syncing';

    try {
      const result = await executeSyncCandidates(allCandidates);
      syncResultCount = { created: result.created.length, failed: result.failed.length };

      if (result.created.length > 0) {
        toast.success(`Bulk sync: ${result.created.length} entries transferred`);
      }
      if (result.failed.length > 0) {
        toast.error(`Bulk sync: ${result.failed.length} entries failed`);
      }
      phase = 'done';
    } catch {
      toast.error('Bulk sync failed');
      phase = 'preview';
    }
  }

  function formatDateShort(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpen}>
  {#if children}
    <Dialog.Trigger>
      {#snippet child({ props })}
        <div {...props} style="display: contents;">
          {@render children()}
        </div>
      {/snippet}
    </Dialog.Trigger>
  {/if}
  <Dialog.Content class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Bulk Sync</Dialog.Title>
      <Dialog.Description>
        Apply rules to a date range. Only manual confirmation — never automatic.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-2">
      <!-- Phase: Select date range -->
      {#if phase === 'select'}
        <div class="space-y-3">
          <div class="flex gap-1 p-0.5 rounded-lg bg-secondary">
            <button
              type="button"
              onclick={() => (rangePreset = 'last-week')}
              class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                {rangePreset === 'last-week'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}">Last week</button
            >
            <button
              type="button"
              onclick={() => (rangePreset = 'last-2-weeks')}
              class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                {rangePreset === 'last-2-weeks'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}">Last 2 weeks</button
            >
            <button
              type="button"
              onclick={() => (rangePreset = 'custom')}
              class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                {rangePreset === 'custom'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}">Custom</button
            >
          </div>

          {#if rangePreset === 'custom'}
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="bulk-from" class="block text-xs font-medium text-foreground mb-1"
                  >From</label
                >
                <input
                  id="bulk-from"
                  type="date"
                  bind:value={customFrom}
                  max={today()}
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
                    focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
                />
              </div>
              <div>
                <label for="bulk-to" class="block text-xs font-medium text-foreground mb-1"
                  >To</label
                >
                <input
                  id="bulk-to"
                  type="date"
                  bind:value={customTo}
                  max={today()}
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
                    focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
                />
              </div>
            </div>
          {:else}
            <p class="text-xs text-muted-foreground">
              {formatDateShort(dateRange.from)} — {formatDateShort(dateRange.to)}
            </p>
          {/if}

          <button
            type="button"
            onclick={handleFetchPreview}
            disabled={!isValidRange}
            class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150
              focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Load Entries
          </button>
        </div>
      {/if}

      <!-- Phase: Loading -->
      {#if phase === 'loading'}
        <div class="py-8 text-center">
          <LoaderCircle class="size-8 text-muted-foreground/50 mx-auto mb-2 animate-spin" />
          <p class="text-sm text-muted-foreground">
            Loading entries for {formatDateShort(dateRange.from)} — {formatDateShort(
              dateRange.to
            )}...
          </p>
        </div>
      {/if}

      <!-- Phase: Preview -->
      {#if phase === 'preview' && bulkPreview}
        {#if bulkPreview.days.length === 0}
          <div class="py-6 text-center">
            <Check class="size-6 text-success mx-auto mb-1" />
            <p class="text-sm text-muted-foreground">All matching entries are already synced.</p>
            <p class="text-xs text-muted-foreground/60 mt-1">
              {bulkPreview.totalSkipped} entries skipped (already synced or 0h).
            </p>
          </div>
        {:else}
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-foreground">
              {allCandidates.length} entries across {selectedDates.size} days
            </span>
            <button
              type="button"
              onclick={toggleAll}
              class="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedDates.size === bulkPreview.days.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div class="space-y-1 max-h-[40vh] overflow-y-auto">
            {#each bulkPreview.days as day (day.date)}
              <label
                class="flex items-start gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer transition-colors hover:bg-accent/50
                  {selectedDates.has(day.date) ? '' : 'opacity-50'}"
              >
                <input
                  type="checkbox"
                  checked={selectedDates.has(day.date)}
                  onchange={() => toggleDate(day.date)}
                  class="accent-primary mt-0.5"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-medium text-foreground">
                      {formatDateShort(day.date)}
                    </span>
                    <span class="text-xs font-mono text-muted-foreground">
                      {day.preview.pending.length} entries, {formatHours(
                        day.preview.pending.reduce((s, c) => s + c.mocoPayload.hours, 0)
                      )}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-0.5">
                    {#each day.preview.pending.slice(0, 3) as candidate (candidate.sourceEntry.id)}
                      <span class="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {getEntrySourceLabel(candidate.sourceEntry)}
                      </span>
                    {/each}
                    {#if day.preview.pending.length > 3}
                      <span class="text-[10px] text-muted-foreground"
                        >+{day.preview.pending.length - 3}</span
                      >
                    {/if}
                  </div>
                  {#if day.preview.errors.length > 0}
                    <div class="flex items-center gap-1 mt-0.5">
                      <AlertTriangle class="size-3 text-warning" />
                      <span class="text-[10px] text-warning-text"
                        >{day.preview.errors.length} blocked</span
                      >
                    </div>
                  {/if}
                </div>
              </label>
            {/each}
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-border">
            <div class="text-xs text-muted-foreground">
              {formatHours(totalHours)} total
              {#if bulkPreview.totalSkipped > 0}
                <span class="text-muted-foreground/50"> | {bulkPreview.totalSkipped} skipped</span>
              {/if}
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                onclick={() => (phase = 'select')}
                class="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors
                  focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Back
              </button>
              <button
                type="button"
                onclick={handleSync}
                disabled={allCandidates.length === 0}
                class="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground
                  hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150
                  flex items-center gap-1.5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Zap class="size-3.5" />
                Transfer {allCandidates.length} entries
              </button>
            </div>
          </div>
        {/if}
      {/if}

      <!-- Phase: Syncing -->
      {#if phase === 'syncing'}
        <div class="py-8 text-center">
          <LoaderCircle class="size-8 text-primary mx-auto mb-2 animate-spin" />
          <p class="text-sm text-muted-foreground">Syncing {allCandidates.length} entries...</p>
        </div>
      {/if}

      <!-- Phase: Done -->
      {#if phase === 'done'}
        <div class="py-6 text-center space-y-2">
          <Check class="size-8 text-success mx-auto" />
          <p class="text-sm text-foreground font-medium">Bulk sync complete</p>
          <div class="text-xs text-muted-foreground">
            {#if syncResultCount.created > 0}
              <span class="text-success-text">{syncResultCount.created} transferred</span>
            {/if}
            {#if syncResultCount.failed > 0}
              <span class="text-danger-text ml-2">{syncResultCount.failed} failed</span>
            {/if}
          </div>
          <button
            type="button"
            onclick={() => handleOpen(false)}
            class="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Done
          </button>
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
