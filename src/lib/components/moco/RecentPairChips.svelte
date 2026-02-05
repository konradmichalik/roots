<script lang="ts">
  import { getTopPairs } from '../../stores/recentMocoPairs.svelte';
  import Clock from '@lucide/svelte/icons/clock';

  let {
    onSelect
  }: {
    onSelect: (projectId: number, taskId: number) => void;
  } = $props();

  const pairs = $derived(getTopPairs(5));

  function truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
  }
</script>

{#if pairs.length > 0}
  <div class="mb-4">
    <div class="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
      <Clock class="size-3" />
      <span>Frequently used</span>
    </div>
    <div class="flex flex-wrap gap-1.5">
      {#each pairs as pair (pair.projectId + '-' + pair.taskId)}
        <button
          type="button"
          onclick={() => onSelect(pair.projectId, pair.taskId)}
          class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md
            bg-accent/50 text-foreground border border-border
            hover:bg-accent hover:border-primary/30 transition-colors duration-150
            focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          title="{pair.customerName} — {pair.projectName} / {pair.taskName}"
        >
          <span class="text-muted-foreground">{truncate(pair.customerName, 12)}</span>
          <span class="text-muted-foreground/50">·</span>
          <span>{truncate(pair.taskName, 18)}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}
