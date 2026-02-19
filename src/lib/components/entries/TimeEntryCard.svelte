<script lang="ts">
  import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata, OutlookMetadata } from '../../types';
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import JiraEntryModal from '../jira/JiraEntryModal.svelte';
  import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
  import { formatHours } from '../../utils/time-format';
  import { extractFirstIssueKey } from '../../utils/jira-issue-parser';
  import { connectionsState, getJiraBaseUrl } from '../../stores/connections.svelte';
  import { findMatchingFavorite } from '../../stores/favorites.svelte';
  import { openStatsForTask } from '../../stores/statsModal.svelte';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Upload from '@lucide/svelte/icons/upload';
  import Star from '@lucide/svelte/icons/star';
  import Copy from '@lucide/svelte/icons/copy';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

  import {
    matchHoverState,
    setHoveredGroup,
    clearHoveredGroup
  } from '../../stores/entryMatching.svelte';

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
  let isJiraConnected = $derived(connectionsState.jira.isConnected);
  let matchedFavorite = $derived(outlookMeta ? findMatchingFavorite(entry.title) : undefined);

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

  let jiraIssueUrl = $derived.by(() => {
    if (!jiraMeta) return null;
    const baseUrl = getJiraBaseUrl();
    if (!baseUrl) return null;
    return `${baseUrl}/browse/${jiraMeta.issueKey}`;
  });

  // Modal states
  let showMocoEditModal = $state(false);
  let showMocoCreateModal = $state(false);
  let showMocoDuplicateModal = $state(false);
  let showJiraEditModal = $state(false);
  let showJiraSyncModal = $state(false);

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
{#if jiraMeta && isJiraConnected}
  <JiraEntryModal
    mode="edit"
    prefill={{
      date: entry.date,
      hours: entry.hours,
      comment: entry.description ?? '',
      issueKey: jiraMeta.issueKey,
      worklogId: jiraMeta.worklogId
    }}
    defaultOpen={showJiraEditModal}
    onClose={() => (showJiraEditModal = false)}
  />
{/if}

<!-- Moco Create Modal (from Jira/Outlook) -->
{#if (jiraMeta || outlookMeta) && isMocoConnected}
  <MocoEntryModal
    mode="create"
    prefill={{
      date: entry.date,
      hours: matchedFavorite?.defaultHours ?? entry.hours,
      description:
        matchedFavorite?.description ??
        (jiraMeta ? `#${jiraMeta.issueKey} ${jiraMeta.issueSummary}` : entry.title),
      projectId: matchedFavorite?.projectId,
      taskId: matchedFavorite?.taskId,
      remoteService: jiraMeta ? 'jira' : undefined,
      remoteId: jiraMeta?.issueKey
    }}
    defaultOpen={showMocoCreateModal}
    onClose={() => (showMocoCreateModal = false)}
  />
{/if}

<!-- Jira Sync Modal (from Moco) -->
{#if mocoMeta && mocoIssueKey && isJiraConnected}
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

<!-- Card with Context Menu -->
<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <div
        {...props}
        class="group rounded-xl border border-border {borderColorClass} border-l-[3px] bg-card p-3 pl-4 shadow-sm hover:shadow-md hover:border-border-bold transition-all duration-150
          {isDimmed ? 'opacity-40' : ''}
          {isInHoveredGroup ? 'shadow-md' : ''}"
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

      {#if mocoIssueKey && isJiraConnected}
        <ContextMenu.Separator />
        <ContextMenu.Item onclick={openJiraSync}>
          <Upload class="text-brand-text" />
          <span>Sync to Jira</span>
          <span class="ml-auto text-xs text-muted-foreground font-mono">{mocoIssueKey}</span>
        </ContextMenu.Item>
      {/if}
    {/if}

    <!-- Jira Entry Actions -->
    {#if jiraMeta && isJiraConnected}
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
      {/if}
    {/if}

    <!-- Outlook Entry Actions -->
    {#if outlookMeta && isMocoConnected}
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
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>

{#snippet cardContent()}
  <div class="flex items-start justify-between gap-2">
    <div class="flex-1 min-w-0">
      <span class="text-sm font-medium text-foreground line-clamp-2">
        {entry.title}
      </span>
      {#if entry.description}
        <p class="text-xs text-muted-foreground truncate">
          {entry.description}
        </p>
      {/if}
      {#if mocoMeta?.remoteTicketKey}
        <span class="text-xs text-muted-foreground font-mono">
          {mocoMeta.remoteTicketKey}
        </span>
      {/if}
      {#if jiraMeta}
        <div class="flex items-center gap-1.5">
          {#if jiraIssueUrl}
            <a
              href={jiraIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs font-mono font-medium text-brand-text hover:underline"
              onclick={(e) => e.stopPropagation()}
            >
              {jiraMeta.issueKey}
            </a>
          {:else}
            <span class="text-xs font-mono font-medium text-brand-text">
              {jiraMeta.issueKey}
            </span>
          {/if}
          {#if jiraMeta.projectKey}
            <span class="text-xs text-muted-foreground">{jiraMeta.projectKey}</span>
          {/if}
        </div>
      {/if}
      {#if outlookMeta}
        <div class="flex items-center gap-1.5">
          {#if entry.startTime && entry.endTime}
            <span class="text-xs text-muted-foreground">{entry.startTime}–{entry.endTime}</span>
          {/if}
          {#if outlookMeta.isOnlineMeeting}
            <span class="text-xs text-discovery-text">Online</span>
          {/if}
          {#if outlookMeta.attendeeCount && outlookMeta.attendeeCount > 0}
            <span class="text-xs text-muted-foreground">{outlookMeta.attendeeCount} attendees</span>
          {/if}
        </div>
      {/if}
    </div>
    <div class="relative flex flex-col items-end flex-shrink-0 min-w-8">
      <span class="text-sm font-mono font-medium text-foreground group-hover:invisible">
        {formatHours(entry.hours)}
      </span>
      <!-- Hover action: overlays hours display -->
      {#if mocoMeta && isMocoConnected}
        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            openMocoEdit();
          }}
          class="absolute inset-0 hidden group-hover:flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors
            focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          title="Edit entry"
          aria-label="Edit entry"
        >
          <Pencil class="size-3.5" />
        </button>
      {:else if jiraMeta && isJiraConnected}
        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            openJiraEdit();
          }}
          class="absolute inset-0 hidden group-hover:flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors
            focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          title="Edit worklog"
          aria-label="Edit worklog"
        >
          <Pencil class="size-3.5" />
        </button>
      {:else if outlookMeta && isMocoConnected}
        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            openMocoCreate();
          }}
          class="absolute inset-0 hidden group-hover:flex items-center justify-center rounded-md text-success hover:text-success-text hover:bg-success/10 transition-colors
            focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          title="Book in Moco"
          aria-label="Book in Moco"
        >
          <Plus class="size-3.5" />
        </button>
      {/if}
    </div>
  </div>
{/snippet}
