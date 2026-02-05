<script lang="ts">
  import DateNavigator from './DateNavigator.svelte';
  import ServiceStatusDot from '../common/ServiceStatusDot.svelte';
  import ConnectionManager from '../connection/ConnectionManager.svelte';
  import SettingsModal from '../settings/SettingsModal.svelte';
  import Logo from '../common/Logo.svelte';
  import MiniTimer from '../timer/MiniTimer.svelte';
  import { sidebarState, toggleLeftSidebar, toggleRightSidebar } from '../../stores/sidebar.svelte';
  import { isAnyLoading } from '../../stores/timeEntries.svelte';
  import PanelLeft from '@lucide/svelte/icons/panel-left';
  import Star from '@lucide/svelte/icons/star';
  import Settings from '@lucide/svelte/icons/settings';

  let isLoading = $derived(isAnyLoading());
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
