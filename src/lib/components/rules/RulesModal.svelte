<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import RuleListItem from './RuleListItem.svelte';
  import RuleEditorModal from './RuleEditorModal.svelte';
  import SyncLogTab from './SyncLogTab.svelte';
  import RuleAnalyticsTab from './RuleAnalyticsTab.svelte';
  import BulkSyncDialog from './BulkSyncDialog.svelte';
  import { getSortedRules, reorderRules } from '../../stores/rules.svelte';
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
  let {
    children,
    defaultOpen = false,
    onClose
  }: {
    children?: Snippet;
    defaultOpen?: boolean;
    onClose?: () => void;
  } = $props();

  let open = $state(defaultOpen);
  let activeTab = $state<'rules' | 'log' | 'analytics'>('rules');

  // Editor state
  let showEditor = $state(false);
  let editingRule = $state<Rule | undefined>(undefined);
  let editorPrefill = $state<{ source?: SourceMatcher } | undefined>(undefined);

  let filterQuery = $state('');
  let sortedRules = $derived(getSortedRules());

  let filteredRules = $derived.by(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return sortedRules;
    return sortedRules.filter((rule) => {
      const source =
        rule.source.type === 'jira'
          ? `jira ${rule.source.projectKey} ${rule.source.issuePattern ?? ''}`
          : `outlook ${rule.source.eventPattern}`;
      const target = `${rule.target.customerName} ${rule.target.mocoProjectName}`;
      const searchable = `${rule.name} ${source} ${target}`.toLowerCase();
      return searchable.includes(q);
    });
  });

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (!isOpen) {
      showEditor = false;
      editingRule = undefined;
      editorPrefill = undefined;
      filterQuery = '';
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

  // Drag and Drop
  let draggedId = $state<string | null>(null);
  let dragOverId = $state<string | null>(null);

  function handleDragStart(e: DragEvent, id: string): void {
    draggedId = id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    }
  }

  function handleDragOver(e: DragEvent, id: string): void {
    e.preventDefault();
    if (draggedId !== id) dragOverId = id;
  }

  function handleDragLeave(): void {
    dragOverId = null;
  }

  function handleDrop(e: DragEvent, targetId: string): void {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      resetDrag();
      return;
    }

    const currentIds = sortedRules.map((r) => r.id);
    const draggedIndex = currentIds.indexOf(draggedId);
    const targetIndex = currentIds.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      resetDrag();
      return;
    }

    const newIds = [...currentIds];
    newIds.splice(draggedIndex, 1);
    newIds.splice(targetIndex, 0, draggedId);

    reorderRules(newIds);
    resetDrag();
  }

  function handleDragEnd(): void {
    resetDrag();
  }

  function resetDrag(): void {
    draggedId = null;
    dragOverId = null;
  }

  function dragProps(id: string) {
    return {
      isDragged: draggedId === id,
      isDragOver: dragOverId === id,
      ondragstart: (e: DragEvent) => handleDragStart(e, id),
      ondragover: (e: DragEvent) => handleDragOver(e, id),
      ondragleave: handleDragLeave,
      ondrop: (e: DragEvent) => handleDrop(e, id),
      ondragend: handleDragEnd
    };
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
  <Dialog.Content class="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
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
          <span class="text-[10px] font-mono text-muted-foreground">({sortedRules.length})</span>
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
        <!-- Search filter -->
        {#if sortedRules.length > 5}
          <div class="relative mb-2">
            <Search
              class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60 pointer-events-none"
            />
            <input
              type="text"
              bind:value={filterQuery}
              placeholder="Filter rules…"
              class="w-full rounded-md border border-border bg-secondary/50 py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-primary transition-colors"
            />
            {#if filterQuery}
              <button
                type="button"
                onclick={() => (filterQuery = '')}
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear filter"
              >
                <X class="size-3.5" />
              </button>
            {/if}
          </div>
        {/if}

        {#if filteredRules.length === 0}
          <p class="py-4 text-center text-sm text-muted-foreground">No matching rules.</p>
        {:else}
          <div class="space-y-1">
            {#each filteredRules as rule (rule.id)}
              <RuleListItem {rule} {...dragProps(rule.id)} onEdit={() => openEditor(rule)} />
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
