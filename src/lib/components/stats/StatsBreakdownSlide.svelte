<script lang="ts">
  import { formatHours } from '../../utils/time-format';
  import type { MonthProjectStats } from './statsTypes';

  let { stats }: { stats: MonthProjectStats } = $props();
</script>

<div class="space-y-4 animate-in fade-in duration-200">
  {#if stats.total > 0}
    <div class="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
      <h4 class="text-sm font-semibold text-foreground">Monthly Breakdown</h4>

      <!-- Billable vs Non-billable -->
      <div class="space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Billable</span>
          <span class="font-mono font-medium text-success-text"
            >{formatHours(stats.billable)}</span
          >
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Non-billable</span>
          <span class="font-mono font-medium text-muted-foreground"
            >{formatHours(stats.nonBillable)}</span
          >
        </div>
        <div class="h-3 rounded-full bg-muted overflow-hidden flex">
          {#if stats.total > 0}
            <div
              class="h-full bg-success transition-all duration-300"
              style="width: {(stats.billable / stats.total) * 100}%"
            ></div>
            <div
              class="h-full bg-muted-foreground/30 transition-all duration-300"
              style="width: {(stats.nonBillable / stats.total) * 100}%"
            ></div>
          {/if}
        </div>
        <p class="text-xs text-muted-foreground">
          {Math.round((stats.billable / stats.total) * 100)}% billable this month
        </p>
      </div>

      <!-- Summary Stats -->
      <div class="pt-3 border-t border-border/50 grid grid-cols-2 gap-4">
        <div>
          <p class="text-xs text-muted-foreground">Total Hours</p>
          <p class="font-mono text-lg font-medium text-foreground">
            {formatHours(stats.total)}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">Projects</p>
          <p class="font-mono text-lg font-medium text-foreground">
            {stats.projects.length}
          </p>
        </div>
      </div>
    </div>
  {:else}
    <div class="rounded-xl border border-border bg-card p-8 text-center">
      <p class="text-sm text-muted-foreground">No data available for this month.</p>
    </div>
  {/if}
</div>
