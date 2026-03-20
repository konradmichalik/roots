<script lang="ts">
  import StatsModal from '../stats/StatsModal.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import SidebarStatsWeek from './SidebarStatsWeek.svelte';
  import SidebarStatsMonth from './SidebarStatsMonth.svelte';
  import SidebarStatsTotal from './SidebarStatsTotal.svelte';
  import SidebarStatsOpenHours from './SidebarStatsOpenHours.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import {
    getCachedDayOverview,
    hasCachedDataForDate,
    monthCacheState,
    getOpenHoursDays
  } from '../../stores/timeEntries.svelte';
  import { getPresenceForDate } from '../../stores/presences.svelte';
  import { statsModalState } from '../../stores/statsModal.svelte';
  import {
    getWeekDates,
    getMonthStart,
    getMonthWorkingDays,
    parseDate
  } from '../../utils/date-helpers';
  import { settingsState } from '../../stores/settings.svelte';
  import type { MocoMetadata } from '../../types';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

  // Helper: get required hours for a date from weekdayHours setting
  function getRequiredHoursForDate(dateStr: string): number {
    const dayOfWeek = parseDate(dateStr).getDay(); // 0=Sun, 1=Mon, ...
    // weekdayHours is [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return settingsState.weekdayHours[index] ?? 0;
  }

  let { todayStr }: { todayStr: string } = $props();

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

  // Billable percentage from month cache
  let billablePercent = $derived.by(() => {
    const cached = monthCacheState.cache[monthStart];
    if (!cached) return 0;
    let billable = 0;
    let total = 0;
    for (const entry of cached.mocoEntries) {
      const meta = entry.metadata as MocoMetadata;
      if (meta.billable) billable += entry.hours;
      total += entry.hours;
    }
    return total > 0 ? Math.round((billable / total) * 100) : 0;
  });

  // StatsModal controlled via global store (so context menus can open it too)

  // Days with open hours across ALL cached months (not just selected month)
  let openDays = $derived(getOpenHoursDays());

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

  // Full targets for entire periods (not just up to yesterday)
  let allMonthWorkingDays = $derived(getMonthWorkingDays(dateNavState.selectedDate));
  let weekFullTarget = $derived(weekDates.reduce((sum, d) => sum + getRequiredHoursForDate(d), 0));
  let monthFullTarget = $derived(
    allMonthWorkingDays.reduce((sum, d) => sum + getRequiredHoursForDate(d), 0)
  );
  let yearStats = $derived.by(() => {
    const year = new Date(todayStr).getFullYear();
    let fullTarget = 0;
    let totalDays = 0;
    let elapsedDays = 0;
    for (let m = 0; m < 12; m++) {
      const ms = `${year}-${String(m + 1).padStart(2, '0')}-01`;
      const days = getMonthWorkingDays(ms);
      fullTarget += days.reduce((sum, d) => sum + getRequiredHoursForDate(d), 0);
      totalDays += days.length;
      elapsedDays += days.filter((d) => d < todayStr).length;
    }
    return { fullTarget, totalDays, elapsedDays };
  });

  let isStatsLoading = $derived(monthCacheState.loading && !monthCacheState.cache[monthStart]);
</script>

<div class="pt-2 space-y-2">
  <div class="flex items-center gap-2">
    <BarChart3 class="size-4 text-muted-foreground" />
    <h3 class="text-sm font-semibold text-foreground">Statistics</h3>
  </div>

  {#if isStatsLoading}
    <div class="space-y-2">
      {#each { length: 3 } as _, i (i)}
        <div class="rounded-lg border border-border px-2.5 py-2 flex items-center justify-between">
          <Skeleton class="h-3 w-14" />
          <Skeleton class="h-3 w-16" />
        </div>
      {/each}
    </div>
  {:else}
    {#if openDays.length > 0}
      <SidebarStatsOpenHours {openDays} />
    {/if}
    <SidebarStatsWeek
      {weekBalance}
      {weekActual}
      {weekTarget}
      {weekFullTarget}
      daysCount={weekDatesUntilYesterday.length}
    />
    <SidebarStatsMonth
      {monthBalance}
      {monthActual}
      {monthTarget}
      {monthFullTarget}
      {billablePercent}
      {balancedDays}
      totalWorkingDays={allMonthWorkingDays?.length ?? 0}
      elapsedWorkingDays={monthWorkingDaysUntilYesterday.length}
      onBillableClick={() => {
        statsModalState.initialSlide = 'billability';
        statsModalState.highlightProjectId = undefined;
        statsModalState.highlightTaskName = undefined;
        statsModalState.open = true;
      }}
    />
    <SidebarStatsTotal
      {todayStr}
      yearFullTarget={yearStats.fullTarget}
      yearElapsedDays={yearStats.elapsedDays}
      yearTotalDays={yearStats.totalDays}
    />
  {/if}

  <StatsModal bind:open={statsModalState.open} initialSlide={statsModalState.initialSlide}>
    <button
      onclick={() => {
        statsModalState.initialSlide = 'overview';
        statsModalState.highlightProjectId = undefined;
        statsModalState.highlightTaskName = undefined;
      }}
      class="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground
        hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      title="View detailed statistics"
    >
      More Statistics
    </button>
  </StatsModal>
</div>
