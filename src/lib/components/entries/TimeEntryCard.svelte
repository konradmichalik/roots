<script lang="ts">
  import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata, OutlookMetadata } from '../../types';
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { formatHours } from '../../utils/time-format';
  import { connectionsState, getJiraBaseUrl } from '../../stores/connections.svelte';
  import { findMatchingFavorite } from '../../stores/favorites.svelte';
  import Star from '@lucide/svelte/icons/star';
  import Plus from '@lucide/svelte/icons/plus';

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
  let matchedFavorite = $derived(outlookMeta ? findMatchingFavorite(entry.title) : undefined);

  let jiraIssueUrl = $derived.by(() => {
    if (!jiraMeta) return null;
    const baseUrl = getJiraBaseUrl();
    if (!baseUrl) return null;
    return `${baseUrl}/browse/${jiraMeta.issueKey}`;
  });
</script>

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
  >
    <button
      class="w-full text-left group rounded-xl border border-border {borderColorClass} border-l-[3px] bg-card p-3 pl-4 shadow-sm hover:shadow-md hover:border-border-bold transition-all duration-150 cursor-pointer
        {isDimmed ? 'opacity-40' : ''}
        {isInHoveredGroup ? 'shadow-md' : ''}"
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
    >
      {@render cardContent()}
    </button>
  </MocoEntryModal>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="group rounded-xl border border-border {borderColorClass} border-l-[3px] bg-card p-3 pl-4 shadow-sm hover:shadow-md hover:border-border-bold transition-all duration-150
      {isDimmed ? 'opacity-40' : ''}
      {isInHoveredGroup ? 'shadow-md' : ''}"
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
  >
    {@render cardContent()}
  </div>
{/if}

{#snippet cardContent()}
  <div class="flex items-start justify-between gap-2">
    <div class="flex-1 min-w-0">
      <span class="text-sm font-medium text-foreground truncate block">
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
    <div class="flex flex-col items-end flex-shrink-0">
      <span class="text-sm font-mono font-medium text-foreground">
        {formatHours(entry.hours)}
      </span>
      {#if outlookMeta && matchedFavorite && isMocoConnected}
        <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-0.5">
          <MocoEntryModal
            mode="create"
            prefill={{
              date: entry.date,
              hours: matchedFavorite.defaultHours ?? entry.hours,
              description: matchedFavorite.description ?? entry.title,
              projectId: matchedFavorite.projectId,
              taskId: matchedFavorite.taskId
            }}
          >
            <Tooltip.Provider delayDuration={200}>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <button
                    class="rounded-md p-0.5 text-warning hover:text-warning/80 hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label="Book as favorite"
                  >
                    <Star class="size-3.5" fill="currentColor" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content side="left" sideOffset={4}>
                  <div class="text-xs">
                    <div class="font-medium">Book as favorite</div>
                    <div class="text-muted-foreground">{matchedFavorite.name}</div>
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </MocoEntryModal>
        </div>
      {:else if (jiraMeta || outlookMeta) && isMocoConnected}
        <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-0.5">
          <MocoEntryModal
            mode="create"
            prefill={{
              date: entry.date,
              hours: entry.hours,
              description: jiraMeta
                ? `#${jiraMeta.issueKey} ${jiraMeta.issueSummary}`
                : entry.title,
              remoteService: jiraMeta ? 'jira' : undefined,
              remoteId: jiraMeta?.issueKey
            }}
          >
            <Tooltip.Provider delayDuration={200}>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <button
                    class="rounded-md p-0.5 text-muted-foreground hover:text-primary hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label="Add to Moco"
                  >
                    <Plus class="size-3.5" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content side="left" sideOffset={4}>Book in Moco</Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </MocoEntryModal>
        </div>
      {/if}
    </div>
  </div>
{/snippet}
