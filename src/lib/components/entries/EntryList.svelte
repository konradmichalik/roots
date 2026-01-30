<script lang="ts">
  import type { UnifiedTimeEntry } from '../../types';
  import TimeEntryCard from './TimeEntryCard.svelte';

  let { entries, emptyMessage = 'Keine Eintraege' }: {
    entries: UnifiedTimeEntry[];
    emptyMessage?: string;
  } = $props();
</script>

{#if entries.length > 0}
  <div class="space-y-1.5">
    {#each entries as entry (entry.id)}
      <TimeEntryCard {entry} />
    {/each}
  </div>
{:else}
  <p class="text-xs text-muted-foreground text-center py-3">{emptyMessage}</p>
{/if}
