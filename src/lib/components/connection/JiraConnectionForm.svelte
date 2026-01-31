<script lang="ts">
  import { connectJira } from '../../stores/connections.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import type { JiraConnectionConfig } from '../../types';

  let instanceType = $state<'cloud' | 'server'>('cloud');
  let baseUrl = $state('');
  let email = $state('');
  let apiToken = $state('');
  let authMethod = $state<'pat' | 'basic'>('pat');
  let username = $state('');
  let password = $state('');
  let personalAccessToken = $state('');

  function detectInstanceType(url: string): void {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      if (parsed.hostname.endsWith('.atlassian.net')) {
        instanceType = 'cloud';
      }
    } catch {
      // ignore invalid URLs during typing
    }
  }

  function handleUrlInput() {
    detectInstanceType(baseUrl);
  }

  let isValid = $derived(() => {
    if (!baseUrl.trim()) return false;
    if (instanceType === 'cloud') {
      return !!email.trim() && !!apiToken.trim();
    }
    if (authMethod === 'pat') {
      return !!personalAccessToken.trim();
    }
    return !!username.trim() && !!password.trim();
  });

  function buildConfig(): JiraConnectionConfig {
    let url = baseUrl.trim().replace(/\/$/, '');
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }

    if (instanceType === 'cloud') {
      return {
        instanceType: 'cloud',
        baseUrl: url,
        credentials: {
          type: 'cloud',
          email: email.trim(),
          apiToken: apiToken.trim()
        }
      };
    }

    return {
      instanceType: 'server',
      baseUrl: url,
      credentials: {
        type: 'server',
        authMethod,
        username: authMethod === 'basic' ? username.trim() : undefined,
        password: authMethod === 'basic' ? password.trim() : undefined,
        personalAccessToken: authMethod === 'pat' ? personalAccessToken.trim() : undefined
      }
    };
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!isValid()) return;
    await connectJira(buildConfig());
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <!-- Instance Type -->
  <div class="flex gap-4">
    <label class="flex items-center gap-1.5 text-sm cursor-pointer">
      <input type="radio" bind:group={instanceType} value="cloud" class="accent-primary" />
      Cloud
    </label>
    <label class="flex items-center gap-1.5 text-sm cursor-pointer">
      <input type="radio" bind:group={instanceType} value="server" class="accent-primary" />
      Server / Data Center
    </label>
  </div>

  <!-- Base URL -->
  <div>
    <label for="jira-url" class="block text-sm font-medium text-foreground mb-1">
      {instanceType === 'cloud' ? 'Atlassian URL' : 'Server URL'}
    </label>
    <input
      id="jira-url"
      type="text"
      bind:value={baseUrl}
      oninput={handleUrlInput}
      placeholder={instanceType === 'cloud' ? 'company.atlassian.net' : 'https://jira.company.com'}
      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    />
  </div>

  <!-- Cloud credentials -->
  {#if instanceType === 'cloud'}
    <div>
      <label for="jira-email" class="block text-sm font-medium text-foreground mb-1">
        E-Mail
      </label>
      <input
        id="jira-email"
        type="email"
        bind:value={email}
        placeholder="name@company.com"
        class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
      />
    </div>

    <div>
      <label for="jira-token" class="block text-sm font-medium text-foreground mb-1">
        API Token
      </label>
      <input
        id="jira-token"
        type="password"
        bind:value={apiToken}
        placeholder="Atlassian API Token"
        class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
      />
      <p class="mt-1 text-xs text-muted-foreground">
        <a
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          target="_blank"
          rel="noopener"
          class="underline hover:text-foreground"
        >
          Create API Token
        </a>
      </p>
    </div>

  <!-- Server / DC credentials -->
  {:else}
    <div class="flex gap-4">
      <label class="flex items-center gap-1.5 text-sm cursor-pointer">
        <input type="radio" bind:group={authMethod} value="pat" class="accent-primary" />
        Personal Access Token
      </label>
      <label class="flex items-center gap-1.5 text-sm cursor-pointer">
        <input type="radio" bind:group={authMethod} value="basic" class="accent-primary" />
        Basic Auth
      </label>
    </div>

    {#if authMethod === 'pat'}
      <div>
        <label for="jira-pat" class="block text-sm font-medium text-foreground mb-1">
          Personal Access Token
        </label>
        <input
          id="jira-pat"
          type="password"
          bind:value={personalAccessToken}
          placeholder="PAT from Jira profile"
          class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
        />
      </div>
    {:else}
      <div>
        <label for="jira-user" class="block text-sm font-medium text-foreground mb-1">
          Username
        </label>
        <input
          id="jira-user"
          type="text"
          bind:value={username}
          placeholder="Username"
          class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
        />
      </div>
      <div>
        <label for="jira-pass" class="block text-sm font-medium text-foreground mb-1">
          Password
        </label>
        <input
          id="jira-pass"
          type="password"
          bind:value={password}
          placeholder="Password"
          class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
        />
      </div>
    {/if}
  {/if}

  {#if connectionsState.jira.error}
    <p class="text-sm text-[var(--ds-text-danger)]">{connectionsState.jira.error}</p>
  {/if}

  <button
    type="submit"
    disabled={connectionsState.jira.isConnecting || !isValid()}
    class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
  >
    {connectionsState.jira.isConnecting ? 'Connecting...' : 'Connect'}
  </button>
</form>
