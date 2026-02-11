<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import { Switch } from '../ui/switch';
  import {
    createPresence,
    updatePresence,
    deletePresence,
    getRawPresencesForDate,
    setDayHomeOffice
  } from '../../stores/presences.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { formatDateLong } from '../../utils/date-helpers';
  import { normalizeTimeInput } from '../../utils/time-format';
  import ClockTimeInput from '../common/ClockTimeInput.svelte';
  import type { Snippet } from 'svelte';
  import type { MocoPresence } from '../../types';
  import Home from '@lucide/svelte/icons/home';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  let {
    children,
    date
  }: {
    children: Snippet;
    date?: string;
  } = $props();

  let effectiveDate = $derived(date ?? dateNavState.selectedDate);
  let existingPresences = $derived(getRawPresencesForDate(effectiveDate));
  let isHomeOfficeDay = $derived(
    existingPresences.length > 0 && existingPresences[0].is_home_office
  );

  let open = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);

  // Form state for new entry
  let newFromTime = $state('');
  let newToTime = $state('');

  // Edit state
  let editingId = $state<number | null>(null);
  let editFromTime = $state('');
  let editToTime = $state('');

  // Delete confirmation
  let deleteConfirmId = $state<number | null>(null);

  function resetForm(): void {
    newFromTime = '';
    newToTime = '';
    editingId = null;
    deleteConfirmId = null;
    error = null;
  }

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (isOpen) {
      resetForm();
    }
  }

  function startEdit(presence: MocoPresence): void {
    editingId = presence.id;
    editFromTime = presence.from;
    editToTime = presence.to ?? '';
    deleteConfirmId = null;
  }

  function cancelEdit(): void {
    editingId = null;
  }

  async function handleHomeOfficeToggle(checked: boolean): Promise<void> {
    saving = true;
    try {
      await setDayHomeOffice(effectiveDate, checked);
    } finally {
      saving = false;
    }
  }

  async function handleCreate(): Promise<void> {
    const normalizedFrom = normalizeTimeInput(newFromTime);
    if (!normalizedFrom) {
      error = 'Please enter a valid start time (e.g., 08:00)';
      return;
    }

    let normalizedTo: string | undefined;
    if (newToTime.trim()) {
      normalizedTo = normalizeTimeInput(newToTime) ?? undefined;
      if (!normalizedTo) {
        error = 'Please enter a valid end time (e.g., 17:00)';
        return;
      }
    }

    saving = true;
    error = null;

    try {
      const success = await createPresence({
        date: effectiveDate,
        from: normalizedFrom,
        to: normalizedTo,
        is_home_office: isHomeOfficeDay
      });

      if (success) {
        newFromTime = '';
        newToTime = '';
      }
    } finally {
      saving = false;
    }
  }

  async function handleUpdate(id: number): Promise<void> {
    const normalizedFrom = normalizeTimeInput(editFromTime);
    if (!normalizedFrom) {
      error = 'Please enter a valid start time';
      return;
    }

    let normalizedTo: string | undefined;
    if (editToTime.trim()) {
      normalizedTo = normalizeTimeInput(editToTime) ?? undefined;
      if (!normalizedTo) {
        error = 'Please enter a valid end time';
        return;
      }
    }

    saving = true;
    error = null;

    try {
      const success = await updatePresence(id, effectiveDate, {
        from: normalizedFrom,
        to: normalizedTo
      });

      if (success) {
        editingId = null;
      }
    } finally {
      saving = false;
    }
  }

  async function handleDelete(id: number): Promise<void> {
    saving = true;
    error = null;

    try {
      const success = await deletePresence(id, effectiveDate);
      if (success) {
        deleteConfirmId = null;
      }
    } finally {
      saving = false;
    }
  }

  function formatTimeRange(from: string, to: string | null): string {
    return to ? `${from} – ${to}` : `${from} – (open)`;
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
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Working Time {formatDateLong(effectiveDate)}</Dialog.Title>
      <Dialog.Description>Manage your working time for this day.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      {#if error}
        <div
          id="presence-form-error"
          role="alert"
          class="rounded-lg border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger-text"
        >
          {error}
        </div>
      {/if}

      <!-- Home Office Toggle (only show if there are entries) -->
      {#if existingPresences.length > 0}
        <div class="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <div class="flex items-center gap-2">
            {#if isHomeOfficeDay}
              <Home class="size-4 text-brand" />
              <span class="text-sm font-medium text-foreground">Home Office</span>
            {:else}
              <Building2 class="size-4 text-muted-foreground" />
              <span class="text-sm font-medium text-foreground">Office</span>
            {/if}
          </div>
          <Switch
            checked={isHomeOfficeDay}
            onCheckedChange={handleHomeOfficeToggle}
            disabled={saving}
          />
        </div>
      {/if}

      <!-- Existing presences -->
      {#if existingPresences.length > 0}
        <div class="space-y-2">
          <h4 class="text-sm font-medium text-foreground">Time slots</h4>
          {#each existingPresences as presence (presence.id)}
            <div class="rounded-lg border border-border bg-card p-3">
              {#if editingId === presence.id}
                <!-- Edit mode -->
                <div class="space-y-3">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="edit-from-time" class="text-xs text-muted-foreground">From</label>
                      <ClockTimeInput
                        id="edit-from-time"
                        bind:value={editFromTime}
                        placeholder="08:00"
                      />
                    </div>
                    <div>
                      <label for="edit-to-time" class="text-xs text-muted-foreground">To</label>
                      <ClockTimeInput
                        id="edit-to-time"
                        bind:value={editToTime}
                        placeholder="17:00"
                      />
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onclick={() => handleUpdate(presence.id)}
                      disabled={saving}
                      class="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground
                        hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onclick={cancelEdit}
                      disabled={saving}
                      class="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground
                        hover:bg-accent disabled:opacity-50 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              {:else if deleteConfirmId === presence.id}
                <!-- Delete confirmation -->
                <div class="space-y-3">
                  <p class="text-sm text-foreground">Delete this entry?</p>
                  <p class="text-xs text-muted-foreground">
                    {formatTimeRange(presence.from, presence.to)}
                  </p>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onclick={() => handleDelete(presence.id)}
                      disabled={saving}
                      class="flex-1 rounded-lg bg-danger px-3 py-2 text-sm font-medium text-danger-text
                        hover:bg-danger/90 disabled:opacity-50 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {saving ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onclick={() => {
                        deleteConfirmId = null;
                      }}
                      disabled={saving}
                      class="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground
                        hover:bg-accent disabled:opacity-50 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              {:else}
                <!-- View mode -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-mono font-medium text-foreground">
                      {formatTimeRange(presence.from, presence.to)}
                    </span>
                    {#if presence.break && presence.break > 0}
                      <span class="text-xs text-muted-foreground">
                        (Break: {presence.break}min)
                      </span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      onclick={() => startEdit(presence)}
                      class="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      title="Edit"
                      aria-label="Edit time slot"
                    >
                      <Pencil class="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onclick={() => {
                        deleteConfirmId = presence.id;
                      }}
                      class="rounded p-1 text-muted-foreground hover:text-danger-text hover:bg-danger-subtle transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      title="Delete"
                      aria-label="Delete time slot"
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <!-- Add new entry -->
      <div class="border-t border-border pt-4">
        <h4 class="text-sm font-medium text-foreground mb-3">Add time slot</h4>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="new-from-time" class="text-xs text-muted-foreground">From</label>
              <ClockTimeInput
                id="new-from-time"
                bind:value={newFromTime}
                placeholder="08:00"
              />
            </div>
            <div>
              <label for="new-to-time" class="text-xs text-muted-foreground">To (optional)</label>
              <ClockTimeInput
                id="new-to-time"
                bind:value={newToTime}
                placeholder="17:00"
              />
            </div>
          </div>
          <button
            type="button"
            onclick={handleCreate}
            disabled={saving || !newFromTime.trim()}
            class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <button
        type="button"
        onclick={() => {
          open = false;
        }}
        class="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground
          hover:bg-accent transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        Close
      </button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
