<script lang="ts">
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import FavoriteModal from '../favorites/FavoriteModal.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { formatHours } from '../../utils/time-format';
  import type { Favorite } from '../../types';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import Pencil from '@lucide/svelte/icons/pencil';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import XCircle from '@lucide/svelte/icons/x-circle';

  let {
    favorite,
    matched = null,
    isDragged = false,
    isDragOver = false,
    ondragstart,
    ondragover,
    ondragleave,
    ondrop,
    ondragend
  }: {
    favorite: Favorite;
    /** null = regular (no match concept), true = event matched, false = event unmatched */
    matched?: boolean | null;
    isDragged?: boolean;
    isDragOver?: boolean;
    ondragstart?: (e: DragEvent) => void;
    ondragover?: (e: DragEvent) => void;
    ondragleave?: () => void;
    ondrop?: (e: DragEvent) => void;
    ondragend?: () => void;
  } = $props();

  let isEventFavorite = $derived(matched !== null);
  let isMatched = $derived(matched === true);
  let isUnmatched = $derived(matched === false);
</script>

<div
  class="group/fav relative rounded-lg border bg-card transition-all duration-150
    {isDragged
    ? 'opacity-50 border-dashed border-primary'
    : isDragOver
      ? 'border-primary bg-primary/5'
      : isUnmatched
        ? 'border-border/50 opacity-50'
        : 'border-border hover:border-border-bold'}"
  draggable="true"
  {ondragstart}
  {ondragover}
  {ondragleave}
  {ondrop}
  {ondragend}
  role="listitem"
>
  <!-- Drag Handle -->
  <div
    class="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/fav:opacity-100 transition-opacity"
  >
    <GripVertical class="size-3 text-muted-foreground" />
  </div>

  {#if !isEventFavorite || isMatched}
    <!-- Regular or matched event: open MocoEntryModal -->
    <MocoEntryModal
      mode="create"
      prefill={{
        date: dateNavState.selectedDate,
        hours: favorite.defaultHours ?? 0,
        description: favorite.description ?? '',
        projectId: favorite.projectId,
        taskId: favorite.taskId
      }}
    >
      <button class="w-full text-left p-2.5 pl-5 cursor-pointer">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              {#if isMatched}
                <CircleCheck class="size-3 text-success flex-shrink-0" />
              {/if}
              <span class="text-sm font-medium text-foreground truncate">{favorite.name}</span>
              {#if favorite.defaultHours}
                <span class="text-xs font-mono text-muted-foreground ml-auto flex-shrink-0 pr-5">
                  {formatHours(favorite.defaultHours)}
                </span>
              {/if}
            </div>
            {#if favorite.description}
              <p class="text-xs text-foreground/80 truncate {isMatched ? 'pl-[18px]' : ''}">
                {favorite.description}
              </p>
            {/if}
            <p class="text-xs text-muted-foreground truncate {isMatched ? 'pl-[18px]' : ''}">
              {favorite.customerName} — {favorite.projectName}
            </p>
            {#if isMatched && favorite.eventMatch}
              <p class="text-xs text-warning/70 truncate pl-[18px]">
                {favorite.eventMatch.matchType === 'exact'
                  ? '='
                  : favorite.eventMatch.matchType === 'startsWith'
                    ? '^'
                    : '~'}
                {favorite.eventMatch.pattern}
              </p>
            {/if}
          </div>
        </div>
      </button>
    </MocoEntryModal>
  {:else}
    <!-- Unmatched event: open FavoriteModal for editing -->
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger class="w-full">
          <FavoriteModal mode="edit" editFavorite={favorite}>
            <button class="w-full text-left p-2.5 pl-5 cursor-pointer">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <XCircle class="size-3 text-muted-foreground flex-shrink-0" />
                    <span class="text-sm font-medium text-foreground truncate">{favorite.name}</span>
                    {#if favorite.defaultHours}
                      <span class="text-xs font-mono text-muted-foreground ml-auto flex-shrink-0 pr-5">
                        {formatHours(favorite.defaultHours)}
                      </span>
                    {/if}
                  </div>
                  {#if favorite.description}
                    <p class="text-xs text-foreground/80 truncate pl-[18px]">
                      {favorite.description}
                    </p>
                  {/if}
                  <p class="text-xs text-muted-foreground truncate pl-[18px]">
                    {favorite.customerName} — {favorite.projectName}
                  </p>
                  {#if favorite.eventMatch}
                    <p class="text-xs text-muted-foreground/50 truncate pl-[18px]">
                      {favorite.eventMatch.matchType === 'exact'
                        ? '='
                        : favorite.eventMatch.matchType === 'startsWith'
                          ? '^'
                          : '~'}
                      {favorite.eventMatch.pattern}
                    </p>
                  {/if}
                </div>
              </div>
            </button>
          </FavoriteModal>
        </Tooltip.Trigger>
        <Tooltip.Content side="right" sideOffset={4}>
          No matching event today — click to edit
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  {/if}

  <!-- Edit overlay -->
  <div
    class="absolute top-1.5 right-1.5 opacity-0 group-hover/fav:opacity-100 flex items-center gap-0.5 transition-opacity duration-150"
  >
    <FavoriteModal mode="edit" editFavorite={favorite}>
      <button
        type="button"
        class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        title="Edit favorite"
        aria-label="Edit favorite"
      >
        <Pencil class="size-3" />
      </button>
    </FavoriteModal>
  </div>
</div>
