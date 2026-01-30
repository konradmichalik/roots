<script lang="ts">
  import MocoConnectionForm from '../connection/MocoConnectionForm.svelte';
  import JiraConnectionForm from '../connection/JiraConnectionForm.svelte';
  import OutlookConnectionForm from '../connection/OutlookConnectionForm.svelte';
  import ThemeToggle from '../common/ThemeToggle.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { disconnectMoco, disconnectJira, disconnectOutlook } from '../../stores/connections.svelte';
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-8">
  <div class="w-full max-w-md">
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold text-foreground">Roots</h1>
      <p class="mt-2 text-muted-foreground">
        Verbinde deine Zeiterfassung, um loszulegen.
      </p>
    </div>

    <!-- Moco -->
    <div class="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full" style="background-color: #10B981"></div>
          <h2 class="text-lg font-semibold text-foreground">Moco</h2>
        </div>
        {#if connectionsState.moco.isConnected}
          <button
            onclick={() => disconnectMoco()}
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Trennen
          </button>
        {:else}
          <span class="text-xs text-muted-foreground">Empfohlen als erstes</span>
        {/if}
      </div>

      {#if connectionsState.moco.isConnected}
        <p class="text-sm text-green-600 dark:text-green-400">Verbunden</p>
      {:else}
        <MocoConnectionForm />
      {/if}
    </div>

    <!-- Jira -->
    <div class="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full" style="background-color: #3B82F6"></div>
          <h2 class="text-lg font-semibold text-foreground">Jira</h2>
        </div>
        {#if connectionsState.jira.isConnected}
          <button
            onclick={() => disconnectJira()}
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Trennen
          </button>
        {:else}
          <span class="text-xs text-muted-foreground">Worklogs</span>
        {/if}
      </div>

      {#if connectionsState.jira.isConnected}
        <p class="text-sm text-green-600 dark:text-green-400">Verbunden</p>
      {:else}
        <JiraConnectionForm />
      {/if}
    </div>

    <!-- Outlook -->
    <div class="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full" style="background-color: #8B5CF6"></div>
          <h2 class="text-lg font-semibold text-foreground">Outlook</h2>
        </div>
        {#if connectionsState.outlook.isConnected}
          <button
            onclick={() => disconnectOutlook()}
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Trennen
          </button>
        {:else}
          <span class="text-xs text-muted-foreground">Kalender</span>
        {/if}
      </div>

      {#if connectionsState.outlook.isConnected}
        <p class="text-sm text-green-600 dark:text-green-400">Verbunden</p>
      {:else}
        <OutlookConnectionForm />
      {/if}
    </div>

    <!-- Future services -->
    <div class="mt-4 space-y-3">
      <div class="rounded-lg border border-border bg-card/50 p-4 opacity-50">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-muted-foreground/30"></div>
          <span class="text-sm font-medium text-muted-foreground">Personio</span>
          <span class="ml-auto text-xs text-muted-foreground">Bald verfuegbar</span>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-center">
      <ThemeToggle />
    </div>
  </div>
</div>
