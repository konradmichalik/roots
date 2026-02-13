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
    monthCacheState
  } from '../../stores/timeEntries.svelte';
  import { getPresenceForDate } from '../../stores/presences.svelte';
  import { getWeekDates, getMonthStart, getMonthWorkingDays } from '../../utils/date-helpers';
  import type { MocoMetadata } from '../../types';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

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

  // StatsModal state (for programmatic open)
  let statsModalOpen = $state(false);
  let statsModalSlide = $state<'overview' | 'breakdown' | 'projects'>('overview');

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

  let isStatsLoading = $derived(monthCacheState.loading && !monthCacheState.cache[monthStart]);
</script>

<div class="border-t border-border pt-3 space-y-2">
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
      daysCount={weekDatesUntilYesterday.length}
    />
    <SidebarStatsMonth
      {monthBalance}
      {monthActual}
      {monthTarget}
      {billablePercent}
      {balancedDays}
      onBillableClick={() => {
        statsModalSlide = 'breakdown';
        statsModalOpen = true;
      }}
    />
    <SidebarStatsTotal {todayStr} />
  {/if}

  <StatsModal bind:open={statsModalOpen} initialSlide={statsModalSlide}>
    <button
      onclick={() => { statsModalSlide = 'overview'; }}
      class="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground
        hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      title="View detailed statistics"
    >
      More Statistics
    </button>
  </StatsModal>
</div>
