<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import ProjectCombobox from '../moco/ProjectCombobox.svelte';
  import TaskCombobox from '../moco/TaskCombobox.svelte';
  import JiraSourceForm from './JiraSourceForm.svelte';
  import OutlookSourceForm from './OutlookSourceForm.svelte';
  import {
    addRule,
    updateRule,
    removeRule,
    findOverlappingRules,
    entryMatchesSource
  } from '../../stores/rules.svelte';
  import { timeEntriesState } from '../../stores/timeEntries.svelte';
  import {
    fetchAssignedProjects,
    fetchTasksForProject,
    getProjectById,
    getTasksForProject
  } from '../../stores/mocoProjects.svelte';
  import { connectionsState, getConnectedJiraIds } from '../../stores/connections.svelte';
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
  import Check from '@lucide/svelte/icons/check';
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

  // eslint-disable-next-line svelte/prefer-writable-derived -- $derived.writable not available in this Svelte version
  let open = $state(false);
  $effect(() => {
    open = defaultOpen;
  });
  let showDeleteConfirm = $state(false);

  // Wizard state
  let currentStep = $state(1);
  let slideDirection = $state<'left' | 'right'>('left');

  const STEPS = [
    { number: 1, label: 'Source' },
    { number: 2, label: 'Target' },
    { number: 3, label: 'Options' }
  ] as const;

  // Form state
  let name = $state('');
  let sourceType = $state<'jira' | 'outlook'>('jira');

  // Jira source
  let jiraConnectionId = $state(connectionsState.jiraConnections[0]?.id ?? 'default');
  let jiraProjectKey = $state('');
  let jiraIssuePattern = $state('');
  let jiraEpicKey = $state('');
  let jiraComponent = $state('');
  let jiraLabels = $state<string[]>([]);
  let jiraSummaryContains = $state('');
  let jiraJql = $state('');

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
        connectionId: jiraConnectionId,
        projectKey: jiraProjectKey,
        issuePattern: jiraIssuePattern || undefined,
        epicKey: jiraEpicKey || undefined,
        component: jiraComponent || undefined,
        labels: jiraLabels.length > 0 ? jiraLabels : undefined,
        summaryContains: jiraSummaryContains || undefined,
        jql: jiraJql || undefined
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

  // Live match preview: count today's entries that match the current source config
  let matchedEntries = $derived.by(() => {
    const src = currentSource;
    // Need at least a project key (simple mode) or JQL (advanced mode)
    if (src.type === 'jira' && !src.projectKey && !src.jql) return [];
    if (src.type === 'outlook' && !src.eventPattern) return [];

    const entries =
      src.type === 'jira' ? timeEntriesState.jiraWorklogs : timeEntriesState.outlookEvents;

    return entries.filter((entry) => entryMatchesSource(entry, src));
  });

  // Per-step validation
  let isStep1Valid = $derived.by(() => {
    if (sourceType === 'jira') {
      // JQL mode: only JQL required
      if (jiraJql.trim()) return true;
      // Simple mode: project key required
      return !!jiraProjectKey.trim();
    }
    if (sourceType === 'outlook') return !!outlookPattern.trim();
    return false;
  });

  let isStep2Valid = $derived(!!projectValue && !!taskValue);

  let isStep3Valid = $derived(!!name.trim());

  let isFormValid = $derived(isStep1Valid && isStep2Valid && isStep3Valid);

  let isCurrentStepValid = $derived(isStepValid(currentStep));

  // Auto-suggest name
  let suggestedName = $derived.by(() => {
    const project = getProjectById(Number(projectValue));
    if (!project) return '';
    if (sourceType === 'jira') {
      const pattern = jiraIssuePattern || jiraProjectKey;
      return `${pattern} → ${project.name}`;
    }
    return `${outlookPattern} → ${project.name}`;
  });

  $effect(() => {
    if (currentStep === 3 && mode === 'create' && !name && suggestedName) {
      name = suggestedName;
    }
  });

  function resetJiraExtendedFields(): void {
    jiraEpicKey = '';
    jiraComponent = '';
    jiraLabels = [];
    jiraSummaryContains = '';
    jiraJql = '';
  }

  function isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return isStep1Valid;
      case 2:
        return isStep2Valid;
      case 3:
        return isStep3Valid;
      default:
        return false;
    }
  }

  // Visual state: only steps before the current one show as "completed"
  function isStepDone(step: number): boolean {
    return step < currentStep && isStepValid(step);
  }

  function canNavigateToStep(step: number): boolean {
    if (mode === 'edit') return true;
    if (step === 1) return true;
    if (step === 2) return isStepValid(1);
    if (step === 3) return isStepValid(1) && isStepValid(2);
    return false;
  }

  function goToStep(step: number): void {
    if (!canNavigateToStep(step)) return;
    slideDirection = step > currentStep ? 'left' : 'right';
    currentStep = step;
  }

  function goNext(): void {
    if (currentStep < 3) {
      slideDirection = 'left';
      currentStep++;
    }
  }

  function goBack(): void {
    if (currentStep > 1) {
      slideDirection = 'right';
      currentStep--;
    }
  }

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
        jiraConnectionId = editRule.source.connectionId;
        jiraProjectKey = editRule.source.projectKey;
        jiraIssuePattern = editRule.source.issuePattern ?? '';
        jiraEpicKey = editRule.source.epicKey ?? '';
        jiraComponent = editRule.source.component ?? '';
        jiraLabels = editRule.source.labels ? [...editRule.source.labels] : [];
        jiraSummaryContains = editRule.source.summaryContains ?? '';
        jiraJql = editRule.source.jql ?? '';
        outlookPattern = '';
        outlookMatchType = 'contains';
        overrideHours = 0;
      } else {
        outlookPattern = editRule.source.eventPattern;
        outlookMatchType = editRule.source.matchType;
        overrideHours = editRule.source.overrideHours ?? 0;
        jiraProjectKey = '';
        jiraIssuePattern = '';
        resetJiraExtendedFields();
      }

      currentStep = 1;
    } else {
      name = '';
      sourceType = prefill?.source?.type ?? 'jira';
      autoSync = false;
      enabled = true;
      projectValue = '';
      taskValue = '';
      selectedProjectId = null;

      resetJiraExtendedFields();

      if (prefill?.source?.type === 'outlook') {
        const src = prefill.source as OutlookSourceMatcher;
        outlookPattern = src.eventPattern;
        outlookMatchType = src.matchType;
        overrideHours = src.overrideHours ?? 0;
        descriptionTemplate = DEFAULT_OUTLOOK_TEMPLATE;
        jiraProjectKey = '';
        jiraIssuePattern = '';
      } else if (prefill?.source?.type === 'jira') {
        jiraConnectionId = prefill.source.connectionId;
        jiraProjectKey = prefill.source.projectKey;
        jiraIssuePattern = prefill.source.issuePattern ?? '';
        jiraEpicKey = prefill.source.epicKey ?? '';
        jiraComponent = prefill.source.component ?? '';
        jiraLabels = prefill.source.labels ? [...prefill.source.labels] : [];
        jiraSummaryContains = prefill.source.summaryContains ?? '';
        jiraJql = prefill.source.jql ?? '';
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

      if (prefill?.source && mode === 'create') {
        currentStep = 2;
      } else {
        currentStep = 1;
      }
    }
    showDeleteConfirm = false;
    slideDirection = 'left';
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

  function handleSubmit(): void {
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
  <Dialog.Content class="sm:max-w-xl max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>{mode === 'edit' ? 'Edit Rule' : 'Create Rule'}</Dialog.Title>
      <Dialog.Description>
        {mode === 'edit'
          ? 'Update or remove this sync rule.'
          : 'Map a source to a Moco booking position.'}
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
      <!-- Stepper -->
      <div class="flex items-center gap-1 mb-4">
        {#each STEPS as step (step.number)}
          <button
            type="button"
            onclick={() => goToStep(step.number)}
            disabled={!canNavigateToStep(step.number)}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              {currentStep === step.number
              ? 'bg-primary text-primary-foreground'
              : isStepDone(step.number)
                ? 'bg-success-subtle text-success-text cursor-pointer hover:bg-success-subtle/80'
                : 'bg-secondary text-muted-foreground disabled:opacity-50'}"
          >
            <span
              class="size-5 rounded-full flex items-center justify-center text-xs font-bold
              {currentStep === step.number
                ? 'bg-primary-foreground/20'
                : isStepDone(step.number)
                  ? 'bg-success/20'
                  : 'bg-muted-foreground/20'}"
            >
              {#if isStepDone(step.number)}
                <Check class="size-3" />
              {:else}
                {step.number}
              {/if}
            </span>
            {step.label}
          </button>
          {#if step.number < 3}
            <div class="flex-1 h-px bg-border"></div>
          {/if}
        {/each}
      </div>

      <!-- Step Content -->
      <div class="min-h-[200px] pb-14">
        {#if currentStep === 1}
          <div
            class="space-y-4 {slideDirection === 'left'
              ? 'animate-slide-in-left'
              : 'animate-slide-in-right'}"
          >
            <!-- Source Type -->
            <div>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label
                class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >Source</label
              >
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
              <JiraSourceForm
                bind:projectKey={jiraProjectKey}
                bind:issuePattern={jiraIssuePattern}
                bind:epicKey={jiraEpicKey}
                bind:component={jiraComponent}
                bind:labels={jiraLabels}
                bind:summaryContains={jiraSummaryContains}
                bind:jql={jiraJql}
              />
            {/if}
            {#if sourceType === 'outlook'}
              <OutlookSourceForm
                bind:pattern={outlookPattern}
                bind:matchType={outlookMatchType}
                bind:overrideHours
              />
            {/if}

            <!-- Live Match Preview -->
            {#if matchedEntries.length > 0}
              <div class="rounded-lg bg-success-subtle/50 px-3 py-2">
                <p class="text-xs text-success-text font-medium">
                  Would match {matchedEntries.length}
                  {matchedEntries.length === 1 ? 'entry' : 'entries'}
                  from today
                </p>
                {#if matchedEntries.length <= 5}
                  <ul class="mt-1 space-y-0.5">
                    {#each matchedEntries as entry (entry.id)}
                      <li class="text-[11px] text-success-text/80 truncate">
                        {entry.title} — {entry.hours.toFixed(2)}h
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {:else if isStep1Valid}
              <p class="text-xs text-muted-foreground">No matching entries from today.</p>
            {/if}
          </div>
        {/if}

        {#if currentStep === 2}
          <div
            class="space-y-4 {slideDirection === 'left'
              ? 'animate-slide-in-left'
              : 'animate-slide-in-right'}"
          >
            <!-- Moco Target -->
            <div>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label
                class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >Moco Project</label
              >
              <ProjectCombobox bind:value={projectValue} onSelect={handleProjectSelect} />
            </div>

            <div>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label
                class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >Moco Task</label
              >
              <TaskCombobox projectId={selectedProjectId} bind:value={taskValue} />
            </div>

            <!-- Description Template -->
            <div>
              <label
                for="rule-template"
                class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >Description Template</label
              >
              <input
                id="rule-template"
                type="text"
                bind:value={descriptionTemplate}
                placeholder={sourceType === 'jira'
                  ? DEFAULT_JIRA_TEMPLATE
                  : DEFAULT_OUTLOOK_TEMPLATE}
                class="w-full rounded-lg border border-input bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono
                  focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring focus:bg-background transition-all duration-150"
              />
              <div class="flex flex-wrap gap-1 mt-1">
                {#each templateVars as v (v.name)}
                  <button
                    type="button"
                    onclick={() => insertVariable(v.name)}
                    class="rounded px-1.5 py-0.5 text-[10px] font-mono bg-secondary text-foreground/70 hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
                  >
                    {`{${v.name}}`}
                  </button>
                {/each}
              </div>
              {#if templatePreview}
                <p class="text-xs mt-1.5">
                  <span class="text-muted-foreground font-semibold">Preview</span>
                  <span class="text-foreground font-mono ml-1.5">{templatePreview}</span>
                </p>
              {/if}
            </div>
          </div>
        {/if}

        {#if currentStep === 3}
          <div
            class="space-y-4 {slideDirection === 'left'
              ? 'animate-slide-in-left'
              : 'animate-slide-in-right'}"
          >
            <!-- Name -->
            <div>
              <label
                for="rule-name"
                class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >Name</label
              >
              <input
                id="rule-name"
                type="text"
                bind:value={name}
                placeholder="e.g. Support Tickets → Moco"
                class="w-full rounded-lg border border-input bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring focus:bg-background transition-all duration-150"
              />
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

            <!-- Summary Card -->
            <div class="rounded-lg border border-border bg-secondary/30 p-3 space-y-1.5">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Summary
              </p>
              <div class="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-xs">
                <span class="text-muted-foreground uppercase font-semibold text-[10px]">Source</span
                >
                <span class="text-foreground font-medium">
                  {#if sourceType === 'jira'}
                    {#if jiraJql}
                      Jira: JQL
                    {:else}
                      Jira: {jiraIssuePattern || jiraProjectKey}{jiraEpicKey
                        ? ` (Epic: ${jiraEpicKey})`
                        : ''}{jiraComponent ? ` [${jiraComponent}]` : ''}{jiraLabels.length > 0
                        ? ` #${jiraLabels.join(' #')}`
                        : ''}
                    {/if}
                  {:else}
                    Outlook: "{outlookPattern}"
                  {/if}
                </span>
                <span class="text-muted-foreground uppercase font-semibold text-[10px]">Target</span
                >
                <span class="text-foreground font-medium">
                  {#if projectValue}
                    {getProjectById(Number(projectValue))?.customer.name} / {getProjectById(
                      Number(projectValue)
                    )?.name}
                  {/if}
                </span>
                <span class="text-muted-foreground uppercase font-semibold text-[10px]"
                  >Template</span
                >
                <span class="text-foreground font-mono text-[11px] truncate"
                  >{descriptionTemplate || '—'}</span
                >
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Navigation -->
      <div class="flex items-center gap-2 pt-4 border-t border-border">
        {#if mode === 'edit'}
          <button
            type="button"
            onclick={requestDelete}
            class="text-sm font-medium text-danger-text hover:text-danger transition-colors
              focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Delete
          </button>
        {/if}
        <div class="flex-1"></div>
        <div class="flex items-center gap-2">
          {#if currentStep > 1}
            <button
              type="button"
              onclick={goBack}
              class="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground
                hover:bg-accent transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Back
            </button>
          {/if}
          {#if currentStep < 3}
            <button
              type="button"
              onclick={goNext}
              disabled={!isCurrentStepValid}
              class="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
                hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Next
            </button>
          {:else}
            <button
              type="button"
              onclick={handleSubmit}
              disabled={!isFormValid}
              class="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
                hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {mode === 'edit' ? 'Update' : 'Save'}
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
