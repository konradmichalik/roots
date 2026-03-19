<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import { executeSyncCandidates, getEntrySourceLabel } from '../../stores/ruleSync.svelte';
  import { toast } from '../../stores/toast.svelte';
  import { formatHours } from '../../utils/time-format';
  import type { SyncPreview } from '../../types';
  import { SvelteSet } from 'svelte/reactivity';
  import Check from '@lucide/svelte/icons/check';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import SkipForward from '@lucide/svelte/icons/skip-forward';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import Zap from '@lucide/svelte/icons/zap';

  let {
    preview,
    defaultOpen = false,
    onClose
  }: {
    preview: SyncPreview;
    defaultOpen?: boolean;
    onClose?: () => void;
  } = $props();

  let open = $state(defaultOpen);
  let isSyncing = $state(false);

  // Track which candidates are selected (all by default)
  let selectedIds = new SvelteSet(preview.pending.map((c) => c.sourceEntry.id));

  let selectedCandidates = $derived(
    preview.pending.filter((c) => selectedIds.has(c.sourceEntry.id))
  );

  let totalHours = $derived(selectedCandidates.reduce((sum, c) => sum + c.mocoPayload.hours, 0));

  function toggleCandidate(id: string): void {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
  }

  function toggleAll(): void {
    if (selectedIds.size === preview.pending.length) {
      selectedIds.clear();
    } else {
      for (const c of preview.pending) {
        selectedIds.add(c.sourceEntry.id);
      }
    }
  }

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (!isOpen) onClose?.();
  }

  async function handleSync(): Promise<void> {
    if (selectedCandidates.length === 0) return;

    isSyncing = true;
    try {
      const result = await executeSyncCandidates(selectedCandidates);

      if (result.created.length > 0) {
        toast.success(`${result.created.length} entries transferred via Rules`);
      }
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} entries failed`);
      }

      open = false;
      onClose?.();
    } catch (error) {
      toast.error('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      isSyncing = false;
    }
  }

  // Auto-open
  $effect(() => {
    if (defaultOpen && !open) open = true;
  });
</script>

<Dialog.Root bind:open onOpenChange={handleOpen}>
  <Dialog.Content class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Apply Rules</Dialog.Title>
      <Dialog.Description>Review entries before transferring to Moco.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-2">
      <!-- Stale warnings -->
      {#if preview.staleRules.length > 0}
        <div class="p-2.5 rounded-lg bg-warning-subtle space-y-1">
          <div class="flex items-center gap-1.5">
            <AlertTriangle class="size-3.5 text-warning-text" />
            <span class="text-xs font-medium text-warning-text">
              {preview.staleRules.length} rule{preview.staleRules.length !== 1 ? 's' : ''} with unavailable
              targets
            </span>
          </div>
          {#each preview.staleRules as rule (rule.id)}
            <p class="text-[10px] text-warning-text/80 pl-5">
              "{rule.name}" — {rule.target.mocoTaskName} no longer available
            </p>
          {/each}
        </div>
      {/if}

      <!-- Pending candidates -->
      {#if preview.pending.length > 0}
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-foreground">
              Transfer ({selectedCandidates.length}/{preview.pending.length})
            </span>
            <button
              type="button"
              onclick={toggleAll}
              class="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedIds.size === preview.pending.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div class="space-y-1 max-h-[35vh] overflow-y-auto">
            {#each preview.pending as candidate (candidate.sourceEntry.id)}
              <label
                class="flex items-start gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer transition-colors hover:bg-accent/50
                  {selectedIds.has(candidate.sourceEntry.id) ? '' : 'opacity-50'}"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(candidate.sourceEntry.id)}
                  onchange={() => toggleCandidate(candidate.sourceEntry.id)}
                  class="accent-primary mt-0.5"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-medium text-foreground truncate">
                      {getEntrySourceLabel(candidate.sourceEntry)}
                    </span>
                    <span class="text-xs text-muted-foreground/50">→</span>
                    <span class="text-xs text-muted-foreground truncate">
                      {candidate.rule.target.mocoTaskName}
                    </span>
                  </div>
                  {#if candidate.mocoPayload.description}
                    <p class="text-xs text-muted-foreground truncate">
                      {candidate.mocoPayload.description}
                    </p>
                  {/if}
                  <p class="text-[10px] text-muted-foreground/60">
                    Rule: {candidate.rule.name}
                  </p>
                </div>
                <span class="text-sm font-mono text-foreground flex-shrink-0">
                  {formatHours(candidate.mocoPayload.hours)}
                </span>
              </label>
            {/each}
          </div>
        </div>
      {:else}
        <div class="py-4 text-center">
          <Check class="size-6 text-success mx-auto mb-1" />
          <p class="text-sm text-muted-foreground">
            {preview.errors.length > 0
              ? 'No entries available for transfer.'
              : 'All matching entries are already synced.'}
          </p>
        </div>
      {/if}

      <!-- Skipped entries -->
      {#if preview.skipped.length > 0}
        <div>
          <span class="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <SkipForward class="size-3" />
            Skipped ({preview.skipped.length})
          </span>
          <div class="space-y-0.5">
            {#each preview.skipped as skipped (skipped.sourceEntry.id)}
              <div class="flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground/60">
                <span class="truncate">{skipped.sourceEntry.title}</span>
                <span class="flex-shrink-0 text-[10px]">
                  {skipped.reason === 'already_synced'
                    ? 'Already synced'
                    : skipped.reason === 'moco_remote_exists'
                      ? 'Exists in Moco'
                      : '0h'}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Errors -->
      {#if preview.errors.length > 0}
        <div>
          <span class="text-xs font-medium text-danger-text mb-1 flex items-center gap-1">
            <AlertTriangle class="size-3" />
            Blocked ({preview.errors.length})
          </span>
          {#each preview.errors as error (error.sourceEntry.id)}
            <div class="flex items-center gap-2 px-2.5 py-1 text-xs text-danger-text/70">
              <span class="truncate">{error.sourceEntry.title}</span>
              <span class="flex-shrink-0 text-[10px]">{error.reason}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Footer -->
      {#if preview.pending.length > 0}
        <div class="flex items-center justify-between pt-2 border-t border-border">
          <span class="text-xs text-muted-foreground">
            {formatHours(totalHours)} total
          </span>
          <div class="flex gap-2">
            <button
              type="button"
              onclick={() => handleOpen(false)}
              class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground
                hover:bg-accent transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={handleSync}
              disabled={selectedCandidates.length === 0 || isSyncing}
              class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground
                hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
                flex items-center gap-1.5"
            >
              {#if isSyncing}
                <LoaderCircle class="size-3.5 animate-spin" />
                Syncing...
              {:else}
                <Zap class="size-3.5" />
                Transfer {selectedCandidates.length}
                {selectedCandidates.length === 1 ? 'entry' : 'entries'}
              {/if}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
