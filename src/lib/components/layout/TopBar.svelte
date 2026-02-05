<script lang="ts">
  import DateNavigator from './DateNavigator.svelte';
  import ThemeToggle from '../common/ThemeToggle.svelte';
  import ServiceStatusDot from '../common/ServiceStatusDot.svelte';
  import ConnectionManager from '../connection/ConnectionManager.svelte';
  import SettingsModal from '../settings/SettingsModal.svelte';
  import Logo from '../common/Logo.svelte';
  import MiniTimer from '../timer/MiniTimer.svelte';
  import { sidebarState, toggleLeftSidebar, toggleRightSidebar } from '../../stores/sidebar.svelte';
  import { isAnyLoading } from '../../stores/timeEntries.svelte';

  let isLoading = $derived(isAnyLoading());
</script>

<header
  class="flex h-14 items-center border-b border-border bg-card px-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
>
  <!-- Left section -->
  <div class="flex flex-1 items-center gap-4">
    <!-- Logo with text -->
    <Logo variant="full" size="md" />
    <!-- Left sidebar toggle -->
    <button
      onclick={toggleLeftSidebar}
      class="rounded-lg p-1.5 transition-all duration-150
        {sidebarState.leftOpen
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}"
      title="Calendar"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line
          x1="16"
          x2="16"
          y1="2"
          y2="6"
        /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    </button>
    <div class="hidden sm:block">
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
      class="rounded-lg p-1.5 transition-all duration-150
        {sidebarState.rightOpen
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}"
      title="Favorites"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-[18px] w-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        />
      </svg>
    </button>

    <ConnectionManager>
      <button
        class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-accent transition-all duration-150"
        title="Manage connections"
      >
        <ServiceStatusDot service="moco" />
        <ServiceStatusDot service="jira" />
        <ServiceStatusDot service="outlook" />
      </button>
    </ConnectionManager>

    <SettingsModal>
      <button
        class="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all duration-150"
        title="Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </SettingsModal>

    <ThemeToggle />
  </div>
</header>
