<script lang="ts">
  import { Calendar } from '$lib/components/ui/calendar/index.js';
  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { CalendarDate } from '@internationalized/date';
  import type { DateValue } from '@internationalized/date';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import { cn } from '$lib/utils.js';
  import { dateNavState, setDate } from '../../stores/dateNavigation.svelte';
  import {
    getCachedDayOverview,
    getDayOverview,
    monthCacheState
  } from '../../stores/timeEntries.svelte';
  import { getAbsenceForDate } from '../../stores/absences.svelte';
  import { presencesState } from '../../stores/presences.svelte';
  import { today, parseDate, getMonthStart, getWeekStart, addDays } from '../../utils/date-helpers';

  let { expanded = false, todayStr = today() }: { expanded?: boolean; todayStr?: string } =
    $props();

  let currentMonthStart = $derived(getMonthStart(dateNavState.selectedDate));

  // Key to force calendar re-render when cache data changes
  let calendarKey = $derived.by(() => {
    const presenceTs = presencesState.cache?.lastFetched ?? 0;
    const monthCache = monthCacheState.cache[currentMonthStart];
    const monthTs = monthCache?.lastFetched ?? 0;
    const entryCount = monthCache?.mocoEntries.length ?? 0;
    return `${presenceTs}-${monthTs}-${entryCount}`;
  });

  function toCalendarDate(dateStr: string): CalendarDate {
    const d = parseDate(dateStr);
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function toDateString_(date: DateValue): string {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  }

  let calendarValue = $derived(toCalendarDate(dateNavState.selectedDate));

  function handleValueChange(newValue: DateValue | DateValue[] | undefined) {
    if (!newValue) return;
    const date = Array.isArray(newValue) ? newValue[0] : newValue;
    if (date) {
      setDate(toDateString_(date));
    }
  }

  type BookingStatus = 'full' | 'partial' | 'empty' | 'none' | 'absence';

  function getBookingStatus(dateStr: string): BookingStatus {
    const absence = getAbsenceForDate(dateStr);
    if (absence && !absence.halfDay) return 'absence';

    if (dateStr > todayStr) return 'none';

    const overview =
      dateStr === dateNavState.selectedDate
        ? getDayOverview(dateStr)
        : getCachedDayOverview(dateStr, getMonthStart(dateStr));

    if (overview.isWeekend) return 'none';
    if (overview.requiredHours === 0) return 'none';

    if (overview.presence && overview.presence.to !== null && overview.presence.hours > 0) {
      const ratio = overview.totals.actual / overview.presence.hours;
      if (ratio >= 0.95) return 'full';
      if (ratio > 0) return 'partial';
      return 'empty';
    }

    const ratio = overview.totals.actual / overview.requiredHours;
    if (ratio >= 0.95) return 'full';
    if (ratio > 0) return 'partial';
    return 'empty';
  }

  function getBookingStatusFromDateValue(day: DateValue): BookingStatus {
    return getBookingStatus(toDateString_(day));
  }

  const STATUS_COLORS: Record<BookingStatus, string> = {
    full: 'bg-success',
    partial: 'bg-warning',
    empty: 'bg-danger',
    absence: 'bg-brand',
    none: ''
  };

  // Week strip data (Mon-Sun)
  const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  let weekDates = $derived.by(() => {
    const monday = getWeekStart(dateNavState.selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  });
</script>

{#if expanded}
  <!-- Full month calendar -->
  {#key calendarKey}
    <Calendar
      type="single"
      value={calendarValue}
      onValueChange={handleValueChange}
      locale="en-US"
      weekStartsOn={1}
      weekdayFormat="narrow"
      class="w-full !bg-transparent !p-0 [--cell-size:2.25rem] [&_tr]:justify-around [&_tbody_tr]:mt-0.5 [&_th]:text-[9px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-muted-foreground/60"
    >
      {#snippet day({ day: dayValue, outsideMonth })}
        {@const status = outsideMonth ? 'none' : getBookingStatusFromDateValue(dayValue)}
        <CalendarPrimitive.Day
          class={cn(
            buttonVariants({ variant: 'ghost' }),
            'flex size-(--cell-size) flex-col items-center justify-center gap-0.5 p-0 leading-none font-normal whitespace-nowrap select-none text-xs',
            '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
            'data-[selected]:bg-primary/20 data-[selected]:text-primary data-[selected]:ring-1 data-[selected]:ring-primary/50',
            '[&[data-outside-month]:not([data-selected])]:text-muted-foreground/40',
            'data-[disabled]:text-muted-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
          )}
        >
          {#snippet children({ day: dayNum })}
            <span>{dayNum}</span>
            {#if status !== 'none'}
              <span class="size-1.5 rounded-full {STATUS_COLORS[status]}"></span>
            {/if}
          {/snippet}
        </CalendarPrimitive.Day>
      {/snippet}
    </Calendar>
  {/key}
{:else}
  <!-- Compact week strip -->
  {#key calendarKey}
    <div class="w-full">
      <!-- Weekday headers -->
      <div class="grid grid-cols-7 mb-1">
        {#each WEEKDAY_LABELS as label, i (i)}
          <div
            class="text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60"
          >
            {label}
          </div>
        {/each}
      </div>
      <!-- Day cells -->
      <div class="grid grid-cols-7">
        {#each weekDates as dateStr (dateStr)}
          {@const d = parseDate(dateStr)}
          {@const dayNum = d.getDate()}
          {@const isSelected = dateStr === dateNavState.selectedDate}
          {@const isToday = dateStr === todayStr}
          {@const status = getBookingStatus(dateStr)}
          <button
            type="button"
            onclick={() => setDate(dateStr)}
            class={cn(
              'flex flex-col items-center justify-center gap-0.5 rounded-full mx-auto size-7 text-xs transition-colors',
              'hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              isSelected && 'bg-primary/20 text-primary ring-1 ring-primary/50',
              !isSelected && isToday && 'bg-accent text-accent-foreground',
              !isSelected && !isToday && 'text-foreground'
            )}
          >
            <span class="leading-none">{dayNum}</span>
            {#if status !== 'none'}
              <span class="size-1.5 rounded-full {STATUS_COLORS[status]}"></span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/key}
{/if}
