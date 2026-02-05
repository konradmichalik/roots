<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import DraftCard from './DraftCard.svelte';
  import { draftsState, getSortedDrafts, clearAllDrafts } from '../../stores/timer.svelte';
  import type { Snippet } from 'svelte';
  import FileText from '@lucide/svelte/icons/file-text';

  let { children }: { children: Snippet } = $props();

  let open = $state(false);

  const drafts = $derived(getSortedDrafts());
  const hasMultipleDrafts = $derived(draftsState.drafts.length > 1);

  function handleClearAll(): void {
    if (confirm('Delete all drafts? This cannot be undone.')) {
      clearAllDrafts();
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <div {...props} style="display: contents;">
        {#if children}
          {@render children()}
        {/if}
      </div>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
    <Dialog.Header>
      <Dialog.Title>Drafts</Dialog.Title>
      <Dialog.Description>Unsaved time entries. Save them to Moco or delete.</Dialog.Description>
    </Dialog.Header>

    <div class="flex-1 overflow-y-auto py-4">
      {#if drafts.length === 0}
        <div class="text-center py-8">
          <FileText class="size-12 mx-auto text-muted-foreground/30 mb-3" strokeWidth={1.5} />
          <p class="text-sm text-muted-foreground">No drafts yet</p>
          <p class="text-xs text-muted-foreground mt-1">
            Stop a timer and save as draft to see it here
          </p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each drafts as draft (draft.id)}
            <DraftCard {draft} />
          {/each}
        </div>
      {/if}
    </div>

    {#if hasMultipleDrafts}
      <div class="border-t border-border pt-3">
        <button
          onclick={handleClearAll}
          class="w-full rounded-lg px-4 py-2 text-sm text-muted-foreground
            hover:text-danger-text hover:bg-danger-subtle active:scale-[0.98] transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Delete all drafts
        </button>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
