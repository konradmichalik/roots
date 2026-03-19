<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import RuleListItem from './RuleListItem.svelte';
  import RuleEditorModal from './RuleEditorModal.svelte';
  import SyncLogTab from './SyncLogTab.svelte';
  import RuleAnalyticsTab from './RuleAnalyticsTab.svelte';
  import BulkSyncDialog from './BulkSyncDialog.svelte';
  import { rulesState, getSortedRules, reorderRules } from '../../stores/rules.svelte';
  import type { Rule, SourceMatcher } from '../../types';
  import type { Snippet } from 'svelte';
  import Zap from '@lucide/svelte/icons/zap';
  import Plus from '@lucide/svelte/icons/plus';
  import List from '@lucide/svelte/icons/list';
  import History from '@lucide/svelte/icons/history';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
  import Layers from '@lucide/svelte/icons/layers';
  import Info from '@lucide/svelte/icons/info';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';

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

  let sortedRules = $derived(getSortedRules());

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (!isOpen) {
      showEditor = false;
      editingRule = undefined;
      editorPrefill = undefined;
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
  <Dialog.Content class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <div class="flex items-center gap-2">
        <Dialog.Title>Rules</Dialog.Title>
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Info class="size-3.5 text-muted-foreground" />
            </Tooltip.Trigger>
            <Tooltip.Content side="right" sideOffset={4} class="max-w-[250px]">
              Rules transfer Jira worklogs and Outlook events to Moco automatically.
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
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
              title="Bulk Sync"
              aria-label="Bulk Sync"
            >
              <Layers class="size-4" />
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
        <div class="space-y-1.5">
          {#each sortedRules as rule (rule.id)}
            <RuleListItem {rule} {...dragProps(rule.id)} onEdit={() => openEditor(rule)} />
          {/each}
        </div>
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
