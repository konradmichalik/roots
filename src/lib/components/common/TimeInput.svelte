<script lang="ts">
  import { hoursToTimeString, timeStringToHours, normalizeTimeInput } from '../../utils/time-format';

  let { value = $bindable(0), id = '', disabled = false, showStepButtons = false }: {
    value: number;
    id?: string;
    disabled?: boolean;
    showStepButtons?: boolean;
  } = $props();

  const STEP_MINUTES = 15;
  const STEP_HOURS = STEP_MINUTES / 60; // 0.25

  // Internal display value in hh:mm format
  let displayValue = $state(hoursToTimeString(value));

  // Update display when value changes externally
  $effect(() => {
    const expected = hoursToTimeString(value);
    if (displayValue !== expected && !isFocused) {
      displayValue = expected;
    }
  });

  let isFocused = $state(false);

  function handleInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    displayValue = target.value;
  }

  function handleBlur(): void {
    isFocused = false;
    const normalized = normalizeTimeInput(displayValue);
    if (normalized) {
      displayValue = normalized;
      value = timeStringToHours(normalized);
    } else {
      // Reset to valid value
      displayValue = hoursToTimeString(value);
    }
  }

  function handleFocus(): void {
    isFocused = true;
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }

  function increment(): void {
    if (disabled) return;
    value = Math.round((value + STEP_HOURS) * 100) / 100;
    displayValue = hoursToTimeString(value);
  }

  function decrement(): void {
    if (disabled || value <= 0) return;
    const newValue = Math.round((value - STEP_HOURS) * 100) / 100;
    value = Math.max(0, newValue);
    displayValue = hoursToTimeString(value);
  }
</script>

<div class="flex items-center gap-1">
  {#if showStepButtons}
    <button
      type="button"
      onclick={decrement}
      {disabled}
      class="flex-shrink-0 rounded-lg border border-input bg-background p-2 text-muted-foreground
        hover:bg-accent hover:text-foreground active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
      title="−15 min"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" x2="19" y1="12" y2="12" />
      </svg>
    </button>
  {/if}
  <input
    {id}
    type="text"
    inputmode="numeric"
    bind:value={displayValue}
    oninput={handleInput}
    onblur={handleBlur}
    onfocus={handleFocus}
    onkeydown={handleKeyDown}
    placeholder="00:00"
    {disabled}
    class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono text-center
      focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150
      disabled:opacity-50 disabled:cursor-not-allowed"
  />
  {#if showStepButtons}
    <button
      type="button"
      onclick={increment}
      {disabled}
      class="flex-shrink-0 rounded-lg border border-input bg-background p-2 text-muted-foreground
        hover:bg-accent hover:text-foreground active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
      title="+15 min"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
      </svg>
    </button>
  {/if}
</div>
