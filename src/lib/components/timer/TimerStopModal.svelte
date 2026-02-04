<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import {
    timerState,
    stopTimer,
    addDraft,
    getElapsedSeconds,
    formatElapsedTime
  } from '../../stores/timer.svelte';
  import { createMocoActivity } from '../../stores/timeEntries.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { secondsToHours, formatHours } from '../../utils/time-format';
  import { today } from '../../utils/date-helpers';
  import { toast } from '../../stores/toast.svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  let open = $state(false);
  let saving = $state(false);
  let note = $state('');
  let elapsedSeconds = $state(0);
  let stoppedHours = $state(0); // Hours after timer is stopped for Moco modal

  const isMocoConnected = $derived(connectionsState.moco.isConnected);
  const hasBooking = $derived(timerState.mocoBooking !== null);
  const booking = $derived(timerState.mocoBooking);
  const hours = $derived(secondsToHours(elapsedSeconds));

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (isOpen) {
      // Capture current state when opening
      elapsedSeconds = getElapsedSeconds();
      note = timerState.note;
    }
  }

  async function handleSaveDirectly(): Promise<void> {
    if (!booking) return;

    saving = true;
    try {
      const seconds = stopTimer();
      const decimalHours = secondsToHours(seconds);

      if (decimalHours < 0.02) {
        // Less than ~1 minute
        toast.error('Timer too short to save');
        open = false;
        return;
      }

      const success = await createMocoActivity({
        date: today(),
        project_id: booking.projectId,
        task_id: booking.taskId,
        hours: decimalHours,
        description: note.trim() || booking.description || undefined
      });

      if (success) {
        open = false;
      } else {
        toast.error('Failed to save entry');
      }
    } finally {
      saving = false;
    }
  }

  function handleSaveAsDraft(): void {
    const seconds = stopTimer();
    const decimalHours = secondsToHours(seconds);

    if (decimalHours < 0.02) {
      toast.error('Timer too short to save');
      open = false;
      return;
    }

    addDraft({
      hours: decimalHours,
      note: note.trim(),
      mocoBooking: timerState.mocoBooking
    });

    toast.success('Draft saved');
    open = false;
  }

  function handlePrepareForMoco(): void {
    // Stop timer and store hours for Moco modal
    const seconds = stopTimer();
    stoppedHours = secondsToHours(seconds);
    open = false;
  }

  function handleDiscard(): void {
    stopTimer();
    open = false;
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpen}>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <div {...props} style="display: contents;">
        {#if children}
          {@render children()}
        {/if}
      </div>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-sm">
    <Dialog.Header>
      <Dialog.Title>Stop Timer</Dialog.Title>
      <Dialog.Description>
        Save your tracked time or keep it as a draft.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- Time display -->
      <div class="text-center">
        <div class="text-4xl font-mono font-semibold text-foreground tabular-nums">
          {formatElapsedTime(elapsedSeconds)}
        </div>
        <div class="text-sm text-muted-foreground mt-1">
          {formatHours(hours)}
        </div>
      </div>

      <!-- Booking info (if pre-configured) -->
      {#if booking}
        <div class="rounded-lg border border-border bg-muted/30 p-3">
          <div class="text-xs text-muted-foreground uppercase tracking-wide mb-1">Project</div>
          <div class="text-sm font-medium text-foreground">{booking.customerName}</div>
          <div class="text-sm text-muted-foreground">{booking.projectName} — {booking.taskName}</div>
        </div>
      {/if}

      <!-- Note input -->
      <div>
        <label for="timer-note" class="block text-sm font-medium text-foreground mb-1">Note</label>
        <textarea
          id="timer-note"
          bind:value={note}
          rows={2}
          placeholder="What did you work on?"
          class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none
            focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="space-y-2">
        <!-- Direct save (only if booking exists and Moco connected) -->
        {#if hasBooking && isMocoConnected}
          <button
            onclick={handleSaveDirectly}
            disabled={saving}
            class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          >
            {saving ? 'Saving...' : 'Save to Moco'}
          </button>
        {/if}

        <!-- Open Moco modal (if connected but no booking) -->
        {#if isMocoConnected && !hasBooking}
          <MocoEntryModal
            mode="create"
            prefill={{
              date: today(),
              hours,
              description: note.trim() || undefined
            }}
          >
            <button
              onclick={handlePrepareForMoco}
              disabled={saving}
              class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
                hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              Save to Moco...
            </button>
          </MocoEntryModal>
        {/if}

        <!-- Save as draft -->
        <button
          onclick={handleSaveAsDraft}
          disabled={saving}
          class="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground
            hover:bg-accent active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
        >
          Save as Draft
        </button>

        <!-- Discard -->
        <button
          onclick={handleDiscard}
          disabled={saving}
          class="w-full rounded-lg px-4 py-2 text-sm text-muted-foreground
            hover:text-danger-text hover:bg-danger-subtle active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
        >
          Discard
        </button>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
