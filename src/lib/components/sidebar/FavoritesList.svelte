<script lang="ts">
  import FavoriteItem from './FavoriteItem.svelte';
  import FavoriteModal from '../favorites/FavoriteModal.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import {
    getRegularFavorites,
    getEventFavorites,
    findMatchingFavorite,
    reorderFavorites
  } from '../../stores/favorites.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getEntriesForDate, createMocoActivity } from '../../stores/timeEntries.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { toast } from '../../stores/toast.svelte';
  import type { Favorite } from '../../types';
  import Star from '@lucide/svelte/icons/star';
  import Plus from '@lucide/svelte/icons/plus';
  import Calendar from '@lucide/svelte/icons/calendar';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import CalendarCheck from '@lucide/svelte/icons/calendar-check';

  let regularFavorites = $derived(getRegularFavorites());
  let eventFavorites = $derived(getEventFavorites());
  let outlookEntries = $derived(getEntriesForDate(dateNavState.selectedDate).outlook);
  let isAdding = $state(false);

  // Track which event favorites have matches today
  let matchedFavoriteIds = $derived.by(() => {
    const ids: string[] = [];
    for (const event of outlookEntries) {
      const fav = findMatchingFavorite(event.title);
      if (fav && !ids.includes(fav.id)) ids.push(fav.id);
    }
    return ids;
  });

  function isMatched(id: string): boolean {
    return matchedFavoriteIds.includes(id);
  }

  // Find matching events that have favorites with eventMatch
  let matchingEvents = $derived.by(() => {
    const matches: Array<{ eventTitle: string; favorite: Favorite; hours: number }> = [];
    for (const event of outlookEntries) {
      const favorite = findMatchingFavorite(event.title);
      if (favorite) {
        matches.push({ eventTitle: event.title, favorite, hours: event.hours });
      }
    }
    return matches;
  });

  let hasMatchingEvents = $derived(matchingEvents.length > 0);
  let canAddFromEvents = $derived(
    connectionsState.moco.isConnected &&
      connectionsState.outlook.isConnected &&
      hasMatchingEvents &&
      !isAdding
  );

  async function addAllFromEvents(): Promise<void> {
    const matches = matchingEvents;
    if (matches.length === 0) return;

    isAdding = true;
    let successCount = 0;

    try {
      for (const match of matches) {
        const hours = match.hours || match.favorite.defaultHours || 0.25;
        const success = await createMocoActivity({
          date: dateNavState.selectedDate,
          project_id: match.favorite.projectId,
          task_id: match.favorite.taskId,
          hours,
          description: match.favorite.description || match.eventTitle
        });
        if (success) successCount++;
      }

      if (successCount > 0) {
        toast.success(`Created ${successCount} entries from events`);
      }
    } finally {
      isAdding = false;
    }
  }

  // Drag and Drop state
  let draggedId = $state<string | null>(null);
  let dragOverId = $state<string | null>(null);
  let dragGroup = $state<'regular' | 'event' | null>(null);

  function handleDragStart(e: DragEvent, id: string, group: 'regular' | 'event'): void {
    draggedId = id;
    dragGroup = group;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    }
  }

  function handleDragOver(e: DragEvent, id: string, group: 'regular' | 'event'): void {
    e.preventDefault();
    if (dragGroup === group && draggedId !== id) {
      dragOverId = id;
    }
  }

  function handleDragLeave(): void {
    dragOverId = null;
  }

  function handleDrop(e: DragEvent, targetId: string, group: 'regular' | 'event'): void {
    e.preventDefault();
    if (!draggedId || dragGroup !== group || draggedId === targetId) {
      resetDragState();
      return;
    }

    const list = group === 'regular' ? regularFavorites : eventFavorites;
    const currentIds = list.map((f) => f.id);

    const draggedIndex = currentIds.indexOf(draggedId);
    const targetIndex = currentIds.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      resetDragState();
      return;
    }

    const newIds = [...currentIds];
    newIds.splice(draggedIndex, 1);
    newIds.splice(targetIndex, 0, draggedId);

    const otherList = group === 'regular' ? eventFavorites : regularFavorites;
    const otherIds = otherList.map((f) => f.id);
    const allIds = group === 'regular' ? [...newIds, ...otherIds] : [...otherIds, ...newIds];

    reorderFavorites(allIds);
    resetDragState();
  }

  function handleDragEnd(): void {
    resetDragState();
  }

  function resetDragState(): void {
    draggedId = null;
    dragOverId = null;
    dragGroup = null;
  }

  function dragProps(id: string, group: 'regular' | 'event') {
    return {
      isDragged: draggedId === id,
      isDragOver: dragOverId === id,
      ondragstart: (e: DragEvent) => handleDragStart(e, id, group),
      ondragover: (e: DragEvent) => handleDragOver(e, id, group),
      ondragleave: handleDragLeave,
      ondrop: (e: DragEvent) => handleDrop(e, id, group),
      ondragend: handleDragEnd
    };
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Star class="size-4 text-warning" />
      <h3 class="text-sm font-semibold text-foreground">Favorites</h3>
    </div>
    <FavoriteModal mode="create">
      <button
        class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="Add favorite"
        aria-label="Add favorite"
      >
        <Plus class="size-3.5" />
      </button>
    </FavoriteModal>
  </div>

  {#if regularFavorites.length === 0 && eventFavorites.length === 0}
    <p class="text-xs text-muted-foreground">No favorites yet. Click + to add one.</p>
  {/if}

  <!-- Quick Favorites Section -->
  {#if regularFavorites.length > 0}
    <div class="space-y-1.5">
      <div class="flex items-center gap-1.5 px-1">
        <Calendar class="size-3 text-muted-foreground" />
        <span class="text-xs font-medium text-muted-foreground">Quick</span>
      </div>

      {#each regularFavorites as favorite (favorite.id)}
        <FavoriteItem {favorite} {...dragProps(favorite.id, 'regular')} />
      {/each}
    </div>
  {/if}

  <!-- Event Matching Section -->
  {#if eventFavorites.length > 0}
    <div class="space-y-1.5">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-1.5">
          <Star class="size-3 text-warning" />
          <span class="text-xs font-medium text-muted-foreground">Event Matching</span>
        </div>
        {#if hasMatchingEvents}
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <button
                  onclick={addAllFromEvents}
                  disabled={!canAddFromEvents}
                  class="rounded p-0.5 text-source-outlook hover:text-source-outlook hover:bg-source-outlook/10
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  aria-label="Add matching events to Moco"
                >
                  {#if isAdding}
                    <LoaderCircle class="size-3.5 animate-spin" />
                  {:else}
                    <CalendarCheck class="size-3.5" />
                  {/if}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" sideOffset={4}>
                Add {matchingEvents.length} matching event{matchingEvents.length !== 1 ? 's' : ''} to
                Moco
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        {/if}
      </div>

      {#each eventFavorites as favorite (favorite.id)}
        <FavoriteItem
          {favorite}
          matched={isMatched(favorite.id)}
          {...dragProps(favorite.id, 'event')}
        />
      {/each}
    </div>
  {/if}
</div>
