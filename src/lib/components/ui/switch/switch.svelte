<script lang="ts">
  import { Switch as SwitchPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  let {
    checked = $bindable(false),
    onCheckedChange,
    disabled = false,
    class: className
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    class?: string;
  } = $props();
</script>

<SwitchPrimitive.Root
  bind:checked
  {disabled}
  {onCheckedChange}
  class={cn(
    'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-all outline-none',
    'focus-visible:ring-[3px] focus-visible:ring-ring/50',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary',
    className
  )}
>
  <SwitchPrimitive.Thumb
    class="pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform
      data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
  />
</SwitchPrimitive.Root>
