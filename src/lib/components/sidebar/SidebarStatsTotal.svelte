<script lang="ts">
  import { formatBalance, formatHours, getBalanceClass } from '../../utils/time-format';
  import { yearStatsState, fetchYearStats, getYearBalance } from '../../stores/yearStats.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { getVacationSummary } from '../../stores/absences.svelte';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TreePalm from '@lucide/svelte/icons/tree-palm';
  import Loader2 from '@lucide/svelte/icons/loader-2';

  let { todayStr }: { todayStr: string } = $props();

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
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Overtime</span>
            <span class="font-mono font-medium {getBalanceClass(yearData.yearBalance)}"
              >{formatBalance(yearData.yearBalance)}</span
            >
          </div>
          <div class="flex items-center justify-between text-muted-foreground">
            <span>Booked: <span class="font-mono font-medium text-foreground">{formatHours(yearData.yearActual)}</span></span>
            <span>Target: <span class="font-mono font-medium text-foreground">{formatHours(yearData.yearTarget)}</span></span>
          </div>
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
            <span>Taken: <span class="font-mono font-medium text-foreground">{vacationSummary.taken} days</span></span>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
