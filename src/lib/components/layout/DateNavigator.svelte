<script lang="ts">
  import {
    navigateBackward,
    navigateForward,
    goToToday,
    getDisplayLabel
  } from '../../stores/dateNavigation.svelte';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
</script>

<div class="flex items-center gap-2">
  <button
    onclick={navigateBackward}
    class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    title="Previous"
  >
    <ChevronLeft class="size-4" />
  </button>

  <button
    onclick={goToToday}
    class="rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground hover:shadow-sm transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
  >
    Today
  </button>

  <button
    onclick={navigateForward}
    class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    title="Next"
  >
    <ChevronRight class="size-4" />
  </button>

  <span class="ml-1 text-sm font-medium text-foreground">
    {getDisplayLabel()}
  </span>
</div>
