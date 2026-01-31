<script lang="ts">
  import {
    navigateBackward,
    navigateForward,
    goToToday,
    getDisplayLabel
  } from '../../stores/dateNavigation.svelte';
</script>

<div class="flex items-center gap-2">
  <button
    onclick={navigateBackward}
    class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150"
    title="Previous"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  </button>

  <button
    onclick={goToToday}
    class="rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground hover:shadow-sm transition-all duration-150"
  >
    Today
  </button>

  <button
    onclick={navigateForward}
    class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150"
    title="Next"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </button>

  <span class="ml-1 text-sm font-medium text-foreground">
    {getDisplayLabel()}
  </span>
</div>
