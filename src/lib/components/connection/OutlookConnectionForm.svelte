<script lang="ts">
  import { connectionsState } from '../../stores/connections.svelte';
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
</script>

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
      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
    <p class="mt-1 text-xs text-muted-foreground">
      Azure Portal &rarr; App registrations &rarr; Deine App
    </p>
  </div>

  {#if connectionsState.outlook.error}
    <p class="text-sm text-red-500">{connectionsState.outlook.error}</p>
  {/if}

  <button
    type="button"
    onclick={handleLogin}
    disabled={connectionsState.outlook.isConnecting || !isValid}
    class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {connectionsState.outlook.isConnecting ? 'Verbinde...' : 'Mit Microsoft anmelden'}
  </button>
</div>
