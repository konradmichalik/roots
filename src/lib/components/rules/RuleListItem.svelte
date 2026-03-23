<script lang="ts">
  import { getLastSyncForRule, getConflictCountForRule } from '../../stores/syncRecords.svelte';
  import type { Rule } from '../../types';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Zap from '@lucide/svelte/icons/zap';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import GitBranch from '@lucide/svelte/icons/git-branch';

  let {
    rule,
    onEdit
  }: {
    rule: Rule;
    onEdit?: () => void;
  } = $props();

  let lastSync = $derived(getLastSyncForRule(rule.id));
  let isStale = $derived(rule.targetStatus === 'stale');
  let conflictCount = $derived(getConflictCountForRule(rule.id));

  let sourceLabel = $derived.by(() => {
    if (rule.source.type === 'jira') {
      if (rule.source.jql) return 'Jira: JQL';
      const parts = [rule.source.issuePattern || rule.source.projectKey];
      if (rule.source.epicKey) parts.push(`Epic: ${rule.source.epicKey}`);
      if (rule.source.component) parts.push(rule.source.component);
      if (rule.source.labels?.length) parts.push(`#${rule.source.labels.join(' #')}`);
      return `Jira: ${parts.join(' · ')}`;
    }
    return `Outlook: "${rule.source.eventPattern}"`;
  });

  let lastSyncLabel = $derived.by(() => {
    if (!lastSync) return 'Never synced';
    const today = new Date().toISOString().slice(0, 10);
    if (lastSync.date === today) return `Today, ${lastSync.count} entries`;
    return `${lastSync.date}, ${lastSync.count} entries`;
  });

  let statusLabel = $derived.by(() => {
    if (!rule.enabled) return 'Paused';
    if (rule.autoSync) return 'Auto';
    return 'Manual';
  });

  let statusClass = $derived.by(() => {
    if (!rule.enabled) return 'bg-secondary text-muted-foreground';
    if (rule.autoSync) return 'bg-information-subtle text-brand-text';
    return 'bg-success-subtle text-success-text';
  });
</script>

<div
  class="group/rule relative rounded-lg border bg-card transition-all duration-150
    {isStale
    ? 'border-warning/50'
    : !rule.enabled
      ? 'border-border/50 opacity-60'
      : 'border-border hover:border-border-bold'}"
  role="listitem"
>
  <!-- Content -->
  <div class="p-2 pl-3 pr-8">
    <div class="flex items-center gap-1.5">
      {#if isStale}
        <AlertTriangle class="size-3 text-warning flex-shrink-0" />
      {:else}
        <Zap
          class="size-3 {rule.enabled ? 'text-warning' : 'text-muted-foreground'} flex-shrink-0"
        />
      {/if}
      <span class="text-sm font-medium text-foreground truncate">{rule.name}</span>
      <span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 {statusClass}">
        {statusLabel}
      </span>
    </div>
    <div class="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
      <span class="shrink-0">{sourceLabel}</span>
      <span class="text-muted-foreground/50 shrink-0">→</span>
      <span class="truncate min-w-0"
        >{rule.target.customerName} / {rule.target.mocoProjectName}</span
      >
      {#if isStale}
        <span class="text-warning shrink-0">· Stale</span>
      {:else}
        <span class="text-muted-foreground/40 shrink-0">· {lastSyncLabel}</span>
      {/if}
      {#if conflictCount > 0}
        <span
          class="inline-flex items-center gap-0.5 shrink-0 text-warning-text"
          title="{conflictCount} synced entries had competing rules"
        >
          <GitBranch class="size-2.5" />
          <span class="text-[10px]">{conflictCount}</span>
        </span>
      {/if}
    </div>
  </div>

  <!-- Edit overlay (hover) -->
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
