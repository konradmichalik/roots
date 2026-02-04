<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getCachedDayOverview, monthCacheState } from '../../stores/timeEntries.svelte';
  import {
    getWeekDates,
    getMonthStart,
    getMonthWorkingDays,
    today
  } from '../../utils/date-helpers';
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { getSourceColor } from '../../stores/settings.svelte';
  import type { Snippet } from 'svelte';
  import type { MocoMetadata } from '../../types';

  let { children }: { children: Snippet } = $props();

  let open = $state(false);
  let todayStr = $derived(today());

  // Week stats (Mon-Fri of the selected date's week)
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

  // Month stats
  let monthWorkingDays = $derived(getMonthWorkingDays(dateNavState.selectedDate));
  let monthStart = $derived(getMonthStart(dateNavState.selectedDate));
  let monthOverviews = $derived(monthWorkingDays.map((d) => getCachedDayOverview(d, monthStart)));
  let monthTotals = $derived({
    actual: monthOverviews.reduce((sum, d) => sum + d.totals.actual, 0),
    required: monthOverviews.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: monthOverviews.reduce((sum, d) => sum + d.balance, 0)
  });

  // Month stats "until now" (only working days up to and including today)
  let monthWorkingDaysUntilNow = $derived(monthWorkingDays.filter((d) => d <= todayStr));
  let monthOverviewsUntilNow = $derived(monthWorkingDaysUntilNow.map((d) => getCachedDayOverview(d, monthStart)));
  let monthTotalsUntilNow = $derived({
    actual: monthOverviewsUntilNow.reduce((sum, d) => sum + d.totals.actual, 0),
    required: monthOverviewsUntilNow.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: monthOverviewsUntilNow.reduce((sum, d) => sum + d.balance, 0),
    daysCount: monthWorkingDaysUntilNow.length
  });

  function getProgressPercent(actual: number, required: number): number {
    if (required === 0) return 0;
    return Math.min(100, Math.round((actual / required) * 100));
  }

  // Month project distribution from cache
  interface ProjectStats {
    name: string;
    customerName: string;
    hours: number;
  }

  let monthProjectStats = $derived(() => {
    const cached = monthCacheState.cache[monthStart];
    if (!cached) return { projects: [] as ProjectStats[], billable: 0, nonBillable: 0, total: 0 };

    const projectMap = new Map<number, ProjectStats>();
    let billable = 0;
    let nonBillable = 0;

    for (const entry of cached.mocoEntries) {
      const meta = entry.metadata as MocoMetadata;
      const projectId = meta.projectId;

      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          name: meta.projectName,
          customerName: meta.customerName,
          hours: 0
        });
      }

      const stats = projectMap.get(projectId)!;
      stats.hours += entry.hours;

      if (meta.billable) {
        billable += entry.hours;
      } else {
        nonBillable += entry.hours;
      }
    }

    const projects = [...projectMap.values()].sort((a, b) => b.hours - a.hours);
    return { projects, billable, nonBillable, total: billable + nonBillable };
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
  <Dialog.Content class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Statistics</Dialog.Title>
      <Dialog.Description>
        Overview of your time bookings for week and month.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-5 py-4">
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
        <!-- Until now indicator -->
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
        <!-- Until now indicator -->
        {#if monthTotalsUntilNow.daysCount < monthWorkingDays.length}
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

      <!-- Monthly Billable/Non-billable -->
      {#if monthProjectStats().total > 0}
        <div class="border-t border-border pt-4 space-y-3">
          <h4 class="text-sm font-semibold text-foreground">
            Monthly Breakdown
          </h4>

          <!-- Billable vs Non-billable -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Billable</span>
              <span class="font-mono font-medium text-success-text">{formatHours(monthProjectStats().billable)}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Non-billable</span>
              <span class="font-mono font-medium text-muted-foreground">{formatHours(monthProjectStats().nonBillable)}</span>
            </div>
            <div class="h-2 rounded-full bg-muted overflow-hidden flex">
              {#if monthProjectStats().total > 0}
                <div
                  class="h-full bg-success transition-all duration-300"
                  style="width: {(monthProjectStats().billable / monthProjectStats().total) * 100}%"
                ></div>
                <div
                  class="h-full bg-muted-foreground/30 transition-all duration-300"
                  style="width: {(monthProjectStats().nonBillable / monthProjectStats().total) * 100}%"
                ></div>
              {/if}
            </div>
            <p class="text-xs text-muted-foreground">
              {Math.round((monthProjectStats().billable / monthProjectStats().total) * 100)}% billable
            </p>
          </div>
        </div>

        <!-- Project Distribution -->
        <div class="border-t border-border pt-4 space-y-3">
          <h4 class="text-sm font-semibold text-foreground">
            Projects This Month
          </h4>

          <div class="space-y-2.5">
            {#each monthProjectStats().projects.slice(0, 8) as project, i (project.name)}
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <div class="h-2.5 w-2.5 rounded-full flex-shrink-0" style="background-color: {getProjectColor(i)}"></div>
                    <span class="text-xs text-muted-foreground truncate" title="{project.customerName} — {project.name}">
                      {project.name}
                    </span>
                  </div>
                  <span class="text-xs font-mono font-medium text-foreground ml-2 flex-shrink-0">
                    {formatHours(project.hours)}
                  </span>
                </div>
                <div class="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    style="width: {(project.hours / monthProjectStats().total) * 100}%; background-color: {getProjectColor(i)}"
                  ></div>
                </div>
              </div>
            {/each}
            {#if monthProjectStats().projects.length > 8}
              <p class="text-xs text-muted-foreground">
                +{monthProjectStats().projects.length - 8} more projects
              </p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
