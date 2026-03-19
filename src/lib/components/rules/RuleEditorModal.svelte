<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import ProjectCombobox from '../moco/ProjectCombobox.svelte';
  import TaskCombobox from '../moco/TaskCombobox.svelte';
  import JiraSourceForm from './JiraSourceForm.svelte';
  import OutlookSourceForm from './OutlookSourceForm.svelte';
  import { addRule, updateRule, removeRule, findOverlappingRules } from '../../stores/rules.svelte';
  import {
    fetchAssignedProjects,
    fetchTasksForProject,
    getProjectById,
    getTasksForProject
  } from '../../stores/mocoProjects.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import {
    renderDescriptionTemplate,
    buildExampleVariables,
    JIRA_TEMPLATE_VARIABLES,
    OUTLOOK_TEMPLATE_VARIABLES,
    DEFAULT_JIRA_TEMPLATE,
    DEFAULT_OUTLOOK_TEMPLATE
  } from '../../utils/description-template';
  import type { Rule, SourceMatcher, OutlookSourceMatcher } from '../../types';
  import { Switch } from '../ui/switch';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import { onMount } from 'svelte';

  let {
    mode = 'create',
    editRule,
    prefill,
    defaultOpen = false,
    onClose
  }: {
    mode?: 'create' | 'edit';
    editRule?: Rule;
    prefill?: { source?: SourceMatcher };
    defaultOpen?: boolean;
    onClose?: () => void;
  } = $props();

  let open = $state(defaultOpen);
  let showDeleteConfirm = $state(false);

  // Form state
  let name = $state('');
  let sourceType = $state<'jira' | 'outlook'>('jira');

  // Jira source
  let jiraProjectKey = $state('');
  let jiraIssuePattern = $state('');

  // Outlook source
  let outlookPattern = $state('');
  let outlookMatchType = $state<OutlookSourceMatcher['matchType']>('contains');
  let overrideHours = $state(0);

  // Target
  let projectValue = $state('');
  let taskValue = $state('');
  let selectedProjectId = $state<number | null>(null);

  // Options
  let descriptionTemplate = $state('');
  let autoSync = $state(false);
  let enabled = $state(true);

  // Derived
  let isMocoConnected = $derived(connectionsState.moco.isConnected);

  let templateVars = $derived(
    sourceType === 'jira' ? JIRA_TEMPLATE_VARIABLES : OUTLOOK_TEMPLATE_VARIABLES
  );

  let templatePreview = $derived(
    descriptionTemplate
      ? renderDescriptionTemplate(descriptionTemplate, buildExampleVariables(sourceType))
      : ''
  );

  let currentSource = $derived.by((): SourceMatcher => {
    if (sourceType === 'jira') {
      return {
        type: 'jira',
        connectionId: 'default',
        projectKey: jiraProjectKey,
        issuePattern: jiraIssuePattern || undefined
      };
    }
    return {
      type: 'outlook',
      eventPattern: outlookPattern,
      matchType: outlookMatchType,
      overrideHours: overrideHours > 0 ? overrideHours : undefined
    };
  });

  let overlappingRules = $derived(findOverlappingRules(currentSource, editRule?.id));

  let isFormValid = $derived.by(() => {
    if (!name.trim()) return false;
    if (!projectValue || !taskValue) return false;
    if (sourceType === 'jira' && !jiraProjectKey.trim()) return false;
    if (sourceType === 'outlook' && !outlookPattern.trim()) return false;
    return true;
  });

  function resetForm(): void {
    if (mode === 'edit' && editRule) {
      name = editRule.name;
      sourceType = editRule.source.type;
      descriptionTemplate = editRule.descriptionTemplate;
      autoSync = editRule.autoSync;
      enabled = editRule.enabled;
      projectValue = String(editRule.target.mocoProjectId);
      taskValue = String(editRule.target.mocoTaskId);
      selectedProjectId = editRule.target.mocoProjectId;

      if (editRule.source.type === 'jira') {
        jiraProjectKey = editRule.source.projectKey;
        jiraIssuePattern = editRule.source.issuePattern ?? '';
        outlookPattern = '';
        outlookMatchType = 'contains';
        overrideHours = 0;
      } else {
        outlookPattern = editRule.source.eventPattern;
        outlookMatchType = editRule.source.matchType;
        overrideHours = editRule.source.overrideHours ?? 0;
        jiraProjectKey = '';
        jiraIssuePattern = '';
      }
    } else {
      name = '';
      sourceType = prefill?.source?.type ?? 'jira';
      autoSync = false;
      enabled = true;
      projectValue = '';
      taskValue = '';
      selectedProjectId = null;

      if (prefill?.source?.type === 'outlook') {
        const src = prefill.source as OutlookSourceMatcher;
        outlookPattern = src.eventPattern;
        outlookMatchType = src.matchType;
        overrideHours = src.overrideHours ?? 0;
        descriptionTemplate = DEFAULT_OUTLOOK_TEMPLATE;
        jiraProjectKey = '';
        jiraIssuePattern = '';
      } else if (prefill?.source?.type === 'jira') {
        jiraProjectKey = prefill.source.projectKey;
        jiraIssuePattern = prefill.source.issuePattern ?? '';
        descriptionTemplate = DEFAULT_JIRA_TEMPLATE;
        outlookPattern = '';
        outlookMatchType = 'contains';
        overrideHours = 0;
      } else {
        descriptionTemplate = DEFAULT_JIRA_TEMPLATE;
        jiraProjectKey = '';
        jiraIssuePattern = '';
        outlookPattern = '';
        outlookMatchType = 'contains';
        overrideHours = 0;
      }
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
    } else {
      onClose?.();
    }
  }

  function handleSourceTypeChange(type: 'jira' | 'outlook'): void {
    sourceType = type;
    descriptionTemplate = type === 'jira' ? DEFAULT_JIRA_TEMPLATE : DEFAULT_OUTLOOK_TEMPLATE;
  }

  function handleProjectSelect(projectId: number): void {
    const changed = selectedProjectId !== projectId;
    selectedProjectId = projectId;
    if (changed) taskValue = '';
    fetchTasksForProject(projectId);
  }

  function insertVariable(varName: string): void {
    descriptionTemplate = descriptionTemplate + `{${varName}}`;
  }

  function handleSubmit(e: Event): void {
    e.preventDefault();
    if (!isFormValid) return;

    const project = getProjectById(Number(projectValue));
    if (!project) return;

    const tasks = getTasksForProject(Number(projectValue));
    const task = tasks.find((t) => t.id === Number(taskValue));
    if (!task) return;

    const ruleData = {
      name: name.trim(),
      enabled,
      autoSync,
      source: currentSource,
      target: {
        mocoProjectId: project.id,
        mocoTaskId: task.id,
        mocoProjectName: project.name,
        mocoTaskName: task.name,
        customerName: project.customer.name
      },
      descriptionTemplate
    };

    if (mode === 'edit' && editRule) {
      updateRule(editRule.id, ruleData);
    } else {
      addRule(ruleData);
    }

    open = false;
    onClose?.();
  }

  function requestDelete(): void {
    showDeleteConfirm = true;
  }

  function cancelDelete(): void {
    showDeleteConfirm = false;
  }

  function confirmDelete(): void {
    if (editRule) {
      removeRule(editRule.id);
      open = false;
      onClose?.();
    }
  }

  // Fetch projects on mount (covers both defaultOpen and trigger-based opening)
  onMount(() => {
    if (defaultOpen) {
      open = true;
    }
    resetForm();
    if (isMocoConnected) {
      fetchAssignedProjects().then(() => {
        if (selectedProjectId) {
          fetchTasksForProject(selectedProjectId);
        }
      });
    }
  });
</script>

<Dialog.Root bind:open onOpenChange={handleOpen}>
  <Dialog.Content class="sm:max-w-md max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>{mode === 'edit' ? 'Edit Rule' : 'Create Rule'}</Dialog.Title>
      <Dialog.Description>
        {mode === 'edit'
          ? 'Update or remove this sync rule.'
          : 'Map a source (Jira/Outlook) to a Moco booking position.'}
      </Dialog.Description>
    </Dialog.Header>

    {#if !isMocoConnected}
      <div class="py-4">
        <p class="text-sm text-muted-foreground">Connect Moco to manage rules.</p>
      </div>
    {:else if showDeleteConfirm}
      <div class="py-4 space-y-4">
        <div class="flex items-center gap-3 p-3 rounded-lg bg-danger-subtle">
          <AlertTriangle class="size-6 text-danger-text flex-shrink-0" />
          <p class="text-sm text-danger-text">
            Delete this rule? Existing sync records will be preserved.
          </p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={cancelDelete}
            class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground
              hover:bg-accent transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={confirmDelete}
            class="flex-1 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-danger-foreground
              hover:bg-danger/90 transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Delete
          </button>
        </div>
      </div>
    {:else}
      <form onsubmit={handleSubmit} class="space-y-4 py-4">
        <!-- Name -->
        <div>
          <label for="rule-name" class="block text-sm font-medium text-foreground mb-1">Name</label>
          <input
            id="rule-name"
            type="text"
            bind:value={name}
            placeholder="e.g. Support Tickets → Moco"
            class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
          />
        </div>

        <!-- Trigger Section -->
        <div class="rounded-lg bg-secondary/40 p-3 space-y-3">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trigger</p>

          <!-- Source Type -->
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-foreground mb-1">Source</label>
            <div class="flex gap-1 p-0.5 rounded-lg bg-secondary">
              <button
                type="button"
                onclick={() => handleSourceTypeChange('jira')}
                class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                  {sourceType === 'jira'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'}"
              >
                Jira
              </button>
              <button
                type="button"
                onclick={() => handleSourceTypeChange('outlook')}
                class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                  {sourceType === 'outlook'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'}"
              >
                Outlook
              </button>
            </div>
          </div>

          <!-- Source-specific forms -->
          {#if sourceType === 'jira'}
            <JiraSourceForm bind:projectKey={jiraProjectKey} bind:issuePattern={jiraIssuePattern} />
          {/if}
          {#if sourceType === 'outlook'}
            <OutlookSourceForm
              bind:pattern={outlookPattern}
              bind:matchType={outlookMatchType}
              bind:overrideHours
            />
          {/if}
        </div>

        <!-- Action Section -->
        <div class="rounded-lg bg-secondary/40 p-3 space-y-3">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Action</p>

          <!-- Moco Target -->
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-foreground mb-1">Moco Project</label>
            <ProjectCombobox bind:value={projectValue} onSelect={handleProjectSelect} />
          </div>

          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-foreground mb-1">Moco Task</label>
            <TaskCombobox projectId={selectedProjectId} bind:value={taskValue} />
          </div>

          <!-- Description Template -->
          <div>
            <label for="rule-template" class="block text-sm font-medium text-foreground mb-1"
              >Description Template</label
            >
            <input
              id="rule-template"
              type="text"
              bind:value={descriptionTemplate}
              placeholder={sourceType === 'jira' ? DEFAULT_JIRA_TEMPLATE : DEFAULT_OUTLOOK_TEMPLATE}
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono
                focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
            />
            <div class="flex flex-wrap gap-1 mt-1">
              {#each templateVars as v (v.name)}
                <button
                  type="button"
                  onclick={() => insertVariable(v.name)}
                  class="rounded px-1.5 py-0.5 text-[10px] font-mono bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {`{${v.name}}`}
                </button>
              {/each}
            </div>
            {#if templatePreview}
              <p class="text-xs text-muted-foreground mt-1 font-mono">
                Preview: <span class="text-foreground">{templatePreview}</span>
              </p>
            {/if}
          </div>
        </div>

        <!-- Enabled + Auto-Sync Toggles -->
        <div class="space-y-2">
          <label class="flex items-center justify-between cursor-pointer">
            <div>
              <span class="text-sm text-foreground">Enabled</span>
              <p class="text-[10px] text-muted-foreground">
                When disabled, this rule is paused and won't match any entries.
              </p>
            </div>
            <Switch bind:checked={enabled} />
          </label>

          <label class="flex items-center justify-between cursor-pointer">
            <div>
              <span class="text-sm text-foreground">Auto-sync</span>
              <p class="text-[10px] text-muted-foreground">
                Automatically transfer new entries when opening the day.
              </p>
            </div>
            <Switch bind:checked={autoSync} />
          </label>
        </div>

        <!-- Overlap Warning -->
        {#if overlappingRules.length > 0}
          <div class="flex items-center gap-2 p-2.5 rounded-lg bg-warning-subtle">
            <AlertTriangle class="size-4 text-warning-text flex-shrink-0" />
            <p class="text-xs text-warning-text">
              Overlaps with: {overlappingRules.map((r) => `"${r.name}"`).join(', ')}. The more
              specific rule takes priority.
            </p>
          </div>
        {/if}

        <!-- Submit / Delete -->
        <div class="flex items-center gap-2">
          <button
            type="submit"
            disabled={!isFormValid}
            class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {mode === 'edit' ? 'Update' : 'Save'}
          </button>
          {#if mode === 'edit'}
            <button
              type="button"
              onclick={requestDelete}
              class="rounded-lg border border-border-danger px-4 py-2.5 text-sm font-medium text-danger-text
                hover:bg-danger-subtle transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Delete
            </button>
          {/if}
        </div>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>
