<script lang="ts">
  import {
    navigateBackward,
    navigateForward,
    getDisplayLabel
  } from '../../stores/dateNavigation.svelte';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
</script>

<div class="flex items-center gap-1">
  <button
    onclick={navigateBackward}
    class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    title="Previous day"
  >
    <ChevronLeft class="size-4" />
  </button>

  <span class="min-w-[140px] text-center text-sm font-medium text-foreground">
    {getDisplayLabel()}
  </span>

  <button
    onclick={navigateForward}
    class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    title="Next day"
  >
    <ChevronRight class="size-4" />
  </button>
</div>
