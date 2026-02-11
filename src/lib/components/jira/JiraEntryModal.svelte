<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import TimeInput from '../common/TimeInput.svelte';
  import IssueKeyInput from './IssueKeyInput.svelte';
  import {
    createJiraWorklog,
    updateJiraWorklog,
    deleteJiraWorklog
  } from '../../stores/timeEntries.svelte';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getJiraBaseUrl } from '../../stores/connections.svelte';
  import type { Snippet } from 'svelte';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import ExternalLink from '@lucide/svelte/icons/external-link';

  let {
    children,
    mode = 'create',
    prefill,
    onSuccess,
    onClose,
    defaultOpen = false
  }: {
    children?: Snippet;
    mode?: 'create' | 'edit';
    prefill?: {
      date?: string;
      hours?: number;
      comment?: string;
      issueKey?: string;
      worklogId?: string;
    };
    onSuccess?: () => void;
    onClose?: () => void;
    defaultOpen?: boolean;
  } = $props();

  let open = $state(defaultOpen);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let showDeleteConfirm = $state(false);

  // Form state
  let date = $state('');
  let hours = $state(0);
  let comment = $state('');
  let issueKey = $state('');
  let issueKeyValid = $state(false);

  function resetForm(): void {
    date = prefill?.date ?? dateNavState.selectedDate;
    hours = prefill?.hours ?? 0;
    comment = prefill?.comment ?? '';
    issueKey = prefill?.issueKey ?? '';
    error = null;
    showDeleteConfirm = false;
    // Valid will be set by the IssueKeyInput component
  }

  // Sync open state with defaultOpen prop changes
  $effect(() => {
    if (defaultOpen !== open) {
      open = defaultOpen;
      if (defaultOpen) {
        resetForm();
      }
    }
  });

  function handleOpen(isOpen: boolean): void {
    open = isOpen;
    if (!isOpen) {
      onClose?.();
    }
    if (isOpen) {
      resetForm();
    }
  }

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (!issueKey || !issueKeyValid || !date || hours <= 0) {
      error = 'Please fill in all required fields.';
      return;
    }

    saving = true;
    error = null;

    try {
      if (mode === 'edit' && prefill?.worklogId && prefill?.issueKey) {
        const success = await updateJiraWorklog(
          prefill.issueKey,
          prefill.worklogId,
          {
            hours,
            comment: comment.trim() || undefined
          },
          date
        );
        if (!success) {
          error = 'Failed to update worklog.';
          return;
        }
      } else {
        const success = await createJiraWorklog({
          issueKey,
          date,
          hours,
          comment: comment.trim() || undefined
        });
        if (!success) {
          error = 'Failed to create worklog.';
          return;
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
    if (!prefill?.worklogId || !prefill?.issueKey) return;

    saving = true;
    error = null;

    try {
      const success = await deleteJiraWorklog(prefill.issueKey, prefill.worklogId, date);
      if (success) {
        open = false;
        onClose?.();
      } else {
        error = 'Failed to delete worklog.';
        showDeleteConfirm = false;
      }
    } finally {
      saving = false;
    }
  }

  let jiraIssueUrl = $derived.by(() => {
    if (!issueKey || !issueKeyValid) return null;
    const baseUrl = getJiraBaseUrl();
    if (!baseUrl) return null;
    return `${baseUrl}/browse/${issueKey}`;
  });
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
      <Dialog.Title>{mode === 'edit' ? 'Edit Jira Worklog' : 'New Jira Worklog'}</Dialog.Title>
      <Dialog.Description>
        {mode === 'edit' ? 'Update the worklog entry.' : 'Log time to a Jira issue.'}
      </Dialog.Description>
    </Dialog.Header>

    {#if showDeleteConfirm}
      <!-- Delete Confirmation -->
      <div class="py-4 space-y-4">
        <div class="flex items-center gap-3 p-3 rounded-lg bg-danger-subtle">
          <AlertTriangle class="size-6 text-danger-text flex-shrink-0" />
          <p class="text-sm text-danger-text">
            Are you sure you want to delete this worklog? This action cannot be undone.
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
      <form onsubmit={handleSubmit} class="space-y-4 py-4">
        <!-- Issue Key -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label for="jira-issue" class="block text-sm font-medium text-foreground">
              Issue Key
            </label>
            {#if jiraIssueUrl}
              <a
                href={jiraIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Open in Jira <ExternalLink class="size-3" />
              </a>
            {/if}
          </div>
          <IssueKeyInput
            id="jira-issue"
            bind:value={issueKey}
            bind:valid={issueKeyValid}
            disabled={mode === 'edit'}
          />
          {#if mode === 'edit'}
            <p class="mt-1 text-xs text-muted-foreground">
              Issue key cannot be changed when editing.
            </p>
          {/if}
        </div>

        <!-- Date & Hours -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="jira-date" class="block text-sm font-medium text-foreground mb-1">
              Date
            </label>
            <input
              id="jira-date"
              type="date"
              bind:value={date}
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground
                focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
            />
          </div>
          <div>
            <label for="jira-hours" class="block text-sm font-medium text-foreground mb-1">
              Duration
            </label>
            <TimeInput id="jira-hours" bind:value={hours} showStepButtons />
          </div>
        </div>

        <!-- Comment -->
        <div>
          <label for="jira-comment" class="block text-sm font-medium text-foreground mb-1">
            Comment <span class="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="jira-comment"
            bind:value={comment}
            rows={3}
            placeholder="What did you work on?"
            class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none
              focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
          ></textarea>
        </div>

        {#if error}
          <p id="jira-entry-error" role="alert" class="text-sm text-danger-text">{error}</p>
        {/if}

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || !issueKey || !issueKeyValid || !date || hours <= 0}
            class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground
              hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}
          </button>
          {#if mode === 'edit' && prefill?.worklogId}
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
