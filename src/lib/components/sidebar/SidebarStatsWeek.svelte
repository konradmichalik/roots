<script lang="ts">
  import {
    formatBalance,
    formatHours,
    getBalanceClass,
    getProgressPercent,
    getOverPercent,
    getPacePercent
  } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';
  import StatsProgressBar from './StatsProgressBar.svelte';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import CalendarRange from '@lucide/svelte/icons/calendar-range';

  let {
    weekBalance,
    weekActual,
    weekTarget,
    weekFullTarget,
    daysCount,
    weekBillablePercent = 0,
    onBillableClick
  }: {
    weekBalance: number;
    weekActual: number;
    weekTarget: number;
    weekFullTarget: number;
    daysCount: number;
    weekBillablePercent?: number;
    onBillableClick?: () => void;
  } = $props();

  let isOpen = $state(true);

  let progressPercent = $derived(getProgressPercent(weekActual, weekFullTarget));
  let overPercent = $derived(getOverPercent(weekActual, weekFullTarget));
  let pacePercent = $derived(getPacePercent(weekTarget, weekFullTarget));
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
      <CalendarRange class="size-3.5 text-muted-foreground" />
      <span class="font-medium text-foreground">Week</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="font-mono font-medium {getBalanceClass(weekBalance)}"
        >{formatBalance(weekBalance)}</span
      >
      <ChevronDown
        class="size-3.5 text-muted-foreground transition-transform duration-200 {isOpen
          ? 'rotate-180'
          : ''}"
      />
    </div>
  </button>
  {#if isOpen}
    <div class="px-2.5 pb-2.5 space-y-1.5 text-xs">
      <div class="flex items-center justify-between">
        <div class="flex items-baseline gap-1.5">
          <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Booked</span>
          <span class="text-sm font-mono font-medium text-foreground"
            >{formatHours(weekActual)}</span
          >
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Target</span>
          <span class="font-mono text-muted-foreground">{formatHours(weekFullTarget)}</span>
        </div>
      </div>

      <StatsProgressBar {progressPercent} {overPercent} {pacePercent} />

      <p class="text-[10px] text-muted-foreground">
        {daysCount} working day{daysCount !== 1 ? 's' : ''} (excl. today)
      </p>

      <!-- Billable % (same pattern as SidebarStatsMonth) -->
      <button
        onclick={() => onBillableClick?.()}
        class="flex items-center justify-between w-full text-muted-foreground
          hover:text-foreground transition-colors rounded
          focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span class="text-[10px] uppercase tracking-wider">Billable</span>
        <span
          class="font-mono font-medium {weekBillablePercent >= settingsState.billableTarget
            ? 'text-success-text'
            : 'text-warning-text'}">{weekBillablePercent}%</span
        >
      </button>
    </div>
  {/if}
</div>
