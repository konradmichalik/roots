<script lang="ts">
  import { themeState, toggleTheme } from '../../stores/theme.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
</script>

<Tooltip.Provider delayDuration={200}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <button
        onclick={toggleTheme}
        class="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {#if themeState.resolvedTheme === 'dark'}
          <Sun class="size-[18px]" />
        {:else}
          <Moon class="size-[18px]" />
        {/if}
      </button>
    </Tooltip.Trigger>
    <Tooltip.Content side="bottom" sideOffset={4}>
      Switch to {themeState.resolvedTheme === 'dark' ? 'light' : 'dark'} mode
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
