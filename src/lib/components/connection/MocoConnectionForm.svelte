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
        placeholder="company"
        maxlength={63}
        pattern="[a-zA-Z0-9][a-zA-Z0-9-]*"
        aria-describedby={connectionsState.moco.error ? 'moco-form-error' : undefined}
        class="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
      />
      <span class="text-sm text-muted-foreground">.mocoapp.com</span>
    </div>
  </div>

  <div>
    <label for="moco-api-key" class="block text-sm font-medium text-foreground mb-1">
      API Key
    </label>
    <input
      id="moco-api-key"
      type="password"
      bind:value={apiKey}
      placeholder="API key from your Moco profile"
      maxlength={256}
      aria-describedby={connectionsState.moco.error ? 'moco-form-error' : undefined}
      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    />
    <p class="mt-1 text-xs text-muted-foreground">Found under Profile &rarr; Integrations</p>
  </div>

  {#if connectionsState.moco.error}
    <p id="moco-form-error" role="alert" class="text-sm text-[var(--ds-text-danger)]">
      {connectionsState.moco.error}
    </p>
  {/if}

  <button
    type="submit"
    disabled={connectionsState.moco.isConnecting || !domain.trim() || !apiKey.trim()}
    class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
  >
    {connectionsState.moco.isConnecting ? 'Connecting...' : 'Connect'}
  </button>
</form>
