<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import ProjectCombobox from './ProjectCombobox.svelte';
  import TaskCombobox from './TaskCombobox.svelte';
  import { fetchAssignedProjects, fetchTasksForProject, getProjectById, getTasksForProject } from '../../stores/mocoProjects.svelte';
  import { createMocoActivity, updateMocoActivity, deleteMocoActivity } from '../../stores/timeEntries.svelte';
  import { addFavorite } from '../../stores/favorites.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import type { Snippet } from 'svelte';

  let { children, mode = 'create', prefill, activityId }: {
    children: Snippet;
    mode?: 'create' | 'edit';
    prefill?: {
      date?: string;
      hours?: number;
      description?: string;
      projectId?: number;
      taskId?: number;
      remoteService?: string;
      remoteId?: string;
    };
    activityId?: number;
  } = $props();

  let open = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let savedAsFavorite = $state(false);

  // Form state
  let date = $state('');
  let hours = $state(0);
  let description = $state('');
  let projectValue = $state('');
  let taskValue = $state('');
  let selectedProjectId = $state<number | null>(null);

  function resetForm(): void {
    date = prefill?.date ?? dateNavState.selectedDate;
    hours = prefill?.hours ?? 0;
    description = prefill?.description ?? '';
    projectValue = prefill?.projectId ? String(prefill.projectId) : '';
    taskValue = prefill?.taskId ? String(prefill.taskId) : '';
    selectedProjectId = prefill?.projectId ?? null;
    error = null;
  }

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (isOpen) {
      resetForm();
      fetchAssignedProjects().then(() => {
        if (selectedProjectId) {
          fetchTasksForProject(selectedProjectId);
        }
      });
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

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!projectValue || !taskValue || !date || hours <= 0) {
      error = 'Please fill in all required fields.';
      return;
    }

    saving = true;
    error = null;

    try {
      if (mode === 'edit' && activityId) {
        const success = await updateMocoActivity(activityId, {
          project_id: Number(projectValue),
          task_id: Number(taskValue),
          hours,
          description: description.trim() || undefined
        }, date);

        if (!success) {
          error = 'Failed to update entry.';
          return;
        }
      } else {
        const payload = {
          date,
          project_id: Number(projectValue),
          task_id: Number(taskValue),
          hours,
          description: description.trim() || undefined,
          remote_service: prefill?.remoteService,
          remote_id: prefill?.remoteId
        };

        const success = await createMocoActivity(payload);
        if (!success) {
          error = 'Failed to create entry.';
          return;
        }
      }

      open = false;
    } finally {
      saving = false;
    }
  }

  async function handleDelete(): Promise<void> {
    if (!activityId) return;

    saving = true;
    error = null;

    try {
      const success = await deleteMocoActivity(activityId, date);
      if (success) {
        open = false;
      } else {
        error = 'Failed to delete entry.';
      }
    } finally {
      saving = false;
    }
  }

  function handleSaveAsFavorite(): void {
    if (!projectValue || !taskValue) return;

    const project = getProjectById(Number(projectValue));
    if (!project) return;

    const tasks = getTasksForProject(Number(projectValue));
    const task = tasks.find((t) => t.id === Number(taskValue));
    if (!task) return;

    addFavorite({
      name: `${project.name} — ${task.name}`,
      projectId: project.id,
      taskId: task.id,
      projectName: project.name,
      taskName: task.name,
      customerName: project.customer.name,
      defaultHours: hours > 0 ? hours : undefined,
      description: description.trim() || undefined
    });

    savedAsFavorite = true;
    setTimeout(() => { savedAsFavorite = false; }, 2000);
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
      <Dialog.Title>{mode === 'edit' ? 'Edit Moco Entry' : 'New Moco Entry'}</Dialog.Title>
      <Dialog.Description>
        {mode === 'edit' ? 'Update the time entry.' : 'Create a new time entry in Moco.'}
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleSubmit} class="space-y-4 py-4">
      <!-- Project -->
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">Project</label>
        <ProjectCombobox bind:value={projectValue} onSelect={handleProjectSelect} />
      </div>

      <!-- Task -->
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">Task</label>
        <TaskCombobox projectId={selectedProjectId} bind:value={taskValue} />
      </div>

      <!-- Date & Hours -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="moco-date" class="block text-sm font-medium text-foreground mb-1">Date</label>
          <input
            id="moco-date"
            type="date"
            bind:value={date}
            class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
              focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
          />
        </div>
        <div>
          <label for="moco-hours" class="block text-sm font-medium text-foreground mb-1">Hours</label>
          <input
            id="moco-hours"
            type="number"
            min="0"
            max="24"
            step="0.25"
            bind:value={hours}
            class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono
              focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
          />
        </div>
      </div>

      <!-- Description -->
      <div>
        <label for="moco-desc" class="block text-sm font-medium text-foreground mb-1">Description</label>
        <textarea
          id="moco-desc"
          bind:value={description}
          rows={3}
          placeholder="What did you work on?"
          class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none
            focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
        ></textarea>
      </div>

      {#if error}
        <p class="text-sm text-danger-text">{error}</p>
      {/if}

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={handleSaveAsFavorite}
          disabled={!projectValue || !taskValue || savedAsFavorite}
          class="rounded-lg border border-input p-2.5 text-muted-foreground
            hover:text-warning hover:border-warning/50 hover:bg-warning/5
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          title={savedAsFavorite ? 'Saved!' : 'Save as Favorite'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 {savedAsFavorite ? 'text-warning' : ''}" viewBox="0 0 24 24" fill={savedAsFavorite ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
        <button
          type="submit"
          disabled={saving || !projectValue || !taskValue || !date || hours <= 0}
          class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
            hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
        >
          {saving ? 'Saving...' : (mode === 'edit' ? 'Update' : 'Create')}
        </button>
        {#if mode === 'edit' && activityId}
          <button
            type="button"
            onclick={handleDelete}
            disabled={saving}
            class="rounded-lg border border-border-danger px-4 py-2.5 text-sm font-medium text-danger-text
              hover:bg-danger-subtle active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          >
            Delete
          </button>
        {/if}
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>
