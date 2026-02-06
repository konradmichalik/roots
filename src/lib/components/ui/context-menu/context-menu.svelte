<script lang="ts">
  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';
  import type { ComponentProps } from 'svelte';

  let { ...restProps }: ComponentProps<typeof ContextMenuPrimitive.Root> = $props();
</script>

<ContextMenuPrimitive.Root {...restProps} />
