<script lang="ts">
  import { hoursToTimeString, timeStringToHours, normalizeTimeInput } from '../../utils/time-format';

  let { value = $bindable(0), id = '', disabled = false }: {
    value: number;
    id?: string;
    disabled?: boolean;
  } = $props();

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
</script>

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
