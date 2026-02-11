<script lang="ts">
  import MiniCalendar from './MiniCalendar.svelte';
  import StatsModal from '../stats/StatsModal.svelte';
  import AbsenceModal from '../absences/AbsenceModal.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { dateNavState, setDate } from '../../stores/dateNavigation.svelte';
  import { getAbsenceForDate } from '../../stores/absences.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { getCachedDayOverview, hasCachedDataForDate, monthCacheState } from '../../stores/timeEntries.svelte';
  import { getPresenceForDate } from '../../stores/presences.svelte';
  import {
    formatDateShort,
    getWeekDates,
    getMonthStart,
    getMonthWorkingDays,
    today
  } from '../../utils/date-helpers';
  import { formatBalance, formatHours, getBalanceClass } from '../../utils/time-format';
  import { ABSENCE_LABELS, ABSENCE_COLORS, type AbsenceType, type ManualAbsence, type PersonioAbsence } from '../../types';
  import Calendar from '@lucide/svelte/icons/calendar';
  import CalendarOff from '@lucide/svelte/icons/calendar-off';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';
  import Scale from '@lucide/svelte/icons/scale';
  import Pencil from '@lucide/svelte/icons/pencil';

  let showLegend = $state(false);
  let showOpenDays = $state(true);
  let showBalancedDays = $state(true);
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

  // Week balance (for selected date's week, up to yesterday - today is still in progress)
  let weekDates = $derived(getWeekDates(dateNavState.selectedDate));
  let weekDatesUntilYesterday = $derived(weekDates.filter((d) => d < todayStr));
  let weekOverviews = $derived(
    weekDatesUntilYesterday.map((d) => getCachedDayOverview(d, getMonthStart(d)))
  );
  let weekBalance = $derived(weekOverviews.reduce((sum, d) => sum + d.balance, 0));
  let weekActual = $derived(weekOverviews.reduce((sum, d) => sum + d.totals.actual, 0));
  let weekTarget = $derived(weekOverviews.reduce((sum, d) => sum + d.requiredHours, 0));

  // Month balance (for selected date's month, up to yesterday - today is still in progress)
  let monthStart = $derived(getMonthStart(dateNavState.selectedDate));
  let monthWorkingDaysUntilYesterday = $derived(
    getMonthWorkingDays(dateNavState.selectedDate).filter((d) => d < todayStr)
  );
  let monthOverviews = $derived(
    monthWorkingDaysUntilYesterday.map((d) => getCachedDayOverview(d, monthStart))
  );
  let monthBalance = $derived(monthOverviews.reduce((sum, d) => sum + d.balance, 0));
  let monthActual = $derived(monthOverviews.reduce((sum, d) => sum + d.totals.actual, 0));
  let monthTarget = $derived(monthOverviews.reduce((sum, d) => sum + d.requiredHours, 0));

  // Days with open hours (negative presenceBalance = not all presence time booked)
  // Only shows days where presence is finished (to !== null)
  let openDays = $derived(
    monthWorkingDaysUntilYesterday
      .map((date, i) => ({
        date,
        overview: monthOverviews[i]
      }))
      .filter(({ date, overview }) => {
        // Must have cached data
        if (!hasCachedDataForDate(date, monthStart)) return false;
        // Must have presence and it must be finished (to !== null)
        if (!overview.presence || overview.presence.to === null) return false;
        // presenceBalance < 0 means booked hours < presence hours
        return overview.presenceBalance !== undefined && overview.presenceBalance < -0.01;
      })
      .sort((a, b) => (a.overview.presenceBalance ?? 0) - (b.overview.presenceBalance ?? 0)) // Largest deficit first
  );

  // Days with non-zero balance where presence is finished (to !== null)
  // Excludes days that are already shown in Open Hours
  let openDaysSet = $derived(new Set(openDays.map((d) => d.date)));
  let balancedDays = $derived(
    monthWorkingDaysUntilYesterday
      .map((date, i) => {
        const presence = getPresenceForDate(date);
        return {
          date,
          overview: monthOverviews[i],
          presence
        };
      })
      .filter(({ date, overview, presence }) => {
        // Exclude days already in Open Hours
        if (openDaysSet.has(date)) return false;
        // Only include if:
        // 1. Has cached data
        // 2. Balance is not zero (over or under target)
        // 3. Presence exists and is finished (to !== null)
        return (
          hasCachedDataForDate(date, monthStart) &&
          Math.abs(overview.balance) >= 0.01 && // Allow small rounding tolerance
          presence !== null &&
          presence.to !== null
        );
      })
      .sort((a, b) => a.overview.balance - b.overview.balance) // Ascending: largest minus first
  );

  let isStatsLoading = $derived(
    monthCacheState.loading && !monthCacheState.cache[monthStart]
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
        class="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium {ABSENCE_COLORS[absence.type]}"
      >
        {ABSENCE_LABELS[absence.type]}
      </span>
      <span class="flex-1 text-xs text-foreground truncate">
        {formatRange(absence.startDate, absence.endDate)}{#if absence.halfDay}<span class="text-muted-foreground ml-1">(½)</span>{/if}
      </span>
      {#if trailing === 'pencil'}
        <Pencil class="size-3 text-muted-foreground shrink-0 transition-colors group-hover:text-foreground" />
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
      <div class="w-full text-left rounded-lg border border-border bg-information-subtle px-2.5 py-1.5 mb-2">
        {@render absenceDetail(selectedAbsence, 'Personio')}
      </div>
    {:else if connectionsState.personio.isConnected}
      <div class="w-full text-left rounded-lg border border-border bg-information-subtle px-2.5 py-1.5 mb-2">
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

  <!-- Legend (collapsible, under calendar) -->
  <div class="border-t border-border pt-3">
    <button
      onclick={() => {
        showLegend = !showLegend;
      }}
      class="flex items-center justify-between w-full text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none rounded"
    >
      <span class="text-xs font-medium text-muted-foreground">Legend</span>
      <ChevronDown
        class="size-3.5 text-muted-foreground transition-transform duration-200 {showLegend
          ? 'rotate-180'
          : ''}"
      />
    </button>
    {#if showLegend}
      <div class="mt-2 space-y-1.5">
        <div class="flex items-center gap-2">
          <div class="size-2 rounded-full bg-success"></div>
          <span class="text-xs text-muted-foreground">≥95% of presence booked</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="size-2 rounded-full bg-warning"></div>
          <span class="text-xs text-muted-foreground">&lt;95% of presence booked</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="size-2 rounded-full bg-danger"></div>
          <span class="text-xs text-muted-foreground">Not booked</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="size-2 rounded-full bg-brand"></div>
          <span class="text-xs text-muted-foreground">Absence</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Statistics Section -->
  <div class="border-t border-border pt-3 space-y-3">
    <div class="flex items-center gap-2">
      <BarChart3 class="size-4 text-muted-foreground" />
      <h3 class="text-sm font-semibold text-foreground">Statistics</h3>
    </div>

    <!-- Week/Month Balance Summary -->
    {#if isStatsLoading}
      <div class="flex items-center gap-3">
        <div class="flex-1 flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5">
          <Skeleton class="h-3 w-10" />
          <Skeleton class="h-3 w-12" />
        </div>
        <div class="flex-1 flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5">
          <Skeleton class="h-3 w-10" />
          <Skeleton class="h-3 w-12" />
        </div>
      </div>
    {:else}
      <div class="flex items-center gap-3 text-xs">
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <div
                class="flex-1 flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 cursor-default"
              >
                <span class="text-muted-foreground">Week</span>
                <span class="font-mono font-medium {getBalanceClass(weekBalance)}"
                  >{formatBalance(weekBalance)}</span
                >
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>
              <div class="text-xs space-y-1">
                <div class="flex items-center justify-between gap-4">
                  <span class="text-muted-foreground">Booked:</span>
                  <span class="font-mono font-medium">{formatHours(weekActual)}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-muted-foreground">Target:</span>
                  <span class="font-mono font-medium">{formatHours(weekTarget)}</span>
                </div>
                <div class="text-muted-foreground pt-1 border-t border-border/50">
                  {weekDatesUntilYesterday.length} working day{weekDatesUntilYesterday.length !== 1
                    ? 's'
                    : ''} (excl. today)
                </div>
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <div
                class="flex-1 flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 cursor-default"
              >
                <span class="text-muted-foreground">Month</span>
                <span class="font-mono font-medium {getBalanceClass(monthBalance)}"
                  >{formatBalance(monthBalance)}</span
                >
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>
              <div class="text-xs space-y-1">
                <div class="flex items-center justify-between gap-4">
                  <span class="text-muted-foreground">Booked:</span>
                  <span class="font-mono font-medium">{formatHours(monthActual)}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-muted-foreground">Target:</span>
                  <span class="font-mono font-medium">{formatHours(monthTarget)}</span>
                </div>
                <div class="text-muted-foreground pt-1 border-t border-border/50">
                  {monthWorkingDaysUntilYesterday.length} working day{monthWorkingDaysUntilYesterday.length !==
                  1
                    ? 's'
                    : ''} (excl. today)
                </div>
              </div>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    {/if}

    <!-- Open Hours Accordion -->
    {#if openDays.length > 0}
      <div>
        <button
          onclick={() => {
            showOpenDays = !showOpenDays;
          }}
          class="flex items-center justify-between w-full text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none rounded"
        >
          <div class="flex items-center gap-1.5">
            <AlertCircle class="size-3.5 text-warning-text" />
            <span class="text-xs font-medium text-foreground">Open Hours</span>
            <span
              class="inline-flex items-center justify-center rounded-full bg-warning/20 text-warning-text text-[10px] font-medium px-1.5 min-w-[18px]"
            >
              {openDays.length}
            </span>
          </div>
          <ChevronDown
            class="size-3.5 text-muted-foreground transition-transform duration-200 {showOpenDays
              ? 'rotate-180'
              : ''}"
          />
        </button>
        {#if showOpenDays}
          <div class="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {#each openDays as { date, overview } (date)}
              <button
                onclick={() => setDate(date)}
                class="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs
                  hover:bg-accent transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
                  {date === dateNavState.selectedDate ? 'bg-accent' : ''}"
              >
                <span class="text-muted-foreground">{formatDateShort(date)}</span>
                <span class="font-mono text-danger-text"
                  >{formatBalance(overview.presenceBalance ?? 0)}</span
                >
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Hour Balances Accordion -->
    {#if balancedDays.length > 0}
      <div>
        <button
          onclick={() => {
            showBalancedDays = !showBalancedDays;
          }}
          class="flex items-center justify-between w-full text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none rounded"
        >
          <div class="flex items-center gap-1.5">
            <Scale class="size-3.5 text-muted-foreground" />
            <span class="text-xs font-medium text-foreground">Hour Balances</span>
            <span
              class="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-1.5 min-w-[18px]"
            >
              {balancedDays.length}
            </span>
          </div>
          <ChevronDown
            class="size-3.5 text-muted-foreground transition-transform duration-200 {showBalancedDays
              ? 'rotate-180'
              : ''}"
          />
        </button>
        {#if showBalancedDays}
          <div class="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {#each balancedDays as { date, overview } (date)}
              <button
                onclick={() => setDate(date)}
                class="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs
                  hover:bg-accent transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
                  {date === dateNavState.selectedDate ? 'bg-accent' : ''}"
              >
                <span class="text-muted-foreground">{formatDateShort(date)}</span>
                <span class="font-mono {getBalanceClass(overview.balance)}"
                  >{formatBalance(overview.balance)}</span
                >
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- More Statistics Button -->
    <StatsModal>
      <button
        class="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground
          hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="View detailed statistics"
      >
        More Statistics
      </button>
    </StatsModal>
  </div>
</div>
