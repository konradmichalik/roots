<script lang="ts">
  import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata, OutlookMetadata } from '../../types';
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import { formatHours } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';
  import { getSourceColor } from '../../stores/settings.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { findMatchingFavorite } from '../../stores/favorites.svelte';

  import { matchHoverState, setHoveredGroup, clearHoveredGroup } from '../../stores/entryMatching.svelte';

  let { entry, matchGroupId }: {
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

  let sourceColor = $derived(getSourceColor(entry.source));
  let mocoMeta = $derived(entry.metadata.source === 'moco' ? entry.metadata as MocoMetadata : null);
  let jiraMeta = $derived(entry.metadata.source === 'jira' ? entry.metadata as JiraMetadata : null);
  let outlookMeta = $derived(entry.metadata.source === 'outlook' ? entry.metadata as OutlookMetadata : null);
  let isMocoConnected = $derived(connectionsState.moco.isConnected);
  let matchedFavorite = $derived(outlookMeta ? findMatchingFavorite(entry.title) : undefined);
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
      class="w-full text-left group rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md hover:border-border-bold transition-all duration-150 cursor-pointer
        {isDimmed ? 'opacity-40' : ''}
        {isInHoveredGroup ? 'shadow-md' : ''}"
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
    >
      {@render cardContent()}
    </button>
  </MocoEntryModal>
{:else}
  <div
    class="group rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md hover:border-border-bold transition-all duration-150
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
      <div class="flex items-center gap-1.5 mb-0.5">
        <div
          class="h-2 w-2 rounded-full flex-shrink-0"
          style="background-color: {sourceColor}"
        ></div>
        <span class="text-sm font-medium text-foreground truncate">
          {entry.title}
        </span>
      </div>
      {#if entry.description}
        <p class="text-xs text-muted-foreground truncate pl-3.5">
          {entry.description}
        </p>
      {/if}
      {#if mocoMeta?.remoteTicketKey}
        <span class="text-xs text-muted-foreground pl-3.5 font-mono">
          {mocoMeta.remoteTicketKey}
        </span>
      {/if}
      {#if jiraMeta}
        <div class="flex items-center gap-1.5 pl-3.5">
          <span class="text-xs font-mono font-medium text-brand-text">
            {jiraMeta.issueKey}
          </span>
          {#if jiraMeta.projectKey}
            <span class="text-xs text-muted-foreground">{jiraMeta.projectKey}</span>
          {/if}
        </div>
      {/if}
      {#if outlookMeta}
        <div class="flex items-center gap-1.5 pl-3.5">
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
        {formatHours(entry.hours, settingsState.hoursFormat)}
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
            <button
              class="rounded-md p-0.5 text-warning hover:text-warning/80 hover:bg-accent transition-colors duration-150"
              title="Book as '{matchedFavorite.name}'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
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
            <button
              class="rounded-md p-0.5 text-muted-foreground hover:text-primary hover:bg-accent transition-colors duration-150"
              title="Book in Moco"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
              </svg>
            </button>
          </MocoEntryModal>
        </div>
      {/if}
    </div>
  </div>
{/snippet}
