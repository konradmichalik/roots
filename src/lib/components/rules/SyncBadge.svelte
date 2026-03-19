<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import type { SyncRecord } from '../../types';
  import Zap from '@lucide/svelte/icons/zap';
  import { rulesState } from '../../stores/rules.svelte';

  let { syncRecord }: { syncRecord: SyncRecord } = $props();

  let ruleName = $derived(
    rulesState.rules.find((r) => r.id === syncRecord.ruleId)?.name ?? 'Unknown Rule'
  );

  let syncDate = $derived(
    new Date(syncRecord.syncedAt).toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  );
</script>

<Tooltip.Provider delayDuration={200}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Zap class="size-3 text-warning/70" aria-label="Synced via Rule" />
    </Tooltip.Trigger>
    <Tooltip.Content side="top" sideOffset={4}>
      Transferred via Rule '{ruleName}' on {syncDate}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
