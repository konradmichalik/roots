<script lang="ts">
  import { Calendar } from '$lib/components/ui/calendar/index.js';
  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import {
    CalendarDate,
    today as todayDate,
    getLocalTimeZone,
    isEqualDay
  } from '@internationalized/date';
  import type { DateValue } from '@internationalized/date';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import { cn } from '$lib/utils.js';
  import { dateNavState, setDate } from '../../stores/dateNavigation.svelte';
  import { getCachedDayOverview, getDayOverview } from '../../stores/timeEntries.svelte';
  import { getAbsenceForDate } from '../../stores/absences.svelte';
  import { today, parseDate, getMonthStart } from '../../utils/date-helpers';

  function toCalendarDate(dateStr: string): CalendarDate {
    const d = parseDate(dateStr);
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function toDateString(date: DateValue): string {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  }

  let calendarValue = $derived(toCalendarDate(dateNavState.selectedDate));

  function handleValueChange(newValue: DateValue | DateValue[] | undefined) {
    if (!newValue) return;
    const date = Array.isArray(newValue) ? newValue[0] : newValue;
    if (date) {
      setDate(toDateString(date));
    }
  }

  type BookingStatus = 'full' | 'partial' | 'empty' | 'none' | 'absence';

  function getBookingStatus(day: DateValue): BookingStatus {
    const dateStr = toDateString(day);
    const todayStr = today();

    // Don't show status for future dates (except absences)
    const absence = getAbsenceForDate(dateStr);
    if (absence && !absence.halfDay) return 'absence';

    if (dateStr > todayStr) return 'none';

    // Use live data for the selected date, cached data otherwise
    const overview =
      dateStr === dateNavState.selectedDate
        ? getDayOverview(dateStr)
        : getCachedDayOverview(dateStr, getMonthStart(dateStr));

    if (overview.isWeekend) return 'none';
    if (overview.requiredHours === 0) return 'none';

    // If presence exists and is finished (to !== null), compare against presence hours
    if (overview.presence && overview.presence.to !== null && overview.presence.hours > 0) {
      const ratio = overview.totals.actual / overview.presence.hours;
      if (ratio >= 0.95) return 'full';
      if (ratio > 0) return 'partial';
      return 'empty';
    }

    // Fallback: no presence data, compare against required hours
    const ratio = overview.totals.actual / overview.requiredHours;
    if (ratio >= 0.95) return 'full';
    if (ratio > 0) return 'partial';
    return 'empty';
  }

  const STATUS_COLORS: Record<BookingStatus, string> = {
    full: 'bg-success',
    partial: 'bg-warning',
    empty: 'bg-danger',
    absence: 'bg-brand',
    none: ''
  };
</script>

<Calendar
  type="single"
  value={calendarValue}
  onValueChange={handleValueChange}
  locale="en-US"
  weekStartsOn={1}
  weekdayFormat="narrow"
  class="w-full [--cell-size:--spacing(7)]"
>
  {#snippet day({ day: dayValue, outsideMonth })}
    {@const status = outsideMonth ? 'none' : getBookingStatus(dayValue)}
    <CalendarPrimitive.Day
      class={cn(
        buttonVariants({ variant: 'ghost' }),
        'flex size-(--cell-size) flex-col items-center justify-center gap-0.5 p-0 leading-none font-normal whitespace-nowrap select-none text-xs',
        '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
        'data-[selected]:bg-primary data-[selected]:text-primary-foreground',
        '[&[data-outside-month]:not([data-selected])]:text-muted-foreground/40',
        'data-[disabled]:text-muted-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
      )}
    >
      {#snippet children({ day: dayNum })}
        <span>{dayNum}</span>
        {#if status !== 'none'}
          <span class="h-1 w-1 rounded-full {STATUS_COLORS[status]}"></span>
        {/if}
      {/snippet}
    </CalendarPrimitive.Day>
  {/snippet}
</Calendar>
