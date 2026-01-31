<script lang="ts">
  import { addAbsence } from '../../stores/absences.svelte';
  import type { AbsenceType } from '../../types';

  let { onSave, onCancel, prefillDate }: {
    onSave: () => void;
    onCancel: () => void;
    prefillDate?: string;
  } = $props();

  let type = $state<AbsenceType>('vacation');
  let startDate = $state(prefillDate ?? '');
  let endDate = $state(prefillDate ?? '');
  let halfDay = $state(false);
  let note = $state('');

  const ABSENCE_LABELS: Record<AbsenceType, string> = {
    vacation: 'Vacation',
    sick: 'Sick Leave',
    public_holiday: 'Public Holiday',
    personal: 'Personal',
    other: 'Other'
  };

  function handleSubmit(e: Event): void {
    e.preventDefault();
    if (!startDate) return;

    addAbsence({
      type,
      startDate,
      endDate: endDate || startDate,
      halfDay,
      note: note.trim() || undefined
    });

    onSave();
  }
</script>

<form onsubmit={handleSubmit} class="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
  <div>
    <label for="absence-type" class="block text-xs font-medium text-foreground mb-1">Type</label>
    <select
      id="absence-type"
      bind:value={type}
      class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground
        focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    >
      {#each Object.entries(ABSENCE_LABELS) as [value, label]}
        <option {value}>{label}</option>
      {/each}
    </select>
  </div>

  <div class="grid grid-cols-2 gap-2">
    <div>
      <label for="absence-start" class="block text-xs font-medium text-foreground mb-1">Start</label>
      <input
        id="absence-start"
        type="date"
        bind:value={startDate}
        class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground
          focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
      />
    </div>
    <div>
      <label for="absence-end" class="block text-xs font-medium text-foreground mb-1">End</label>
      <input
        id="absence-end"
        type="date"
        bind:value={endDate}
        min={startDate}
        class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground
          focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
      />
    </div>
  </div>

  <div>
    <label for="absence-note" class="block text-xs font-medium text-foreground mb-1">Note (optional)</label>
    <input
      id="absence-note"
      type="text"
      bind:value={note}
      placeholder="e.g. Doctor appointment"
      class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground
        focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    />
  </div>

  <label class="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" bind:checked={halfDay} class="accent-primary" />
    <span class="text-sm text-foreground">Half day</span>
  </label>

  <div class="flex gap-2">
    <button
      type="submit"
      disabled={!startDate}
      class="flex-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground
        hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
    >
      Save
    </button>
    <button
      type="button"
      onclick={onCancel}
      class="rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-foreground
        hover:bg-secondary active:scale-[0.98] transition-all duration-150"
    >
      Cancel
    </button>
  </div>
</form>
