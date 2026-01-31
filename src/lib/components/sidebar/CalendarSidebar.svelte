<script lang="ts">
  import MiniCalendar from './MiniCalendar.svelte';
  import AbsenceForm from '../settings/AbsenceForm.svelte';
  import FavoritesList from './FavoritesList.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getAbsenceForDate, removeAbsence } from '../../stores/absences.svelte';
  import { formatDateShort } from '../../utils/date-helpers';
  import type { AbsenceType } from '../../types';

  let showForm = $state(false);

  let selectedAbsence = $derived(getAbsenceForDate(dateNavState.selectedDate));

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

  function formatRange(start: string, end: string): string {
    const startFmt = formatDateShort(start);
    if (start === end) return startFmt;
    return `${startFmt} – ${formatDateShort(end)}`;
  }
</script>

<div class="p-4 space-y-4">
  <div class="flex items-center gap-2">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
    </svg>
    <h3 class="text-sm font-semibold text-foreground">Calendar</h3>
  </div>

  <MiniCalendar />

  <!-- Legend -->
  <div class="space-y-1.5 border-t border-border pt-3">
    <div class="flex items-center gap-2">
      <div class="h-2 w-2 rounded-full bg-success"></div>
      <span class="text-xs text-muted-foreground">Fully booked</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="h-2 w-2 rounded-full bg-warning"></div>
      <span class="text-xs text-muted-foreground">Partially booked</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="h-2 w-2 rounded-full bg-danger"></div>
      <span class="text-xs text-muted-foreground">Not booked</span>
    </div>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-brand"></div>
        <span class="text-xs text-muted-foreground">Absence</span>
      </div>
      {#if !selectedAbsence && !showForm}
        <button
          onclick={() => { showForm = true; }}
          class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          title="Add absence for selected date"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Absence detail for selected date -->
  {#if selectedAbsence}
    <div class="rounded-lg border border-border bg-information-subtle p-3 space-y-2">
      <div class="flex items-center justify-between">
        <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {TYPE_COLORS[selectedAbsence.type]}">
          {TYPE_LABELS[selectedAbsence.type]}
        </span>
        <button
          onclick={() => removeAbsence(selectedAbsence!.id)}
          class="text-xs text-muted-foreground hover:text-danger-text transition-colors"
        >
          Remove
        </button>
      </div>
      <div class="text-sm text-foreground">
        {formatRange(selectedAbsence.startDate, selectedAbsence.endDate)}
        {#if selectedAbsence.halfDay}
          <span class="text-xs text-muted-foreground ml-1">(half day)</span>
        {/if}
      </div>
      {#if selectedAbsence.note}
        <p class="text-xs text-muted-foreground">{selectedAbsence.note}</p>
      {/if}
    </div>
  {/if}

  <!-- Add absence form -->
  {#if showForm}
    <AbsenceForm
      prefillDate={dateNavState.selectedDate}
      onSave={() => { showForm = false; }}
      onCancel={() => { showForm = false; }}
    />
  {/if}

  <!-- Favorites -->
  <div class="border-t border-border pt-3">
    <FavoritesList />
  </div>
</div>
