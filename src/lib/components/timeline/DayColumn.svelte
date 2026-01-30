<script lang="ts">
  import type { DayOverview } from '../../types';
  import EntryList from '../entries/EntryList.svelte';
  import HoursDisplay from '../common/HoursDisplay.svelte';
  import { formatDateShort, getShortDayName } from '../../utils/date-helpers';
  import { formatBalance, getBalanceClass } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';

  let { day }: { day: DayOverview } = $props();

  let allEntries = $derived([...day.entries.moco, ...day.entries.jira, ...day.entries.outlook]);
</script>

<div
  class="flex flex-col rounded-xl border border-border bg-card shadow-sm {day.isToday ? 'ring-[3px] ring-primary/25 border-primary/30' : ''} {day.isWeekend ? 'opacity-50' : ''}"
>
  <!-- Day header -->
  <div class="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
    <div class="flex items-center gap-1.5">
      <span class="text-xs font-medium text-muted-foreground">
        {getShortDayName(day.date)}
      </span>
      <span class="text-sm font-semibold text-foreground {day.isToday ? 'text-primary' : ''}">
        {formatDateShort(day.date)}
      </span>
    </div>
    <HoursDisplay hours={day.totals.actual} class="font-semibold" />
  </div>

  <!-- Entries -->
  <div class="flex-1 overflow-auto p-2">
    <EntryList entries={allEntries} emptyMessage="Keine Buchungen" />
  </div>

  <!-- Day summary footer -->
  <div class="border-t border-border bg-muted/20 px-3 py-1.5 flex items-center justify-between">
    <span class="text-xs text-muted-foreground">
      Soll: {day.requiredHours}h
    </span>
    {#if !day.isWeekend}
      <span class="text-xs font-medium {getBalanceClass(day.balance)}">
        {formatBalance(day.balance, settingsState.hoursFormat)}
      </span>
    {/if}
  </div>
</div>
