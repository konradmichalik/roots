<script lang="ts">
  import { formatBalance } from '../../utils/time-format';
  import { formatDateShort } from '../../utils/date-helpers';
  import { dateNavState, setDate } from '../../stores/dateNavigation.svelte';
  import type { DayOverview } from '../../types';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import AlertCircle from '@lucide/svelte/icons/alert-circle';

  let {
    openDays
  }: {
    openDays: Array<{ date: string; overview: DayOverview }>;
  } = $props();

  let isOpen = $state(true);
</script>

<div class="rounded-lg border border-warning/30 bg-warning/5">
  <button
    onclick={() => {
      isOpen = !isOpen;
    }}
    class="flex items-center justify-between w-full px-2.5 py-2 text-xs
      hover:bg-warning/10 transition-colors rounded-lg
      focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
  >
    <div class="flex items-center gap-1.5">
      <AlertCircle class="size-3.5 text-warning-text" />
      <span class="font-medium text-foreground">Open Hours</span>
      <span
        class="inline-flex items-center justify-center rounded-full bg-warning/20 text-warning-text text-[10px] font-medium px-1.5 min-w-[18px]"
      >
        {openDays.length}
      </span>
    </div>
    <ChevronDown
      class="size-3.5 text-muted-foreground transition-transform duration-200 {isOpen
        ? 'rotate-180'
        : ''}"
    />
  </button>
  {#if isOpen}
    <div class="px-2.5 pb-2.5 space-y-1 max-h-32 overflow-y-auto">
      {#each openDays as { date, overview } (date)}
        <button
          onclick={() => setDate(date)}
          class="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs
            hover:bg-accent transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
            {date === dateNavState.selectedDate ? 'bg-accent' : ''}"
        >
          <span class="text-muted-foreground">{formatDateShort(date)}</span>
          <span class="font-mono text-danger-text"
            >{formatBalance(overview.presenceBalance ?? 0)}</span
          >
        </button>
      {/each}
    </div>
  {/if}
</div>
