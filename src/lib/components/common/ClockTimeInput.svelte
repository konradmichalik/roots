<script lang="ts">
  import { normalizeTimeInput } from '../../utils/time-format';
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';

  let {
    value = $bindable(''),
    id = '',
    disabled = false,
    placeholder = '08:00'
  }: {
    value: string;
    id?: string;
    disabled?: boolean;
    placeholder?: string;
  } = $props();

  const STEP_MINUTES = 15;

  function adjustTime(delta: number): void {
    if (disabled) return;
    const normalized = normalizeTimeInput(value);
    if (!normalized) return;

    const [h, m] = normalized.split(':').map(Number);
    let totalMinutes = h * 60 + m + delta;
    totalMinutes = Math.max(0, Math.min(23 * 60 + 45, totalMinutes));

    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    value = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  }

  function handleBlur(): void {
    if (value.trim()) {
      const normalized = normalizeTimeInput(value);
      if (normalized) {
        value = normalized;
      }
    }
  }
</script>

<div class="flex items-center gap-1">
  <button
    type="button"
    onclick={() => adjustTime(-STEP_MINUTES)}
    disabled={disabled || !normalizeTimeInput(value)}
    class="flex-shrink-0 rounded border border-input bg-background p-1 text-muted-foreground
      hover:bg-accent hover:text-foreground active:scale-95
      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    title="−15 min"
  >
    <Minus class="size-3" />
  </button>
  <input
    {id}
    type="text"
    inputmode="numeric"
    bind:value
    onblur={handleBlur}
    {placeholder}
    {disabled}
    class="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground font-mono text-center
      focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150
      disabled:opacity-50 disabled:cursor-not-allowed"
  />
  <button
    type="button"
    onclick={() => adjustTime(STEP_MINUTES)}
    disabled={disabled || !normalizeTimeInput(value)}
    class="flex-shrink-0 rounded border border-input bg-background p-1 text-muted-foreground
      hover:bg-accent hover:text-foreground active:scale-95
      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    title="+15 min"
  >
    <Plus class="size-3" />
  </button>
</div>
