<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import ProjectCombobox from '../moco/ProjectCombobox.svelte';
  import TaskCombobox from '../moco/TaskCombobox.svelte';
  import { startTimer } from '../../stores/timer.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import {
    fetchAssignedProjects,
    fetchTasksForProject,
    getProjectById,
    getTasksForProject
  } from '../../stores/mocoProjects.svelte';
  import type { Snippet } from 'svelte';
  import type { TimerMocoBooking } from '../../types';

  let { children }: { children: Snippet } = $props();

  let open = $state(false);
  let projectValue = $state('');
  let taskValue = $state('');
  let selectedProjectId = $state<number | null>(null);
  let description = $state('');

  const isMocoConnected = $derived(connectionsState.moco.isConnected);

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (isOpen) {
      resetForm();
      if (isMocoConnected) {
        fetchAssignedProjects();
      }
    }
  }

  function resetForm(): void {
    projectValue = '';
    taskValue = '';
    selectedProjectId = null;
    description = '';
  }

  function handleProjectSelect(projectId: number): void {
    const changed = selectedProjectId !== projectId;
    selectedProjectId = projectId;
    if (changed) {
      taskValue = '';
    }
    fetchTasksForProject(projectId);
  }

  function handleStartWithProject(): void {
    if (!projectValue || !taskValue) return;

    const project = getProjectById(Number(projectValue));
    if (!project) return;

    const tasks = getTasksForProject(Number(projectValue));
    const task = tasks.find((t) => t.id === Number(taskValue));
    if (!task) return;

    const booking: TimerMocoBooking = {
      projectId: project.id,
      taskId: task.id,
      projectName: project.name,
      taskName: task.name,
      customerName: project.customer.name,
      description: description.trim() || undefined
    };

    startTimer(booking);
    open = false;
  }

  function handleStartWithoutProject(): void {
    startTimer();
    open = false;
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
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Start Timer</Dialog.Title>
      <Dialog.Description>Optionally select a project to track time against.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      {#if isMocoConnected}
        <!-- Project -->
        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-sm font-medium text-foreground mb-1">Project (optional)</label>
          <ProjectCombobox bind:value={projectValue} onSelect={handleProjectSelect} />
        </div>

        <!-- Task -->
        {#if selectedProjectId}
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-foreground mb-1">Task</label>
            <TaskCombobox projectId={selectedProjectId} bind:value={taskValue} />
          </div>
        {/if}

        <!-- Description -->
        {#if projectValue && taskValue}
          <div>
            <label for="timer-desc" class="block text-sm font-medium text-foreground mb-1"
              >Note (optional)</label
            >
            <input
              id="timer-desc"
              type="text"
              bind:value={description}
              placeholder="What will you work on?"
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
            />
          </div>
        {/if}
      {:else}
        <p class="text-sm text-muted-foreground">Connect to Moco to track time against projects.</p>
      {/if}

      <!-- Actions -->
      <div class="space-y-2 pt-2">
        {#if projectValue && taskValue}
          <button
            onclick={handleStartWithProject}
            class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
          >
            Start with Project
          </button>
        {/if}

        <button
          onclick={handleStartWithoutProject}
          class="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground
            hover:bg-accent active:scale-[0.98] transition-all duration-150"
        >
          {projectValue && taskValue ? 'Start without Project' : 'Start Timer'}
        </button>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
