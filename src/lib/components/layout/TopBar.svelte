<script lang="ts">
  import DateNavigator from './DateNavigator.svelte';
  import ServiceStatusDot from '../common/ServiceStatusDot.svelte';
  import ConnectionManager from '../connection/ConnectionManager.svelte';
  import SettingsModal from '../settings/SettingsModal.svelte';
  import Logo from '../common/Logo.svelte';
  import MiniTimer from '../timer/MiniTimer.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { sidebarState, toggleLeftSidebar, toggleRightSidebar } from '../../stores/sidebar.svelte';
  import {
    isAnyLoading,
    timeEntriesState,
    refreshDayEntries
  } from '../../stores/timeEntries.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { formatRelativeTime, formatDateTime } from '../../utils/date-helpers';
  import PanelLeft from '@lucide/svelte/icons/panel-left';
  import Star from '@lucide/svelte/icons/star';
  import Settings from '@lucide/svelte/icons/settings';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';

  let isLoading = $derived(isAnyLoading());
  let lastFetched = $derived(
    timeEntriesState.lastFetched ? new Date(timeEntriesState.lastFetched) : null
  );

  // Tick counter for relative time updates
  let timeTick = $state(0);
  $effect(() => {
    const interval = setInterval(() => timeTick++, 30000);
    return () => clearInterval(interval);
  });

  function handleRefresh(): void {
    refreshDayEntries(dateNavState.selectedDate);
  }
</script>

<header
  class="flex h-14 items-center border-b border-border bg-card px-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
>
  <!-- Left section -->
  <div class="flex flex-1 items-center gap-2">
    <!-- Left sidebar toggle -->
    <button
      onclick={toggleLeftSidebar}
      class="rounded-lg p-1.5 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
        {sidebarState.leftOpen
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}"
      title={sidebarState.leftOpen ? 'Close sidebar' : 'Open sidebar'}
    >
      <PanelLeft
        class="size-[18px] transition-transform duration-200 {sidebarState.leftOpen
          ? ''
          : '-scale-x-100'}"
      />
    </button>

    <div class="h-4 w-px bg-border"></div>

    <!-- Logo with text -->
    <Logo variant="full" size="md" />

    <div class="hidden sm:block ml-2">
      <DateNavigator />
    </div>
  </div>

  <!-- Center: Logo (animated on load) -->
  <div class="flex items-center justify-center">
    <Logo animate={isLoading} size="md" />
  </div>

  <!-- Right section -->

  <div class="flex flex-1 items-center justify-end gap-3">
    <!-- Refresh status -->
    <div class="flex items-center gap-1.5">
      {#if lastFetched}
        {#key `${lastFetched.getTime()}-${timeTick}`}
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger class="inline-flex">
                <span
                  class="inline-flex items-center justify-center h-5 px-2 text-[10px] font-medium rounded-full bg-muted text-muted-foreground whitespace-nowrap cursor-default"
                >
                  {formatRelativeTime(lastFetched)}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" sideOffset={4}>
                {formatDateTime(timeEntriesState.lastFetched!)}
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        {/key}
      {/if}
      <button
        onclick={handleRefresh}
        disabled={isLoading}
        class="inline-flex items-center justify-center size-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150
          focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="Refresh data"
      >
        <RefreshCw class="size-3.5 {isLoading ? 'animate-spin' : ''}" />
      </button>
    </div>

    <div class="h-5 w-px bg-border"></div>

    <!-- Timer -->
    <MiniTimer />

    <!-- Right sidebar toggle (Favorites) -->
    <button
      onclick={toggleRightSidebar}
      class="rounded-lg p-1.5 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
        {sidebarState.rightOpen
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}"
      title="Favorites"
    >
      <Star class="size-[18px]" />
    </button>

    <ConnectionManager>
      <button
        class="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 hover:bg-accent transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="Manage connections"
      >
        <ServiceStatusDot service="moco" />
        <ServiceStatusDot service="jira" />
        <ServiceStatusDot service="outlook" />
        <ServiceStatusDot service="personio" />
      </button>
    </ConnectionManager>

    <SettingsModal>
      <button
        class="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="Settings"
      >
        <Settings class="size-[18px]" />
      </button>
    </SettingsModal>
  </div>
</header>
