<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { updateRule } from '../../stores/rules.svelte';
  import { getLastSyncForRule, getSyncCountForRule } from '../../stores/syncRecords.svelte';
  import { formatHours } from '../../utils/time-format';
  import type { Rule } from '../../types';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Zap from '@lucide/svelte/icons/zap';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';

  let {
    rule,
    isDragged = false,
    isDragOver = false,
    ondragstart,
    ondragover,
    ondragleave,
    ondrop,
    ondragend,
    onEdit
  }: {
    rule: Rule;
    isDragged?: boolean;
    isDragOver?: boolean;
    ondragstart?: (e: DragEvent) => void;
    ondragover?: (e: DragEvent) => void;
    ondragleave?: () => void;
    ondrop?: (e: DragEvent) => void;
    ondragend?: () => void;
    onEdit?: () => void;
  } = $props();

  let lastSync = $derived(getLastSyncForRule(rule.id));
  let totalSyncs = $derived(getSyncCountForRule(rule.id));
  let isStale = $derived(rule.targetStatus === 'stale');

  let sourceLabel = $derived.by(() => {
    if (rule.source.type === 'jira') {
      const pattern = rule.source.issuePattern;
      return pattern ? `Jira: ${pattern}` : `Jira: ${rule.source.projectKey}`;
    }
    return `Outlook: "${rule.source.eventPattern}"`;
  });

  let lastSyncLabel = $derived.by(() => {
    if (!lastSync) return 'Never synced';
    const today = new Date().toISOString().slice(0, 10);
    if (lastSync.date === today) return `Today, ${lastSync.count} entries`;
    return `${lastSync.date}, ${lastSync.count} entries`;
  });

  function toggleEnabled(): void {
    updateRule(rule.id, { enabled: !rule.enabled });
  }

  function toggleAutoSync(): void {
    updateRule(rule.id, { autoSync: !rule.autoSync });
  }
</script>

<div
  class="group/rule relative overflow-hidden rounded-lg border bg-card transition-all duration-150
    {isDragged
    ? 'opacity-50 border-dashed border-primary'
    : isDragOver
      ? 'border-primary bg-primary/5'
      : isStale
        ? 'border-warning/50'
        : !rule.enabled
          ? 'border-border/50 opacity-60'
          : 'border-border hover:border-border-bold'}"
  draggable="true"
  {ondragstart}
  {ondragover}
  {ondragleave}
  {ondrop}
  {ondragend}
  role="listitem"
>
  <!-- Drag Handle -->
  <div
    class="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/rule:opacity-100 transition-opacity"
  >
    <GripVertical class="size-3 text-muted-foreground" />
  </div>

  <div class="p-2.5 pl-5">
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          {#if isStale}
            <AlertTriangle class="size-3 text-warning flex-shrink-0" />
          {:else}
            <Zap
              class="size-3 {rule.enabled ? 'text-warning' : 'text-muted-foreground'} flex-shrink-0"
            />
          {/if}
          <span class="text-sm font-medium text-foreground truncate">{rule.name}</span>
        </div>
        <p class="text-xs text-muted-foreground truncate">{sourceLabel}</p>
        <p class="text-xs text-muted-foreground truncate">
          {rule.target.customerName} — {rule.target.mocoProjectName} / {rule.target.mocoTaskName}
        </p>
        {#if isStale}
          <p class="text-xs text-warning truncate">Task no longer available</p>
        {:else}
          <p class="text-[10px] text-muted-foreground/60 truncate">{lastSyncLabel}</p>
        {/if}
      </div>

      <!-- Toggles -->
      <div class="flex flex-col items-end gap-1 flex-shrink-0">
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                type="button"
                onclick={toggleEnabled}
                class="rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors
                  {rule.enabled
                  ? 'bg-success-subtle text-success-text'
                  : 'bg-secondary text-muted-foreground'}"
              >
                {rule.enabled ? 'On' : 'Off'}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side="left" sideOffset={4}>
              {rule.enabled ? 'Rule is active' : 'Rule is paused'}
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>

        {#if rule.enabled}
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <button
                  type="button"
                  onclick={toggleAutoSync}
                  class="rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors
                    {rule.autoSync
                    ? 'bg-information-subtle text-brand-text'
                    : 'bg-secondary text-muted-foreground'}"
                >
                  {rule.autoSync ? 'Auto' : 'Manual'}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side="left" sideOffset={4}>
                {rule.autoSync ? 'Entries are synced automatically' : 'Entries require manual sync'}
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        {/if}
      </div>
    </div>
  </div>

  <!-- Edit overlay -->
  <div
    class="absolute top-1.5 right-1.5 opacity-0 group-hover/rule:opacity-100 flex items-center gap-0.5 transition-opacity duration-150"
  >
    <button
      type="button"
      onclick={onEdit}
      class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      title="Edit rule"
      aria-label="Edit rule"
    >
      <Pencil class="size-3" />
    </button>
  </div>
</div>
