<script lang="ts">
  import DateNavigator from './DateNavigator.svelte';
  import ViewSwitcher from './ViewSwitcher.svelte';
  import ThemeToggle from '../common/ThemeToggle.svelte';
  import ServiceStatusDot from '../common/ServiceStatusDot.svelte';
  import ConnectionManager from '../connection/ConnectionManager.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { reconciliationState, toggleReconciliation } from '../../stores/reconciliation.svelte';
</script>

<header class="flex h-14 items-center justify-between border-b border-border bg-card px-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
  <div class="flex items-center gap-4">
    <h1 class="text-lg font-bold text-foreground tracking-tight">Roots</h1>
    <div class="hidden sm:block">
      <DateNavigator />
    </div>
  </div>

  <div class="flex items-center gap-3">
    <ViewSwitcher />

    {#if connectionsState.moco.isConnected && connectionsState.jira.isConnected}
      <button
        onclick={toggleReconciliation}
        class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150
          {reconciliationState.isOpen
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}"
        title="Moco-Jira Abgleich"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" />
        </svg>
        Abgleich
      </button>
    {/if}

    <ConnectionManager>
      <button
        class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-accent transition-all duration-150"
        title="Verbindungen verwalten"
      >
        <ServiceStatusDot service="moco" />
        <ServiceStatusDot service="jira" />
        <ServiceStatusDot service="outlook" />
        <ServiceStatusDot service="personio" />
      </button>
    </ConnectionManager>

    <ThemeToggle />
  </div>
</header>
