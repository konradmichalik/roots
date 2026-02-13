<script lang="ts">
  import { formatBalance, formatHours, getBalanceClass } from '../../utils/time-format';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import CalendarRange from '@lucide/svelte/icons/calendar-range';

  let {
    weekBalance,
    weekActual,
    weekTarget,
    daysCount
  }: {
    weekBalance: number;
    weekActual: number;
    weekTarget: number;
    daysCount: number;
  } = $props();

  let isOpen = $state(true);
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
    <div class="px-2.5 pb-2.5 space-y-1 text-xs">
      <div class="flex items-center justify-between text-muted-foreground">
        <span>Booked: <span class="font-mono font-medium text-foreground">{formatHours(weekActual)}</span></span>
        <span>Target: <span class="font-mono font-medium text-foreground">{formatHours(weekTarget)}</span></span>
      </div>
      <p class="text-[10px] text-muted-foreground">
        {daysCount} working day{daysCount !== 1 ? 's' : ''} (excl. today)
      </p>
    </div>
  {/if}
</div>
