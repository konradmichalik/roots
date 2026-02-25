<script lang="ts">
  import TopBar from './TopBar.svelte';
  import DayView from '../timeline/DayView.svelte';
  import CalendarSidebar from '../sidebar/CalendarSidebar.svelte';
  import FavoritesSidebar from '../sidebar/FavoritesSidebar.svelte';
  import ToastContainer from '../common/ToastContainer.svelte';
  import MorningModal from '../common/MorningModal.svelte';
  import { sidebarState, toggleRightSidebar } from '../../stores/sidebar.svelte';
  import { dateNavState, setDate, getDateRange } from '../../stores/dateNavigation.svelte';
  import {
    fetchDayEntries,
    refreshDayEntries,
    fetchMonthCache,
    getEntriesForDate
  } from '../../stores/timeEntries.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { initializeAutoRefresh, cleanupAutoRefresh } from '../../stores/autoRefresh.svelte';
  import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../../utils/storage';
  import { today } from '../../utils/date-helpers';
  import { onMount } from 'svelte';

  let innerWidth = $state(0);
  const isCompact = $derived(innerWidth < 1280);

  let lastMonthKey = '';
  let showMorningModal = $state(false);
  let morningCheckedForDate = '';

  function fetchMonth() {
    const range = getDateRange();
    const monthKey = range.from;
    if (monthKey !== lastMonthKey) {
      lastMonthKey = monthKey;
      fetchMonthCache(range.from, range.to);
    }
  }

  async function checkMorningGreeting(): Promise<void> {
    const todayStr = today();
    if (morningCheckedForDate === todayStr) return;

    try {
      if (!connectionsState.moco.isConnected || !connectionsState.outlook.isConnected) return;

      const lastShown = await getStorageItemAsync<string>(STORAGE_KEYS.MORNING_GREETING);
      if (lastShown === todayStr) {
        morningCheckedForDate = todayStr;
        return;
      }

      const hasOutlookEvents = getEntriesForDate(todayStr).outlook.length > 0;
      if (hasOutlookEvents) {
        showMorningModal = true;
      }
    } catch {
      morningCheckedForDate = '';
    }
    morningCheckedForDate = todayStr;
  }

  function handleMorningClose(): void {
    showMorningModal = false;
    saveStorage(STORAGE_KEYS.MORNING_GREETING, today());
  }

  onMount(() => {
    const dayPromise = fetchDayEntries(dateNavState.selectedDate);
    fetchMonth();
    initializeAutoRefresh();

    // Check morning greeting after initial data is loaded
    dayPromise.then(() => checkMorningGreeting());

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      const todayStr = today();

      // Navigate to today if the date changed overnight
      const dateChanged = dateNavState.selectedDate !== todayStr;
      if (dateChanged) {
        setDate(todayStr);
      }

      // If the date changed, $effect already triggers fetchDayEntries for the new date.
      // Only force-refresh when staying on the same day (e.g. waking mid-day).
      if (!dateChanged) {
        refreshDayEntries(todayStr)
          .then(() => checkMorningGreeting())
          .catch(() => checkMorningGreeting());
      } else {
        checkMorningGreeting();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupAutoRefresh();
    };
  });

  // Re-fetch day data on every date change; month cache only on month change
  $effect(() => {
    const _date = dateNavState.selectedDate;
    fetchDayEntries(dateNavState.selectedDate);
    fetchMonth();
  });
</script>

<svelte:window bind:innerWidth />

<div class="flex h-screen flex-col">
  <TopBar />

  <div class="flex flex-1 overflow-hidden">
    {#if sidebarState.leftOpen}
      <aside
        class="w-72 flex-shrink-0 border-r border-border bg-card overflow-y-auto animate-slide-in-left"
      >
        <CalendarSidebar />
      </aside>
    {/if}

    <main class="flex-1 overflow-auto p-4 dot-grid-bg">
      <div class="animate-slide-up">
        <DayView />
      </div>
    </main>

    {#if sidebarState.rightOpen}
      {#if isCompact}
        <button
          type="button"
          class="fixed inset-0 top-14 z-30 bg-black/20 backdrop-blur-[1px]"
          onclick={toggleRightSidebar}
          aria-label="Close favorites"
        ></button>
      {/if}
      <aside
        class={isCompact
          ? 'fixed right-0 top-14 bottom-0 z-40 w-80 border-l border-border bg-card overflow-y-auto shadow-xl animate-slide-in-right'
          : 'w-80 flex-shrink-0 border-l border-border bg-card overflow-y-auto animate-slide-in-right'}
      >
        <FavoritesSidebar />
      </aside>
    {/if}
  </div>

  <ToastContainer />
  <MorningModal bind:open={showMorningModal} onClose={handleMorningClose} />
</div>
