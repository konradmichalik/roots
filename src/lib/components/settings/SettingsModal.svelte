<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import WeekdayHoursForm from './WeekdayHoursForm.svelte';
  import {
    autoRefreshState,
    setAutoRefreshInterval,
    AUTO_REFRESH_OPTIONS,
    type AutoRefreshInterval
  } from '../../stores/autoRefresh.svelte';
  import { themeState, setTheme } from '../../stores/theme.svelte';
  import type { Theme } from '../../types';
  import type { Snippet } from 'svelte';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import Monitor from '@lucide/svelte/icons/monitor';

  let { children }: { children: Snippet } = $props();
  let open = $state(false);

  function handleAutoRefreshChange(value: AutoRefreshInterval): void {
    setAutoRefreshInterval(value);
  }

  function handleThemeChange(theme: Theme): void {
    setTheme(theme);
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
      <!-- Theme -->
      <div>
        <h3 class="text-sm font-semibold text-foreground mb-1">Theme</h3>
        <p class="text-xs text-muted-foreground mb-3">
          Light, dark, or follow your system preference.
        </p>
        <div class="flex gap-1">
          <button
            onclick={() => handleThemeChange('light')}
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-colors
              focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
              {themeState.theme === 'light'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'}"
          >
            <Sun class="size-3.5" />
            Light
          </button>
          <button
            onclick={() => handleThemeChange('dark')}
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-colors
              focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
              {themeState.theme === 'dark'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'}"
          >
            <Moon class="size-3.5" />
            Dark
          </button>
          <button
            onclick={() => handleThemeChange('system')}
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-colors
              focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
              {themeState.theme === 'system'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'}"
          >
            <Monitor class="size-3.5" />
            Auto
          </button>
        </div>
      </div>

      <div class="border-t border-border"></div>

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
                focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
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
