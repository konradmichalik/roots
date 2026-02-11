<script lang="ts">
  import { connectPersonio } from '../../stores/connections.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../../utils/storage';
  import type { PersonioConnectionConfig } from '../../types';

  let clientId = $state('');
  let clientSecret = $state('');
  let email = $state('');
  let loaded = $state(false);

  // Restore saved credentials
  $effect(() => {
    if (loaded) return;
    getStorageItemAsync<PersonioConnectionConfig>(STORAGE_KEYS.PERSONIO_CONFIG).then((config) => {
      if (config) {
        clientId = config.clientId;
        clientSecret = config.clientSecret;
        email = config.email;
      }
      loaded = true;
    });
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim() || !email.trim()) return;

    const config: PersonioConnectionConfig = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      email: email.trim()
    };

    // Save credentials regardless of connection result
    saveStorage(STORAGE_KEYS.PERSONIO_CONFIG, config);

    await connectPersonio(config);
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <div>
    <label for="personio-client-id" class="block text-sm font-medium text-foreground mb-1">
      Client ID
    </label>
    <input
      id="personio-client-id"
      type="text"
      bind:value={clientId}
      placeholder="Personio API Client ID"
      maxlength={256}
      aria-describedby={connectionsState.personio.error ? 'personio-form-error' : undefined}
      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    />
  </div>

  <div>
    <label for="personio-client-secret" class="block text-sm font-medium text-foreground mb-1">
      Client Secret
    </label>
    <input
      id="personio-client-secret"
      type="password"
      bind:value={clientSecret}
      placeholder="Personio API Client Secret"
      maxlength={256}
      aria-describedby={connectionsState.personio.error ? 'personio-form-error' : undefined}
      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    />
  </div>

  <div>
    <label for="personio-email" class="block text-sm font-medium text-foreground mb-1">
      Email
    </label>
    <input
      id="personio-email"
      type="email"
      bind:value={email}
      placeholder="Your email in Personio"
      maxlength={254}
      aria-describedby={connectionsState.personio.error ? 'personio-form-error' : undefined}
      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    />
    <p class="mt-1 text-xs text-muted-foreground">
      Must match your Personio employee email
    </p>
  </div>

  {#if connectionsState.personio.error}
    <p id="personio-form-error" role="alert" class="text-sm text-[var(--ds-text-danger)]">{connectionsState.personio.error}</p>
  {/if}

  <button
    type="submit"
    disabled={connectionsState.personio.isConnecting || !clientId.trim() || !clientSecret.trim() || !email.trim()}
    class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
  >
    {connectionsState.personio.isConnecting ? 'Connecting...' : 'Connect'}
  </button>
</form>
