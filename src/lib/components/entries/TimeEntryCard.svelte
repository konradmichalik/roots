<script lang="ts">
  import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata, OutlookMetadata } from '../../types';
  import { formatHours } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';
  import { getSourceColor } from '../../stores/settings.svelte';

  let { entry }: { entry: UnifiedTimeEntry } = $props();

  let sourceColor = $derived(getSourceColor(entry.source));
  let mocoMeta = $derived(entry.metadata.source === 'moco' ? entry.metadata as MocoMetadata : null);
  let jiraMeta = $derived(entry.metadata.source === 'jira' ? entry.metadata as JiraMetadata : null);
  let outlookMeta = $derived(entry.metadata.source === 'outlook' ? entry.metadata as OutlookMetadata : null);
</script>

<div class="group rounded-md border border-border bg-card p-2.5 hover:bg-card/80 transition-colors">
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
          <span class="text-xs font-mono font-medium text-blue-600 dark:text-blue-400">
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
            <span class="text-xs text-purple-600 dark:text-purple-400">Online</span>
          {/if}
          {#if outlookMeta.attendeeCount && outlookMeta.attendeeCount > 0}
            <span class="text-xs text-muted-foreground">{outlookMeta.attendeeCount} Teiln.</span>
          {/if}
        </div>
      {/if}
    </div>
    <span class="text-sm font-mono font-medium text-foreground flex-shrink-0">
      {formatHours(entry.hours, settingsState.hoursFormat)}
    </span>
  </div>
</div>
