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
  let openUpward = $state(false);
  let inputEl = $state<HTMLInputElement | null>(null);

  let items = $derived(
    getActiveProjects().map((p) => ({
      value: String(p.id),
      label: `${p.customer.name} — ${p.name}`,
      searchText: `${p.identifier} ${p.customer.name} ${p.name}`.toLowerCase()
    }))
  );

  let filtered = $derived(
    searchValue.trim()
      ? items.filter((item) => item.searchText.includes(searchValue.toLowerCase()))
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

  function checkDropdownDirection(): void {
    if (!inputEl) return;
    const rect = inputEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    openUpward = spaceBelow < 220;
  }

  function scrollInputIntoView(): void {
    if (!inputEl) return;
    // Ensure the input (and its dropdown space) is visible within the scroll container
    inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleClick(): void {
    searchValue = '';
    displayValue = '';
    checkDropdownDirection();
    open = true;
    scrollInputIntoView();
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
    if (!open) checkDropdownDirection();
    open = true;
  }
</script>

<div class="relative">
  <input
    bind:this={inputEl}
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
      class="absolute z-50 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg
        {openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}"
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
    <div
      class="absolute z-50 w-full rounded-lg border border-border bg-card shadow-lg
        {openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}"
    >
      <div class="px-3 py-2 text-sm text-muted-foreground">No projects found</div>
    </div>
  {/if}
</div>
