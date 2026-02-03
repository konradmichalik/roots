<script lang="ts">
  import type { ServiceType } from '../../types';
  import { connectionsState } from '../../stores/connections.svelte';
  import { getSourceColor } from '../../stores/settings.svelte';

  let { service }: { service: ServiceType } = $props();

  const labels: Record<ServiceType, string> = {
    moco: 'Moco',
    jira: 'Jira',
    outlook: 'Outlook'
  };

  let isConnected = $derived(connectionsState[service].isConnected);
</script>

<div
  class="relative flex items-center justify-center"
  title="{labels[service]}: {isConnected ? 'Connected' : 'Not connected'}"
>
  <div
    class="h-2 w-2 rounded-full transition-all duration-200 {isConnected ? '' : 'opacity-30'}"
    style="background-color: {isConnected ? getSourceColor(service) : 'var(--ds-border-bold)'}"
  ></div>
</div>
