<script lang="ts">
  import MocoEntryModal from '../moco/MocoEntryModal.svelte';
  import FavoriteModal from '../favorites/FavoriteModal.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { formatHours } from '../../utils/time-format';
  import type { Favorite } from '../../types';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import Pencil from '@lucide/svelte/icons/pencil';

  let {
    favorite,
    isDragged = false,
    isDragOver = false,
    ondragstart,
    ondragover,
    ondragleave,
    ondrop,
    ondragend
  }: {
    favorite: Favorite;
    isDragged?: boolean;
    isDragOver?: boolean;
    ondragstart?: (e: DragEvent) => void;
    ondragover?: (e: DragEvent) => void;
    ondragleave?: () => void;
    ondrop?: (e: DragEvent) => void;
    ondragend?: () => void;
  } = $props();
</script>

<div
  class="group/fav relative rounded-lg border bg-card transition-all duration-150
    {isDragged
    ? 'opacity-50 border-dashed border-primary'
    : isDragOver
      ? 'border-primary bg-primary/5'
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
            <span class="text-sm font-medium text-foreground truncate">{favorite.name}</span>
            {#if favorite.defaultHours}
              <span class="text-xs font-mono text-muted-foreground ml-auto flex-shrink-0 pr-5">
                {formatHours(favorite.defaultHours)}
              </span>
            {/if}
          </div>
          {#if favorite.description}
            <p class="text-xs text-foreground/80 truncate">{favorite.description}</p>
          {/if}
          <p class="text-xs text-muted-foreground truncate">
            {favorite.customerName} — {favorite.projectName}
          </p>
        </div>
      </div>
    </button>
  </MocoEntryModal>

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
