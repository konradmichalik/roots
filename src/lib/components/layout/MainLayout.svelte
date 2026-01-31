<script lang="ts">
  import TopBar from './TopBar.svelte';
  import DayView from '../timeline/DayView.svelte';
  import CalendarSidebar from '../sidebar/CalendarSidebar.svelte';
  import StatsSidebar from '../sidebar/StatsSidebar.svelte';
  import { sidebarState } from '../../stores/sidebar.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getDateRange } from '../../stores/dateNavigation.svelte';
  import { fetchDayEntries, refreshDayEntries, fetchMonthCache, refreshMonthCacheIfStale } from '../../stores/timeEntries.svelte';
  import { onMount } from 'svelte';

  let lastMonthKey = '';

  function fetchDay() {
    fetchDayEntries(dateNavState.selectedDate);
  }

  function fetchMonth() {
    const range = getDateRange();
    const monthKey = range.from;
    if (monthKey !== lastMonthKey) {
      lastMonthKey = monthKey;
      fetchMonthCache(range.from, range.to);
    }
  }

  onMount(() => {
    fetchDay();
    fetchMonth();

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      const range = getDateRange();
      refreshMonthCacheIfStale(range.from, range.to);
      refreshDayEntries(dateNavState.selectedDate);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  // Re-fetch day data on every date change; month cache only on month change
  $effect(() => {
    const _date = dateNavState.selectedDate;
    fetchDay();
    fetchMonth();
  });
</script>

<div class="flex h-screen flex-col">
  <TopBar />

  <div class="flex flex-1 overflow-hidden">
    {#if sidebarState.leftOpen}
      <aside class="w-72 flex-shrink-0 border-r border-border bg-card overflow-y-auto animate-slide-in-left">
        <CalendarSidebar />
      </aside>
    {/if}

    <main class="flex-1 overflow-auto p-4 dot-grid-bg">
      <div class="animate-slide-up">
        <DayView />
      </div>
    </main>

    {#if sidebarState.rightOpen}
      <aside class="w-80 flex-shrink-0 border-l border-border bg-card overflow-y-auto animate-slide-in-right">
        <StatsSidebar />
      </aside>
    {/if}
  </div>
</div>
