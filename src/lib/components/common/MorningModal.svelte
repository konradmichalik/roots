<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { getMatchableEvents } from '../../utils/matchable-events';
  import {
    getEntriesForDate,
    createMocoActivity,
    getCachedDayOverview
  } from '../../stores/timeEntries.svelte';
  import { mocoUserName } from '../../stores/connections.svelte';
  import { getAbsenceForDate } from '../../stores/absences.svelte';
  import { toast } from '../../stores/toast.svelte';
  import {
    today,
    getWeekDates,
    getMonthStart,
    parseDate
  } from '../../utils/date-helpers';
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { ABSENCE_LABELS } from '../../types/unified';
  import type { OutlookMetadata, AbsenceType } from '../../types/unified';
  import Sun from '@lucide/svelte/icons/sun';
  import Check from '@lucide/svelte/icons/check';
  import Video from '@lucide/svelte/icons/video';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import { SvelteSet } from 'svelte/reactivity';

  let {
    open = $bindable(false),
    onClose
  }: {
    open: boolean;
    onClose: () => void;
  } = $props();

  let isBooking = $state(false);
  let selectedIds = new SvelteSet<string>();
  let hasInitializedSelection = $state(false);

  let todayStr = $derived(today());

  // All Outlook events for the schedule
  let outlookEvents = $derived(
    [...getEntriesForDate(todayStr).outlook].sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return 1;
      if (b.startTime) return -1;
      return 0;
    })
  );

  // Matchable events for booking
  let allMatchable = $derived(getMatchableEvents(todayStr));
  let unbookedEvents = $derived(allMatchable.filter((e) => !e.booked));
  let bookedEvents = $derived(allMatchable.filter((e) => e.booked));

  let totalUnbookedHours = $derived(unbookedEvents.reduce((sum, e) => sum + e.hours, 0));

  // Day context
  let absence = $derived(getAbsenceForDate(todayStr));
  let onlineMeetingCount = $derived(
    outlookEvents.filter((e) => (e.metadata as OutlookMetadata).isOnlineMeeting).length
  );

  // Weekly balance (days before today)
  let weekBalance = $derived.by(() => {
    const weekDates = getWeekDates(todayStr);
    const pastDates = weekDates.filter((d) => d < todayStr);
    return pastDates
      .map((d) => getCachedDayOverview(d, getMonthStart(d)))
      .reduce((sum, d) => sum + d.balance, 0);
  });

  // Pre-select all un-booked events only once when modal opens
  $effect(() => {
    if (open && unbookedEvents.length > 0 && !hasInitializedSelection) {
      selectedIds.clear();
      for (const e of unbookedEvents) selectedIds.add(e.eventId);
      hasInitializedSelection = true;
    }
    if (!open) {
      hasInitializedSelection = false;
    }
  });

  function getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function formatDayDate(dateStr: string): string {
    const d = parseDate(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  let greeting = $derived(
    mocoUserName.value ? `${getTimeGreeting()}, ${mocoUserName.value}!` : `${getTimeGreeting()}!`
  );

  let absenceLabel = $derived.by(() => {
    if (!absence) return null;
    return ABSENCE_LABELS[(absence as { type: AbsenceType }).type] || 'time off';
  });

  function toggleEvent(eventId: string): void {
    if (selectedIds.has(eventId)) {
      selectedIds.delete(eventId);
    } else {
      selectedIds.add(eventId);
    }
  }

  async function bookSelected(): Promise<void> {
    const toBook = unbookedEvents.filter((e) => selectedIds.has(e.eventId));
    if (toBook.length === 0) return;

    isBooking = true;
    let successCount = 0;
    let failCount = 0;
    const dateStr = todayStr;

    try {
      for (const match of toBook) {
        const success = await createMocoActivity({
          date: dateStr,
          project_id: match.favorite.projectId,
          task_id: match.favorite.taskId,
          hours: match.hours,
          description: match.favorite.description || match.eventTitle
        });
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'entry' : 'entries'} booked`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} ${failCount === 1 ? 'entry' : 'entries'} failed`);
      }
    } finally {
      isBooking = false;
      onClose();
    }
  }

  function staggerDelay(index: number, baseMs: number = 80): string {
    return `animation-delay: ${index * baseMs}ms`;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg overflow-hidden">
    <!-- Header: Greeting + Date (left-aligned, compact icon) -->
    <Dialog.Header class="pb-1">
      <Dialog.Title class="flex items-center gap-2 text-lg">
        <Sun class="size-4 text-warning" />
        {greeting}
      </Dialog.Title>
      <p class="text-xs text-muted-foreground">
        {formatDayDate(todayStr)}
      </p>
    </Dialog.Header>

    <!-- Snackable metrics or absence notice -->
    {#if absenceLabel}
      <p
        class="animate-stagger-in text-sm text-muted-foreground"
        style={staggerDelay(0, 120)}
      >
        You're on {absenceLabel.toLowerCase()} today. Enjoy your day!
      </p>
    {:else}
      <div
        class="animate-stagger-in grid grid-cols-2 gap-2"
        style={staggerDelay(0, 120)}
      >
        <div class="rounded-lg bg-accent/50 px-3 py-2">
          <span class="text-lg font-semibold tabular-nums text-foreground">{outlookEvents.length}</span>
          <span class="ml-1 text-xs text-muted-foreground">
            {outlookEvents.length === 1 ? 'Appointment' : 'Appointments'}
            {#if onlineMeetingCount > 0}
              <span class="text-muted-foreground/70">({onlineMeetingCount} <Video class="inline size-3 -mt-0.5" /> online)</span>
            {/if}
          </span>
        </div>
        <div class="rounded-lg bg-accent/50 px-3 py-2">
          <span class="text-lg font-semibold tabular-nums {getBalanceClass(weekBalance)}">{formatBalance(weekBalance)}</span>
          <span class="ml-1 text-xs text-muted-foreground">Week Balance</span>
        </div>
      </div>
    {/if}

    <!-- Today's Schedule -->
    {#if outlookEvents.length > 0}
      <div class="animate-stagger-in min-w-0" style={staggerDelay(1, 120)}>
        <div class="flex items-center gap-1.5 mb-2">
          <CalendarDays class="size-3.5 text-muted-foreground shrink-0" />
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >Schedule</span
          >
        </div>
        <div class="space-y-0.5 max-h-[200px] overflow-y-auto">
          {#each outlookEvents as event, i (event.id)}
            {@const meta = event.metadata as OutlookMetadata}
            <div
              class="group animate-stagger-in flex items-center gap-3 rounded-md px-3 py-1.5 text-sm min-w-0"
              style={staggerDelay(i + 2, 60)}
            >
              <span
                class="text-xs text-muted-foreground tabular-nums whitespace-nowrap w-[100px] shrink-0"
              >
                {#if meta.isAllDay}
                  All day
                {:else if event.startTime && event.endTime}
                  {event.startTime} – {event.endTime}
                {:else}
                  —
                {/if}
              </span>
              <span class="truncate flex-1 min-w-0 text-foreground">{event.title}</span>
              {#if meta.isOnlineMeeting}
                <Video class="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Booking Section (conditional) -->
    {#if unbookedEvents.length > 0 || bookedEvents.length > 0}
      <div
        class="animate-stagger-in border-t border-border pt-3 mt-1 min-w-0"
        style={staggerDelay(outlookEvents.length + 2, 60)}
      >
        <div class="flex items-center gap-1.5 mb-2">
          <Sparkles class="size-3.5 text-primary" />
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {#if unbookedEvents.length > 0}
              Ready to book &middot; {formatHours(totalUnbookedHours)}
            {:else}
              All matched &middot; booked
            {/if}
          </span>
        </div>

        <div class="space-y-0.5">
          {#if unbookedEvents.length > 0}
            {#each unbookedEvents as event, i (event.eventId)}
              <label
                class="animate-stagger-in flex items-start gap-3 rounded-md px-3 py-1.5 min-w-0 cursor-pointer hover:bg-accent/50 transition-colors"
                style={staggerDelay(outlookEvents.length + i + 3, 60)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(event.eventId)}
                  onchange={() => toggleEvent(event.eventId)}
                  disabled={isBooking}
                  class="mt-0.5 size-4 rounded border-border accent-primary"
                  aria-label="Book {event.eventTitle}"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-foreground truncate">{event.eventTitle}</div>
                  <div class="text-xs text-muted-foreground truncate">
                    {event.favorite.customerName} &middot; {event.favorite.projectName} &rarr; {event
                      .favorite.taskName}
                  </div>
                </div>
                <span class="text-xs text-muted-foreground tabular-nums shrink-0 mt-0.5"
                  >{formatHours(event.hours)}</span
                >
              </label>
            {/each}
          {/if}

          {#if bookedEvents.length > 0}
            {#each bookedEvents as event, i (event.eventId)}
              <div
                class="animate-stagger-in flex items-start gap-3 rounded-md px-3 py-1.5 min-w-0 opacity-40"
                style={staggerDelay(outlookEvents.length + unbookedEvents.length + i + 3, 60)}
              >
                <Check class="mt-0.5 size-4 shrink-0 text-success-text" />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-foreground truncate">{event.eventTitle}</div>
                  <div class="text-xs text-muted-foreground truncate">
                    {event.favorite.customerName} &middot; {event.favorite.projectName} &rarr; {event
                      .favorite.taskName}
                  </div>
                </div>
                <span class="text-xs text-muted-foreground tabular-nums shrink-0 mt-0.5"
                  >{formatHours(event.hours)}</span
                >
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/if}

    <Dialog.Footer>
      {#if unbookedEvents.length > 0}
        <button
          type="button"
          onclick={onClose}
          disabled={isBooking}
          class="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          Skip
        </button>
        <button
          type="button"
          onclick={bookSelected}
          disabled={isBooking || selectedIds.size === 0}
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {#if isBooking}
            <LoaderCircle class="size-4 animate-spin" />
            Booking...
          {:else}
            Book & Start Day
            <ArrowRight class="size-4" />
          {/if}
        </button>
      {:else}
        <button
          type="button"
          onclick={onClose}
          class="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          Start Day
          <ArrowRight class="size-4" />
        </button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
