<script lang="ts">
  import DayColumn from './DayColumn.svelte';
  import HoursDisplay from '../common/HoursDisplay.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getDayOverview, timeEntriesState, isAnyLoading } from '../../stores/timeEntries.svelte';
  import { getWeekDates, getWeekNumber } from '../../utils/date-helpers';
  import { formatBalance, getBalanceClass } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';
  import type { DayOverview } from '../../types';

  let weekDates = $derived(getWeekDates(dateNavState.selectedDate));
  let dayOverviews = $derived(weekDates.map((d) => getDayOverview(d)));
  let loading = $derived(isAnyLoading());

  let weekTotals = $derived({
    actual: dayOverviews.reduce((sum, d) => sum + d.totals.actual, 0),
    required: dayOverviews.reduce((sum, d) => sum + d.requiredHours, 0),
    balance: dayOverviews.reduce((sum, d) => sum + d.balance, 0)
  });
</script>

<div class="space-y-4">
  <!-- Week summary bar -->
  <div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
    <div class="flex items-center gap-4">
      <span class="text-sm text-muted-foreground">
        Gesamt:
      </span>
      <HoursDisplay hours={weekTotals.actual} class="text-base font-bold" />
      <span class="text-sm text-muted-foreground">
        von {weekTotals.required}h Soll
      </span>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">Saldo:</span>
      <span class="text-sm font-bold {getBalanceClass(weekTotals.balance)}">
        {formatBalance(weekTotals.balance, settingsState.hoursFormat)}
      </span>
    </div>
  </div>

  <!-- Loading indicator -->
  {#if loading}
    <div class="text-center text-sm text-muted-foreground py-2">
      Lade Eintraege...
    </div>
  {/if}

  <!-- Day columns grid -->
  <div class="grid grid-cols-5 gap-3">
    {#each dayOverviews as day (day.date)}
      <DayColumn {day} />
    {/each}
  </div>
</div>
