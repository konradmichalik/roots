<script lang="ts">
  import { rulesState } from '../../stores/rules.svelte';
  import { getRuleAnalytics } from '../../stores/syncRecords.svelte';
  import { formatHours } from '../../utils/time-format';
  import Zap from '@lucide/svelte/icons/zap';
  import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

  let analytics = $derived(
    rulesState.rules
      .map((rule) => ({
        rule,
        stats: getRuleAnalytics(rule.id)
      }))
      .sort((a, b) => b.stats.totalSynced - a.stats.totalSynced)
  );

  let totalSynced = $derived(analytics.reduce((s, a) => s + a.stats.totalSynced, 0));
  let totalHours = $derived(analytics.reduce((s, a) => s + a.stats.totalHours, 0));

  function formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
</script>

{#if analytics.length === 0 || totalSynced === 0}
  <div class="py-8 text-center">
    <BarChart3 class="size-8 text-muted-foreground/30 mx-auto mb-2" />
    <p class="text-sm text-muted-foreground">No sync data yet.</p>
    <p class="text-xs text-muted-foreground/70 mt-1">
      Statistics appear after rules transfer entries to Moco.
    </p>
  </div>
{:else}
  <!-- Summary -->
  <div class="grid grid-cols-2 gap-3 mb-4">
    <div class="rounded-lg border border-border bg-card p-3 text-center">
      <span class="text-3xl font-extrabold font-mono text-foreground">{totalSynced}</span>
      <p class="text-[10px] text-muted-foreground mt-0.5">entries synced</p>
    </div>
    <div class="rounded-lg border border-border bg-card p-3 text-center">
      <span class="text-3xl font-extrabold font-mono text-foreground"
        >{formatHours(totalHours)}</span
      >
      <p class="text-[10px] text-muted-foreground mt-0.5">total hours</p>
    </div>
  </div>

  <!-- Per-rule breakdown -->
  <div class="space-y-3 max-h-[45vh] overflow-y-auto">
    {#each analytics as { rule, stats } (rule.id)}
      {#if stats.totalSynced > 0 || stats.totalFailed > 0}
        <div class="rounded-lg border border-border p-3">
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <Zap class="size-3 text-warning flex-shrink-0" />
              <span class="text-sm font-medium text-foreground truncate">{rule.name}</span>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="text-xs font-mono text-foreground">{stats.totalSynced}</span>
              <span class="text-[10px] text-muted-foreground">entries</span>
              {#if stats.totalFailed > 0}
                <span class="text-xs font-mono text-danger-text">{stats.totalFailed} failed</span>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
            <span>{formatHours(stats.totalHours)} total</span>
            {#if stats.lastSyncDate}
              <span>Last: {stats.lastSyncDate}</span>
            {/if}
          </div>

          <!-- Monthly breakdown -->
          {#if stats.byMonth.length > 0}
            <div class="space-y-1">
              {#each stats.byMonth.slice(0, 4) as month (month.month)}
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-muted-foreground w-16 shrink-0">
                    {formatMonth(month.month)}
                  </span>
                  <div class="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary/60 rounded-full transition-all"
                      style="width: {Math.min(
                        100,
                        (month.count / Math.max(...stats.byMonth.map((m) => m.count))) * 100
                      )}%"
                    ></div>
                  </div>
                  <span
                    class="text-[10px] font-mono text-muted-foreground w-10 text-right shrink-0"
                  >
                    {month.count}
                  </span>
                  <span
                    class="text-[10px] font-mono text-muted-foreground/60 w-12 text-right shrink-0"
                  >
                    {formatHours(month.hours)}
                  </span>
                </div>
              {/each}
              {#if stats.byMonth.length > 4}
                <p class="text-[10px] text-muted-foreground/50 text-center">
                  +{stats.byMonth.length - 4} more months
                </p>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
