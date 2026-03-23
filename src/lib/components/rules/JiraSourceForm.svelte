<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import Info from '@lucide/svelte/icons/info';
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';

  let {
    projectKey = $bindable(''),
    issuePattern = $bindable(''),
    epicKey = $bindable(''),
    component = $bindable(''),
    labels = $bindable<string[]>([]),
    summaryContains = $bindable(''),
    jql = $bindable('')
  }: {
    projectKey: string;
    issuePattern: string;
    epicKey: string;
    component: string;
    labels: string[];
    summaryContains: string;
    jql: string;
  } = $props();

  let labelInput = $state('');

  type FilterType = 'issuePattern' | 'epicKey' | 'component' | 'labels' | 'summaryContains';

  let filtersInitialized = false;
  let activeFilters = new SvelteSet<FilterType>();

  // Initialize active filters once from existing values (edit mode)
  $effect(() => {
    if (filtersInitialized) return;
    filtersInitialized = true;
    if (issuePattern) activeFilters.add('issuePattern');
    if (epicKey) activeFilters.add('epicKey');
    if (component) activeFilters.add('component');
    if (labels.length > 0) activeFilters.add('labels');
    if (summaryContains) activeFilters.add('summaryContains');
  });

  // Simple text filters (rendered via {#each}), labels is a special case
  const TEXT_FILTERS: Array<{
    type: FilterType;
    label: string;
    id: string;
    placeholder: string;
    hint?: string;
    mono?: boolean;
  }> = [
    {
      type: 'issuePattern',
      label: 'Issue Pattern',
      id: 'jira-pattern',
      placeholder: 'e.g. SUP-42 or SUP-*',
      hint: 'Use * for wildcard (e.g. SUP-*).',
      mono: true
    },
    {
      type: 'epicKey',
      label: 'Epic',
      id: 'jira-epic',
      placeholder: 'e.g. SUP-100',
      hint: 'Match all issues under this epic.',
      mono: true
    },
    { type: 'component', label: 'Component', id: 'jira-component', placeholder: 'e.g. Backend' },
    {
      type: 'summaryContains',
      label: 'Summary Contains',
      id: 'jira-summary',
      placeholder: 'e.g. meeting'
    }
  ];

  const AVAILABLE_FILTERS: Array<{ type: FilterType; label: string }> = [
    ...TEXT_FILTERS.map((f) => ({ type: f.type, label: f.label })),
    { type: 'labels', label: 'Labels' }
  ];

  // Bindable value getter/setter by filter type
  function getFilterValue(type: FilterType): string {
    switch (type) {
      case 'issuePattern':
        return issuePattern;
      case 'epicKey':
        return epicKey;
      case 'component':
        return component;
      case 'summaryContains':
        return summaryContains;
      default:
        return '';
    }
  }

  function setFilterValue(type: FilterType, value: string): void {
    switch (type) {
      case 'issuePattern':
        issuePattern = value;
        break;
      case 'epicKey':
        epicKey = value;
        break;
      case 'component':
        component = value;
        break;
      case 'summaryContains':
        summaryContains = value;
        break;
    }
  }

  let remainingFilters = $derived(AVAILABLE_FILTERS.filter((f) => !activeFilters.has(f.type)));

  let showFilterMenu = $state(false);

  function addFilter(type: FilterType): void {
    activeFilters.add(type);
    showFilterMenu = false;
  }

  function removeFilter(type: FilterType): void {
    activeFilters.delete(type);
    // Clear the value
    switch (type) {
      case 'issuePattern':
        issuePattern = '';
        break;
      case 'epicKey':
        epicKey = '';
        break;
      case 'component':
        component = '';
        break;
      case 'labels':
        labels = [];
        break;
      case 'summaryContains':
        summaryContains = '';
        break;
    }
  }

  function addLabel(): void {
    const val = labelInput.trim();
    if (val && !labels.includes(val)) {
      labels = [...labels, val];
    }
    labelInput = '';
  }

  function removeLabel(label: string): void {
    labels = labels.filter((l) => l !== label);
  }

  function handleLabelKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLabel();
    }
  }
</script>

<div class="space-y-3 pl-3 border-l-2 border-brand/30">
  <div class="rounded-lg bg-information-subtle/50 p-2.5">
    <p class="text-xs text-brand-text flex items-center gap-1.5">
      <Info class="size-3 flex-shrink-0" />
      All worklogs from this Jira project will be matched.
    </p>
  </div>

    <!-- Project Key (always visible) -->
    <div>
      <label
        for="jira-project"
        class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
        >Project Key</label
      >
      <input
        id="jira-project"
        type="text"
        bind:value={projectKey}
        placeholder="e.g. SUP"
        class="w-full rounded-lg border border-input bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono
          focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring focus:bg-background transition-all duration-150"
      />
    </div>

    <!-- Active Text Filters -->
    {#each TEXT_FILTERS.filter((f) => activeFilters.has(f.type)) as filter (filter.type)}
      <div class="animate-slide-up">
        <div class="flex items-center justify-between mb-1.5">
          <label
            for={filter.id}
            class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >{filter.label}</label
          >
          <button
            type="button"
            onclick={() => removeFilter(filter.type)}
            class="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove {filter.label.toLowerCase()} filter"
          >
            <X class="size-3" />
          </button>
        </div>
        <input
          id={filter.id}
          type="text"
          value={getFilterValue(filter.type)}
          oninput={(e) => setFilterValue(filter.type, e.currentTarget.value)}
          placeholder={filter.placeholder}
          class="w-full rounded-lg border border-input bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground {filter.mono
            ? 'font-mono'
            : ''}
            focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring focus:bg-background transition-all duration-150"
        />
        {#if filter.hint}
          <p class="text-[10px] text-muted-foreground mt-0.5">{filter.hint}</p>
        {/if}
      </div>
    {/each}

    <!-- Labels (special case: tag input) -->
    {#if activeFilters.has('labels')}
      <div class="animate-slide-up">
        <div class="flex items-center justify-between mb-1.5">
          <label
            for="jira-labels"
            class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >Labels</label
          >
          <button
            type="button"
            onclick={() => removeFilter('labels')}
            class="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove labels filter"
          >
            <X class="size-3" />
          </button>
        </div>
        {#if labels.length > 0}
          <div class="flex flex-wrap gap-1 mb-1.5">
            {#each labels as label (label)}
              <span
                class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground"
              >
                {label}
                <button
                  type="button"
                  onclick={() => removeLabel(label)}
                  class="rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Remove label {label}"
                >
                  <X class="size-2.5" />
                </button>
              </span>
            {/each}
          </div>
        {/if}
        <div class="flex gap-1.5">
          <input
            id="jira-labels"
            type="text"
            bind:value={labelInput}
            onkeydown={handleLabelKeydown}
            placeholder="Type label and press Enter"
            class="flex-1 rounded-lg border border-input bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring focus:bg-background transition-all duration-150"
          />
          <button
            type="button"
            onclick={addLabel}
            disabled={!labelInput.trim()}
            class="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground
              hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          >
            Add
          </button>
        </div>
        <p class="text-[10px] text-muted-foreground mt-0.5">
          At least one label must match (OR logic).
        </p>
      </div>
    {/if}

    <!-- Add Filter Button -->
    {#if remainingFilters.length > 0}
      <div class="relative">
        <button
          type="button"
          onclick={() => (showFilterMenu = !showFilterMenu)}
          class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus class="size-3" />
          Add filter
        </button>
        {#if showFilterMenu}
          <div
            class="absolute left-0 top-full mt-1 z-10 rounded-lg border border-border bg-card shadow-lg py-1 min-w-[160px] animate-slide-up"
          >
            {#each remainingFilters as filter (filter.type)}
              <button
                type="button"
                onclick={() => addFilter(filter.type)}
                class="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                {filter.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
</div>
