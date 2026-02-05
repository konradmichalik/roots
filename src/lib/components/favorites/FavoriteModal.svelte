<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import ProjectCombobox from '../moco/ProjectCombobox.svelte';
  import TaskCombobox from '../moco/TaskCombobox.svelte';
  import TimeInput from '../common/TimeInput.svelte';
  import { addFavorite, updateFavorite, removeFavorite } from '../../stores/favorites.svelte';
  import {
    fetchAssignedProjects,
    fetchTasksForProject,
    getProjectById,
    getTasksForProject
  } from '../../stores/mocoProjects.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import type { Favorite, FavoriteEventMatch } from '../../types';
  import type { Snippet } from 'svelte';

  let {
    children,
    mode = 'create',
    editFavorite
  }: {
    children: Snippet;
    mode?: 'create' | 'edit';
    editFavorite?: Favorite;
  } = $props();

  let open = $state(false);
  let showDeleteConfirm = $state(false);

  // Form state
  let name = $state('');
  let projectValue = $state('');
  let taskValue = $state('');
  let selectedProjectId = $state<number | null>(null);
  let defaultHours = $state(0);
  let description = $state('');
  let enableEventMatch = $state(false);
  let matchPattern = $state('');
  let matchType = $state<FavoriteEventMatch['matchType']>('contains');

  let isMocoConnected = $derived(connectionsState.moco.isConnected);

  function resetForm(): void {
    if (mode === 'edit' && editFavorite) {
      name = editFavorite.name;
      projectValue = String(editFavorite.projectId);
      taskValue = String(editFavorite.taskId);
      selectedProjectId = editFavorite.projectId;
      defaultHours = editFavorite.defaultHours ?? 0;
      description = editFavorite.description ?? '';
      enableEventMatch = !!editFavorite.eventMatch;
      matchPattern = editFavorite.eventMatch?.pattern ?? '';
      matchType = editFavorite.eventMatch?.matchType ?? 'contains';
    } else {
      name = '';
      projectValue = '';
      taskValue = '';
      selectedProjectId = null;
      defaultHours = 0;
      description = '';
      enableEventMatch = false;
      matchPattern = '';
      matchType = 'contains';
    }
    showDeleteConfirm = false;
  }

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (isOpen) {
      resetForm();
      if (isMocoConnected) {
        fetchAssignedProjects().then(() => {
          if (selectedProjectId) {
            fetchTasksForProject(selectedProjectId);
          }
        });
      }
    }
  }

  function handleProjectSelect(projectId: number): void {
    const changed = selectedProjectId !== projectId;
    selectedProjectId = projectId;
    if (changed) {
      taskValue = '';
    }
    fetchTasksForProject(projectId);
  }

  function handleSubmit(e: Event): void {
    e.preventDefault();
    if (!name.trim() || !projectValue || !taskValue) return;

    const project = getProjectById(Number(projectValue));
    if (!project) return;

    const tasks = getTasksForProject(Number(projectValue));
    const task = tasks.find((t) => t.id === Number(taskValue));
    if (!task) return;

    const eventMatch: FavoriteEventMatch | undefined =
      enableEventMatch && matchPattern.trim()
        ? { pattern: matchPattern.trim(), matchType }
        : undefined;

    if (mode === 'edit' && editFavorite) {
      updateFavorite(editFavorite.id, {
        name: name.trim(),
        projectId: project.id,
        taskId: task.id,
        projectName: project.name,
        taskName: task.name,
        customerName: project.customer.name,
        defaultHours: defaultHours > 0 ? defaultHours : undefined,
        description: description.trim() || undefined,
        eventMatch
      });
    } else {
      addFavorite({
        name: name.trim(),
        projectId: project.id,
        taskId: task.id,
        projectName: project.name,
        taskName: task.name,
        customerName: project.customer.name,
        defaultHours: defaultHours > 0 ? defaultHours : undefined,
        description: description.trim() || undefined,
        eventMatch
      });
    }

    open = false;
  }

  function requestDelete(): void {
    showDeleteConfirm = true;
  }

  function cancelDelete(): void {
    showDeleteConfirm = false;
  }

  function confirmDelete(): void {
    if (editFavorite) {
      removeFavorite(editFavorite.id);
      open = false;
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpen}>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <div {...props} style="display: contents;">
        {#if children}
          {@render children()}
        {/if}
      </div>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-md max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>{mode === 'edit' ? 'Edit Favorite' : 'Add Favorite'}</Dialog.Title>
      <Dialog.Description>
        {mode === 'edit'
          ? 'Update or remove this favorite booking.'
          : 'Create a quick booking template for common tasks.'}
      </Dialog.Description>
    </Dialog.Header>

    {#if !isMocoConnected}
      <div class="py-4">
        <p class="text-sm text-muted-foreground">Connect Moco to manage favorites.</p>
      </div>
    {:else if showDeleteConfirm}
      <div class="py-4 space-y-4">
        <div class="flex items-center gap-3 p-3 rounded-lg bg-danger-subtle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 text-danger-text flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p class="text-sm text-danger-text">
            Are you sure you want to delete this favorite? This action cannot be undone.
          </p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={cancelDelete}
            class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground
              hover:bg-accent transition-all duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={confirmDelete}
            class="flex-1 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-danger-foreground
              hover:bg-danger/90 transition-all duration-150"
          >
            Delete
          </button>
        </div>
      </div>
    {:else}
      <form onsubmit={handleSubmit} class="space-y-4 py-4">
        <div>
          <label for="fav-name" class="block text-sm font-medium text-foreground mb-1">Name</label>
          <input
            id="fav-name"
            type="text"
            bind:value={name}
            placeholder="e.g. Daily Standup"
            class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
          />
        </div>

        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-sm font-medium text-foreground mb-1">Project</label>
          <ProjectCombobox bind:value={projectValue} onSelect={handleProjectSelect} />
        </div>

        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-sm font-medium text-foreground mb-1">Task</label>
          <TaskCombobox projectId={selectedProjectId} bind:value={taskValue} />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="fav-hours" class="block text-sm font-medium text-foreground mb-1"
              >Default Duration</label
            >
            <TimeInput id="fav-hours" bind:value={defaultHours} />
          </div>
          <div>
            <label for="fav-desc" class="block text-sm font-medium text-foreground mb-1"
              >Description</label
            >
            <input
              id="fav-desc"
              type="text"
              bind:value={description}
              placeholder="Optional"
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
            />
          </div>
        </div>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" bind:checked={enableEventMatch} class="accent-primary" />
          <span class="text-sm text-foreground">Auto-match Outlook events</span>
        </label>

        {#if enableEventMatch}
          <div class="space-y-3 pl-4 border-l-2 border-warning/30">
            <div>
              <label for="fav-pattern" class="block text-sm font-medium text-foreground mb-1"
                >Pattern</label
              >
              <input
                id="fav-pattern"
                type="text"
                bind:value={matchPattern}
                placeholder="e.g. Daily"
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
              />
            </div>
            <div>
              <label for="fav-match-type" class="block text-sm font-medium text-foreground mb-1"
                >Match type</label
              >
              <select
                id="fav-match-type"
                bind:value={matchType}
                class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
                  focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
              >
                <option value="contains">Contains</option>
                <option value="exact">Exact match</option>
                <option value="startsWith">Starts with</option>
              </select>
            </div>
          </div>
        {/if}

        <div class="flex items-center gap-2">
          <button
            type="submit"
            disabled={!name.trim() || !projectValue || !taskValue}
            class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          >
            {mode === 'edit' ? 'Update' : 'Save'}
          </button>
          {#if mode === 'edit'}
            <button
              type="button"
              onclick={requestDelete}
              class="rounded-lg border border-border-danger px-4 py-2.5 text-sm font-medium text-danger-text
                hover:bg-danger-subtle transition-all duration-150"
            >
              Delete
            </button>
          {/if}
        </div>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>
