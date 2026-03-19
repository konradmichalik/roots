<script lang="ts">
  import FavoritesList from './FavoritesList.svelte';
  import RulesModal from '../rules/RulesModal.svelte';
  import { rulesState } from '../../stores/rules.svelte';
  import Zap from '@lucide/svelte/icons/zap';
</script>

<div class="p-4 space-y-4">
  <FavoritesList />

  <!-- Rules Section -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Zap class="size-4 text-warning" />
        <h3 class="text-sm font-semibold text-foreground">Rules</h3>
        {#if rulesState.rules.length > 0}
          <span class="text-[10px] font-mono text-muted-foreground">
            ({rulesState.rules.filter((r) => r.enabled).length} active)
          </span>
        {/if}
      </div>
    </div>

    <RulesModal>
      <button
        class="w-full rounded-lg border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground
          hover:border-border hover:text-foreground hover:bg-accent/30 transition-all duration-150
          focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {#if rulesState.rules.length === 0}
          Set up Rules to auto-sync entries
        {:else}
          Manage Rules
        {/if}
      </button>
    </RulesModal>
  </div>
</div>
