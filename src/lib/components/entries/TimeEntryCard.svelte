<script lang="ts">
  import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata, OutlookMetadata } from '../../types';
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import JiraEntryModal from '../jira/JiraEntryModal.svelte';
  import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
  import { formatHours } from '../../utils/time-format';
  import { extractFirstIssueKey } from '../../utils/jira-issue-parser';
  import {
    connectionsState,
    getJiraBaseUrl,
    getJiraConnectionState,
    isJiraConnected
  } from '../../stores/connections.svelte';
  import { findMatchingFavorite } from '../../stores/favorites.svelte';
  import { buildMocoPrefill } from '../../utils/moco-prefill';
  import { openStatsForTask } from '../../stores/statsModal.svelte';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Upload from '@lucide/svelte/icons/upload';
  import Star from '@lucide/svelte/icons/star';
  import Copy from '@lucide/svelte/icons/copy';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
  import CircleDollarSign from '@lucide/svelte/icons/circle-dollar-sign';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';

  import {
    matchHoverState,
    setHoveredGroup,
    clearHoveredGroup
  } from '../../stores/entryMatching.svelte';
  import { getSyncRecordByActivityId } from '../../stores/syncRecords.svelte';
  import SyncBadge from '../rules/SyncBadge.svelte';
  import RuleEditorModal from '../rules/RuleEditorModal.svelte';
  import Zap from '@lucide/svelte/icons/zap';
  import Tag from '@lucide/svelte/icons/tag';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import Eye from '@lucide/svelte/icons/eye';
  import { isDismissed, dismissEvent, restoreEvent } from '../../stores/dismissedEvents.svelte';

  let {
    entry,
    matchGroupId
  }: {
    entry: UnifiedTimeEntry;
    matchGroupId?: string;
  } = $props();

  let isAnyGroupHovered = $derived(matchHoverState.hoveredGroupId !== null);
  let isInHoveredGroup = $derived(
    matchGroupId !== undefined && matchGroupId === matchHoverState.hoveredGroupId
  );
  let isDimmed = $derived(isAnyGroupHovered && !isInHoveredGroup);

  function handleMouseEnter(): void {
    if (matchGroupId) setHoveredGroup(matchGroupId);
  }

  function handleMouseLeave(): void {
    if (matchGroupId) clearHoveredGroup();
  }

  // Map sources to styleguide border color classes
  const SOURCE_BORDER_COLORS: Record<string, string> = {
    moco: 'border-l-success',
    jira: 'border-l-brand',
    outlook: 'border-l-source-outlook'
  };

  let borderColorClass = $derived(SOURCE_BORDER_COLORS[entry.source]);
  let mocoMeta = $derived(
    entry.metadata.source === 'moco' ? (entry.metadata as MocoMetadata) : null
  );
  let jiraMeta = $derived(
    entry.metadata.source === 'jira' ? (entry.metadata as JiraMetadata) : null
  );
  let outlookMeta = $derived(
    entry.metadata.source === 'outlook' ? (entry.metadata as OutlookMetadata) : null
  );
  let isMocoConnected = $derived(connectionsState.moco.isConnected);
  let hasAnyJiraConnected = $derived(isJiraConnected());
  let isEntryJiraConnected = $derived.by(() => {
    if (!jiraMeta) return false;
    return getJiraConnectionState(jiraMeta.connectionId)?.state.isConnected === true;
  });
  let hasMultipleJira = $derived(connectionsState.jiraConnections.length > 1);
  let jiraConnectionLabel = $derived.by(() => {
    if (!jiraMeta || !hasMultipleJira) return null;
    return getJiraConnectionState(jiraMeta.connectionId)?.label ?? null;
  });
  let matchedFavorite = $derived(outlookMeta ? findMatchingFavorite(entry.title) : undefined);
  let syncRecord = $derived(mocoMeta ? getSyncRecordByActivityId(mocoMeta.activityId) : undefined);

  let isDismissedEntry = $derived(
    outlookMeta ? isDismissed(outlookMeta.eventId, entry.date) : false
  );

  // Jira/Outlook entry not linked to any Moco entry
  let isUnbooked = $derived(
    (jiraMeta || outlookMeta) && isMocoConnected && !matchGroupId && !isDismissedEntry
  );

  // Detect Jira issue key in Moco entry description or remoteTicketKey
  let mocoIssueKey = $derived.by(() => {
    if (!mocoMeta) return null;

    // Check remoteTicketKey first (Moco's native Jira integration)
    if (mocoMeta.remoteTicketKey) {
      return extractFirstIssueKey(mocoMeta.remoteTicketKey);
    }

    // Then check description for #ABC-123 pattern
    if (entry.description) {
      return extractFirstIssueKey(entry.description);
    }

    return null;
  });

  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Clean description: remove ticket key to avoid duplication with badge
  let displayDescription = $derived.by(() => {
    if (!entry.description) return null;
    if (mocoMeta?.remoteTicketKey) {
      const ticketKey = escapeRegExp(mocoMeta.remoteTicketKey);
      const cleaned = entry.description.replace(new RegExp(`#?${ticketKey}\\s*`), '').trim();
      return cleaned || null;
    }
    return entry.description;
  });

  // Extract initials from organizer name (Outlook)
  let organizerInitials = $derived.by(() => {
    const name = outlookMeta ? entry.description : null;
    if (!name) return null;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0]?.[0]?.toUpperCase() ?? null;
  });

  let jiraIssueUrl = $derived.by(() => {
    if (!jiraMeta) return null;
    const baseUrl = getJiraBaseUrl(jiraMeta.connectionId);
    if (!baseUrl) return null;
    return `${baseUrl}/browse/${jiraMeta.issueKey}`;
  });

  // Drag & drop: allow Jira/Outlook entries to be dragged to Moco column
  let isDragging = $state(false);
  let isDraggable = $derived(entry.source === 'jira' || entry.source === 'outlook');

  function handleDragStart(e: DragEvent): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(entry));
    isDragging = true;
  }

  function handleDragEnd(): void {
    isDragging = false;
  }

  // Modal states
  let showMocoEditModal = $state(false);
  let showMocoCreateModal = $state(false);
  let showMocoDuplicateModal = $state(false);
  let showJiraEditModal = $state(false);
  let showJiraSyncModal = $state(false);
  let showRuleEditorModal = $state(false);

  // Hover action button config (DRY: one button, three variants)
  let hoverAction = $derived.by(() => {
    if (mocoMeta && isMocoConnected)
      return {
        onclick: openMocoEdit,
        title: 'Edit entry',
        icon: Pencil,
        color: 'text-muted-foreground hover:text-foreground hover:bg-accent'
      } as const;
    if (jiraMeta && isEntryJiraConnected)
      return {
        onclick: openJiraEdit,
        title: 'Edit worklog',
        icon: Pencil,
        color: 'text-muted-foreground hover:text-foreground hover:bg-accent'
      } as const;
    if (outlookMeta && isMocoConnected)
      return {
        onclick: openMocoCreate,
        title: 'Book in Moco',
        icon: Plus,
        color: 'text-success hover:text-success-text hover:bg-success/10'
      } as const;
    return null;
  });

  // Context menu actions
  function openMocoEdit(): void {
    showMocoEditModal = true;
  }

  function openMocoCreate(): void {
    showMocoCreateModal = true;
  }

  function openMocoDuplicate(): void {
    showMocoDuplicateModal = true;
  }

  function openJiraEdit(): void {
    showJiraEditModal = true;
  }

  function openJiraSync(): void {
    showJiraSyncModal = true;
  }

  function handleDismiss(): void {
    if (outlookMeta) dismissEvent(outlookMeta.eventId, entry.date);
  }

  function handleRestore(): void {
    if (outlookMeta) restoreEvent(outlookMeta.eventId, entry.date);
  }
</script>

<!-- Moco Edit Modal -->
{#if mocoMeta && isMocoConnected}
  <MocoEntryModal
    mode="edit"
    activityId={mocoMeta.activityId}
    prefill={{
      date: entry.date,
      hours: entry.hours,
      description: entry.description ?? '',
      projectId: mocoMeta.projectId,
      taskId: mocoMeta.taskId
    }}
    defaultOpen={showMocoEditModal}
    onClose={() => (showMocoEditModal = false)}
  />
{/if}

<!-- Moco Duplicate Modal -->
{#if mocoMeta && isMocoConnected}
  <MocoEntryModal
    mode="create"
    prefill={{
      date: entry.date,
      hours: entry.hours,
      description: entry.description ?? '',
      projectId: mocoMeta.projectId,
      taskId: mocoMeta.taskId
    }}
    defaultOpen={showMocoDuplicateModal}
    onClose={() => (showMocoDuplicateModal = false)}
  />
{/if}

<!-- Jira Edit Modal -->
{#if jiraMeta && isEntryJiraConnected}
  <JiraEntryModal
    mode="edit"
    prefill={{
      date: entry.date,
      hours: entry.hours,
      comment: entry.description ?? '',
      issueKey: jiraMeta.issueKey,
      worklogId: jiraMeta.worklogId,
      connectionId: jiraMeta.connectionId
    }}
    defaultOpen={showJiraEditModal}
    onClose={() => (showJiraEditModal = false)}
  />
{/if}

<!-- Moco Create Modal (from Jira/Outlook) -->
{#if (jiraMeta || outlookMeta) && isMocoConnected}
  <MocoEntryModal
    mode="create"
    prefill={buildMocoPrefill(entry)}
    defaultOpen={showMocoCreateModal}
    onClose={() => (showMocoCreateModal = false)}
  />
{/if}

<!-- Jira Sync Modal (from Moco) -->
{#if mocoMeta && mocoIssueKey && hasAnyJiraConnected}
  <JiraEntryModal
    mode="create"
    prefill={{
      date: entry.date,
      hours: entry.hours,
      issueKey: mocoIssueKey,
      comment: entry.description
    }}
    defaultOpen={showJiraSyncModal}
    onClose={() => (showJiraSyncModal = false)}
  />
{/if}

<!-- Rule Editor Modal (from context menu) -->
{#if showRuleEditorModal && outlookMeta}
  <RuleEditorModal
    mode="create"
    prefill={{
      source: {
        type: 'outlook',
        eventPattern: entry.title,
        matchType: 'contains',
        overrideHours: entry.hours > 0 ? entry.hours : undefined
      }
    }}
    defaultOpen={true}
    onClose={() => (showRuleEditorModal = false)}
  />
{:else if showRuleEditorModal && jiraMeta}
  <RuleEditorModal
    mode="create"
    prefill={{
      source: {
        type: 'jira',
        connectionId: jiraMeta.connectionId,
        projectKey: jiraMeta.projectKey ?? jiraMeta.issueKey.split('-')[0],
        issuePattern: jiraMeta.issueKey
      }
    }}
    defaultOpen={true}
    onClose={() => (showRuleEditorModal = false)}
  />
{/if}

<!-- Card with Context Menu -->
<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <div
        {...props}
        draggable={isDraggable}
        ondragstart={isDraggable ? handleDragStart : undefined}
        ondragend={isDraggable ? handleDragEnd : undefined}
        class="group relative rounded-xl border border-border {borderColorClass} border-l-[3px] bg-card dark:bg-white/[0.03] dark:border-white/10 p-3 pl-4 hover:border-border-bold dark:hover:border-white/20 dark:hover:bg-white/[0.05] transition-all duration-150
          {isDimmed || isDismissedEntry ? 'opacity-40' : ''}
          {isInHoveredGroup ? 'border-border-bold dark:border-white/20' : ''}
          {isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
          {isDragging ? 'opacity-50' : ''}"
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
      >
        {@render cardContent()}
      </div>
    {/snippet}
  </ContextMenu.Trigger>

  <ContextMenu.Content>
    <!-- Moco Entry Actions -->
    {#if mocoMeta && isMocoConnected}
      <ContextMenu.Item onclick={openMocoEdit}>
        <Pencil class="text-muted-foreground" />
        <span>Edit Entry</span>
      </ContextMenu.Item>
      <ContextMenu.Item onclick={openMocoDuplicate}>
        <Copy class="text-muted-foreground" />
        <span>Duplicate Entry</span>
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item onclick={() => openStatsForTask(mocoMeta.projectId, mocoMeta.taskName)}>
        <BarChart3 class="text-muted-foreground" />
        <span>Task Stats</span>
      </ContextMenu.Item>

      {#if mocoIssueKey && hasAnyJiraConnected}
        <ContextMenu.Separator />
        <ContextMenu.Item onclick={openJiraSync}>
          <Upload class="text-brand-text" />
          <span>Sync to Jira</span>
          <span class="ml-auto text-xs text-muted-foreground font-mono">{mocoIssueKey}</span>
        </ContextMenu.Item>
      {/if}
    {/if}

    <!-- Jira Entry Actions -->
    {#if jiraMeta && isEntryJiraConnected}
      <ContextMenu.Item onclick={openJiraEdit}>
        <Pencil class="text-muted-foreground" />
        <span>Edit Worklog</span>
      </ContextMenu.Item>

      {#if jiraIssueUrl}
        <ContextMenu.Item>
          <a
            href={jiraIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 w-full"
          >
            <ExternalLink class="text-muted-foreground" />
            <span>Open in Jira</span>
          </a>
        </ContextMenu.Item>
      {/if}

      {#if isMocoConnected}
        <ContextMenu.Separator />
        <ContextMenu.Item onclick={openMocoCreate}>
          <Plus class="text-success" />
          <span>Book in Moco</span>
        </ContextMenu.Item>
        <ContextMenu.Item onclick={() => (showRuleEditorModal = true)}>
          <Zap class="text-warning" />
          <span>Create Rule</span>
        </ContextMenu.Item>
      {/if}
    {/if}

    <!-- Outlook Entry Actions -->
    {#if outlookMeta}
      {#if isDismissedEntry}
        <ContextMenu.Item onclick={handleRestore}>
          <Eye class="text-muted-foreground" />
          <span>Restore</span>
        </ContextMenu.Item>
      {:else}
        {#if isMocoConnected}
          {#if matchedFavorite}
            <ContextMenu.Item onclick={openMocoCreate}>
              <Star class="text-warning" />
              <span>Book as Favorite</span>
              <span class="ml-auto text-xs text-muted-foreground truncate max-w-[120px]"
                >{matchedFavorite.name}</span
              >
            </ContextMenu.Item>
          {:else}
            <ContextMenu.Item onclick={openMocoCreate}>
              <Plus class="text-success" />
              <span>Book in Moco</span>
            </ContextMenu.Item>
          {/if}
          <ContextMenu.Separator />
          <ContextMenu.Item onclick={() => (showRuleEditorModal = true)}>
            <Zap class="text-warning" />
            <span>Create Rule</span>
          </ContextMenu.Item>
        {/if}
        {#if isMocoConnected}
          <ContextMenu.Separator />
        {/if}
        <ContextMenu.Item onclick={handleDismiss}>
          <EyeOff class="text-muted-foreground" />
          <span>Dismiss</span>
        </ContextMenu.Item>
      {/if}
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>

{#snippet cardContent()}
  <div class="relative flex items-start justify-between gap-2">
    <div class="flex-1 min-w-0">
      <!-- Primary context (top-left): time for Outlook, customer for Moco, ticket badge for Jira -->
      {#if outlookMeta?.isAllDay}
        <span class="text-[11px] font-medium text-muted-foreground leading-tight">All day</span>
      {:else if outlookMeta && entry.startTime && entry.endTime}
        <span class="text-[11px] font-mono font-medium text-muted-foreground leading-tight">
          {entry.startTime}–{entry.endTime}
        </span>
      {:else if mocoMeta?.customerName}
        <span
          class="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider leading-none"
        >
          {mocoMeta.customerName}
        </span>
      {:else if jiraMeta}
        <div class="flex items-center gap-1.5 min-w-0">
          {#if jiraIssueUrl}
            <a
              href={jiraIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium bg-white/5 text-brand-text hover:bg-brand/20 transition-colors flex-shrink-0"
              onclick={(e) => e.stopPropagation()}
            >
              {jiraMeta.issueKey}
            </a>
          {:else}
            <span
              class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium bg-white/5 text-brand-text flex-shrink-0"
            >
              {jiraMeta.issueKey}
            </span>
          {/if}
          {#if jiraMeta.projectKey}
            <span
              class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0"
            >
              <Tag class="size-2.5" />
              {jiraMeta.projectKey}
            </span>
          {/if}
          {#if jiraConnectionLabel}
            <span
              class="text-[10px] text-muted-foreground/50 truncate max-w-[120px]"
              title={jiraConnectionLabel}>{jiraConnectionLabel}</span
            >
          {/if}
        </div>
      {/if}

      <!-- Title -->
      <span
        class="text-sm font-semibold text-foreground leading-snug line-clamp-2 {isDismissedEntry
          ? 'line-through text-muted-foreground'
          : ''}"
      >
        {entry.title}
      </span>

      <!-- Description / Organizer -->
      {#if outlookMeta && displayDescription}
        <div class="flex items-center gap-1.5 mt-0.5">
          {#if organizerInitials}
            <span
              class="inline-flex items-center justify-center size-4 rounded-full bg-source-outlook-subtle text-[8px] font-bold text-source-outlook-text flex-shrink-0"
            >
              {organizerInitials}
            </span>
          {/if}
          <p class="min-w-0 flex-1 text-xs font-medium text-muted-foreground/70 truncate">
            {displayDescription}
          </p>
        </div>
      {:else if displayDescription}
        <p class="text-xs font-medium text-muted-foreground/70 truncate">
          {displayDescription}
        </p>
      {/if}

      <!-- Ticket badge for Moco entries with linked Jira ticket -->
      {#if mocoMeta?.remoteTicketKey}
        <span
          class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium bg-white/5 text-brand-text mt-0.5"
        >
          {mocoMeta.remoteTicketKey}
        </span>
      {/if}
    </div>
    <div class="relative flex flex-col items-end flex-shrink-0">
      <span class="text-base font-mono font-bold text-foreground group-hover:invisible">
        {formatHours(entry.hours)}
      </span>
      {#if hoverAction}
        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            hoverAction.onclick();
          }}
          class="absolute top-1/2 right-0 -translate-y-1/2 hidden group-hover:flex items-center justify-center size-7 rounded-md {hoverAction.color} transition-colors
            focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          title={hoverAction.title}
          aria-label={hoverAction.title}
        >
          <hoverAction.icon class="size-3.5" />
        </button>
      {/if}
    </div>
  </div>
  <!-- Unbooked indicator for Jira/Outlook entries not linked to Moco -->
  {#if isUnbooked}
    <div class="mt-1.5 flex items-center gap-1">
      <span class="size-1.5 rounded-full bg-warning/60"></span>
      <span class="text-[10px] text-muted-foreground/50">Not booked</span>
    </div>
  {/if}
  <!-- Bottom-right badges (outside the hours container so edit button doesn't cover them) -->
  {#if syncRecord || mocoMeta?.billable}
    <div class="absolute bottom-2.5 right-3 flex items-center gap-1.5">
      {#if syncRecord}
        <SyncBadge {syncRecord} />
      {/if}
      {#if mocoMeta?.billable}
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <CircleDollarSign class="size-3 text-success/60" aria-label="Billable" />
            </Tooltip.Trigger>
            <Tooltip.Content side="top" sideOffset={4}>Billable</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {/if}
    </div>
  {/if}
{/snippet}
