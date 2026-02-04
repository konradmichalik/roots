<script lang="ts">
  import type { ServiceType } from '../../types';
  import { connectionsState } from '../../stores/connections.svelte';
  import { getSourceColor } from '../../stores/settings.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';

  let { service }: { service: ServiceType } = $props();

  const labels: Record<ServiceType, string> = {
    moco: 'Moco',
    jira: 'Jira',
    outlook: 'Outlook'
  };

  let isConnected = $derived(connectionsState[service].isConnected);
</script>

<Tooltip.Provider delayDuration={200}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <div class="relative flex items-center justify-center">
        <div
          class="h-2 w-2 rounded-full transition-all duration-200 {isConnected ? '' : 'opacity-30'}"
          style="background-color: {isConnected ? getSourceColor(service) : 'var(--ds-border-bold)'}"
        ></div>
      </div>
    </Tooltip.Trigger>
    <Tooltip.Content side="bottom" sideOffset={4}>
      <div class="flex items-center gap-1.5">
        <div
          class="h-2 w-2 rounded-full"
          style="background-color: {isConnected ? getSourceColor(service) : 'var(--ds-border-bold)'}"
        ></div>
        <span class="font-medium">{labels[service]}</span>
        <span class="text-muted-foreground">·</span>
        <span class="{isConnected ? 'text-success-text' : 'text-muted-foreground'}">
          {isConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
