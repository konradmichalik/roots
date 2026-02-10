<script lang="ts">
  import { formatHours, formatPT } from '../../utils/time-format';
  import Hourglass from '@lucide/svelte/icons/hourglass';
  import Clock from '@lucide/svelte/icons/clock';
  import Target from '@lucide/svelte/icons/target';
  import * as Tooltip from '$lib/components/ui/tooltip';

  let {
    logged,
    budgetHours = 0,
    remaining = 0,
    hasBudget = false
  }: {
    logged: number;
    budgetHours?: number;
    remaining?: number;
    hasBudget?: boolean;
  } = $props();
</script>

<Tooltip.Provider delayDuration={200}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <div
        class="inline-flex items-center gap-x-3 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground cursor-default"
      >
        {#if hasBudget}
          <span class="inline-flex items-center gap-1">
            <Hourglass
              class="size-3 {remaining > 0 ? 'text-success-text' : 'text-danger-text'}"
            />
            <span
              class="font-semibold {remaining > 0 ? 'text-success-text' : 'text-danger-text'}"
            >
              {remaining < 0 ? '-' : ''}{formatPT(remaining)} PT
            </span>
            <span>({formatHours(remaining)})</span>
            remaining
          </span>
        {:else}
          <span class="inline-flex items-center gap-1">
            <Clock class="size-3" />
            <span class="font-semibold text-foreground">{formatPT(logged)} PT</span>
            <span>({formatHours(logged)})</span>
            logged
          </span>
        {/if}
      </div>
    </Tooltip.Trigger>
    <Tooltip.Content side="bottom" sideOffset={4}>
      <div class="flex flex-col gap-1 text-xs">
        {#if hasBudget}
          <span class="inline-flex items-center gap-1">
            <Target class="size-3" />
            <span class="font-semibold">{formatPT(budgetHours)} PT</span>
            <span>({formatHours(budgetHours)})</span>
            budget
          </span>
        {/if}
        <span class="inline-flex items-center gap-1">
          <Clock class="size-3" />
          <span class="font-semibold">{formatPT(logged)} PT</span>
          <span>({formatHours(logged)})</span>
          logged
        </span>
      </div>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
