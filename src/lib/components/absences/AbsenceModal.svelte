<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import { addAbsence, updateAbsence, removeAbsence } from '../../stores/absences.svelte';
  import { ABSENCE_LABELS, type AbsenceType, type ManualAbsence } from '../../types';
  import type { Snippet } from 'svelte';

  let {
    children,
    mode = 'create',
    editAbsence,
    prefillDate
  }: {
    children: Snippet;
    mode?: 'create' | 'edit';
    editAbsence?: ManualAbsence;
    prefillDate?: string;
  } = $props();

  let open = $state(false);
  let showDeleteConfirm = $state(false);

  // Form state
  let type = $state<AbsenceType>('vacation');
  let startDate = $state('');
  let endDate = $state('');
  let halfDay = $state(false);
  let note = $state('');

  function resetForm(): void {
    if (mode === 'edit' && editAbsence) {
      type = editAbsence.type;
      startDate = editAbsence.startDate;
      endDate = editAbsence.endDate;
      halfDay = editAbsence.halfDay;
      note = editAbsence.note ?? '';
    } else {
      type = 'vacation';
      startDate = prefillDate ?? '';
      endDate = prefillDate ?? '';
      halfDay = false;
      note = '';
    }
    showDeleteConfirm = false;
  }

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (isOpen) {
      resetForm();
    }
  }

  function handleSubmit(e: Event): void {
    e.preventDefault();
    if (!startDate) return;

    if (mode === 'edit' && editAbsence) {
      updateAbsence(editAbsence.id, {
        type,
        startDate,
        endDate: endDate || startDate,
        halfDay,
        note: note.trim() || undefined
      });
    } else {
      addAbsence({
        type,
        startDate,
        endDate: endDate || startDate,
        halfDay,
        note: note.trim() || undefined
      });
    }

    open = false;
  }

  function requestDelete(): void {
    showDeleteConfirm = true;
  }

  function cancelDelete(): void {
    showDeleteConfirm = false;
  }

  function confirmDelete(): void {
    if (editAbsence) {
      removeAbsence(editAbsence.id);
      open = false;
    }
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
      <Dialog.Title>{mode === 'edit' ? 'Edit Absence' : 'Add Absence'}</Dialog.Title>
      <Dialog.Description>
        {mode === 'edit'
          ? 'Update or remove this absence entry.'
          : 'Track time off for vacations, sick days, and more.'}
      </Dialog.Description>
    </Dialog.Header>

    {#if showDeleteConfirm}
      <div class="py-4 space-y-4">
        <div class="flex items-center gap-3 p-3 rounded-lg bg-danger-subtle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 text-danger-text flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p class="text-sm text-danger-text">
            Are you sure you want to delete this absence? This action cannot be undone.
          </p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={cancelDelete}
            class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground
              hover:bg-accent transition-all duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={confirmDelete}
            class="flex-1 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-danger-foreground
              hover:bg-danger/90 transition-all duration-150"
          >
            Delete
          </button>
        </div>
      </div>
    {:else}
      <form onsubmit={handleSubmit} class="space-y-4 py-4">
        <div>
          <label for="absence-type" class="block text-sm font-medium text-foreground mb-1"
            >Type</label
          >
          <select
            id="absence-type"
            bind:value={type}
            class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
              focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
          >
            {#each Object.entries(ABSENCE_LABELS) as [value, label] (value)}
              <option {value}>{label}</option>
            {/each}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="absence-start" class="block text-sm font-medium text-foreground mb-1"
              >Start Date</label
            >
            <input
              id="absence-start"
              type="date"
              bind:value={startDate}
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
                focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
            />
          </div>
          <div>
            <label for="absence-end" class="block text-sm font-medium text-foreground mb-1"
              >End Date</label
            >
            <input
              id="absence-end"
              type="date"
              bind:value={endDate}
              min={startDate}
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
                focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
            />
          </div>
        </div>

        <div>
          <label for="absence-note" class="block text-sm font-medium text-foreground mb-1"
            >Note (optional)</label
          >
          <input
            id="absence-note"
            type="text"
            bind:value={note}
            placeholder="e.g. Doctor appointment"
            class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
          />
        </div>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" bind:checked={halfDay} class="accent-primary" />
          <span class="text-sm text-foreground">Half day only</span>
        </label>

        <div class="flex items-center gap-2">
          <button
            type="submit"
            disabled={!startDate}
            class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          >
            {mode === 'edit' ? 'Update' : 'Save'}
          </button>
          {#if mode === 'edit'}
            <button
              type="button"
              onclick={requestDelete}
              class="rounded-lg border border-border-danger px-4 py-2.5 text-sm font-medium text-danger-text
                hover:bg-danger-subtle transition-all duration-150"
            >
              Delete
            </button>
          {/if}
        </div>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>
