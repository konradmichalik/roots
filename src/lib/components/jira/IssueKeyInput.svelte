<script lang="ts">
  import { extractFirstIssueKey, isValidIssueKey } from '../../utils/jira-issue-parser';
  import { getJiraBaseUrl } from '../../stores/connections.svelte';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';

  let {
    value = $bindable(''),
    valid = $bindable(false),
    disabled = false,
    id
  }: {
    value?: string;
    valid?: boolean;
    disabled?: boolean;
    id?: string;
  } = $props();

  let inputValue = $state(value);
  let validationError = $state<string | null>(null);

  // Validate on initial render and when value changes externally
  $effect(() => {
    // Always sync inputValue with external value
    if (value !== inputValue) {
      inputValue = value;
    }
    // Always validate current value
    const isValid = isValidIssueKey(value);
    if (valid !== isValid) {
      valid = isValid;
    }
    validationError = isValid || !value ? null : 'Invalid format (e.g., ABC-123)';
  });

  function handleInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    let newValue = target.value.toUpperCase();

    // Extract issue key from pasted text that might contain more than just the key
    const extracted = extractFirstIssueKey(newValue);
    if (extracted && newValue.length > extracted.length) {
      newValue = extracted;
    }

    inputValue = newValue;
    value = newValue;
    valid = isValidIssueKey(newValue);
    validationError = valid || !newValue ? null : 'Invalid format (e.g., ABC-123)';
  }

  let jiraUrl = $derived.by(() => {
    if (!valid || !value) return null;
    const baseUrl = getJiraBaseUrl();
    if (!baseUrl) return null;
    return `${baseUrl}/browse/${value}`;
  });
</script>

<div class="relative">
  <input
    type="text"
    {id}
    {disabled}
    value={inputValue}
    oninput={handleInput}
    placeholder="ABC-123"
    class="w-full rounded-lg border border-input bg-background px-3 py-2 pr-16 text-sm text-foreground uppercase
      focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150
      disabled:opacity-50 disabled:cursor-not-allowed
      {validationError && inputValue
      ? 'border-danger focus:border-danger focus:ring-danger/30'
      : ''}"
  />

  <!-- Validation indicator -->
  <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
    {#if inputValue}
      {#if valid}
        <Check class="size-4 text-success" />
        {#if jiraUrl}
          <a
            href={jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Open in Jira"
          >
            <ExternalLink class="size-3.5" />
          </a>
        {/if}
      {:else}
        <X class="size-4 text-danger" />
      {/if}
    {/if}
  </div>
</div>

{#if validationError && inputValue}
  <p class="mt-1 text-xs text-danger-text">{validationError}</p>
{/if}
