<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import MocoConnectionForm from './MocoConnectionForm.svelte';
  import JiraConnectionForm from './JiraConnectionForm.svelte';
  import OutlookConnectionForm from './OutlookConnectionForm.svelte';
  import { connectionsState, disconnectMoco, disconnectJira, disconnectOutlook } from '../../stores/connections.svelte';
  import { getSourceColor } from '../../stores/settings.svelte';
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
      <Dialog.Title>Verbindungen</Dialog.Title>
      <Dialog.Description>Services verbinden und verwalten.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6 py-4">
      <!-- Moco -->
      <div class="rounded-xl border border-border p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="h-3 w-3 rounded-full" style="background-color: {getSourceColor('moco')}"></div>
            <h3 class="font-semibold text-foreground">Moco</h3>
          </div>
          {#if connectionsState.moco.isConnected}
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-600 dark:text-green-400">Verbunden</span>
              <button
                onclick={() => disconnectMoco()}
                class="text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                Trennen
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
            <div class="h-3 w-3 rounded-full" style="background-color: {getSourceColor('jira')}"></div>
            <h3 class="font-semibold text-foreground">Jira</h3>
          </div>
          {#if connectionsState.jira.isConnected}
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-600 dark:text-green-400">Verbunden</span>
              <button
                onclick={() => disconnectJira()}
                class="text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                Trennen
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
            <div class="h-3 w-3 rounded-full" style="background-color: {getSourceColor('outlook')}"></div>
            <h3 class="font-semibold text-foreground">Outlook</h3>
          </div>
          {#if connectionsState.outlook.isConnected}
            <div class="flex items-center gap-2">
              <span class="text-xs text-green-600 dark:text-green-400">Verbunden</span>
              <button
                onclick={() => disconnectOutlook()}
                class="text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                Trennen
              </button>
            </div>
          {/if}
        </div>
        {#if !connectionsState.outlook.isConnected}
          <OutlookConnectionForm />
        {/if}
      </div>

      <!-- Future services -->
      <div class="rounded-xl border border-border p-4 opacity-50">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-muted-foreground/30"></div>
          <span class="font-semibold text-muted-foreground">Personio</span>
          <span class="ml-auto text-xs text-muted-foreground">Bald verfuegbar</span>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
