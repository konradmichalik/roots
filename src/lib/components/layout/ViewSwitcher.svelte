<script lang="ts">
  import { dateNavState, setViewMode } from '../../stores/dateNavigation.svelte';
  import type { ViewMode } from '../../types';

  const views: { mode: ViewMode; label: string }[] = [
    { mode: 'week', label: 'Woche' },
    { mode: 'day', label: 'Tag' },
    { mode: 'month', label: 'Monat' }
  ];
</script>

<div class="flex rounded-lg border border-border bg-secondary/50 overflow-hidden">
  {#each views as view}
    <button
      onclick={() => setViewMode(view.mode)}
      class="px-3 py-1.5 text-xs font-medium transition-all duration-150 first:rounded-l-[calc(var(--radius)-1px)] last:rounded-r-[calc(var(--radius)-1px)] {dateNavState.viewMode === view.mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
    >
      {view.label}
    </button>
  {/each}
</div>
