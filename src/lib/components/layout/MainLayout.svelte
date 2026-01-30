<script lang="ts">
  import TopBar from './TopBar.svelte';
  import WeekView from '../timeline/WeekView.svelte';
  import DayView from '../timeline/DayView.svelte';
  import ReconciliationView from '../reconciliation/ReconciliationView.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { reconciliationState } from '../../stores/reconciliation.svelte';
  import { getDateRange } from '../../stores/dateNavigation.svelte';
  import { fetchAllEntries } from '../../stores/timeEntries.svelte';
  import { onMount } from 'svelte';

  // Fetch entries when date changes
  let lastRange = '';

  function checkAndFetch() {
    const range = getDateRange();
    const rangeKey = `${range.from}-${range.to}`;
    if (rangeKey !== lastRange) {
      lastRange = rangeKey;
      fetchAllEntries(range.from, range.to);
    }
  }

  onMount(() => {
    checkAndFetch();
  });

  // Re-fetch when date/view changes
  $effect(() => {
    // Access reactive state to trigger effect
    const _date = dateNavState.selectedDate;
    const _view = dateNavState.viewMode;
    checkAndFetch();
  });
</script>

<div class="flex h-screen flex-col">
  <TopBar />

  <main class="flex-1 overflow-auto p-4">
    {#if reconciliationState.isOpen}
      <ReconciliationView />
    {:else if dateNavState.viewMode === 'week'}
      <WeekView />
    {:else if dateNavState.viewMode === 'day'}
      <DayView />
    {:else}
      <div class="text-center text-muted-foreground py-12">
        Monatsansicht folgt
      </div>
    {/if}
  </main>
</div>
