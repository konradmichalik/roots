<script lang="ts">
  import type { UnifiedTimeEntry } from '../../types';
  import TimeEntryCard from './TimeEntryCard.svelte';
  import SquarePlus from '@lucide/svelte/icons/square-plus';

  let {
    entries,
    emptyMessage = 'No entries'
  }: {
    entries: UnifiedTimeEntry[];
    emptyMessage?: string;
  } = $props();
</script>

{#if entries.length > 0}
  <div class="space-y-2">
    {#each entries as entry (entry.id)}
      <TimeEntryCard {entry} />
    {/each}
  </div>
{:else}
  <div class="flex flex-col items-center gap-1 py-6 text-center">
    <SquarePlus class="size-5 text-muted-foreground/40" strokeWidth={1.5} />
    <p class="text-xs text-muted-foreground/60">{emptyMessage}</p>
  </div>
{/if}
