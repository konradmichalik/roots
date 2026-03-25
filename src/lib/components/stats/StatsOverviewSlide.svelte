<script lang="ts">
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';

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
    showMonthUntilYesterday,
    billabilityRate
  }: {
    weekTotals: Totals;
    weekTotalsUntilYesterday: TotalsUntilYesterday;
    monthTotals: Totals;
    monthTotalsUntilYesterday: TotalsUntilYesterday;
    monthWorkingDaysCount: number;
    showMonthUntilYesterday: boolean;
    billabilityRate: number;
  } = $props();

  function getProgressPercent(actual: number, required: number): number {
    if (required === 0) return 0;
    return Math.min(100, Math.round((actual / required) * 100));
  }

  let billableTarget = $derived(settingsState.billableTarget);
</script>

<div class="space-y-4 animate-in fade-in duration-200">
  <!-- KPI Summary Row -->
  <div class="grid grid-cols-3 gap-3">
    <div class="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
      <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Week</span>
      <div class="font-mono text-lg font-bold {getBalanceClass(weekTotals.balance)}">
        {formatBalance(weekTotals.balance)}
      </div>
      <div class="text-[10px] text-muted-foreground font-mono">
        {formatHours(weekTotals.actual)} / {formatHours(weekTotals.required)}
      </div>
    </div>
    <div class="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
      <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Month</span>
      <div class="font-mono text-lg font-bold {getBalanceClass(monthTotals.balance)}">
        {formatBalance(monthTotals.balance)}
      </div>
      <div class="text-[10px] text-muted-foreground font-mono">
        {formatHours(monthTotals.actual)} / {formatHours(monthTotals.required)}
      </div>
    </div>
    <div class="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
      <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Billable</span>
      <div
        class="font-mono text-lg font-bold {billabilityRate >= billableTarget
          ? 'text-success-text'
          : 'text-warning-text'}"
      >
        {billabilityRate}%
      </div>
      <div class="text-[10px] text-muted-foreground font-mono">target {billableTarget}%</div>
    </div>
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
      <span
        >Booked: <span class="font-mono text-base font-bold text-foreground"
          >{formatHours(weekTotals.actual)}</span
        ></span
      >
      <span
        >Target: <span class="font-mono font-medium text-foreground"
          >{formatHours(weekTotals.required)}</span
        ></span
      >
    </div>
    <div class="h-2.5 rounded-full bg-muted overflow-hidden">
      <div
        class="h-full rounded-full bg-success transition-all duration-300"
        style="width: {getProgressPercent(weekTotals.actual, weekTotals.required)}%"
      ></div>
    </div>
    <p class="text-xs font-mono text-muted-foreground">
      {getProgressPercent(weekTotals.actual, weekTotals.required)}% of weekly target (Mon-Fri)
    </p>
    {#if weekTotalsUntilYesterday.daysCount > 0 && weekTotalsUntilYesterday.daysCount < 5}
      <div class="pt-2 border-t border-border/50">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground"
            >Until yesterday ({weekTotalsUntilYesterday.daysCount} days)</span
          >
          <span class="font-mono font-medium {getBalanceClass(weekTotalsUntilYesterday.balance)}">
            {formatBalance(weekTotalsUntilYesterday.balance)}
          </span>
        </div>
        <div class="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span class="font-mono"
            >{formatHours(weekTotalsUntilYesterday.actual)} / {formatHours(
              weekTotalsUntilYesterday.required
            )}</span
          >
          <span>{weekTotalsUntilYesterday.balance >= 0 ? 'overtime' : 'undertime'}</span>
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
        >Booked: <span class="font-mono text-base font-bold text-foreground"
          >{formatHours(monthTotals.actual)}</span
        ></span
      >
      <span
        >Target: <span class="font-mono font-medium text-foreground"
          >{formatHours(monthTotals.required)}</span
        ></span
      >
    </div>
    <div class="h-2.5 rounded-full bg-muted overflow-hidden">
      <div
        class="h-full rounded-full bg-success transition-all duration-300"
        style="width: {getProgressPercent(monthTotals.actual, monthTotals.required)}%"
      ></div>
    </div>
    <p class="text-xs font-mono text-muted-foreground">
      {getProgressPercent(monthTotals.actual, monthTotals.required)}% of monthly target ({monthWorkingDaysCount}
      working days)
    </p>
    {#if showMonthUntilYesterday}
      <div class="pt-2 border-t border-border/50">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground"
            >Until yesterday ({monthTotalsUntilYesterday.daysCount} days)</span
          >
          <span class="font-mono font-medium {getBalanceClass(monthTotalsUntilYesterday.balance)}">
            {formatBalance(monthTotalsUntilYesterday.balance)}
          </span>
        </div>
        <div class="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span class="font-mono"
            >{formatHours(monthTotalsUntilYesterday.actual)} / {formatHours(
              monthTotalsUntilYesterday.required
            )}</span
          >
          <span>{monthTotalsUntilYesterday.balance >= 0 ? 'overtime' : 'undertime'}</span>
        </div>
      </div>
    {/if}
  </div>
</div>
