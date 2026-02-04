<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getCachedDayOverview, monthCacheState } from '../../stores/timeEntries.svelte';
  import {
    getWeekDates,
    getMonthStart,
    getMonthWorkingDays,
    today,
    parseDate,
    toDateString
  } from '../../utils/date-helpers';
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { getSourceColor } from '../../stores/settings.svelte';
  import type { Snippet } from 'svelte';
  import type { MocoMetadata } from '../../types';

  let { children }: { children: Snippet } = $props();

  let open = $state(false);
  let todayStr = $derived(today());

  // Month navigation state
  let selectedMonth = $state(getMonthStart(dateNavState.selectedDate));

  // Reset to current month when dialog opens
  $effect(() => {
    if (open) {
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

  // Week stats "until now" (only days up to and including today)
  let weekDatesUntilNow = $derived(weekDates.filter((d) => d <= todayStr));
  let weekOverviewsUntilNow = $derived(weekDatesUntilNow.map((d) => getCachedDayOverview(d, getMonthStart(d))));
  let weekTotalsUntilNow = $derived({
    actual: weekOverviewsUntilNow.reduce((sum, d) => sum + d.totals.actual, 0),
    required: weekOverviewsUntilNow.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: weekOverviewsUntilNow.reduce((sum, d) => sum + d.balance, 0),
    daysCount: weekDatesUntilNow.length
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

  // Month stats "until now" (only working days up to and including today) - only relevant for current month
  let monthWorkingDaysUntilNow = $derived(
    isCurrentMonth ? monthWorkingDays.filter((d) => d <= todayStr) : monthWorkingDays
  );
  let monthOverviewsUntilNow = $derived(monthWorkingDaysUntilNow.map((d) => getCachedDayOverview(d, monthStart)));
  let monthTotalsUntilNow = $derived({
    actual: monthOverviewsUntilNow.reduce((sum, d) => sum + d.totals.actual, 0),
    required: monthOverviewsUntilNow.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: monthOverviewsUntilNow.reduce((sum, d) => sum + d.balance, 0),
    daysCount: monthWorkingDaysUntilNow.length
  });

  // Show "until now" section only if we're in the current month and not at month end
  let showMonthUntilNow = $derived(isCurrentMonth && monthTotalsUntilNow.daysCount < monthWorkingDays.length);

  function getProgressPercent(actual: number, required: number): number {
    if (required === 0) return 0;
    return Math.min(100, Math.round((actual / required) * 100));
  }

  // Month project+task distribution from cache
  interface TaskStats {
    projectName: string;
    taskName: string;
    customerName: string;
    hours: number;
  }

  let monthProjectStats = $derived.by(() => {
    const cached = monthCacheState.cache[monthStart];
    if (!cached) return { tasks: [] as TaskStats[], billable: 0, nonBillable: 0, total: 0 };

    const taskMap = new Map<string, TaskStats>();
    let billable = 0;
    let nonBillable = 0;

    for (const entry of cached.mocoEntries) {
      const meta = entry.metadata as MocoMetadata;
      const key = `${meta.projectId}-${meta.taskId}`;

      if (!taskMap.has(key)) {
        taskMap.set(key, {
          projectName: meta.projectName,
          taskName: meta.taskName,
          customerName: meta.customerName,
          hours: 0
        });
      }

      const stats = taskMap.get(key)!;
      stats.hours += entry.hours;

      if (meta.billable) {
        billable += entry.hours;
      } else {
        nonBillable += entry.hours;
      }
    }

    const tasks = [...taskMap.values()].sort((a, b) => b.hours - a.hours);
    return { tasks, billable, nonBillable, total: billable + nonBillable };
  });

  // Colors for project bars (cycling through a palette)
  const PROJECT_COLORS = [
    '#8fbcbb', '#88c0d0', '#81a1c1', '#5e81ac',
    '#bf616a', '#d08770', '#ebcb8b', '#a3be8c', '#b48ead'
  ];

  function getProjectColor(index: number): string {
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
  }
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
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Statistics</Dialog.Title>
      <Dialog.Description>
        Overview of your time bookings for week and month.
      </Dialog.Description>
    </Dialog.Header>

    <!-- Month Navigation -->
    <div class="flex items-center justify-between py-2">
      <button
        onclick={prevMonth}
        class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Previous month"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      <span class="text-sm font-medium text-foreground">{monthLabel}</span>

      <button
        onclick={nextMonth}
        disabled={isCurrentMonth}
        class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors
          disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        aria-label="Next month"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
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
        {#if activeSlide === 'overview'}
          <!-- Overview Slide -->
          <div class="space-y-4 animate-in fade-in duration-200">
            <!-- Week Balance -->
            <div class="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-foreground">This Week</span>
                <span class="font-mono text-lg font-medium {getBalanceClass(weekTotals.balance)}">
                  {formatBalance(weekTotals.balance)}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm text-muted-foreground">
                <span>Booked: <span class="font-mono font-medium text-foreground">{formatHours(weekTotals.actual)}</span></span>
                <span>Target: <span class="font-mono font-medium text-foreground">{formatHours(weekTotals.required)}</span></span>
              </div>
              <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  style="width: {getProgressPercent(weekTotals.actual, weekTotals.required)}%; background-color: {getSourceColor('moco')}"
                ></div>
              </div>
              <p class="text-xs text-muted-foreground">
                {getProgressPercent(weekTotals.actual, weekTotals.required)}% of weekly target (Mon-Fri)
              </p>
              {#if weekTotalsUntilNow.daysCount < 5}
                <div class="pt-2 border-t border-border/50">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted-foreground">Until now ({weekTotalsUntilNow.daysCount} days):</span>
                    <span class="font-mono font-medium {getBalanceClass(weekTotalsUntilNow.balance)}">
                      {formatBalance(weekTotalsUntilNow.balance)}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatHours(weekTotalsUntilNow.actual)} / {formatHours(weekTotalsUntilNow.required)}</span>
                    <span>{weekTotalsUntilNow.balance >= 0 ? 'ahead' : 'behind'}</span>
                  </div>
                </div>
              {/if}
            </div>

            <!-- Month Balance -->
            <div class="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-foreground">This Month</span>
                <span class="font-mono text-lg font-medium {getBalanceClass(monthTotals.balance)}">
                  {formatBalance(monthTotals.balance)}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm text-muted-foreground">
                <span>Booked: <span class="font-mono font-medium text-foreground">{formatHours(monthTotals.actual)}</span></span>
                <span>Target: <span class="font-mono font-medium text-foreground">{formatHours(monthTotals.required)}</span></span>
              </div>
              <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  style="width: {getProgressPercent(monthTotals.actual, monthTotals.required)}%; background-color: {getSourceColor('moco')}"
                ></div>
              </div>
              <p class="text-xs text-muted-foreground">
                {getProgressPercent(monthTotals.actual, monthTotals.required)}% of monthly target ({monthWorkingDays.length} working days)
              </p>
              {#if showMonthUntilNow}
                <div class="pt-2 border-t border-border/50">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted-foreground">Until now ({monthTotalsUntilNow.daysCount} days):</span>
                    <span class="font-mono font-medium {getBalanceClass(monthTotalsUntilNow.balance)}">
                      {formatBalance(monthTotalsUntilNow.balance)}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatHours(monthTotalsUntilNow.actual)} / {formatHours(monthTotalsUntilNow.required)}</span>
                    <span>{monthTotalsUntilNow.balance >= 0 ? 'ahead' : 'behind'}</span>
                  </div>
                </div>
              {/if}
            </div>
          </div>

        {:else if activeSlide === 'breakdown'}
          <!-- Breakdown Slide -->
          <div class="space-y-4 animate-in fade-in duration-200">
            {#if monthProjectStats.total > 0}
              <div class="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                <h4 class="text-sm font-semibold text-foreground">
                  Monthly Breakdown
                </h4>

                <!-- Billable vs Non-billable -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Billable</span>
                    <span class="font-mono font-medium text-success-text">{formatHours(monthProjectStats.billable)}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Non-billable</span>
                    <span class="font-mono font-medium text-muted-foreground">{formatHours(monthProjectStats.nonBillable)}</span>
                  </div>
                  <div class="h-3 rounded-full bg-muted overflow-hidden flex">
                    {#if monthProjectStats.total > 0}
                      <div
                        class="h-full bg-success transition-all duration-300"
                        style="width: {(monthProjectStats.billable / monthProjectStats.total) * 100}%"
                      ></div>
                      <div
                        class="h-full bg-muted-foreground/30 transition-all duration-300"
                        style="width: {(monthProjectStats.nonBillable / monthProjectStats.total) * 100}%"
                      ></div>
                    {/if}
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {Math.round((monthProjectStats.billable / monthProjectStats.total) * 100)}% billable this month
                  </p>
                </div>

                <!-- Summary Stats -->
                <div class="pt-3 border-t border-border/50 grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-xs text-muted-foreground">Total Hours</p>
                    <p class="font-mono text-lg font-medium text-foreground">{formatHours(monthProjectStats.total)}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Tasks</p>
                    <p class="font-mono text-lg font-medium text-foreground">{monthProjectStats.tasks.length}</p>
                  </div>
                </div>
              </div>
            {:else}
              <div class="rounded-xl border border-border bg-card p-8 text-center">
                <p class="text-sm text-muted-foreground">No data available for this month.</p>
              </div>
            {/if}
          </div>

        {:else if activeSlide === 'projects'}
          <!-- Projects/Tasks Slide -->
          <div class="space-y-4 animate-in fade-in duration-200">
            {#if monthProjectStats.tasks.length > 0}
              <div class="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                <h4 class="text-sm font-semibold text-foreground">
                  Tasks This Month
                </h4>

                <div class="space-y-3">
                  {#each monthProjectStats.tasks.slice(0, 8) as task, i (`${task.projectName}-${task.taskName}`)}
                    <div class="space-y-1">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                          <div class="h-3 w-3 rounded-full flex-shrink-0" style="background-color: {getProjectColor(i)}"></div>
                          <div class="min-w-0 flex-1">
                            <span class="text-sm text-foreground truncate block" title="{task.projectName}">
                              {task.projectName}
                            </span>
                            <span class="text-xs text-muted-foreground truncate block" title="{task.taskName}">
                              {task.taskName}
                            </span>
                          </div>
                        </div>
                        <span class="text-sm font-mono font-medium text-foreground ml-2 flex-shrink-0">
                          {formatHours(task.hours)}
                        </span>
                      </div>
                      <div class="h-1.5 rounded-full bg-muted overflow-hidden ml-5">
                        <div
                          class="h-full rounded-full transition-all duration-300"
                          style="width: {(task.hours / monthProjectStats.total) * 100}%; background-color: {getProjectColor(i)}"
                        ></div>
                      </div>
                    </div>
                  {/each}
                  {#if monthProjectStats.tasks.length > 8}
                    <p class="text-xs text-muted-foreground pt-2">
                      +{monthProjectStats.tasks.length - 8} more tasks
                    </p>
                  {/if}
                </div>
              </div>
            {:else}
              <div class="rounded-xl border border-border bg-card p-8 text-center">
                <p class="text-sm text-muted-foreground">No tasks tracked this month.</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>

    </div>
  </Dialog.Content>
</Dialog.Root>
