<script lang="ts">
  import { formatBalance, formatHours, getBalanceClass } from '../../utils/time-format';
  import { formatDateShort } from '../../utils/date-helpers';
  import { dateNavState, setDate } from '../../stores/dateNavigation.svelte';
  import { settingsState } from '../../stores/settings.svelte';
  import type { DayOverview } from '../../types';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Scale from '@lucide/svelte/icons/scale';

  let {
    monthBalance,
    monthActual,
    monthTarget,
    billablePercent,
    balancedDays,
    onBillableClick
  }: {
    monthBalance: number;
    monthActual: number;
    monthTarget: number;
    billablePercent: number;
    balancedDays: Array<{ date: string; overview: DayOverview }>;
    onBillableClick?: () => void;
  } = $props();

  let isOpen = $state(false);
  let showBalancedDays = $state(true);
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
      <Calendar class="size-3.5 text-muted-foreground" />
      <span class="font-medium text-foreground">Month</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="font-mono font-medium {getBalanceClass(monthBalance)}"
        >{formatBalance(monthBalance)}</span
      >
      <ChevronDown
        class="size-3.5 text-muted-foreground transition-transform duration-200 {isOpen
          ? 'rotate-180'
          : ''}"
      />
    </div>
  </button>
  {#if isOpen}
    <div class="px-2.5 pb-2.5 space-y-3 text-xs">
      <!-- Booked / Target -->
      <div class="flex items-center justify-between text-muted-foreground">
        <span>Booked: <span class="font-mono font-medium text-foreground">{formatHours(monthActual)}</span></span>
        <span>Target: <span class="font-mono font-medium text-foreground">{formatHours(monthTarget)}</span></span>
      </div>

      <!-- Billable % -->
      <button
        onclick={() => onBillableClick?.()}
        class="flex items-center justify-between w-full text-muted-foreground
          hover:text-foreground transition-colors rounded
          focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span>Billable</span>
        <span class="font-mono font-medium {billablePercent >= settingsState.billableTarget ? 'text-success-text' : 'text-warning-text'}">{billablePercent}%</span>
      </button>

      <!-- Hour Balances Sub-Accordion -->
      {#if balancedDays.length > 0}
        <div>
          <button
            onclick={() => {
              showBalancedDays = !showBalancedDays;
            }}
            class="flex items-center justify-between w-full text-left
              focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none rounded"
          >
            <div class="flex items-center gap-1.5">
              <Scale class="size-3.5 text-muted-foreground" />
              <span class="font-medium text-foreground">Hour Balances</span>
              <span
                class="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-1.5 min-w-[18px]"
              >
                {balancedDays.length}
              </span>
            </div>
            <ChevronDown
              class="size-3.5 text-muted-foreground transition-transform duration-200 {showBalancedDays
                ? 'rotate-180'
                : ''}"
            />
          </button>
          {#if showBalancedDays}
            <div class="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
              {#each balancedDays as { date, overview } (date)}
                <button
                  onclick={() => setDate(date)}
                  class="w-full flex items-center justify-between rounded-lg px-2 py-1.5
                    hover:bg-accent transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
                    {date === dateNavState.selectedDate ? 'bg-accent' : ''}"
                >
                  <span class="text-muted-foreground">{formatDateShort(date)}</span>
                  <span class="font-mono {getBalanceClass(overview.balance)}"
                    >{formatBalance(overview.balance)}</span
                  >
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
