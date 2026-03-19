<script lang="ts">
  import FavoriteItem from './FavoriteItem.svelte';
  import FavoriteModal from '../favorites/FavoriteModal.svelte';
  import { getSortedFavorites, reorderFavorites } from '../../stores/favorites.svelte';
  import Star from '@lucide/svelte/icons/star';
  import Plus from '@lucide/svelte/icons/plus';

  let favorites = $derived(getSortedFavorites());

  // Drag and Drop state
  let draggedId = $state<string | null>(null);
  let dragOverId = $state<string | null>(null);

  function handleDragStart(e: DragEvent, id: string): void {
    draggedId = id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    }
  }

  function handleDragOver(e: DragEvent, id: string): void {
    e.preventDefault();
    if (draggedId !== id) {
      dragOverId = id;
    }
  }

  function handleDragLeave(): void {
    dragOverId = null;
  }

  function handleDrop(e: DragEvent, targetId: string): void {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      resetDragState();
      return;
    }

    const currentIds = favorites.map((f) => f.id);
    const draggedIndex = currentIds.indexOf(draggedId);
    const targetIndex = currentIds.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      resetDragState();
      return;
    }

    const newIds = [...currentIds];
    newIds.splice(draggedIndex, 1);
    newIds.splice(targetIndex, 0, draggedId);

    reorderFavorites(newIds);
    resetDragState();
  }

  function handleDragEnd(): void {
    resetDragState();
  }

  function resetDragState(): void {
    draggedId = null;
    dragOverId = null;
  }

  function dragProps(id: string) {
    return {
      isDragged: draggedId === id,
      isDragOver: dragOverId === id,
      ondragstart: (e: DragEvent) => handleDragStart(e, id),
      ondragover: (e: DragEvent) => handleDragOver(e, id),
      ondragleave: handleDragLeave,
      ondrop: (e: DragEvent) => handleDrop(e, id),
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

  {#if favorites.length === 0}
    <p class="text-xs text-muted-foreground">No favorites yet. Click + to add one.</p>
  {:else}
    <div class="space-y-1.5">
      {#each favorites as favorite (favorite.id)}
        <FavoriteItem {favorite} {...dragProps(favorite.id)} />
      {/each}
    </div>
  {/if}
</div>
