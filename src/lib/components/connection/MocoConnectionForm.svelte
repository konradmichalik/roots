<script lang="ts">
  import { connectMoco } from '../../stores/connections.svelte';
  import { connectionsState } from '../../stores/connections.svelte';

  let domain = $state('');
  let apiKey = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!domain.trim() || !apiKey.trim()) return;

    await connectMoco({
      domain: domain.trim(),
      apiKey: apiKey.trim()
    });
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <div>
    <label for="moco-domain" class="block text-sm font-medium text-foreground mb-1">
      Moco Domain
    </label>
    <div class="flex items-center gap-1">
      <input
        id="moco-domain"
        type="text"
        bind:value={domain}
        placeholder="firma"
        class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <span class="text-sm text-muted-foreground">.mocoapp.com</span>
    </div>
  </div>

  <div>
    <label for="moco-api-key" class="block text-sm font-medium text-foreground mb-1">
      API-Schluessel
    </label>
    <input
      id="moco-api-key"
      type="password"
      bind:value={apiKey}
      placeholder="API Key aus deinem Moco-Profil"
      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
    <p class="mt-1 text-xs text-muted-foreground">
      Zu finden unter Profil &rarr; Integrationen
    </p>
  </div>

  {#if connectionsState.moco.error}
    <p class="text-sm text-red-500">{connectionsState.moco.error}</p>
  {/if}

  <button
    type="submit"
    disabled={connectionsState.moco.isConnecting || !domain.trim() || !apiKey.trim()}
    class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {connectionsState.moco.isConnecting ? 'Verbinde...' : 'Verbinden'}
  </button>
</form>
