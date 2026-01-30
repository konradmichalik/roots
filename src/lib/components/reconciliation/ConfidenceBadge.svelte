<script lang="ts">
  import type { MatchConfidence } from '../../types';

  let { confidence }: { confidence: MatchConfidence } = $props();
</script>

{#if confidence === 'high'}
  <span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
    Exakt
  </span>
{:else}
  <span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
    Beschreibung
  </span>
{/if}
