<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import ProjectCombobox from './ProjectCombobox.svelte';
  import TaskCombobox from './TaskCombobox.svelte';
  import RecentPairChips from './RecentPairChips.svelte';
  import TimeInput from '../common/TimeInput.svelte';
  import {
    fetchAssignedProjects,
    fetchTasksForProject,
    fetchProjectReport,
    getProjectById,
    getTasksForProject,
    getActiveProjects
  } from '../../stores/mocoProjects.svelte';
  import {
    createMocoActivity,
    updateMocoActivity,
    deleteMocoActivity
  } from '../../stores/timeEntries.svelte';
  import { addFavorite } from '../../stores/favorites.svelte';
  import { trackPairUsage } from '../../stores/recentMocoPairs.svelte';
  import { settingsState } from '../../stores/settings.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { untrack, type Snippet } from 'svelte';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import Star from '@lucide/svelte/icons/star';

  let {
    children,
    mode = 'create',
    prefill,
    activityId,
    onSuccess,
    onClose,
    defaultOpen = false
  }: {
    children?: Snippet;
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
    onSuccess?: () => void;
    onClose?: () => void;
    defaultOpen?: boolean;
  } = $props();

  let open = $state(defaultOpen);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let savedAsFavorite = $state(false);
  let showDeleteConfirm = $state(false);

  // Form state
  let date = $state('');
  let hours = $state(0);
  let description = $state('');
  let projectValue = $state('');
  let taskValue = $state('');
  let selectedProjectId = $state<number | null>(null);
  let projectInactiveWarning = $state(false);
  let taskInactiveWarning = $state(false);

  function resetForm(): void {
    date = prefill?.date ?? dateNavState.selectedDate;
    hours = prefill?.hours ?? 0;
    description = prefill?.description ?? '';
    projectValue = prefill?.projectId ? String(prefill.projectId) : '';
    taskValue = prefill?.taskId ? String(prefill.taskId) : '';
    selectedProjectId = prefill?.projectId ?? null;
    error = null;
    showDeleteConfirm = false;
    projectInactiveWarning = false;
    taskInactiveWarning = false;
  }

  // Sync open state with defaultOpen prop changes (only react to prop changes, not internal open state)
  let prevDefaultOpen = defaultOpen;
  $effect(() => {
    const newDefaultOpen = defaultOpen;
    untrack(() => {
      if (newDefaultOpen !== prevDefaultOpen) {
        prevDefaultOpen = newDefaultOpen;
        open = newDefaultOpen;
        if (newDefaultOpen) {
          resetForm();
          fetchAssignedProjects();
        }
      }
    });
  });

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (!isOpen) {
      onClose?.();
    }
    if (isOpen) {
      resetForm();
      fetchAssignedProjects().then(async () => {
        // Check if prefilled project is still active
        if (prefill?.projectId) {
          const activeProjects = getActiveProjects();
          const projectExists = activeProjects.some((p) => p.id === prefill.projectId);
          if (!projectExists) {
            projectInactiveWarning = true;
            projectValue = '';
            taskValue = '';
            selectedProjectId = null;
            return; // Don't check task if project is inactive
          }
        }

        if (selectedProjectId) {
          await fetchTasksForProject(selectedProjectId);
          await fetchProjectReport(selectedProjectId);
          // Check if prefilled task is still available (active)
          if (prefill?.taskId) {
            const tasks = getTasksForProject(selectedProjectId);
            const taskExists = tasks.some((t) => t.id === prefill.taskId);
            if (!taskExists) {
              taskInactiveWarning = true;
              taskValue = ''; // Clear invalid task
            }
          }
        }
      });
    }
  }

  function handleProjectSelect(projectId: number): void {
    const changed = selectedProjectId !== projectId;
    selectedProjectId = projectId;
    projectInactiveWarning = false;
    if (changed) {
      taskValue = '';
      taskInactiveWarning = false;
    }
    fetchTasksForProject(projectId);
    fetchProjectReport(projectId);
  }

  async function handleChipSelect(projectId: number, taskId: number): Promise<void> {
    projectValue = String(projectId);
    selectedProjectId = projectId;
    projectInactiveWarning = false;
    taskInactiveWarning = false;
    await fetchTasksForProject(projectId);
    await fetchProjectReport(projectId);
    taskValue = String(taskId);
  }

  // Clear warnings when user selects valid values
  $effect(() => {
    if (taskValue && taskInactiveWarning) {
      taskInactiveWarning = false;
    }
  });

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
        const success = await updateMocoActivity(
          activityId,
          {
            project_id: Number(projectValue),
            task_id: Number(taskValue),
            hours,
            description: description.trim() || undefined
          },
          date
        );

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

      // Track the project+task combination for quick selection
      const project = getProjectById(Number(projectValue));
      if (project) {
        const tasks = getTasksForProject(Number(projectValue));
        const task = tasks.find((t) => t.id === Number(taskValue));
        if (task) {
          trackPairUsage({
            projectId: project.id,
            taskId: task.id,
            projectName: project.name,
            taskName: task.name,
            customerName: project.customer.name
          });
        }
      }

      open = false;
      onClose?.();
      onSuccess?.();
    } finally {
      saving = false;
    }
  }

  function requestDelete(): void {
    showDeleteConfirm = true;
  }

  function cancelDelete(): void {
    showDeleteConfirm = false;
  }

  async function confirmDelete(): Promise<void> {
    if (!activityId) return;

    saving = true;
    error = null;

    try {
      const success = await deleteMocoActivity(activityId, date);
      if (success) {
        open = false;
        onClose?.();
      } else {
        error = 'Failed to delete entry.';
        showDeleteConfirm = false;
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
    setTimeout(() => {
      savedAsFavorite = false;
    }, 2000);
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpen}>
  {#if children}
    <Dialog.Trigger>
      {#snippet child({ props })}
        <div {...props} style="display: contents;">
          {@render children()}
        </div>
      {/snippet}
    </Dialog.Trigger>
  {/if}
  <Dialog.Content class="sm:max-w-md max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>{mode === 'edit' ? 'Edit Moco Entry' : 'New Moco Entry'}</Dialog.Title>
      <Dialog.Description>
        {mode === 'edit' ? 'Update the time entry.' : 'Create a new time entry in Moco.'}
      </Dialog.Description>
    </Dialog.Header>

    {#if showDeleteConfirm}
      <!-- Delete Confirmation -->
      <div class="py-4 space-y-4">
        <div class="flex items-center gap-3 p-3 rounded-lg bg-danger-subtle">
          <AlertTriangle class="size-6 text-danger-text flex-shrink-0" />
          <p class="text-sm text-danger-text">
            Are you sure you want to delete this entry? This action cannot be undone.
          </p>
        </div>

        {#if error}
          <p class="text-sm text-danger-text">{error}</p>
        {/if}

        <div class="flex gap-2">
          <button
            type="button"
            onclick={cancelDelete}
            disabled={saving}
            class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground
              hover:bg-accent active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={confirmDelete}
            disabled={saving}
            class="flex-1 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-danger-foreground
              hover:bg-danger/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {saving ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    {:else}
      {#if mode === 'create' && settingsState.showQuickSelection}
        <RecentPairChips onSelect={handleChipSelect} />
      {/if}
      <form onsubmit={handleSubmit} class="space-y-4 py-4">
        <!-- Project -->
        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-sm font-medium text-foreground mb-1">Project</label>
          <ProjectCombobox bind:value={projectValue} onSelect={handleProjectSelect} />
          {#if projectInactiveWarning}
            <p class="mt-1 text-xs text-warning-text">
              The previously selected project is no longer active. Please select a different
              project.
            </p>
          {/if}
        </div>

        <!-- Task -->
        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-sm font-medium text-foreground mb-1">Task</label>
          <TaskCombobox projectId={selectedProjectId} bind:value={taskValue} />
          {#if taskInactiveWarning}
            <p class="mt-1 text-xs text-warning-text">
              The previously selected task is no longer active. Please select a different task.
            </p>
          {/if}
        </div>

        <!-- Date & Hours -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="moco-date" class="block text-sm font-medium text-foreground mb-1"
              >Date</label
            >
            <input
              id="moco-date"
              type="date"
              bind:value={date}
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
                focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
            />
          </div>
          <div>
            <label for="moco-hours" class="block text-sm font-medium text-foreground mb-1"
              >Duration</label
            >
            <TimeInput id="moco-hours" bind:value={hours} showStepButtons />
          </div>
        </div>

        <!-- Description -->
        <div>
          <label for="moco-desc" class="block text-sm font-medium text-foreground mb-1"
            >Description</label
          >
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
              disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            title={savedAsFavorite ? 'Saved!' : 'Save as Favorite'}
          >
            <Star
              class="size-4 {savedAsFavorite ? 'text-warning' : ''}"
              fill={savedAsFavorite ? 'currentColor' : 'none'}
            />
          </button>
          <button
            type="submit"
            disabled={saving || !projectValue || !taskValue || !date || hours <= 0}
            class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}
          </button>
          {#if mode === 'edit' && activityId}
            <button
              type="button"
              onclick={requestDelete}
              disabled={saving}
              class="rounded-lg border border-border-danger px-4 py-2.5 text-sm font-medium text-danger-text
                hover:bg-danger-subtle active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Delete
            </button>
          {/if}
        </div>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>
