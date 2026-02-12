<script lang="ts">
  import {
    connectionsState,
    reauthenticateOutlook,
    disconnectOutlook
  } from '../../stores/connections.svelte';
  import { startOAuthFlow } from '../../api/oauth-manager';
  import type { OutlookConnectionConfig } from '../../types';

  let clientId = $state('');
  let tenantId = $state('');

  let isValid = $derived(clientId.trim().length > 0 && tenantId.trim().length > 0);

  function handleLogin() {
    if (!isValid) return;

    const config: OutlookConnectionConfig = {
      clientId: clientId.trim(),
      tenantId: tenantId.trim(),
      redirectUri: window.location.origin
    };

    startOAuthFlow(config);
  }

  function handleReauth() {
    reauthenticateOutlook();
  }

  function handleRemove() {
    disconnectOutlook();
  }
</script>

{#if connectionsState.outlook.needsReauth}
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">Session expired. Sign in again to reconnect.</p>

    {#if connectionsState.outlook.error}
      <p class="text-sm text-[var(--ds-text-danger)]">{connectionsState.outlook.error}</p>
    {/if}

    <button
      type="button"
      onclick={handleReauth}
      disabled={connectionsState.outlook.isConnecting}
      class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
    >
      {connectionsState.outlook.isConnecting ? 'Connecting...' : 'Sign in again'}
    </button>

    <button
      type="button"
      onclick={handleRemove}
      class="w-full text-xs text-muted-foreground hover:text-danger-text transition-colors"
    >
      Remove connection
    </button>
  </div>
{:else}
  <div class="space-y-4">
    <div>
      <label for="outlook-client-id" class="block text-sm font-medium text-foreground mb-1">
        Application (Client) ID
      </label>
      <input
        id="outlook-client-id"
        type="text"
        bind:value={clientId}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        maxlength={36}
        pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        aria-describedby={connectionsState.outlook.error ? 'outlook-form-error' : undefined}
        class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
      />
    </div>

    <div>
      <label for="outlook-tenant-id" class="block text-sm font-medium text-foreground mb-1">
        Directory (Tenant) ID
      </label>
      <input
        id="outlook-tenant-id"
        type="text"
        bind:value={tenantId}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        maxlength={36}
        pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        aria-describedby={connectionsState.outlook.error ? 'outlook-form-error' : undefined}
        class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
      />
      <p class="mt-1 text-xs text-muted-foreground">
        Azure Portal &rarr; App registrations &rarr; Your app
      </p>
    </div>

    {#if connectionsState.outlook.error}
      <p id="outlook-form-error" role="alert" class="text-sm text-[var(--ds-text-danger)]">
        {connectionsState.outlook.error}
      </p>
    {/if}

    <button
      type="button"
      onclick={handleLogin}
      disabled={connectionsState.outlook.isConnecting || !isValid}
      class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
    >
      {connectionsState.outlook.isConnecting ? 'Connecting...' : 'Sign in with Microsoft'}
    </button>
  </div>
{/if}
