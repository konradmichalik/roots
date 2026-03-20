<script lang="ts">
  import {
    dateNavState,
    navigateBackward,
    navigateForward
  } from '../../stores/dateNavigation.svelte';
  import { parseDate } from '../../utils/date-helpers';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  let dateParts = $derived.by(() => {
    const d = parseDate(dateNavState.selectedDate);
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'long' }),
      year: d.getFullYear()
    };
  });
</script>

<div class="flex items-center gap-1">
  <button
    onclick={navigateBackward}
    class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    title="Previous day"
    aria-label="Previous day"
  >
    <ChevronLeft class="size-4" />
  </button>

  <span class="min-w-[140px] text-center text-sm">
    <span class="text-muted-foreground font-normal">{dateParts.weekday},</span>
    <span class="font-semibold text-foreground">{dateParts.month} {dateParts.day}</span><span
      class="text-muted-foreground font-normal">, {dateParts.year}</span
    >
  </span>

  <button
    onclick={navigateForward}
    class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    title="Next day"
    aria-label="Next day"
  >
    <ChevronRight class="size-4" />
  </button>
</div>
