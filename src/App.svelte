<script lang="ts">
  import './app.css';
  import SetupScreen from './lib/components/screens/SetupScreen.svelte';
  import MainLayout from './lib/components/layout/MainLayout.svelte';
  import AppLoader from './lib/components/common/AppLoader.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import {
    connectionsState,
    initializeConnections,
    hasAnyServiceConfigured,
    handleOutlookCallback
  } from './lib/stores/connections.svelte';
  import { initializeTheme, cleanupTheme } from './lib/stores/theme.svelte';
  import { initializeDateNavigation, dateNavState } from './lib/stores/dateNavigation.svelte';
  import { formatDateLong } from './lib/utils/date-helpers';
  import { initializeTimeEntries } from './lib/stores/timeEntries.svelte';
  import { initializePresences } from './lib/stores/presences.svelte';
  import { initializeSettings } from './lib/stores/settings.svelte';
  import { initializeAbsences } from './lib/stores/absences.svelte';
  import { initializeFavorites } from './lib/stores/favorites.svelte';
  import { initializeRecentPairs } from './lib/stores/recentMocoPairs.svelte';
  import { initializeSidebar } from './lib/stores/sidebar.svelte';
  import { initializeTimer } from './lib/stores/timer.svelte';
  import { detectOAuthCallback, clearOAuthCallbackFromUrl } from './lib/api/oauth-manager';
  import { logger } from './lib/utils/logger';
  import { onMount } from 'svelte';

  let isInitializing = $state(true);

  // Update document title based on selected date
  $effect(() => {
    document.title = `roots - ${formatDateLong(dateNavState.selectedDate)}`;
  });

  onMount(() => {
    async function initialize() {
      try {
        await initializeTheme();

        await initializeSettings();
        await initializeAbsences();
        await initializeFavorites();
        await initializeRecentPairs();
        await initializeTimer();
        initializeDateNavigation();
        initializeSidebar();
        await initializePresences();
        await initializeTimeEntries();

        // Check for OAuth callback before restoring connections
        const oauthCallback = detectOAuthCallback();
        if (oauthCallback) {
          logger.info('OAuth callback detected, exchanging code for tokens');
          clearOAuthCallbackFromUrl();
          await handleOutlookCallback(oauthCallback.code);
        }

        await initializeConnections();
      } finally {
        setTimeout(() => {
          isInitializing = false;
        }, 300);
      }
    }

    initialize();

    return () => {
      cleanupTheme();
    };
  });
</script>

<Tooltip.Provider>
  {#if isInitializing}
    <AppLoader />
  {:else if hasAnyServiceConfigured()}
    <div class="animate-fade-in">
      <MainLayout />
    </div>
  {:else}
    <div class="animate-fade-in">
      <SetupScreen />
    </div>
  {/if}
</Tooltip.Provider>
