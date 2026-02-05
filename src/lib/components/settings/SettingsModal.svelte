<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import { Tabs } from 'bits-ui';
  import { Switch } from '../ui/switch';
  import WeekdayHoursForm from './WeekdayHoursForm.svelte';
  import {
    autoRefreshState,
    setAutoRefreshInterval,
    AUTO_REFRESH_OPTIONS,
    type AutoRefreshInterval
  } from '../../stores/autoRefresh.svelte';
  import { themeState, setTheme } from '../../stores/theme.svelte';
  import { settingsState, updateSettings } from '../../stores/settings.svelte';
  import type { Theme } from '../../types';
  import type { Snippet } from 'svelte';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Palette from '@lucide/svelte/icons/palette';
  import Clock from '@lucide/svelte/icons/clock';
  import Zap from '@lucide/svelte/icons/zap';
  import Database from '@lucide/svelte/icons/database';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { clearAllMonthCache, getCachedMonthCount } from '../../stores/timeEntries.svelte';
  import { toast } from '../../stores/toast.svelte';

  let { children }: { children: Snippet } = $props();
  let open = $state(false);
  let activeTab = $state('appearance');

  function handleAutoRefreshChange(value: AutoRefreshInterval): void {
    setAutoRefreshInterval(value);
  }

  function handleThemeChange(theme: Theme): void {
    setTheme(theme);
  }

  function handleQuickSelectionToggle(enabled: boolean): void {
    updateSettings({ showQuickSelection: enabled });
  }

  let cachedMonths = $derived(getCachedMonthCount());

  function handleClearCache(): void {
    clearAllMonthCache();
    toast.success('Cache cleared');
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#if children}
      {@render children()}
    {/if}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-lg p-0 gap-0 max-h-[85vh] overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b">
      <h2 class="text-lg font-semibold">Settings</h2>
    </div>

    <!-- Tabs -->
    <Tabs.Root bind:value={activeTab} class="gap-0">
      <Tabs.List
        class="flex w-full h-auto px-4 py-2 rounded-none border-b bg-transparent justify-start gap-1"
      >
        <Tabs.Trigger
          value="appearance"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors
            data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:font-medium
            text-muted-foreground hover:text-foreground"
        >
          <Palette class="size-3.5" />
          Appearance
        </Tabs.Trigger>
        <Tabs.Trigger
          value="hours"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors
            data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:font-medium
            text-muted-foreground hover:text-foreground"
        >
          <Clock class="size-3.5" />
          Working Hours
        </Tabs.Trigger>
        <Tabs.Trigger
          value="features"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors
            data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:font-medium
            text-muted-foreground hover:text-foreground"
        >
          <Zap class="size-3.5" />
          Features
        </Tabs.Trigger>
        <Tabs.Trigger
          value="data"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors
            data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:font-medium
            text-muted-foreground hover:text-foreground"
        >
          <Database class="size-3.5" />
          Data
        </Tabs.Trigger>
      </Tabs.List>

      <!-- Appearance Tab -->
      <Tabs.Content value="appearance" class="mt-0 px-6 py-4 min-h-[240px] space-y-6">
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
      </Tabs.Content>

      <!-- Working Hours Tab -->
      <Tabs.Content value="hours" class="mt-0 px-6 py-4 min-h-[240px]">
        <h3 class="text-sm font-semibold text-foreground mb-3">Target Hours per Day</h3>
        <WeekdayHoursForm />
      </Tabs.Content>

      <!-- Features Tab -->
      <Tabs.Content value="features" class="mt-0 px-6 py-4 min-h-[240px] space-y-6">
        <!-- Quick Selection -->
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-foreground">Quick Selection</h3>
            <p class="text-xs text-muted-foreground mt-0.5">
              Show frequently used project+task combinations in the Moco modal.
            </p>
          </div>
          <Switch
            checked={settingsState.showQuickSelection}
            onCheckedChange={handleQuickSelectionToggle}
          />
        </div>
      </Tabs.Content>

      <!-- Data Tab -->
      <Tabs.Content value="data" class="mt-0 px-6 py-4 min-h-[240px]">
        <h3 class="text-sm font-semibold text-foreground mb-1">Cache</h3>
        <p class="text-xs text-muted-foreground mb-3">
          {cachedMonths}
          {cachedMonths === 1 ? 'month' : 'months'} cached.
        </p>
        <button
          onclick={handleClearCache}
          disabled={cachedMonths === 0}
          class="flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-colors
            focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
            bg-danger-subtle text-danger-text hover:bg-danger/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 class="size-3.5" />
          Clear Cache
        </button>
      </Tabs.Content>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
