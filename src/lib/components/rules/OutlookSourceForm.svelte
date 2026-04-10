<script lang="ts">
  import TimeInput from '../common/TimeInput.svelte';
  import type { OutlookSourceMatcher } from '../../types';
  import Info from '@lucide/svelte/icons/info';
  import Clock from '@lucide/svelte/icons/clock';

  let {
    pattern = $bindable(''),
    matchType = $bindable<OutlookSourceMatcher['matchType']>('contains'),
    overrideHours = $bindable(0)
  }: {
    pattern: string;
    matchType: OutlookSourceMatcher['matchType'];
    overrideHours: number;
  } = $props();
</script>

<div class="space-y-3 pl-3 border-l-2 border-source-outlook/30">
  <p class="text-xs text-muted-foreground flex items-center gap-1">
    <Info class="size-3 flex-shrink-0" />
    Events matching this pattern will be transferred.
  </p>
  <p class="text-xs text-muted-foreground flex items-center gap-1">
    <Clock class="size-3 flex-shrink-0" />
    Sync happens after the event ends — future events won't be synced yet.
  </p>
  <div>
    <label for="outlook-pattern" class="block text-sm font-medium text-foreground mb-1"
      >Event Pattern</label
    >
    <input
      id="outlook-pattern"
      type="text"
      bind:value={pattern}
      placeholder="e.g. Team Weekly"
      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
        focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    />
  </div>
  <div class="grid grid-cols-2 gap-3">
    <div>
      <label for="outlook-match" class="block text-sm font-medium text-foreground mb-1"
        >Match Type</label
      >
      <select
        id="outlook-match"
        bind:value={matchType}
        class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
          focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
      >
        <option value="contains">Contains</option>
        <option value="exact">Exact match</option>
        <option value="startsWith">Starts with</option>
      </select>
    </div>
    <div>
      <label for="outlook-hours" class="block text-sm font-medium text-foreground mb-1"
        >Override Hours</label
      >
      <TimeInput id="outlook-hours" bind:value={overrideHours} />
      <p class="text-[10px] text-muted-foreground mt-0.5">0 = use event duration</p>
    </div>
  </div>
</div>
