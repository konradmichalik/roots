<script lang="ts">
  import { formatHours } from '../../utils/time-format';

  let { hours, class: className = '' }: { hours: number; class?: string } = $props();
</script>

<span class="font-mono text-sm {className}">
  {formatHours(hours)}
</span>
