<script lang="ts">
  import type { ServiceType } from '../../types';
  import { getSourceColor } from '../../stores/settings.svelte';

  let { source }: { source: ServiceType } = $props();

  const labels: Record<ServiceType, string> = {
    moco: 'Moco',
    jira: 'Jira',
    outlook: 'Outlook',
    personio: 'Personio'
  };
</script>

<span
  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
  style="background-color: {getSourceColor(source)}"
>
  {labels[source]}
</span>
