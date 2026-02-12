<script lang="ts">
  import { settingsState, updateSettings } from '../../stores/settings.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import type { WeekdayHours } from '../../types';
  import Info from '@lucide/svelte/icons/info';

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let personioConnected = $derived(connectionsState.personio.isConnected);

  function handleChange(dayIndex: number, value: string): void {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0 || parsed > 12) return;
    const rounded = Math.round(parsed * 2) / 2; // snap to 0.5 increments
    const updated: WeekdayHours = [...settingsState.weekdayHours] as WeekdayHours;
    updated[dayIndex] = rounded;
    updateSettings({ weekdayHours: updated });
  }
</script>

{#if connectionsState.personio.isConnected}
  <div class="flex items-start gap-2 rounded-lg bg-source-personio-subtle px-3 py-2 mb-3">
    <Info class="size-3.5 text-source-personio-text shrink-0 mt-0.5" />
    <p class="text-xs text-muted-foreground">Synced from Personio. Disconnect to edit manually.</p>
  </div>
{/if}

<div class="space-y-2">
  {#each DAY_LABELS as label, i (label)}
    <div class="flex items-center gap-3">
      <span
        class="w-10 text-sm font-medium text-foreground {i >= 5 ? 'text-muted-foreground' : ''}"
      >
        {label}
      </span>
      <input
        type="number"
        min="0"
        max="12"
        step="0.5"
        value={settingsState.weekdayHours[i]}
        disabled={personioConnected}
        onchange={(e) => handleChange(i, (e.target as HTMLInputElement).value)}
        class="w-20 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground text-center font-mono
          focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span class="text-xs text-muted-foreground">h</span>
    </div>
  {/each}
</div>
