<script lang="ts">
  import { syncRecordsState, removeSyncRecord } from '../../stores/syncRecords.svelte';
  import { rulesState } from '../../stores/rules.svelte';
  import { formatHours } from '../../utils/time-format';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Zap from '@lucide/svelte/icons/zap';
  import Filter from '@lucide/svelte/icons/filter';

  // Filters
  let filterRuleId = $state<string | ''>('');
  let filterSourceType = $state<'all' | 'jira' | 'outlook'>('all');
  let filterStatus = $state<'all' | 'success' | 'failed'>('all');

  let availableRules = $derived(rulesState.rules.map((r) => ({ id: r.id, name: r.name })));

  let filteredRecords = $derived.by(() => {
    let records = [...syncRecordsState.records];

    if (filterRuleId) {
      records = records.filter((r) => r.ruleId === filterRuleId);
    }
    if (filterSourceType !== 'all') {
      records = records.filter((r) => r.sourceType === filterSourceType);
    }
    if (filterStatus !== 'all') {
      records = records.filter((r) => r.status === filterStatus);
    }

    return records.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));
  });

  let hasActiveFilters = $derived(
    filterRuleId !== '' || filterSourceType !== 'all' || filterStatus !== 'all'
  );

  const PAGE_SIZE = 50;
  let visibleCount = $state(PAGE_SIZE);
  let visibleRecords = $derived(filteredRecords.slice(0, visibleCount));
  let hasMore = $derived(visibleCount < filteredRecords.length);

  // Reset pagination when filters change
  let filterKey = $derived(`${filterRuleId}-${filterSourceType}-${filterStatus}`);
  $effect(() => {
    void filterKey;
    visibleCount = PAGE_SIZE;
  });

  function loadMore(): void {
    visibleCount += PAGE_SIZE;
  }

  let showFilters = $state(false);
  let confirmDeleteId = $state<string | null>(null);

  function getRuleName(ruleId: string): string {
    return rulesState.rules.find((r) => r.id === ruleId)?.name ?? 'Deleted Rule';
  }

  function formatSyncDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function handleDelete(id: string): void {
    if (confirmDeleteId === id) {
      removeSyncRecord(id);
      confirmDeleteId = null;
    } else {
      confirmDeleteId = id;
    }
  }

  function clearFilters(): void {
    filterRuleId = '';
    filterSourceType = 'all';
    filterStatus = 'all';
  }
</script>

{#if syncRecordsState.records.length === 0}
  <div class="py-8 text-center">
    <Zap class="size-8 text-muted-foreground/30 mx-auto mb-2" />
    <p class="text-sm text-muted-foreground">No sync activity yet.</p>
    <p class="text-xs text-muted-foreground/70 mt-1">
      Once rules transfer entries to Moco, they appear here.
    </p>
  </div>
{:else}
  <!-- Filter bar -->
  <div class="flex items-center gap-2 mb-2">
    <button
      type="button"
      onclick={() => (showFilters = !showFilters)}
      class="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors
        {hasActiveFilters
        ? 'text-brand-text bg-information-subtle'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
    >
      <Filter class="size-3" />
      Filter
      {#if hasActiveFilters}
        <span class="font-mono">({filteredRecords.length})</span>
      {/if}
    </button>
    {#if hasActiveFilters}
      <button
        type="button"
        onclick={clearFilters}
        class="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Clear
      </button>
    {/if}
    <span class="ml-auto text-[10px] text-muted-foreground/60">
      {syncRecordsState.records.length} total records
    </span>
  </div>

  {#if showFilters}
    <div class="grid grid-cols-3 gap-2 mb-3 p-2 rounded-lg bg-secondary/50">
      <select
        bind:value={filterRuleId}
        class="rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground
          focus:outline-none focus:ring-[3px] focus:ring-ring/50 transition-all"
      >
        <option value="">All Rules</option>
        {#each availableRules as rule (rule.id)}
          <option value={rule.id}>{rule.name}</option>
        {/each}
      </select>
      <select
        bind:value={filterSourceType}
        class="rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground
          focus:outline-none focus:ring-[3px] focus:ring-ring/50 transition-all"
      >
        <option value="all">All Sources</option>
        <option value="jira">Jira</option>
        <option value="outlook">Outlook</option>
      </select>
      <select
        bind:value={filterStatus}
        class="rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground
          focus:outline-none focus:ring-[3px] focus:ring-ring/50 transition-all"
      >
        <option value="all">All Status</option>
        <option value="success">Success</option>
        <option value="failed">Failed</option>
      </select>
    </div>
  {/if}

  <div class="space-y-1 max-h-[50vh] overflow-y-auto">
    {#each visibleRecords as record (record.id)}
      <div
        class="flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-accent/50
          {record.status === 'failed' ? 'bg-danger-subtle/30' : ''}"
      >
        <!-- Status icon -->
        <div class="flex-shrink-0 mt-0.5">
          {#if record.status === 'success'}
            <Check class="size-3 text-success" />
          {:else}
            <X class="size-3 text-danger-text" />
          {/if}
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="font-medium text-foreground truncate">{record.sourceKey}</span>
            <span class="text-muted-foreground/50">→</span>
            <span class="text-muted-foreground truncate">{getRuleName(record.ruleId)}</span>
          </div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <span>{record.mocoDate}</span>
            <span class="font-mono">{formatHours(record.hours)}</span>
            <span
              class="rounded-full px-1 py-0 text-[9px] font-medium
                {record.autoSynced
                ? 'bg-information-subtle text-brand-text'
                : 'bg-secondary text-muted-foreground'}"
            >
              {record.autoSynced ? 'auto' : 'manual'}
            </span>
            <span
              class="rounded-full px-1 py-0 text-[9px] font-medium
                {record.sourceType === 'jira'
                ? 'bg-brand/10 text-brand-text'
                : 'bg-source-outlook/10 text-source-outlook'}"
            >
              {record.sourceType}
            </span>
          </div>
          {#if record.status === 'failed' && record.errorReason}
            <p class="text-danger-text truncate">{record.errorReason}</p>
          {/if}
        </div>

        <!-- Timestamp + actions -->
        <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span class="text-[10px] text-muted-foreground/60">{formatSyncDate(record.syncedAt)}</span
          >
          <button
            type="button"
            onclick={() => handleDelete(record.id)}
            class="rounded p-0.5 text-muted-foreground/40 hover:text-danger-text transition-colors
              focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            title={confirmDeleteId === record.id
              ? 'Click again to confirm deletion'
              : 'Delete sync record'}
            aria-label="Delete sync record"
          >
            {#if confirmDeleteId === record.id}
              <AlertTriangle class="size-3 text-warning" />
            {:else}
              <Trash2 class="size-3" />
            {/if}
          </button>
        </div>
      </div>
    {/each}
    {#if filteredRecords.length === 0 && hasActiveFilters}
      <p class="text-xs text-muted-foreground text-center py-4">
        No records match the current filters.
      </p>
    {/if}
    {#if hasMore}
      <button
        type="button"
        onclick={loadMore}
        class="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
      >
        Show more ({filteredRecords.length - visibleCount} remaining)
      </button>
    {/if}
  </div>
{/if}
