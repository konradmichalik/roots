<script lang="ts">
  import type { BookingSuggestion } from '../../utils/booking-suggestions';
  import { settingsState, updateSettings } from '../../stores/settings.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { formatDateShort } from '../../utils/date-helpers';

  let {
    suggestion,
    loading = false,
    onApply
  }: {
    suggestion: BookingSuggestion | null;
    loading?: boolean;
    onApply: (projectId: number, taskId: number) => void;
  } = $props();

  let collapsed = $derived(settingsState.suggestionCollapsed);

  function toggleCollapsed(): void {
    updateSettings({ suggestionCollapsed: !collapsed });
  }
</script>

{#if loading}
  <div class="mb-1">
    <div class="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
      <ChevronRight class="size-3 rotate-90" />
      <Sparkles class="size-3" />
      <span>Suggestion</span>
    </div>
    <div class="h-7 w-48 rounded-md bg-muted/50 animate-pulse"></div>
  </div>
{:else if suggestion}
  {@const s = suggestion}
  <div class="mb-1">
    <button
      type="button"
      onclick={toggleCollapsed}
      class="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
      aria-expanded={!collapsed}
    >
      <ChevronRight
        class="size-3 transition-transform duration-150 {collapsed ? '' : 'rotate-90'}"
      />
      <Sparkles class="size-3" />
      <span>Suggestion</span>
      <span
        class="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-medium leading-none rounded-full bg-information-subtle text-brand-text"
      >
        1
      </span>
    </button>
    {#if !collapsed}
      <div class="flex flex-wrap gap-1.5">
        <Tooltip.Root delayDuration={400} disableHoverableContent ignoreNonKeyboardFocus>
          <Tooltip.Trigger>
            <button
              type="button"
              onclick={() => onApply(s.projectId, s.taskId)}
              class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md
                bg-information-subtle/60 text-brand-text border border-brand/20
                hover:bg-information-subtle hover:border-brand/40 transition-colors duration-150
                focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span class="truncate max-w-[220px]">{s.customerName} — {s.taskName}</span>
              <span class="text-brand-text/40 ml-0.5">({formatDateShort(s.matchedEntryDate)})</span>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>
            <div class="flex flex-col gap-0.5">
              <span class="font-medium">{s.customerName} — {s.projectName}</span>
              <span class="text-muted-foreground">{s.taskName}</span>
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    {/if}
  </div>
{/if}
