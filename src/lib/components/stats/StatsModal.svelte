<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import StatsOverviewSlide from './StatsOverviewSlide.svelte';
  import StatsBreakdownSlide from './StatsBreakdownSlide.svelte';
  import StatsProjectsSlide from './StatsProjectsSlide.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import {
    getCachedDayOverview,
    monthCacheState,
    fetchMonthCache
  } from '../../stores/timeEntries.svelte';
  import {
    getWeekDates,
    getMonthStart,
    getMonthEnd,
    getMonthWorkingDays,
    today,
    parseDate,
    toDateString
  } from '../../utils/date-helpers';
  import type { Snippet } from 'svelte';
  import type { MocoMetadata } from '../../types';
  import type { MonthProjectStats, ProjectStats, TaskStats } from './statsTypes';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  let { children }: { children: Snippet } = $props();

  let open = $state(false);
  let todayStr = $state(today());

  // Month navigation state
  let selectedMonth = $state(getMonthStart(dateNavState.selectedDate));

  // Reset to current month and refresh todayStr when dialog opens
  $effect(() => {
    if (open) {
      todayStr = today();
      selectedMonth = getMonthStart(dateNavState.selectedDate);
    }
  });

  function addMonths(dateStr: string, months: number): string {
    const date = parseDate(dateStr);
    date.setMonth(date.getMonth() + months);
    return toDateString(date);
  }

  function prevMonth(): void {
    selectedMonth = addMonths(selectedMonth, -1);
  }

  function nextMonth(): void {
    selectedMonth = addMonths(selectedMonth, 1);
  }

  let monthLabel = $derived.by(() => {
    const date = parseDate(selectedMonth);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  let isCurrentMonth = $derived(selectedMonth === getMonthStart(today()));

  // Slider state
  type SlideId = 'overview' | 'breakdown' | 'projects';
  let activeSlide = $state<SlideId>('overview');

  const slides: { id: SlideId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'breakdown', label: 'Breakdown' },
    { id: 'projects', label: 'Tasks' }
  ];

  function goToSlide(id: SlideId): void {
    activeSlide = id;
  }

  // Week stats (Mon-Fri of the selected date's week) - always based on selected date
  let weekDates = $derived(getWeekDates(dateNavState.selectedDate));
  let weekOverviews = $derived(weekDates.map((d) => getCachedDayOverview(d, getMonthStart(d))));
  let weekTotals = $derived({
    actual: weekOverviews.reduce((sum, d) => sum + d.totals.actual, 0),
    required: weekOverviews.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: weekOverviews.reduce((sum, d) => sum + d.balance, 0)
  });

  // Week stats "until yesterday" (only completed days, excluding today)
  let weekDatesUntilYesterday = $derived(weekDates.filter((d) => d < todayStr));
  let weekOverviewsUntilYesterday = $derived(
    weekDatesUntilYesterday.map((d) => getCachedDayOverview(d, getMonthStart(d)))
  );
  let weekTotalsUntilYesterday = $derived({
    actual: weekOverviewsUntilYesterday.reduce((sum, d) => sum + d.totals.actual, 0),
    required: weekOverviewsUntilYesterday.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: weekOverviewsUntilYesterday.reduce((sum, d) => sum + d.balance, 0),
    daysCount: weekDatesUntilYesterday.length
  });

  // Month stats - based on selectedMonth
  let monthWorkingDays = $derived(getMonthWorkingDays(selectedMonth));
  let monthStart = $derived(selectedMonth);
  let monthOverviews = $derived(monthWorkingDays.map((d) => getCachedDayOverview(d, monthStart)));
  let monthTotals = $derived({
    actual: monthOverviews.reduce((sum, d) => sum + d.totals.actual, 0),
    required: monthOverviews.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: monthOverviews.reduce((sum, d) => sum + d.balance, 0)
  });

  // Month stats "until yesterday"
  let monthWorkingDaysUntilYesterday = $derived(
    isCurrentMonth ? monthWorkingDays.filter((d) => d < todayStr) : monthWorkingDays
  );
  let monthOverviewsUntilYesterday = $derived(
    monthWorkingDaysUntilYesterday.map((d) => getCachedDayOverview(d, monthStart))
  );
  let monthTotalsUntilYesterday = $derived({
    actual: monthOverviewsUntilYesterday.reduce((sum, d) => sum + d.totals.actual, 0),
    required: monthOverviewsUntilYesterday.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: monthOverviewsUntilYesterday.reduce((sum, d) => sum + d.balance, 0),
    daysCount: monthWorkingDaysUntilYesterday.length
  });

  let showMonthUntilYesterday = $derived(isCurrentMonth && monthTotalsUntilYesterday.daysCount > 0);

  // Auto-fetch uncached months when navigating
  $effect(() => {
    if (open && !monthCacheState.cache[selectedMonth]) {
      fetchMonthCache(selectedMonth, getMonthEnd(selectedMonth));
    }
  });

  let isMonthLoading = $derived(monthCacheState.loading && !monthCacheState.cache[selectedMonth]);

  // Month project+task distribution from cache
  let monthProjectStats = $derived.by((): MonthProjectStats => {
    const cached = monthCacheState.cache[monthStart];
    if (!cached) return { projects: [], billable: 0, nonBillable: 0, total: 0 };

    const projectRecord: Record<number, ProjectStats & { taskMap: Record<string, TaskStats> }> = {};
    let billable = 0;
    let nonBillable = 0;

    for (const entry of cached.mocoEntries) {
      const meta = entry.metadata as MocoMetadata;

      if (!projectRecord[meta.projectId]) {
        projectRecord[meta.projectId] = {
          projectId: meta.projectId,
          projectName: meta.projectName,
          customerName: meta.customerName,
          hours: 0,
          tasks: [],
          taskMap: {}
        };
      }

      const project = projectRecord[meta.projectId];

      if (!project.taskMap[meta.taskName]) {
        project.taskMap[meta.taskName] = { taskName: meta.taskName, hours: 0 };
      }

      project.taskMap[meta.taskName].hours += entry.hours;
      project.hours += entry.hours;

      if (meta.billable) {
        billable += entry.hours;
      } else {
        nonBillable += entry.hours;
      }
    }

    const projects = Object.values(projectRecord)
      .sort((a, b) => b.hours - a.hours)
      .map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        customerName: project.customerName,
        hours: project.hours,
        tasks: Object.values(project.taskMap).sort((a, b) => b.hours - a.hours)
      }));

    return { projects, billable, nonBillable, total: billable + nonBillable };
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <div {...props} style="display: contents;">
        {#if children}
          {@render children()}
        {/if}
      </div>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Statistics</Dialog.Title>
      <Dialog.Description>Overview of your time bookings for week and month.</Dialog.Description>
    </Dialog.Header>

    <!-- Month Navigation -->
    <div class="flex items-center justify-between py-2">
      <button
        onclick={prevMonth}
        class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors
          focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Previous month"
      >
        <ChevronLeft class="size-4" />
      </button>

      <span class="text-sm font-medium text-foreground">{monthLabel}</span>

      <button
        onclick={nextMonth}
        disabled={isCurrentMonth}
        class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors
          disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
          focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Next month"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>

    <!-- Slide Tabs -->
    <div class="flex items-center gap-1 border-b border-border -mx-6 px-6 pb-3">
      {#each slides as slide (slide.id)}
        <button
          onclick={() => goToSlide(slide.id)}
          class="px-3 py-1.5 text-sm rounded-md transition-colors
            {activeSlide === slide.id
            ? 'bg-primary text-primary-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
        >
          {slide.label}
        </button>
      {/each}
    </div>

    <div class="py-4">
      <!-- Slide Container - Fixed Height -->
      <div class="h-[420px] overflow-y-auto">
        {#if isMonthLoading}
          <!-- Skeleton mimicking overview layout -->
          <div class="space-y-4 animate-pulse">
            {#each { length: 2 } as _, i (i)}
              <div class="rounded-xl border border-border bg-card p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <Skeleton class="h-4 w-24" />
                  <Skeleton class="h-6 w-16" />
                </div>
                <div class="flex items-center justify-between">
                  <Skeleton class="h-3 w-28" />
                  <Skeleton class="h-3 w-28" />
                </div>
                <Skeleton class="h-2 w-full rounded-full" />
                <Skeleton class="h-3 w-40" />
              </div>
            {/each}
          </div>
        {:else if activeSlide === 'overview'}
          <StatsOverviewSlide
            {weekTotals}
            {weekTotalsUntilYesterday}
            {monthTotals}
            {monthTotalsUntilYesterday}
            monthWorkingDaysCount={monthWorkingDays.length}
            {showMonthUntilYesterday}
          />
        {:else if activeSlide === 'breakdown'}
          <StatsBreakdownSlide stats={monthProjectStats} />
        {:else if activeSlide === 'projects'}
          <StatsProjectsSlide stats={monthProjectStats} />
        {/if}
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
