<script lang="ts">
  import { getTopPairs, removePair } from '../../stores/recentMocoPairs.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import Clock from '@lucide/svelte/icons/clock';
  import X from '@lucide/svelte/icons/x';

  let {
    onSelect
  }: {
    onSelect: (projectId: number, taskId: number) => void;
  } = $props();

  const pairs = $derived(getTopPairs(5));

  function truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
  }

  function handleRemove(e: Event, projectId: number, taskId: number): void {
    e.stopPropagation();
    removePair(projectId, taskId);
  }
</script>

{#if pairs.length > 0}
  <div class="mb-1">
    <div class="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
      <Clock class="size-3" />
      <span>Frequently used</span>
    </div>
    <div class="flex flex-wrap gap-1.5">
      {#each pairs as pair (pair.projectId + '-' + pair.taskId)}
        <Tooltip.Root delayDuration={400} disableHoverableContent ignoreNonKeyboardFocus>
          <Tooltip.Trigger>
            <button
              type="button"
              onclick={() => onSelect(pair.projectId, pair.taskId)}
              class="group inline-flex items-center gap-1 pl-2 pr-1 py-1 text-xs rounded-md
                bg-accent/50 text-foreground border border-border
                hover:bg-accent hover:border-primary/30 transition-colors duration-150
                focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span class="text-muted-foreground">{truncate(pair.customerName, 12)}</span>
              <span class="text-muted-foreground/50">·</span>
              <span>{truncate(pair.taskName, 18)}</span>
              <span
                role="button"
                tabindex="-1"
                onclick={(e) => handleRemove(e, pair.projectId, pair.taskId)}
                class="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-danger-subtle hover:text-danger-text transition-all"
              >
                <X class="size-3" />
              </span>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>
            <div class="flex flex-col gap-0.5">
              <span class="font-medium">{pair.customerName} — {pair.projectName}</span>
              <span class="text-muted-foreground">{pair.taskName}</span>
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      {/each}
    </div>
  </div>
{/if}
