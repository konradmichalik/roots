<script lang="ts">
  import ProjectCombobox from '../moco/ProjectCombobox.svelte';
  import TaskCombobox from '../moco/TaskCombobox.svelte';
  import { addFavorite, updateFavorite } from '../../stores/favorites.svelte';
  import {
    fetchAssignedProjects,
    fetchTasksForProject,
    getProjectById,
    getTasksForProject
  } from '../../stores/mocoProjects.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import type { Favorite } from '../../types';

  let {
    onSave,
    onCancel,
    editFavorite
  }: {
    onSave: () => void;
    onCancel: () => void;
    editFavorite?: Favorite;
  } = $props();

  let name = $state('');
  let projectValue = $state('');
  let taskValue = $state('');
  let selectedProjectId = $state<number | null>(null);
  let defaultHours = $state(0);
  let description = $state('');
  // Initialize form state from editFavorite prop
  $effect.pre(() => {
    const fav = editFavorite;
    name = fav?.name ?? '';
    projectValue = fav ? String(fav.projectId) : '';
    taskValue = fav ? String(fav.taskId) : '';
    selectedProjectId = fav?.projectId ?? null;
    defaultHours = fav?.defaultHours ?? 0;
    description = fav?.description ?? '';
  });

  let isMocoConnected = $derived(connectionsState.moco.isConnected);

  $effect(() => {
    if (isMocoConnected) {
      fetchAssignedProjects().then(() => {
        if (selectedProjectId) fetchTasksForProject(selectedProjectId);
      });
    }
  });

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

    const data = {
      name: name.trim(),
      projectId: project.id,
      taskId: task.id,
      projectName: project.name,
      taskName: task.name,
      customerName: project.customer.name,
      defaultHours: defaultHours > 0 ? defaultHours : undefined,
      description: description.trim() || undefined
    };

    if (editFavorite) {
      updateFavorite(editFavorite.id, data);
    } else {
      addFavorite(data);
    }

    onSave();
  }
</script>

{#if !isMocoConnected}
  <div class="rounded-lg border border-border bg-muted/30 p-3">
    <p class="text-xs text-muted-foreground">Connect Moco to create favorites.</p>
  </div>
{:else}
  <form onsubmit={handleSubmit} class="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
    <div>
      <label for="fav-name" class="block text-xs font-medium text-foreground mb-1">Name</label>
      <input
        id="fav-name"
        type="text"
        bind:value={name}
        placeholder="e.g. Daily Standup"
        class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground
					focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
      />
    </div>

    <div>
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-xs font-medium text-foreground mb-1">Project</label>
      <ProjectCombobox bind:value={projectValue} onSelect={handleProjectSelect} />
    </div>

    <div>
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="block text-xs font-medium text-foreground mb-1">Task</label>
      <TaskCombobox projectId={selectedProjectId} bind:value={taskValue} />
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div>
        <label for="fav-hours" class="block text-xs font-medium text-foreground mb-1"
          >Hours (optional)</label
        >
        <input
          id="fav-hours"
          type="number"
          min="0"
          max="24"
          step="0.25"
          bind:value={defaultHours}
          class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground font-mono
						focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
        />
      </div>
      <div>
        <label for="fav-desc" class="block text-xs font-medium text-foreground mb-1"
          >Description</label
        >
        <input
          id="fav-desc"
          type="text"
          bind:value={description}
          placeholder="Optional"
          class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground
						focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <button
        type="submit"
        disabled={!name.trim() || !projectValue || !taskValue}
        class="flex-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground
					hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
      >
        {editFavorite ? 'Update' : 'Save'}
      </button>
      <button
        type="button"
        onclick={onCancel}
        class="rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-foreground
					hover:bg-secondary active:scale-[0.98] transition-all duration-150"
      >
        Cancel
      </button>
    </div>
  </form>
{/if}
