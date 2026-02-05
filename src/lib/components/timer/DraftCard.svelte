<script lang="ts">
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import { removeDraft } from '../../stores/timer.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { formatHours } from '../../utils/time-format';
  import { formatDateShort } from '../../utils/date-helpers';
  import type { DraftEntry } from '../../types';

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
            class="rounded p-1.5 text-primary hover:bg-primary/10 active:scale-95 transition-all duration-150"
            title="Save to Moco"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3v12" />
              <path d="m8 11 4 4 4-4" />
              <path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" />
            </svg>
          </button>
        </MocoEntryModal>
      {/if}

      <button
        onclick={handleDelete}
        class="rounded p-1.5 text-muted-foreground hover:text-danger-text hover:bg-danger-subtle active:scale-95 transition-all duration-150"
        title="Delete draft"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>
  </div>
</div>
