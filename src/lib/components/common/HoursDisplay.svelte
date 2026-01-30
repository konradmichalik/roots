<script lang="ts">
  import { formatHours } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';

  let { hours, class: className = '' }: { hours: number; class?: string } = $props();
</script>

<span class="font-mono text-sm {className}">
  {formatHours(hours, settingsState.hoursFormat)}
</span>
