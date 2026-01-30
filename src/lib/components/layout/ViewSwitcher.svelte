<script lang="ts">
  import { dateNavState, setViewMode } from '../../stores/dateNavigation.svelte';
  import type { ViewMode } from '../../types';

  const views: { mode: ViewMode; label: string }[] = [
    { mode: 'week', label: 'Woche' },
    { mode: 'day', label: 'Tag' },
    { mode: 'month', label: 'Monat' }
  ];
</script>

<div class="flex rounded-md border border-border bg-secondary/50">
  {#each views as view}
    <button
      onclick={() => setViewMode(view.mode)}
      class="px-3 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md {dateNavState.viewMode === view.mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
    >
      {view.label}
    </button>
  {/each}
</div>
