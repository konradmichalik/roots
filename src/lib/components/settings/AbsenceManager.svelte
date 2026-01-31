<script lang="ts">
  import { absencesState, removeAbsence } from '../../stores/absences.svelte';
  import AbsenceForm from './AbsenceForm.svelte';
  import { formatDateShort } from '../../utils/date-helpers';
  import type { AbsenceType } from '../../types';

  let showForm = $state(false);

  const TYPE_LABELS: Record<AbsenceType, string> = {
    vacation: 'Vacation',
    sick: 'Sick',
    public_holiday: 'Holiday',
    personal: 'Personal',
    other: 'Other'
  };

  const TYPE_COLORS: Record<AbsenceType, string> = {
    vacation: 'bg-information-subtle text-brand-text',
    sick: 'bg-danger-subtle text-danger-text',
    public_holiday: 'bg-warning-subtle text-warning-text',
    personal: 'bg-discovery-subtle text-discovery-text',
    other: 'bg-secondary text-muted-foreground'
  };

  let sortedAbsences = $derived(
    [...absencesState.absences].sort((a, b) => b.startDate.localeCompare(a.startDate))
  );

  function formatDateRange(start: string, end: string): string {
    const startFmt = formatDateShort(start);
    if (start === end) return startFmt;
    return `${startFmt} - ${formatDateShort(end)}`;
  }
</script>

<div class="space-y-3">
  {#if sortedAbsences.length > 0}
    <div class="space-y-2 max-h-48 overflow-y-auto">
      {#each sortedAbsences as absence (absence.id)}
        <div class="flex items-center justify-between rounded-lg border border-border bg-card p-2.5">
          <div class="flex items-center gap-2 min-w-0">
            <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {TYPE_COLORS[absence.type]}">
              {TYPE_LABELS[absence.type]}
            </span>
            <span class="text-sm text-foreground truncate">
              {formatDateRange(absence.startDate, absence.endDate)}
            </span>
            {#if absence.halfDay}
              <span class="text-xs text-muted-foreground">(half)</span>
            {/if}
            {#if absence.note}
              <span class="text-xs text-muted-foreground truncate">{absence.note}</span>
            {/if}
          </div>
          <button
            onclick={() => removeAbsence(absence.id)}
            class="flex-shrink-0 text-xs text-muted-foreground hover:text-danger-text transition-colors ml-2"
          >
            Remove
          </button>
        </div>
      {/each}
    </div>
  {:else if !showForm}
    <p class="text-sm text-muted-foreground py-2">No absences recorded.</p>
  {/if}

  {#if showForm}
    <AbsenceForm
      onSave={() => { showForm = false; }}
      onCancel={() => { showForm = false; }}
    />
  {:else}
    <button
      onclick={() => { showForm = true; }}
      class="w-full rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground
        hover:bg-secondary hover:text-foreground hover:border-solid transition-all duration-150"
    >
      + Add Absence
    </button>
  {/if}
</div>
