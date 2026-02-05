<script lang="ts">
  import { getTasksForProject, getTaskLoggedHours } from '../../stores/mocoProjects.svelte';
  import { formatHours } from '../../utils/time-format';

  let {
    projectId,
    value = $bindable<string>('')
  }: {
    projectId: number | null;
    value?: string;
  } = $props();

  let searchValue = $state('');
  let open = $state(false);

  let tasks = $derived(projectId ? getTasksForProject(projectId) : []);

  interface TaskItem {
    value: string;
    label: string;
    budgetHours: number | null;
    loggedHours: number;
    availableHours: number | null;
  }

  let items = $derived(
    tasks.map((t): TaskItem => {
      const loggedHours = getTaskLoggedHours(t.id);
      const budgetHours =
        t.budget && t.hourly_rate && t.hourly_rate > 0 ? t.budget / t.hourly_rate : null;
      const availableHours = budgetHours !== null ? budgetHours - loggedHours : null;
      return {
        value: String(t.id),
        label: t.name,
        budgetHours,
        loggedHours,
        availableHours
      };
    })
  );

  let filtered = $derived(
    searchValue.trim()
      ? items.filter((item) => item.label.toLowerCase().includes(searchValue.toLowerCase()))
      : items
  );

  let selectedLabel = $derived(items.find((item) => item.value === value)?.label ?? '');

  let isDisabled = $derived(!projectId);

  // Keep display in sync: when not focused, show selected label
  let displayValue = $state('');

  $effect(() => {
    if (!open) {
      displayValue = selectedLabel;
    }
  });

  function handleSelect(item: TaskItem): void {
    value = item.value;
    displayValue = item.label;
    searchValue = '';
    open = false;
  }

  function handleClick(): void {
    if (isDisabled) return;
    searchValue = '';
    displayValue = '';
    open = true;
  }

  function handleBlur(): void {
    setTimeout(() => {
      open = false;
      displayValue = selectedLabel;
    }, 150);
  }

  function handleInput(e: Event): void {
    searchValue = (e.target as HTMLInputElement).value;
    displayValue = searchValue;
    open = true;
  }
</script>

<div class="relative">
  <input
    type="text"
    value={displayValue}
    placeholder={projectId ? 'Search task...' : 'Select a project first'}
    disabled={isDisabled}
    onclick={handleClick}
    onblur={handleBlur}
    oninput={handleInput}
    autocomplete="off"
    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
      focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150
      disabled:opacity-50 disabled:cursor-not-allowed"
  />
  {#if open && filtered.length > 0}
    <div
      class="absolute z-50 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
    >
      {#each filtered as item (item.value)}
        <button
          type="button"
          class="w-full cursor-pointer select-none px-3 py-2 text-left text-sm text-foreground
            hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2
            {item.value === value ? 'font-medium bg-accent/50' : ''}"
          onmousedown={(e) => {
            e.preventDefault();
            handleSelect(item);
          }}
        >
          <span class="truncate">{item.label}</span>
          {#if item.availableHours !== null}
            <span
              class="flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded
              {item.availableHours > 0
                ? 'bg-success-subtle text-success-text'
                : 'bg-danger-subtle text-danger-text'}"
            >
              {item.availableHours > 0 ? '+' : ''}{formatHours(item.availableHours)}h
            </span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
  {#if open && filtered.length === 0 && searchValue.trim()}
    <div class="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
      <div class="px-3 py-2 text-sm text-muted-foreground">No tasks found</div>
    </div>
  {/if}
</div>
