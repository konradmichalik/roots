<script lang="ts">
  import StatsModal from '../stats/StatsModal.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { dateNavState, setDate } from '../../stores/dateNavigation.svelte';
  import {
    getCachedDayOverview,
    hasCachedDataForDate,
    monthCacheState
  } from '../../stores/timeEntries.svelte';
  import { getPresenceForDate } from '../../stores/presences.svelte';
  import {
    formatDateShort,
    getWeekDates,
    getMonthStart,
    getMonthWorkingDays
  } from '../../utils/date-helpers';
  import { formatBalance, formatHours, getBalanceClass } from '../../utils/time-format';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';
  import Scale from '@lucide/svelte/icons/scale';

  let { todayStr }: { todayStr: string } = $props();

  let showOpenDays = $state(true);
  let showBalancedDays = $state(true);

  // Week balance (for selected date's week, up to yesterday)
  let weekDates = $derived(getWeekDates(dateNavState.selectedDate));
  let weekDatesUntilYesterday = $derived(weekDates.filter((d) => d < todayStr));
  let weekOverviews = $derived(
    weekDatesUntilYesterday.map((d) => getCachedDayOverview(d, getMonthStart(d)))
  );
  let weekBalance = $derived(weekOverviews.reduce((sum, d) => sum + d.balance, 0));
  let weekActual = $derived(weekOverviews.reduce((sum, d) => sum + d.totals.actual, 0));
  let weekTarget = $derived(weekOverviews.reduce((sum, d) => sum + d.requiredHours, 0));

  // Month balance (for selected date's month, up to yesterday)
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
  let openDays = $derived(
    monthWorkingDaysUntilYesterday
      .map((date, i) => ({ date, overview: monthOverviews[i] }))
      .filter(({ date, overview }) => {
        if (!hasCachedDataForDate(date, monthStart)) return false;
        if (!overview.presence || overview.presence.to === null) return false;
        return overview.presenceBalance !== undefined && overview.presenceBalance < -0.01;
      })
      .sort((a, b) => (a.overview.presenceBalance ?? 0) - (b.overview.presenceBalance ?? 0))
  );

  // Days with non-zero balance (excludes open hours days)
  let openDaysSet = $derived(new Set(openDays.map((d) => d.date)));
  let balancedDays = $derived(
    monthWorkingDaysUntilYesterday
      .map((date, i) => {
        const presence = getPresenceForDate(date);
        return { date, overview: monthOverviews[i], presence };
      })
      .filter(({ date, overview, presence }) => {
        if (openDaysSet.has(date)) return false;
        return (
          hasCachedDataForDate(date, monthStart) &&
          Math.abs(overview.balance) >= 0.01 &&
          presence !== null &&
          presence.to !== null
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  );

  let isStatsLoading = $derived(
    monthCacheState.loading && !monthCacheState.cache[monthStart]
  );
</script>

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
        onclick={() => { showOpenDays = !showOpenDays; }}
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
        onclick={() => { showBalancedDays = !showBalancedDays; }}
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
