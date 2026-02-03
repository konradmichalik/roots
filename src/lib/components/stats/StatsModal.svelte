<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getDayOverview, getCachedDayOverview } from '../../stores/timeEntries.svelte';
  import {
    getWeekDates,
    getMonthStart,
    getMonthEnd,
    addDays,
    isWeekend
  } from '../../utils/date-helpers';
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { getSourceColor } from '../../stores/settings.svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  let open = $state(false);

  // Current day stats
  let dayOverview = $derived(getDayOverview(dateNavState.selectedDate));

  // Week stats (Mon-Fri of the selected date's week)
  let weekDates = $derived(getWeekDates(dateNavState.selectedDate));
  let weekOverviews = $derived(weekDates.map((d) => getCachedDayOverview(d, getMonthStart(d))));
  let weekTotals = $derived({
    actual: weekOverviews.reduce((sum, d) => sum + d.totals.actual, 0),
    required: weekOverviews.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: weekOverviews.reduce((sum, d) => sum + d.balance, 0)
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

  function getMonthWorkingDays(dateStr: string): string[] {
    const start = getMonthStart(dateStr);
    const end = getMonthEnd(dateStr);
    const days: string[] = [];
    let current = start;
    while (current <= end) {
      if (!isWeekend(current)) days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }

  function getProgressPercent(actual: number, required: number): number {
    if (required === 0) return 0;
    return Math.min(100, Math.round((actual / required) * 100));
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
        Overview of your time bookings for day, week, and month.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-5 py-4">
      <!-- Day Balance -->
      <div class="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-foreground">Today</span>
          <span class="font-mono text-lg font-medium {getBalanceClass(dayOverview.balance)}">
            {formatBalance(dayOverview.balance)}
          </span>
        </div>
        <div class="flex items-center justify-between text-sm text-muted-foreground">
          <span>Booked: <span class="font-mono font-medium text-foreground">{formatHours(dayOverview.totals.actual)}</span></span>
          <span>Target: <span class="font-mono font-medium text-foreground">{formatHours(dayOverview.requiredHours)}</span></span>
        </div>
        <div class="h-2 rounded-full bg-muted overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            style="width: {getProgressPercent(dayOverview.totals.actual, dayOverview.requiredHours)}%; background-color: {getSourceColor('moco')}"
          ></div>
        </div>
        <p class="text-xs text-muted-foreground">
          {getProgressPercent(dayOverview.totals.actual, dayOverview.requiredHours)}% of daily target
        </p>
      </div>

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
      </div>

      <!-- Day source breakdown -->
      <div class="border-t border-border pt-4 space-y-3">
        <h4 class="text-sm font-semibold text-foreground">
          Today by Source
        </h4>

        <!-- Moco -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded-full" style="background-color: {getSourceColor('moco')}"></div>
              <span class="text-sm text-muted-foreground">Moco (booked)</span>
            </div>
            <span class="text-sm font-mono font-medium text-foreground">{formatHours(dayOverview.totals.moco)}</span>
          </div>
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              style="width: {getProgressPercent(dayOverview.totals.moco, dayOverview.requiredHours)}%; background-color: {getSourceColor('moco')}"
            ></div>
          </div>
        </div>

        <!-- Jira -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded-full" style="background-color: {getSourceColor('jira')}"></div>
              <span class="text-sm text-muted-foreground">Jira (worklogs)</span>
            </div>
            <span class="text-sm font-mono font-medium text-foreground">{formatHours(dayOverview.totals.jira)}</span>
          </div>
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              style="width: {getProgressPercent(dayOverview.totals.jira, dayOverview.requiredHours)}%; background-color: {getSourceColor('jira')}"
            ></div>
          </div>
        </div>

        <!-- Outlook -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded-full" style="background-color: {getSourceColor('outlook')}"></div>
              <span class="text-sm text-muted-foreground">Outlook (meetings)</span>
            </div>
            <span class="text-sm font-mono font-medium text-foreground">{formatHours(dayOverview.totals.outlook)}</span>
          </div>
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              style="width: {getProgressPercent(dayOverview.totals.outlook, dayOverview.requiredHours)}%; background-color: {getSourceColor('outlook')}"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
