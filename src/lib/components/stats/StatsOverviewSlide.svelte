<script lang="ts">
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';

  interface Totals {
    actual: number;
    required: number;
    balance: number;
  }

  interface TotalsUntilYesterday extends Totals {
    daysCount: number;
  }

  let {
    weekTotals,
    weekTotalsUntilYesterday,
    monthTotals,
    monthTotalsUntilYesterday,
    monthWorkingDaysCount,
    showMonthUntilYesterday
  }: {
    weekTotals: Totals;
    weekTotalsUntilYesterday: TotalsUntilYesterday;
    monthTotals: Totals;
    monthTotalsUntilYesterday: TotalsUntilYesterday;
    monthWorkingDaysCount: number;
    showMonthUntilYesterday: boolean;
  } = $props();

  function getProgressPercent(actual: number, required: number): number {
    if (required === 0) return 0;
    return Math.min(100, Math.round((actual / required) * 100));
  }
</script>

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
      {getProgressPercent(weekTotals.actual, weekTotals.required)}% of weekly target (Mon-Fri)
    </p>
    {#if weekTotalsUntilYesterday.daysCount > 0 && weekTotalsUntilYesterday.daysCount < 5}
      <div class="pt-2 border-t border-border/50">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground"
            >Until yesterday ({weekTotalsUntilYesterday.daysCount} days):</span
          >
          <span class="font-mono font-medium {getBalanceClass(weekTotalsUntilYesterday.balance)}">
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
      {getProgressPercent(monthTotals.actual, monthTotals.required)}% of monthly target ({monthWorkingDaysCount}
      working days)
    </p>
    {#if showMonthUntilYesterday}
      <div class="pt-2 border-t border-border/50">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground"
            >Until yesterday ({monthTotalsUntilYesterday.daysCount} days):</span
          >
          <span class="font-mono font-medium {getBalanceClass(monthTotalsUntilYesterday.balance)}">
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
