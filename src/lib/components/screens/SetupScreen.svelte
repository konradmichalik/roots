<script lang="ts">
  import MocoConnectionForm from '../connection/MocoConnectionForm.svelte';
  import ThemeToggle from '../common/ThemeToggle.svelte';
  import { connectionsState, disconnectMoco } from '../../stores/connections.svelte';
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-8 animate-fade-in">
  <div class="w-full max-w-md">
    <div class="mb-8 flex flex-col items-center gap-4">
      <img src="/images/roots-logo-sm.svg" alt="roots logo" class="h-14 w-14" />
      <div class="text-center">
        <h1 class="text-3xl font-bold text-foreground tracking-tight">roots</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">
          Connect Moco to get started. You can add Jira, Outlook and Personio later in the settings.
        </p>
      </div>
    </div>

    <!-- Moco -->
    <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img
            src="/logos/moco.svg"
            alt="Moco"
            class="h-5 w-auto opacity-40 grayscale dark:invert dark:opacity-30"
          />
          <h2 class="text-lg font-semibold text-foreground">Moco</h2>
        </div>
        {#if connectionsState.moco.isConnected}
          <button
            onclick={() => disconnectMoco()}
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Disconnect
          </button>
        {/if}
      </div>

      {#if connectionsState.moco.isConnected}
        <p class="text-sm text-success-text">Connected</p>
      {:else}
        <MocoConnectionForm />
      {/if}
    </div>

    <div class="mt-6 flex justify-center">
      <ThemeToggle />
    </div>
  </div>
</div>
