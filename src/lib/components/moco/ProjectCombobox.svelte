<script lang="ts">
  import { getActiveProjects } from '../../stores/mocoProjects.svelte';

  let {
    value = $bindable<string>(''),
    onSelect
  }: {
    value?: string;
    onSelect?: (projectId: number) => void;
  } = $props();

  let searchValue = $state('');
  let open = $state(false);

  let items = $derived(
    getActiveProjects().map((p) => ({
      value: String(p.id),
      label: `${p.customer.name} — ${p.name}`
    }))
  );

  let filtered = $derived(
    searchValue.trim()
      ? items.filter((item) => item.label.toLowerCase().includes(searchValue.toLowerCase()))
      : items
  );

  let selectedLabel = $derived(items.find((item) => item.value === value)?.label ?? '');

  // Keep display in sync: when not focused, show selected label
  let displayValue = $state('');

  $effect(() => {
    if (!open) {
      displayValue = selectedLabel;
    }
  });

  function handleSelect(item: { value: string; label: string }): void {
    value = item.value;
    displayValue = item.label;
    searchValue = '';
    open = false;
    onSelect?.(Number(item.value));
  }

  function handleClick(): void {
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
    placeholder="Search project..."
    onclick={handleClick}
    onblur={handleBlur}
    oninput={handleInput}
    autocomplete="off"
    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
      focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
  />
  {#if open && filtered.length > 0}
    <div
      class="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
    >
      {#each filtered as item (item.value)}
        <button
          type="button"
          class="w-full cursor-pointer select-none px-3 py-2 text-left text-sm text-foreground
            hover:bg-accent hover:text-accent-foreground
            {item.value === value ? 'font-medium bg-accent/50' : ''}"
          onmousedown={(e) => {
            e.preventDefault();
            handleSelect(item);
          }}
        >
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
  {#if open && filtered.length === 0 && searchValue.trim()}
    <div class="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
      <div class="px-3 py-2 text-sm text-muted-foreground">No projects found</div>
    </div>
  {/if}
</div>
