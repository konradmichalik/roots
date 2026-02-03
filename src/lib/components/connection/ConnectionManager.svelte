<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import MocoConnectionForm from './MocoConnectionForm.svelte';
  import JiraConnectionForm from './JiraConnectionForm.svelte';
  import OutlookConnectionForm from './OutlookConnectionForm.svelte';
  import { connectionsState, disconnectMoco, disconnectJira, disconnectOutlook } from '../../stores/connections.svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#if children}
      {@render children()}
    {/if}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Connections</Dialog.Title>
      <Dialog.Description>Connect and manage services.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6 py-4">
      <!-- Moco -->
      <div class="rounded-xl border border-border p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-source-moco"></div>
            <h3 class="font-semibold text-foreground">Moco</h3>
          </div>
          {#if connectionsState.moco.isConnected}
            <div class="flex items-center gap-2">
              <span class="text-xs text-success-text">Connected</span>
              <button
                onclick={() => disconnectMoco()}
                class="text-xs text-muted-foreground hover:text-danger-text transition-colors"
              >
                Disconnect
              </button>
            </div>
          {/if}
        </div>
        {#if !connectionsState.moco.isConnected}
          <MocoConnectionForm />
        {/if}
      </div>

      <!-- Jira -->
      <div class="rounded-xl border border-border p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-source-jira"></div>
            <h3 class="font-semibold text-foreground">Jira</h3>
          </div>
          {#if connectionsState.jira.isConnected}
            <div class="flex items-center gap-2">
              <span class="text-xs text-success-text">Connected</span>
              <button
                onclick={() => disconnectJira()}
                class="text-xs text-muted-foreground hover:text-danger-text transition-colors"
              >
                Disconnect
              </button>
            </div>
          {/if}
        </div>
        {#if !connectionsState.jira.isConnected}
          <JiraConnectionForm />
        {/if}
      </div>

      <!-- Outlook -->
      <div class="rounded-xl border border-border p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-source-outlook"></div>
            <h3 class="font-semibold text-foreground">Outlook</h3>
          </div>
          {#if connectionsState.outlook.isConnected}
            <div class="flex items-center gap-2">
              <span class="text-xs text-success-text">Connected</span>
              <button
                onclick={() => disconnectOutlook()}
                class="text-xs text-muted-foreground hover:text-danger-text transition-colors"
              >
                Disconnect
              </button>
            </div>
          {/if}
        </div>
        {#if !connectionsState.outlook.isConnected}
          <OutlookConnectionForm />
        {/if}
      </div>

    </div>
  </Dialog.Content>
</Dialog.Root>
