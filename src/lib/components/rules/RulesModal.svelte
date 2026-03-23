<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import RuleListItem from './RuleListItem.svelte';
  import RuleEditorModal from './RuleEditorModal.svelte';
  import SyncLogTab from './SyncLogTab.svelte';
  import RuleAnalyticsTab from './RuleAnalyticsTab.svelte';
  import BulkSyncDialog from './BulkSyncDialog.svelte';
  import { getSortedRules } from '../../stores/rules.svelte';
  import { getLastSyncForRule } from '../../stores/syncRecords.svelte';
  import type { Rule, SourceMatcher } from '../../types';
  import type { Snippet } from 'svelte';
  import Zap from '@lucide/svelte/icons/zap';
  import Plus from '@lucide/svelte/icons/plus';
  import List from '@lucide/svelte/icons/list';
  import History from '@lucide/svelte/icons/history';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
  import Play from '@lucide/svelte/icons/play';
  import Search from '@lucide/svelte/icons/search';
  import X from '@lucide/svelte/icons/x';
  import Filter from '@lucide/svelte/icons/filter';
  let {
    children,
    defaultOpen = false,
    onClose
  }: {
    children?: Snippet;
    defaultOpen?: boolean;
    onClose?: () => void;
  } = $props();

  // eslint-disable-next-line svelte/prefer-writable-derived -- $derived.writable not available in this Svelte version
  let open = $state(false);
  $effect(() => {
    open = defaultOpen;
  });
  let activeTab = $state<'rules' | 'log' | 'analytics'>('rules');

  // Editor state
  let showEditor = $state(false);
  let editingRule = $state<Rule | undefined>(undefined);
  let editorPrefill = $state<{ source?: SourceMatcher } | undefined>(undefined);

  let filterQuery = $state('');
  let filterSourceType = $state<'all' | 'jira' | 'outlook'>('all');
  let filterStatus = $state<'all' | 'active' | 'paused' | 'stale'>('all');
  let filterCustomer = $state('');
  let filterAutoSync = $state<'all' | 'yes' | 'no'>('all');
  let sortBy = $state<'name-asc' | 'name-desc' | 'edited' | 'synced'>('name-asc');
  let showFilters = $state(false);

  let sortedRules = $derived(getSortedRules());

  let hasActiveFilters = $derived(
    filterSourceType !== 'all' ||
      filterStatus !== 'all' ||
      filterCustomer !== '' ||
      filterAutoSync !== 'all'
  );

  let uniqueCustomers = $derived(
    [...new Set(sortedRules.map((r) => r.target.customerName))].sort()
  );

  let filteredAndSortedRules = $derived.by(() => {
    let rules = sortedRules;

    // Text search
    const q = filterQuery.trim().toLowerCase();
    if (q) {
      rules = rules.filter((rule) => {
        const source =
          rule.source.type === 'jira'
            ? [
                'jira',
                rule.source.projectKey,
                rule.source.issuePattern,
                rule.source.epicKey,
                rule.source.component,
                rule.source.summaryContains,
                rule.source.jql,
                rule.source.labels?.join(' ')
              ]
                .filter(Boolean)
                .join(' ')
            : `outlook ${rule.source.eventPattern}`;
        const target = `${rule.target.customerName} ${rule.target.mocoProjectName}`;
        return `${rule.name} ${source} ${target}`.toLowerCase().includes(q);
      });
    }

    // Filters
    if (filterSourceType !== 'all') {
      rules = rules.filter((r) => r.source.type === filterSourceType);
    }
    if (filterStatus !== 'all') {
      rules = rules.filter((r) => {
        if (filterStatus === 'active') return r.enabled && r.targetStatus !== 'stale';
        if (filterStatus === 'paused') return !r.enabled;
        if (filterStatus === 'stale') return r.targetStatus === 'stale';
        return true;
      });
    }
    if (filterCustomer) {
      rules = rules.filter((r) => r.target.customerName === filterCustomer);
    }
    if (filterAutoSync !== 'all') {
      rules = rules.filter((r) => (filterAutoSync === 'yes' ? r.autoSync : !r.autoSync));
    }

    // Sort
    rules = [...rules].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'edited':
          return b.updatedAt.localeCompare(a.updatedAt);
        case 'synced': {
          const aSync = getLastSyncForRule(a.id);
          const bSync = getLastSyncForRule(b.id);
          if (!aSync && !bSync) return 0;
          if (!aSync) return 1;
          if (!bSync) return -1;
          return bSync.date.localeCompare(aSync.date);
        }
        default:
          return 0;
      }
    });

    return rules;
  });

  function clearFilters(): void {
    filterSourceType = 'all';
    filterStatus = 'all';
    filterCustomer = '';
    filterAutoSync = 'all';
  }

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (!isOpen) {
      showEditor = false;
      editingRule = undefined;
      editorPrefill = undefined;
      filterQuery = '';
      clearFilters();
      sortBy = 'name-asc';
      showFilters = false;
      onClose?.();
    }
  }

  function openEditor(rule?: Rule): void {
    editingRule = rule;
    editorPrefill = undefined;
    showEditor = true;
  }

  function handleEditorClose(): void {
    showEditor = false;
    editingRule = undefined;
    editorPrefill = undefined;
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
  <Dialog.Content class="sm:max-w-4xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
    <Dialog.Header>
      <div class="flex items-center gap-2">
        <Dialog.Title>Rules</Dialog.Title>
        <span
          class="rounded-full bg-discovery-subtle px-2 py-0.5 text-[10px] font-semibold text-discovery-text"
        >
          Experimental
        </span>
      </div>
      <Dialog.Description>
        Map Jira projects and Outlook events to Moco booking positions.
      </Dialog.Description>
    </Dialog.Header>

    <!-- Tabs -->
    <div class="flex items-center gap-1 border-b border-border mb-3">
      <button
        type="button"
        onclick={() => (activeTab = 'rules')}
        class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors
          {activeTab === 'rules'
          ? 'text-foreground border-b-2 border-primary -mb-px'
          : 'text-muted-foreground hover:text-foreground'}"
      >
        <List class="size-3.5" />
        Rules
        {#if sortedRules.length > 0}
          <span
            class="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
            >{sortedRules.length}</span
          >
        {/if}
      </button>
      <button
        type="button"
        onclick={() => (activeTab = 'log')}
        class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors
          {activeTab === 'log'
          ? 'text-foreground border-b-2 border-primary -mb-px'
          : 'text-muted-foreground hover:text-foreground'}"
      >
        <History class="size-3.5" />
        Log
      </button>
      <button
        type="button"
        onclick={() => (activeTab = 'analytics')}
        class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors
          {activeTab === 'analytics'
          ? 'text-foreground border-b-2 border-primary -mb-px'
          : 'text-muted-foreground hover:text-foreground'}"
      >
        <BarChart3 class="size-3.5" />
        Stats
      </button>

      <div class="ml-auto flex items-center gap-1">
        {#if activeTab === 'rules'}
          <BulkSyncDialog>
            <button
              class="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150
                focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              title="Run all rules"
              aria-label="Run all rules"
            >
              <Play class="size-4" />
            </button>
          </BulkSyncDialog>
          <button
            type="button"
            onclick={() => openEditor()}
            class="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150
              focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            title="Add rule"
            aria-label="Add rule"
          >
            <Plus class="size-4" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Rules Tab -->
    {#if activeTab === 'rules'}
      {#if sortedRules.length === 0}
        <div class="py-8 text-center">
          <Zap class="size-8 text-muted-foreground/30 mx-auto mb-2" />
          <p class="text-sm text-muted-foreground">No rules yet.</p>
          <p class="text-xs text-muted-foreground/70 mt-1 max-w-[300px] mx-auto">
            Rules transfer Jira worklogs and Outlook events to Moco automatically. Create a rule to
            map a Jira project or recurring event to a Moco booking position.
          </p>
          <button
            type="button"
            onclick={() => openEditor()}
            class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Create First Rule
          </button>
        </div>
      {:else}
        <!-- Toolbar -->
        <div class="flex items-center gap-2 mb-2">
          <!-- Search -->
          <div class="relative flex-1">
            <Search
              class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none"
            />
            <input
              type="text"
              bind:value={filterQuery}
              placeholder="Search rules…"
              class="w-full rounded-md border border-border bg-secondary/50 py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-primary transition-colors"
            />
            {#if filterQuery}
              <button
                type="button"
                onclick={() => (filterQuery = '')}
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X class="size-3.5" />
              </button>
            {/if}
          </div>

          <!-- Filter toggle -->
          <button
            type="button"
            onclick={() => (showFilters = !showFilters)}
            class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors
              {hasActiveFilters
              ? 'text-brand-text bg-information-subtle'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
          >
            <Filter class="size-3.5" />
            Filter
            {#if hasActiveFilters}
              <span class="text-[10px] font-mono">({filteredAndSortedRules.length})</span>
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

          <!-- Sort -->
          <select
            bind:value={sortBy}
            class="rounded-md border border-border bg-secondary/50 px-2 py-1.5 text-sm text-foreground
              focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-primary transition-colors"
          >
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="edited">Last edited</option>
            <option value="synced">Last synced</option>
          </select>
        </div>

        <!-- Filter panel -->
        {#if showFilters}
          <div
            class="grid grid-cols-4 gap-2 mb-3 p-2.5 rounded-lg bg-secondary/50 animate-slide-up"
          >
            <!-- Source Type -->
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
              >
                Source
              </p>
              <div class="flex gap-0.5 p-0.5 rounded-md bg-secondary">
                {#each [['all', 'All'], ['jira', 'Jira'], ['outlook', 'Outlook']] as [val, label] (val)}
                  <button
                    type="button"
                    onclick={() => (filterSourceType = val as typeof filterSourceType)}
                    class="flex-1 rounded px-2 py-1 text-xs font-medium transition-colors
                      {filterSourceType === val
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'}"
                  >
                    {label}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Status -->
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
              >
                Status
              </p>
              <div class="flex gap-0.5 p-0.5 rounded-md bg-secondary">
                {#each [['all', 'All'], ['active', 'Active'], ['paused', 'Paused'], ['stale', 'Stale']] as [val, label] (val)}
                  <button
                    type="button"
                    onclick={() => (filterStatus = val as typeof filterStatus)}
                    class="flex-1 rounded px-1.5 py-1 text-xs font-medium transition-colors
                      {filterStatus === val
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'}"
                  >
                    {label}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Customer -->
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
              >
                Customer
              </p>
              <select
                bind:value={filterCustomer}
                class="w-full rounded-md border border-input bg-background px-2 py-1 text-xs
                  focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-primary transition-colors"
              >
                <option value="">All</option>
                {#each uniqueCustomers as customer (customer)}
                  <option value={customer}>{customer}</option>
                {/each}
              </select>
            </div>

            <!-- Auto-Sync -->
            <div>
              <p
                class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
              >
                Auto-Sync
              </p>
              <div class="flex gap-0.5 p-0.5 rounded-md bg-secondary">
                {#each [['all', 'All'], ['yes', 'Yes'], ['no', 'No']] as [val, label] (val)}
                  <button
                    type="button"
                    onclick={() => (filterAutoSync = val as typeof filterAutoSync)}
                    class="flex-1 rounded px-2 py-1 text-xs font-medium transition-colors
                      {filterAutoSync === val
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'}"
                  >
                    {label}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {/if}

        {#if filteredAndSortedRules.length === 0}
          <p class="py-4 text-center text-sm text-muted-foreground">No matching rules.</p>
        {:else}
          <div class="space-y-1">
            {#each filteredAndSortedRules as rule (rule.id)}
              <RuleListItem {rule} onEdit={() => openEditor(rule)} />
            {/each}
          </div>
        {/if}
      {/if}
    {/if}

    <!-- Sync Log Tab -->
    {#if activeTab === 'log'}
      <SyncLogTab />
    {/if}

    <!-- Analytics Tab -->
    {#if activeTab === 'analytics'}
      <RuleAnalyticsTab />
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- Rule Editor (nested dialog) -->
{#if showEditor}
  <RuleEditorModal
    mode={editingRule ? 'edit' : 'create'}
    editRule={editingRule}
    prefill={editorPrefill}
    defaultOpen={true}
    onClose={handleEditorClose}
  />
{/if}
