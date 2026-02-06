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
  import type { Snippet } from 'svelte';
  import type { MocoMetadata } from '../../types';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

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

  // Month stats "until yesterday" (only completed working days, excluding today) - only relevant for current month
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

  // Show "until yesterday" section only if we're in the current month and have at least one completed day
  let showMonthUntilYesterday = $derived(isCurrentMonth && monthTotalsUntilYesterday.daysCount > 0);

  function getProgressPercent(actual: number, required: number): number {
    if (required === 0) return 0;
    return Math.min(100, Math.round((actual / required) * 100));
  }

  // Month project+task distribution from cache
  interface TaskStats {
    taskName: string;
    hours: number;
  }

  interface ProjectStats {
    projectId: number;
    projectName: string;
    customerName: string;
    hours: number;
    tasks: TaskStats[];
  }

  let monthProjectStats = $derived.by(() => {
    const cached = monthCacheState.cache[monthStart];
    if (!cached) return { projects: [] as ProjectStats[], billable: 0, nonBillable: 0, total: 0 };

    const projectRecord: Record<number, ProjectStats & { taskMap: Record<string, TaskStats> }> = {};
    let billable = 0;
    let nonBillable = 0;

    for (const entry of cached.mocoEntries) {
      const meta = entry.metadata as MocoMetadata;

      // Initialize project if needed
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

      // Aggregate by taskName within the project
      if (!project.taskMap[meta.taskName]) {
        project.taskMap[meta.taskName] = {
          taskName: meta.taskName,
          hours: 0
        };
      }

      project.taskMap[meta.taskName].hours += entry.hours;
      project.hours += entry.hours;

      if (meta.billable) {
        billable += entry.hours;
      } else {
        nonBillable += entry.hours;
      }
    }

    // Convert taskMap to array and sort
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

  // Colors for project bars (cycling through a palette)
  const PROJECT_COLORS = [
    '#8fbcbb',
    '#88c0d0',
    '#81a1c1',
    '#5e81ac',
    '#bf616a',
    '#d08770',
    '#ebcb8b',
    '#a3be8c',
    '#b48ead'
  ];

  function getProjectColor(index: number): string {
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
  }

  function getPercent(hours: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((hours / total) * 100);
  }

  // Generate pie chart segments
  let pieSegments = $derived.by(() => {
    if (monthProjectStats.total === 0) return [];

    const segments: Array<{
      project: ProjectStats;
      color: string;
      percent: number;
      startAngle: number;
      endAngle: number;
    }> = [];

    let currentAngle = -90; // Start from top

    monthProjectStats.projects.forEach((project, i) => {
      const percent = (project.hours / monthProjectStats.total) * 100;
      const angle = (percent / 100) * 360;

      segments.push({
        project,
        color: getProjectColor(i),
        percent,
        startAngle: currentAngle,
        endAngle: currentAngle + angle
      });

      currentAngle += angle;
    });

    return segments;
  });

  function describeArc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ): string {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  }

  function polarToCartesian(
    cx: number,
    cy: number,
    r: number,
    angleInDegrees: number
  ): { x: number; y: number } {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians)
    };
  }

  let hoveredSegment = $state<number | null>(null);
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
                <span
                  >Booked: <span class="font-mono font-medium text-foreground"
                    >{formatHours(weekTotals.actual)}</span
                  ></span
                >
                <span
                  >Target: <span class="font-mono font-medium text-foreground"
                    >{formatHours(weekTotals.required)}</span
                  ></span
                >
              </div>
              <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full rounded-full bg-success transition-all duration-300"
                  style="width: {getProgressPercent(weekTotals.actual, weekTotals.required)}%"
                ></div>
              </div>
              <p class="text-xs text-muted-foreground">
                {getProgressPercent(weekTotals.actual, weekTotals.required)}% of weekly target
                (Mon-Fri)
              </p>
              {#if weekTotalsUntilYesterday.daysCount > 0 && weekTotalsUntilYesterday.daysCount < 5}
                <div class="pt-2 border-t border-border/50">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted-foreground"
                      >Until yesterday ({weekTotalsUntilYesterday.daysCount} days):</span
                    >
                    <span
                      class="font-mono font-medium {getBalanceClass(
                        weekTotalsUntilYesterday.balance
                      )}"
                    >
                      {formatBalance(weekTotalsUntilYesterday.balance)}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span
                      >{formatHours(weekTotalsUntilYesterday.actual)} / {formatHours(
                        weekTotalsUntilYesterday.required
                      )}</span
                    >
                    <span>{weekTotalsUntilYesterday.balance >= 0 ? 'ahead' : 'behind'}</span>
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
                <span
                  >Booked: <span class="font-mono font-medium text-foreground"
                    >{formatHours(monthTotals.actual)}</span
                  ></span
                >
                <span
                  >Target: <span class="font-mono font-medium text-foreground"
                    >{formatHours(monthTotals.required)}</span
                  ></span
                >
              </div>
              <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full rounded-full bg-success transition-all duration-300"
                  style="width: {getProgressPercent(monthTotals.actual, monthTotals.required)}%"
                ></div>
              </div>
              <p class="text-xs text-muted-foreground">
                {getProgressPercent(monthTotals.actual, monthTotals.required)}% of monthly target ({monthWorkingDays.length}
                working days)
              </p>
              {#if showMonthUntilYesterday}
                <div class="pt-2 border-t border-border/50">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted-foreground"
                      >Until yesterday ({monthTotalsUntilYesterday.daysCount} days):</span
                    >
                    <span
                      class="font-mono font-medium {getBalanceClass(
                        monthTotalsUntilYesterday.balance
                      )}"
                    >
                      {formatBalance(monthTotalsUntilYesterday.balance)}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span
                      >{formatHours(monthTotalsUntilYesterday.actual)} / {formatHours(
                        monthTotalsUntilYesterday.required
                      )}</span
                    >
                    <span>{monthTotalsUntilYesterday.balance >= 0 ? 'ahead' : 'behind'}</span>
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
                <h4 class="text-sm font-semibold text-foreground">Monthly Breakdown</h4>

                <!-- Billable vs Non-billable -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Billable</span>
                    <span class="font-mono font-medium text-success-text"
                      >{formatHours(monthProjectStats.billable)}</span
                    >
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Non-billable</span>
                    <span class="font-mono font-medium text-muted-foreground"
                      >{formatHours(monthProjectStats.nonBillable)}</span
                    >
                  </div>
                  <div class="h-3 rounded-full bg-muted overflow-hidden flex">
                    {#if monthProjectStats.total > 0}
                      <div
                        class="h-full bg-success transition-all duration-300"
                        style="width: {(monthProjectStats.billable / monthProjectStats.total) *
                          100}%"
                      ></div>
                      <div
                        class="h-full bg-muted-foreground/30 transition-all duration-300"
                        style="width: {(monthProjectStats.nonBillable / monthProjectStats.total) *
                          100}%"
                      ></div>
                    {/if}
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {Math.round((monthProjectStats.billable / monthProjectStats.total) * 100)}%
                    billable this month
                  </p>
                </div>

                <!-- Summary Stats -->
                <div class="pt-3 border-t border-border/50 grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-xs text-muted-foreground">Total Hours</p>
                    <p class="font-mono text-lg font-medium text-foreground">
                      {formatHours(monthProjectStats.total)}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Projects</p>
                    <p class="font-mono text-lg font-medium text-foreground">
                      {monthProjectStats.projects.length}
                    </p>
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
          <div class="space-y-3 animate-in fade-in duration-200">
            {#if monthProjectStats.projects.length > 0}
              <!-- Pie Chart with Tooltip -->
              <div class="flex flex-col items-center gap-2 py-2">
                <div class="relative">
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    {#each pieSegments as segment, i (segment.project.projectId)}
                      <path
                        role="img"
                        aria-label="{segment.project.customerName} — {segment.project
                          .projectName}: {formatHours(segment.project.hours)}"
                        d={describeArc(50, 50, 45, segment.startAngle, segment.endAngle)}
                        fill={segment.color}
                        class="transition-opacity duration-150 cursor-pointer"
                        opacity={hoveredSegment === null || hoveredSegment === i ? 1 : 0.4}
                        onmouseenter={() => (hoveredSegment = i)}
                        onmouseleave={() => (hoveredSegment = null)}
                      />
                    {/each}
                    <!-- Center hole for donut effect -->
                    <circle cx="50" cy="50" r="32" fill="var(--background)" />
                  </svg>
                  <!-- Center text -->
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    {#if hoveredSegment !== null}
                      <span class="text-base font-mono font-semibold text-foreground">
                        {Math.round(pieSegments[hoveredSegment].percent)}%
                      </span>
                    {:else}
                      <span class="text-[10px] text-muted-foreground">Total</span>
                      <span class="text-xs font-mono font-medium text-foreground">
                        {formatHours(monthProjectStats.total)}
                      </span>
                    {/if}
                  </div>
                </div>

                <!-- Hover Tooltip -->
                <div class="h-12 flex items-center justify-center text-center px-4">
                  {#if hoveredSegment !== null}
                    {@const hovered = pieSegments[hoveredSegment].project}
                    <div class="flex flex-col items-center gap-0.5">
                      <span class="text-sm font-medium text-foreground line-clamp-1">
                        {hovered.customerName} — {hovered.projectName}
                      </span>
                      <span class="text-xs text-muted-foreground font-mono">
                        {formatHours(hovered.hours)}
                      </span>
                    </div>
                  {:else}
                    <span class="text-xs text-muted-foreground">
                      Hover über Segmente für Details
                    </span>
                  {/if}
                </div>
              </div>

              <!-- Project List -->
              {#each monthProjectStats.projects as project, i (project.projectId)}
                <div
                  role="listitem"
                  class="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm"
                >
                  <!-- Project Header -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        class="h-3 w-3 rounded-full flex-shrink-0"
                        style="background-color: {getProjectColor(i)}"
                      ></div>
                      <span
                        class="text-sm font-medium text-foreground truncate"
                        title="{project.customerName} — {project.projectName}"
                      >
                        {project.customerName} — {project.projectName}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span class="text-xs text-muted-foreground">
                        {getPercent(project.hours, monthProjectStats.total)}%
                      </span>
                      <span class="text-sm font-mono font-semibold text-foreground">
                        {formatHours(project.hours)}
                      </span>
                    </div>
                  </div>

                  <!-- Project Progress Bar -->
                  <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      style="width: {getPercent(
                        project.hours,
                        monthProjectStats.total
                      )}%; background-color: {getProjectColor(i)}"
                    ></div>
                  </div>

                  <!-- Tasks within Project -->
                  <div class="pl-5 space-y-1 pt-1">
                    {#each project.tasks as task, taskIndex (`${project.projectId}-${taskIndex}`)}
                      <div class="flex items-center justify-between text-xs gap-2">
                        <span
                          class="text-muted-foreground truncate min-w-0 flex-1"
                          title={task.taskName}
                        >
                          {task.taskName}
                        </span>
                        <span class="text-muted-foreground/70 flex-shrink-0 w-8 text-right">
                          {getPercent(task.hours, monthProjectStats.total)}%
                        </span>
                        <span class="font-mono text-muted-foreground flex-shrink-0 w-14 text-right">
                          {formatHours(task.hours)}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            {:else}
              <div class="rounded-xl border border-border bg-card p-8 text-center">
                <p class="text-sm text-muted-foreground">No projects tracked this month.</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
