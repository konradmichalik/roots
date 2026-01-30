<script lang="ts">
  import type { UnifiedTimeEntry } from '../../types';
  import TimeEntryCard from './TimeEntryCard.svelte';

  let { entries, emptyMessage = 'Keine Eintraege' }: {
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
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M12 8v8" /><path d="M8 12h8" />
    </svg>
    <p class="text-xs text-muted-foreground/60">{emptyMessage}</p>
  </div>
{/if}
