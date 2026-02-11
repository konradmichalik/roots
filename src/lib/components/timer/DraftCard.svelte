<script lang="ts">
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import { removeDraft } from '../../stores/timer.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { formatHours } from '../../utils/time-format';
  import { formatDateShort } from '../../utils/date-helpers';
  import type { DraftEntry } from '../../types';
  import Download from '@lucide/svelte/icons/download';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  let {
    draft,
    onConverted
  }: {
    draft: DraftEntry;
    onConverted?: () => void;
  } = $props();

  const isMocoConnected = $derived(connectionsState.moco.isConnected);

  function handleDelete(): void {
    removeDraft(draft.id);
  }

  function handleMocoSaved(): void {
    // Remove draft after successfully saving to Moco
    removeDraft(draft.id);
    onConverted?.();
  }
</script>

<div
  class="rounded-lg border border-border bg-card p-3 hover:shadow-sm transition-shadow duration-150"
>
  <div class="flex items-start justify-between gap-2">
    <div class="flex-1 min-w-0">
      <!-- Date and hours -->
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-muted-foreground">{formatDateShort(draft.date)}</span>
        <span class="text-sm font-mono font-medium text-foreground">{formatHours(draft.hours)}</span
        >
      </div>

      <!-- Booking info if exists -->
      {#if draft.mocoBooking}
        <div class="text-sm text-foreground truncate">
          {draft.mocoBooking.customerName} — {draft.mocoBooking.projectName}
        </div>
        <div class="text-xs text-muted-foreground truncate">
          {draft.mocoBooking.taskName}
        </div>
      {/if}

      <!-- Note -->
      {#if draft.note}
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">
          {draft.note}
        </p>
      {/if}
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 flex-shrink-0">
      {#if isMocoConnected}
        <MocoEntryModal
          mode="create"
          prefill={{
            date: draft.date,
            hours: draft.hours,
            description: draft.note || draft.mocoBooking?.description || undefined,
            projectId: draft.mocoBooking?.projectId,
            taskId: draft.mocoBooking?.taskId
          }}
          onSuccess={handleMocoSaved}
        >
          <button
            class="rounded p-1.5 text-primary hover:bg-primary/10 active:scale-95 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            title="Save to Moco"
            aria-label="Save to Moco"
          >
            <Download class="size-4" />
          </button>
        </MocoEntryModal>
      {/if}

      <button
        onclick={handleDelete}
        class="rounded p-1.5 text-muted-foreground hover:text-danger-text hover:bg-danger-subtle active:scale-95 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="Delete draft"
        aria-label="Delete draft"
      >
        <Trash2 class="size-4" />
      </button>
    </div>
  </div>
</div>
