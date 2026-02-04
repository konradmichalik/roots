<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import { createPresence, updatePresence, deletePresence, getRawPresencesForDate } from '../../stores/presences.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { formatDateLong } from '../../utils/date-helpers';
  import { normalizeTimeInput } from '../../utils/time-format';
  import type { Snippet } from 'svelte';
  import type { MocoPresence } from '../../types';

  let { children, date }: {
    children: Snippet;
    date?: string;
  } = $props();

  let effectiveDate = $derived(date ?? dateNavState.selectedDate);
  let existingPresences = $derived(getRawPresencesForDate(effectiveDate));

  let open = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);

  // Form state for new entry
  let newFromTime = $state('');
  let newToTime = $state('');
  let newIsHomeOffice = $state(false);

  // Edit state
  let editingId = $state<number | null>(null);
  let editFromTime = $state('');
  let editToTime = $state('');
  let editIsHomeOffice = $state(false);

  // Delete confirmation
  let deleteConfirmId = $state<number | null>(null);

  function resetForm(): void {
    newFromTime = '';
    newToTime = '';
    newIsHomeOffice = false;
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
    editIsHomeOffice = presence.is_home_office;
    deleteConfirmId = null;
  }

  function cancelEdit(): void {
    editingId = null;
  }

  async function handleCreate(): Promise<void> {
    const normalizedFrom = normalizeTimeInput(newFromTime);
    if (!normalizedFrom) {
      error = 'Please enter a valid start time (e.g., 08:00)';
      return;
    }

    // To time is optional (open presence)
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
        is_home_office: newIsHomeOffice
      });

      if (success) {
        newFromTime = '';
        newToTime = '';
        newIsHomeOffice = false;
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
        to: normalizedTo,
        is_home_office: editIsHomeOffice
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
      <Dialog.Title>Arbeitszeit {formatDateLong(effectiveDate)}</Dialog.Title>
      <Dialog.Description>
        Manage your working time for this day.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      {#if error}
        <div class="rounded-lg border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger-text">
          {error}
        </div>
      {/if}

      <!-- Existing presences -->
      {#if existingPresences.length > 0}
        <div class="space-y-2">
          <h4 class="text-sm font-medium text-foreground">Existing entries</h4>
          {#each existingPresences as presence (presence.id)}
            <div class="rounded-lg border border-border bg-card p-3">
              {#if editingId === presence.id}
                <!-- Edit mode -->
                <div class="space-y-3">
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-xs text-muted-foreground">From</label>
                      <input
                        type="text"
                        bind:value={editFromTime}
                        placeholder="08:00"
                        class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono
                          focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                      />
                    </div>
                    <div>
                      <label class="text-xs text-muted-foreground">To</label>
                      <input
                        type="text"
                        bind:value={editToTime}
                        placeholder="17:00"
                        class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono
                          focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
                      />
                    </div>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      bind:checked={editIsHomeOffice}
                      class="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                    <span class="text-sm text-foreground">Home Office</span>
                  </label>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onclick={() => handleUpdate(presence.id)}
                      disabled={saving}
                      class="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground
                        hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onclick={cancelEdit}
                      disabled={saving}
                      class="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground
                        hover:bg-accent disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              {:else if deleteConfirmId === presence.id}
                <!-- Delete confirmation -->
                <div class="space-y-3">
                  <p class="text-sm text-foreground">Delete this entry?</p>
                  <p class="text-xs text-muted-foreground">{formatTimeRange(presence.from, presence.to)}</p>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onclick={() => handleDelete(presence.id)}
                      disabled={saving}
                      class="flex-1 rounded-lg bg-danger px-3 py-2 text-sm font-medium text-danger-text
                        hover:bg-danger/90 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onclick={() => { deleteConfirmId = null; }}
                      disabled={saving}
                      class="rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground
                        hover:bg-accent disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              {:else}
                <!-- View mode -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    {#if presence.is_home_office}
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                    {:else}
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    {/if}
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
                      class="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onclick={() => { deleteConfirmId = presence.id; }}
                      class="rounded p-1 text-muted-foreground hover:text-danger-text hover:bg-danger-subtle transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
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
        <h4 class="text-sm font-medium text-foreground mb-3">Add new entry</h4>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-muted-foreground">From</label>
              <input
                type="text"
                bind:value={newFromTime}
                placeholder="08:00"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono
                  focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
              />
            </div>
            <div>
              <label class="text-xs text-muted-foreground">To (optional)</label>
              <input
                type="text"
                bind:value={newToTime}
                placeholder="17:00"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono
                  focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring"
              />
            </div>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={newIsHomeOffice}
              class="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <span class="text-sm text-foreground">Home Office</span>
          </label>
          <button
            type="button"
            onclick={handleCreate}
            disabled={saving || !newFromTime.trim()}
            class="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Adding...' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <button
        type="button"
        onclick={() => { open = false; }}
        class="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground
          hover:bg-accent transition-colors"
      >
        Close
      </button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
