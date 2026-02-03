<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import WeekdayHoursForm from './WeekdayHoursForm.svelte';
  import { autoRefreshState, setAutoRefreshInterval, AUTO_REFRESH_OPTIONS, type AutoRefreshInterval } from '../../stores/autoRefresh.svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
  let open = $state(false);

  function handleAutoRefreshChange(value: AutoRefreshInterval): void {
    setAutoRefreshInterval(value);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#if children}
      {@render children()}
    {/if}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-md max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
      <Dialog.Description>Configure your target working hours.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6 py-4">
      <!-- Auto-Refresh -->
      <div>
        <h3 class="text-sm font-semibold text-foreground mb-1">Auto-Refresh</h3>
        <p class="text-xs text-muted-foreground mb-3">
          Automatically reload data at regular intervals.
        </p>
        <div class="flex gap-1">
          {#each AUTO_REFRESH_OPTIONS as option (option.value)}
            <button
              onclick={() => handleAutoRefreshChange(option.value)}
              class="flex-1 flex items-center justify-center px-2 py-2 text-xs rounded-md transition-colors
                {autoRefreshState.interval === option.value
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'}"
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="border-t border-border"></div>

      <!-- Working Hours -->
      <div>
        <h3 class="text-sm font-semibold text-foreground mb-3">Target Hours per Day</h3>
        <WeekdayHoursForm />
      </div>

    </div>
  </Dialog.Content>
</Dialog.Root>
