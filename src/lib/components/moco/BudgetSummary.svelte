<script lang="ts">
  import { formatHours, formatPT } from '../../utils/time-format';
  import Clock from '@lucide/svelte/icons/clock';
  import Target from '@lucide/svelte/icons/target';
  import Hourglass from '@lucide/svelte/icons/hourglass';

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

<div
  class="flex items-center flex-wrap gap-x-3 gap-y-0.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground"
>
  <span class="inline-flex items-center gap-1">
    <Clock class="size-3" />
    <span class="font-semibold text-foreground">{formatPT(logged)} PT</span>
    <span>({formatHours(logged)})</span>
    logged
  </span>
  {#if hasBudget}
    <span class="inline-flex items-center gap-1">
      <Target class="size-3" />
      <span class="font-semibold text-foreground">{formatPT(budgetHours)} PT</span>
      <span>({formatHours(budgetHours)})</span>
      budget
    </span>
    <span class="inline-flex items-center gap-1">
      <Hourglass class="size-3 {remaining > 0 ? 'text-success-text' : 'text-danger-text'}" />
      <span
        class="font-semibold {remaining > 0 ? 'text-success-text' : 'text-danger-text'}"
      >
        {remaining < 0 ? '-' : ''}{formatPT(remaining)} PT
      </span>
      <span>({formatHours(remaining)})</span>
      remaining
    </span>
  {/if}
</div>
