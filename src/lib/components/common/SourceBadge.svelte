<script lang="ts">
  import type { ServiceType } from '../../types';

  let { source }: { source: ServiceType } = $props();

  const labels: Record<ServiceType, string> = {
    moco: 'Moco',
    jira: 'Jira',
    outlook: 'Outlook',
    personio: 'Personio'
  };

  // Map sources to styleguide color classes
  const SOURCE_BADGE_COLORS: Record<ServiceType, string> = {
    moco: 'bg-success text-success-foreground',
    jira: 'bg-brand text-brand-foreground',
    outlook: 'bg-source-outlook text-white',
    personio: 'bg-warning text-warning-foreground'
  };

  let colorClass = $derived(SOURCE_BADGE_COLORS[source]);
</script>

<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {colorClass}">
  {labels[source]}
</span>
