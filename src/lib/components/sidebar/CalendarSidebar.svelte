<script lang="ts">
  import MiniCalendar from './MiniCalendar.svelte';
  import StatsModal from '../stats/StatsModal.svelte';
  import AbsenceModal from '../absences/AbsenceModal.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getAbsenceForDate } from '../../stores/absences.svelte';
  import { formatDateShort } from '../../utils/date-helpers';
  import { ABSENCE_LABELS, ABSENCE_COLORS, type AbsenceType } from '../../types';

  let showLegend = $state(false);

  let selectedAbsence = $derived(getAbsenceForDate(dateNavState.selectedDate));

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

  <!-- Actions -->
  <div class="flex items-center gap-2 border-t border-border pt-3">
    <!-- Stats button -->
    <StatsModal>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground
          hover:text-foreground hover:bg-accent transition-colors duration-150"
        title="View statistics"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" />
        </svg>
        Statistics
      </button>
    </StatsModal>

    <!-- Add absence button -->
    {#if !selectedAbsence}
      <AbsenceModal mode="create" prefillDate={dateNavState.selectedDate}>
        <button
          class="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground
            hover:text-foreground hover:bg-accent transition-colors duration-150"
          title="Add absence for selected date"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          Absence
        </button>
      </AbsenceModal>
    {/if}
  </div>

  <!-- Collapsible Legend -->
  <div class="border-t border-border pt-3">
    <button
      onclick={() => { showLegend = !showLegend; }}
      class="flex items-center justify-between w-full text-left"
    >
      <span class="text-xs font-medium text-muted-foreground">Legend</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 {showLegend ? 'rotate-180' : ''}"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    {#if showLegend}
      <div class="mt-2 space-y-1.5">
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
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-brand"></div>
          <span class="text-xs text-muted-foreground">Absence</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Absence detail for selected date -->
  {#if selectedAbsence}
    <AbsenceModal mode="edit" editAbsence={selectedAbsence}>
      <button class="w-full text-left rounded-lg border border-border bg-information-subtle p-3 space-y-2 hover:bg-information-subtle/80 transition-colors">
        <div class="flex items-center justify-between">
          <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {ABSENCE_COLORS[selectedAbsence.type]}">
            {ABSENCE_LABELS[selectedAbsence.type]}
          </span>
          <span class="text-xs text-muted-foreground">
            Click to edit
          </span>
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
      </button>
    </AbsenceModal>
  {/if}
</div>
