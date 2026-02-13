<script lang="ts">
  import MiniCalendar from './MiniCalendar.svelte';
  import SidebarStats from './SidebarStats.svelte';
  import AbsenceModal from '../absences/AbsenceModal.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { dateNavState, setDate } from '../../stores/dateNavigation.svelte';
  import { getAbsenceForDate } from '../../stores/absences.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { formatDateShort, today } from '../../utils/date-helpers';
  import {
    ABSENCE_LABELS,
    ABSENCE_COLORS,
    type ManualAbsence,
    type PersonioAbsence
  } from '../../types';
  import Calendar from '@lucide/svelte/icons/calendar';
  import CalendarOff from '@lucide/svelte/icons/calendar-off';
  import Info from '@lucide/svelte/icons/info';
  import Pencil from '@lucide/svelte/icons/pencil';

  let todayStr = $state(today());

  // Refresh todayStr periodically to handle midnight crossover
  $effect(() => {
    const interval = setInterval(() => {
      const now = today();
      if (now !== todayStr) {
        todayStr = now;
      }
    }, 60_000);
    return () => clearInterval(interval);
  });

  let selectedAbsence = $derived(getAbsenceForDate(dateNavState.selectedDate));
  let isPersonioAbsence = $derived(
    selectedAbsence && 'source' in selectedAbsence && selectedAbsence.source === 'personio'
  );
  let selectedManualAbsence = $derived(
    selectedAbsence && !isPersonioAbsence ? (selectedAbsence as ManualAbsence) : undefined
  );

  function formatRange(start: string, end: string): string {
    const startFmt = formatDateShort(start);
    if (start === end) return startFmt;
    return `${startFmt} – ${formatDateShort(end)}`;
  }
</script>

<div class="p-4 space-y-4">
  <!-- Calendar Header with Today and Absence Buttons -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Calendar class="size-4 text-muted-foreground" />
      <h3 class="text-sm font-semibold text-foreground">Calendar</h3>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Info class="size-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help" />
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4} class="space-y-1.5 p-2.5">
            <div class="flex items-center gap-2">
              <div class="size-2 rounded-full bg-success"></div>
              <span class="text-xs">≥95% of presence booked</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="size-2 rounded-full bg-warning"></div>
              <span class="text-xs">&lt;95% of presence booked</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="size-2 rounded-full bg-danger"></div>
              <span class="text-xs">Not booked</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="size-2 rounded-full bg-brand"></div>
              <span class="text-xs">Absence</span>
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
    <div class="flex items-center gap-1">
      <button
        onclick={() => setDate(todayStr)}
        class="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground
          hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="Go to today"
      >
        Today
      </button>
      {#if connectionsState.personio.isConnected}
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <div
                class="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground/40 cursor-default"
              >
                <CalendarOff class="size-4" />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>
              Absences managed by Personio
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {:else}
        <AbsenceModal mode="create" prefillDate={dateNavState.selectedDate}>
          <button
            class="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground
              hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            title="Manage absences"
          >
            <CalendarOff class="size-4" />
          </button>
        </AbsenceModal>
      {/if}
    </div>
  </div>

  <MiniCalendar />

  {#snippet absenceDetail(absence: ManualAbsence | PersonioAbsence, trailing: string | 'pencil')}
    <div class="flex items-center gap-2">
      <span
        class="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium {ABSENCE_COLORS[
          absence.type
        ]}"
      >
        {ABSENCE_LABELS[absence.type]}
      </span>
      <span class="flex-1 text-xs text-foreground truncate">
        {formatRange(absence.startDate, absence.endDate)}{#if absence.halfDay}<span
            class="text-muted-foreground ml-1">(½)</span
          >{/if}
      </span>
      {#if trailing === 'pencil'}
        <Pencil
          class="size-3 text-muted-foreground shrink-0 transition-colors group-hover:text-foreground"
        />
      {:else}
        <span class="text-[10px] text-muted-foreground shrink-0">{trailing}</span>
      {/if}
    </div>
    {#if absence.note}
      <p class="text-[10px] text-muted-foreground truncate mt-1">{absence.note}</p>
    {/if}
  {/snippet}

  <!-- Absence detail for selected date -->
  {#if selectedAbsence}
    {#if isPersonioAbsence}
      <div
        class="w-full text-left rounded-lg border border-border bg-information-subtle px-2.5 py-1.5 mb-2"
      >
        {@render absenceDetail(selectedAbsence, 'Personio')}
      </div>
    {:else if connectionsState.personio.isConnected}
      <div
        class="w-full text-left rounded-lg border border-border bg-information-subtle px-2.5 py-1.5 mb-2"
      >
        {@render absenceDetail(selectedAbsence, 'Manual')}
      </div>
    {:else}
      <AbsenceModal mode="edit" editAbsence={selectedManualAbsence}>
        <button
          class="group w-full text-left rounded-lg border border-border bg-information-subtle px-2.5 py-1.5 mb-2 hover:bg-information-subtle/80 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {@render absenceDetail(selectedAbsence, 'pencil')}
        </button>
      </AbsenceModal>
    {/if}
  {/if}

  <!-- Statistics Section (extracted) -->
  <SidebarStats {todayStr} />
</div>
