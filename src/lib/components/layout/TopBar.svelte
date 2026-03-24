<script lang="ts">
  import DateNavigator from './DateNavigator.svelte';
  import ServiceStatusDot from '../common/ServiceStatusDot.svelte';
  import ConnectionManager from '../connection/ConnectionManager.svelte';
  import SettingsModal from '../settings/SettingsModal.svelte';
  import AboutModal from '../common/AboutModal.svelte';
  import Logo from '../common/Logo.svelte';
  import MiniTimer from '../timer/MiniTimer.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { sidebarState, toggleLeftSidebar, toggleRightSidebar } from '../../stores/sidebar.svelte';
  import {
    isAnyLoading,
    timeEntriesState,
    refreshDayEntries,
    getOpenHoursDays
  } from '../../stores/timeEntries.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { formatRelativeTime, formatDateTime } from '../../utils/date-helpers';
  import RulesModal from '../rules/RulesModal.svelte';
  import { getStaleRules } from '../../stores/rules.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { isTauri } from '../../utils/storage';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import PanelLeft from '@lucide/svelte/icons/panel-left';
  import Star from '@lucide/svelte/icons/star';
  import Zap from '@lucide/svelte/icons/zap';
  import Settings from '@lucide/svelte/icons/settings';
  import CircleHelp from '@lucide/svelte/icons/circle-help';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';

  const isDesktop = isTauri();

  let showRules = $derived(connectionsState.moco.isConnected);
  let staleCount = $derived(getStaleRules().length);

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

  // Count open hours days across all cached months
  let openHoursCount = $derived(getOpenHoursDays().length);

  function handleRefresh(): void {
    refreshDayEntries(dateNavState.selectedDate);
  }

  const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [data-no-drag]';

  function handleMouseDown(e: MouseEvent): void {
    if (!isDesktop) return;
    const target = e.target as HTMLElement;
    if (target.closest(INTERACTIVE)) return;
    getCurrentWindow().startDragging();
  }
</script>

<header
  onmousedown={handleMouseDown}
  role="none"
  class="flex h-14 items-center border-b border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]"
  style:padding-left={isDesktop ? '80px' : '20px'}
  style:padding-right="20px"
>
  <!-- Left section -->
  <div class="flex flex-1 items-center gap-2">
    <!-- Left sidebar toggle -->
    <button
      onclick={toggleLeftSidebar}
      class="relative rounded-lg p-1.5 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
        {sidebarState.leftOpen
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}"
      title={sidebarState.leftOpen ? 'Close sidebar' : 'Open sidebar'}
      aria-label={sidebarState.leftOpen ? 'Close sidebar' : 'Open sidebar'}
    >
      <PanelLeft
        class="size-[18px] transition-transform duration-200 {sidebarState.leftOpen
          ? ''
          : '-scale-x-100'}"
      />
      {#if openHoursCount > 0 && !sidebarState.leftOpen}
        <span
          class="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-warning border-2 border-card"
          aria-label="{openHoursCount} days with open hours"
        ></span>
      {/if}
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
                {formatDateTime(timeEntriesState.lastFetched ?? '')}
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
        aria-label="Refresh data"
      >
        <RefreshCw class="size-3.5 {isLoading ? 'animate-spin' : ''}" />
      </button>
    </div>

    <div class="h-5 w-px bg-border"></div>

    <!-- Timer -->
    <MiniTimer />

    <!-- Rules -->
    {#if showRules}
      <RulesModal>
        <button
          class="relative rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground
            transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          title="Rules"
          aria-label="Rules"
        >
          <Zap class="size-[18px]" />
          {#if staleCount > 0}
            <span
              class="absolute -top-0.5 -right-0.5 flex items-center justify-center h-3.5 min-w-3.5 px-0.5 rounded-full bg-warning text-[8px] font-bold text-warning-foreground"
            >
              {staleCount}
            </span>
          {/if}
        </button>
      </RulesModal>
    {/if}

    <!-- Right sidebar toggle (Favorites) -->
    <button
      onclick={toggleRightSidebar}
      class="rounded-lg p-1.5 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
        {sidebarState.rightOpen
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}"
      title="Favorites"
      aria-label={sidebarState.rightOpen ? 'Close favorites' : 'Open favorites'}
    >
      <Star class="size-[18px]" />
    </button>

    <div class="h-5 w-px bg-border"></div>

    <ConnectionManager>
      <button
        class="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 hover:bg-muted transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="Manage connections"
      >
        <ServiceStatusDot service="moco" />
        <ServiceStatusDot service="jira" />
        <ServiceStatusDot service="outlook" />
        <ServiceStatusDot service="personio" />
      </button>
    </ConnectionManager>

    <AboutModal>
      <button
        class="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="About Roots"
        aria-label="About Roots"
      >
        <CircleHelp class="size-[18px]" />
      </button>
    </AboutModal>

    <SettingsModal>
      <button
        class="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="Settings"
        aria-label="Settings"
      >
        <Settings class="size-[18px]" />
      </button>
    </SettingsModal>
  </div>
</header>
