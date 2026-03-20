<script lang="ts">
  import {
    formatBalance,
    formatHours,
    getBalanceClass,
    getProgressPercent,
    getOverPercent,
    getPacePercent
  } from '../../utils/time-format';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import CalendarRange from '@lucide/svelte/icons/calendar-range';

  let {
    weekBalance,
    weekActual,
    weekTarget,
    weekFullTarget,
    daysCount
  }: {
    weekBalance: number;
    weekActual: number;
    weekTarget: number;
    weekFullTarget: number;
    daysCount: number;
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

      <!-- Mini progress bar with pace marker on the bar -->
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
        <!-- Pace marker (on the bar) -->
        {#if pacePercent > 0 && pacePercent < 100}
          <div
            class="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-foreground/60 rounded-full"
            style="left: {pacePercent}%;"
          ></div>
        {/if}
      </div>

      <p class="text-[10px] text-muted-foreground">
        {daysCount} working day{daysCount !== 1 ? 's' : ''} (excl. today)
      </p>
    </div>
  {/if}
</div>
