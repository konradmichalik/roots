<script lang="ts">
  import {
    formatBalance,
    formatHours,
    getBalanceClass,
    getProgressPercent,
    getOverPercent,
    getPacePercent
  } from '../../utils/time-format';
  import { yearStatsState, fetchYearStats, getYearBalance } from '../../stores/yearStats.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { getVacationSummary } from '../../stores/absences.svelte';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TreePalm from '@lucide/svelte/icons/tree-palm';
  import Loader2 from '@lucide/svelte/icons/loader-2';

  let {
    todayStr,
    yearFullTarget = 0,
    yearElapsedDays = 0,
    yearTotalDays = 0
  }: {
    todayStr: string;
    yearFullTarget?: number;
    yearElapsedDays?: number;
    yearTotalDays?: number;
  } = $props();

  let isOpen = $state(false);

  // Trigger year fetch when section opens for the first time
  $effect(() => {
    if (isOpen && !yearStatsState.loaded && !yearStatsState.loading) {
      fetchYearStats();
    }
  });

  let yearData = $derived(getYearBalance(todayStr));
  let vacationSummary = $derived(getVacationSummary());
  let showVacation = $derived(
    connectionsState.personio.isConnected && vacationSummary !== undefined
  );

  // Show header balance only when data is loaded
  let headerBalance = $derived(yearStatsState.loaded ? yearData.yearBalance : null);

  let progressPercent = $derived(getProgressPercent(yearData.yearActual, yearFullTarget));
  let overPercent = $derived(getOverPercent(yearData.yearActual, yearFullTarget));
  let pacePercent = $derived(getPacePercent(yearData.yearTarget, yearFullTarget));
</script>

<div class="rounded-lg border border-border">
  <button
    onclick={() => {
      isOpen = !isOpen;
    }}
    class="flex items-center justify-between w-full px-2.5 py-2 text-xs
      hover:bg-accent/50 transition-colors rounded-lg
      focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
  >
    <div class="flex items-center gap-1.5">
      <TrendingUp class="size-3.5 text-muted-foreground" />
      <span class="font-medium text-foreground">Year</span>
    </div>
    <div class="flex items-center gap-2">
      {#if yearStatsState.loading}
        <Loader2 class="size-3.5 text-muted-foreground animate-spin" />
      {:else if headerBalance !== null}
        <span class="font-mono font-medium {getBalanceClass(headerBalance)}"
          >{formatBalance(headerBalance)}</span
        >
      {:else}
        <span class="font-mono text-muted-foreground">--</span>
      {/if}
      <ChevronDown
        class="size-3.5 text-muted-foreground transition-transform duration-200 {isOpen
          ? 'rotate-180'
          : ''}"
      />
    </div>
  </button>
  {#if isOpen}
    <div class="px-2.5 pb-2.5 space-y-3 text-xs">
      <!-- Loading progress -->
      {#if yearStatsState.loading}
        <p class="text-muted-foreground">
          Loading year data... ({yearStatsState.monthsLoaded}/{yearStatsState.totalMonths} months)
        </p>
      {/if}

      <!-- Year Overtime -->
      {#if yearStatsState.loaded}
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Overtime</span>
            <span class="font-mono font-medium {getBalanceClass(yearData.yearBalance)}"
              >{formatBalance(yearData.yearBalance)}</span
            >
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-baseline gap-1.5">
              <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Booked</span>
              <span class="text-sm font-mono font-medium text-foreground"
                >{formatHours(yearData.yearActual)}</span
              >
            </div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Target</span>
              <span class="font-mono text-muted-foreground">{formatHours(yearFullTarget)}</span>
            </div>
          </div>

          <!-- Mini progress bar with pace marker -->
          <div class="relative w-full h-1 rounded-full bg-muted/30">
            <div
              class="absolute top-0 left-0 h-full rounded-full bg-success transition-all duration-300"
              style="width: {progressPercent}%;"
            ></div>
            {#if overPercent > 0}
              <div
                class="absolute top-0 left-0 h-full rounded-full bg-discovery transition-all duration-300"
                style="width: {overPercent}%;"
              ></div>
            {/if}
            {#if pacePercent > 0 && pacePercent < 100}
              <div
                class="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-foreground/60 rounded-full"
                style="left: {pacePercent}%;"
              ></div>
            {/if}
          </div>
          <p class="text-[10px] text-muted-foreground">
            {yearElapsedDays} of {yearTotalDays} working days (excl. today)
          </p>
        </div>
      {/if}

      <!-- Vacation (Personio) -->
      {#if showVacation && vacationSummary}
        <div class="space-y-1 pt-2 border-t border-border/50">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <TreePalm class="size-3.5 text-success-text" />
              <span class="text-muted-foreground">Vacation</span>
            </div>
            <span class="font-mono font-medium text-foreground">
              {vacationSummary.remaining} / {vacationSummary.entitlement} days
            </span>
          </div>
          <div class="flex items-center justify-between text-muted-foreground pl-5">
            <span
              >Taken: <span class="font-mono font-medium text-foreground"
                >{vacationSummary.taken} days</span
              ></span
            >
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
