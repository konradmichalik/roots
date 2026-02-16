<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { getMatchableEvents } from '../../utils/matchable-events';
  import { getEntriesForDate, createMocoActivity } from '../../stores/timeEntries.svelte';
  import { mocoUserName } from '../../stores/connections.svelte';
  import { toast } from '../../stores/toast.svelte';
  import { today } from '../../utils/date-helpers';
  import { formatHours } from '../../utils/time-format';
  import Sun from '@lucide/svelte/icons/sun';
  import Check from '@lucide/svelte/icons/check';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
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
  let allEvents = $derived(getMatchableEvents(todayStr));
  let unbookedEvents = $derived(allEvents.filter((e) => !e.booked));
  let bookedEvents = $derived(allEvents.filter((e) => e.booked));
  let totalOutlookEvents = $derived(getEntriesForDate(todayStr).outlook.length);
  let totalUnbookedHours = $derived(
    unbookedEvents.reduce((sum, e) => sum + e.hours, 0)
  );

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

  let greeting = $derived(
    mocoUserName.value
      ? `${getTimeGreeting()}, ${mocoUserName.value}!`
      : `${getTimeGreeting()}!`
  );

  let summary = $derived.by(() => {
    let text = `You have ${totalOutlookEvents} ${totalOutlookEvents === 1 ? 'event' : 'events'} today, ${allEvents.length} ${allEvents.length === 1 ? 'matches' : 'match'} your favorites`;
    if (bookedEvents.length > 0) text += `, ${bookedEvents.length} already booked`;
    text += `. Ready to book ${unbookedEvents.length} ${unbookedEvents.length === 1 ? 'entry' : 'entries'} (${formatHours(totalUnbookedHours)})?`;
    return text;
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
          description: match.favorite.description || match.eventTitle,
          remote_service: 'outlook',
          remote_id: match.eventId
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

  function staggerDelay(index: number, baseMs: number = 100): string {
    return `animation-delay: ${index * baseMs}ms`;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md overflow-hidden">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Sun class="size-5 text-warning" />
        {greeting}
      </Dialog.Title>
      <Dialog.Description>
        <span class="animate-stagger-in" style={staggerDelay(0, 150)}>
          {summary}
        </span>
      </Dialog.Description>
    </Dialog.Header>

    {#if allEvents.length > 0}
      <div class="space-y-1 min-w-0 overflow-hidden">
        {#if unbookedEvents.length > 0}
          {#each unbookedEvents as event, i (event.eventId)}
            <label
              class="animate-stagger-in flex items-start gap-3 rounded-md px-3 py-2 min-w-0 cursor-pointer hover:bg-accent/50 transition-colors"
              style={staggerDelay(i + 1, 100)}
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
                  {event.favorite.customerName} &middot; {event.favorite.projectName} &rarr; {event.favorite.taskName}
                </div>
                <div class="text-xs text-muted-foreground">{formatHours(event.hours)}</div>
              </div>
            </label>
          {/each}
        {/if}

        {#if bookedEvents.length > 0}
          {#if unbookedEvents.length > 0}
            <div class="border-t border-border mt-2"></div>
          {/if}

          {#each bookedEvents as event, i (event.eventId)}
            <div
              class="animate-stagger-in flex items-start gap-3 rounded-md px-3 py-2 min-w-0 opacity-40"
              style={staggerDelay(unbookedEvents.length + i + 1, 100)}
            >
              <Check class="mt-0.5 size-4 shrink-0 text-success-text" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-foreground truncate">{event.eventTitle}</div>
                <div class="text-xs text-muted-foreground truncate">
                  {event.favorite.customerName} &middot; {event.favorite.projectName} &rarr; {event.favorite.taskName}
                </div>
                <div class="text-xs text-muted-foreground">{formatHours(event.hours)}</div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}

    <Dialog.Footer>
      <button
        type="button"
        onclick={onClose}
        disabled={isBooking}
        class="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
      >
        Skip
      </button>
      {#if unbookedEvents.length > 0}
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
            Book
          {/if}
        </button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
