<script lang="ts">
  import { formatHours } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';
  import type { WeekBillability } from './statsTypes';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TrendingDown from '@lucide/svelte/icons/trending-down';
  import Minus from '@lucide/svelte/icons/minus';

  let {
    weeks,
    overallRate
  }: {
    weeks: WeekBillability[];
    overallRate: number;
  } = $props();

  let billableTotal = $derived(weeks.reduce((s, w) => s + w.billable, 0));
  let nonBillableTotal = $derived(weeks.reduce((s, w) => s + w.nonBillable, 0));

  let target = $derived(settingsState.billableTarget);

  // Trend: compare last 2 weeks
  let trend = $derived.by((): 'up' | 'down' | 'flat' => {
    if (weeks.length < 2) return 'flat';
    const last = weeks[weeks.length - 1].rate;
    const prev = weeks[weeks.length - 2].rate;
    if (last > prev + 3) return 'up';
    if (last < prev - 3) return 'down';
    return 'flat';
  });

  // Dynamic Y-axis: zoom into the relevant range so small differences are visible
  let yRange = $derived.by(() => {
    const rates = weeks.map((w) => w.rate);
    const allValues = [...rates, target];
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    // Add 15pp padding on each side, clamp to 0–100
    const rangeMin = Math.max(0, Math.floor((dataMin - 15) / 5) * 5);
    const rangeMax = Math.min(100, Math.ceil((dataMax + 15) / 5) * 5);
    // Ensure at least 30pp range so the chart doesn't look absurdly stretched
    const span = rangeMax - rangeMin;
    if (span < 30) {
      const mid = (rangeMin + rangeMax) / 2;
      return { min: Math.max(0, Math.round(mid - 15)), max: Math.min(100, Math.round(mid + 15)) };
    }
    return { min: rangeMin, max: rangeMax };
  });

  // Chart geometry
  const chartW = 460;
  const chartH = 80;
  const padX = 16;
  const padY = 10;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;

  function rateToY(rate: number): number {
    const normalized = (rate - yRange.min) / (yRange.max - yRange.min);
    return padY + innerH - normalized * innerH;
  }

  let points = $derived(
    weeks.map((w, i) => {
      const x = weeks.length === 1 ? padX + innerW / 2 : padX + (i / (weeks.length - 1)) * innerW;
      return { x, y: rateToY(w.rate), week: w };
    })
  );

  let linePath = $derived(points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '));
  let targetY = $derived(rateToY(target));

  function dotColor(rate: number): string {
    if (rate >= target) return 'var(--success)';
    if (rate >= target - 10) return 'var(--warning)';
    return 'var(--muted-foreground)';
  }

  const MONO_FONT = "'JetBrains Mono Variable', ui-monospace, monospace";

  let hoveredPoint = $state<number | null>(null);
</script>

<div class="space-y-3 animate-in fade-in duration-200">
  <!-- Combined card: rate + sparkline -->
  <div class="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
    <!-- Rate header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-semibold text-foreground">Billability</h4>
        {#if trend === 'up'}
          <TrendingUp class="size-3.5 text-success-text" />
        {:else if trend === 'down'}
          <TrendingDown class="size-3.5 text-danger-text" />
        {:else}
          <Minus class="size-3.5 text-muted-foreground" />
        {/if}
      </div>
      <div class="flex items-baseline gap-1.5">
        <span class="text-4xl font-mono font-extrabold text-foreground">{overallRate}%</span>
        <span class="text-lg font-mono text-muted-foreground/60">/ {target}%</span>
      </div>
    </div>

    <!-- Compact bar -->
    <div class="h-2 rounded-full bg-muted overflow-hidden flex">
      <div
        class="h-full bg-success transition-all duration-300"
        style="width: {overallRate}%"
      ></div>
    </div>

    <div class="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1"></span>
        <span class="font-mono">{formatHours(billableTotal)}</span> billable
      </span>
      <span>
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mr-1"></span>
        <span class="font-mono">{formatHours(nonBillableTotal)}</span> non-billable
      </span>
    </div>

    <!-- Sparkline -->
    {#if weeks.length > 1}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="relative pt-1 overflow-x-clip" onmouseleave={() => (hoveredPoint = null)}>
        <svg
          viewBox="0 0 {chartW} {chartH}"
          class="w-full h-auto"
          role="img"
          aria-label="Weekly billability sparkline"
        >
          <!-- Y-axis range labels -->
          <text
            x={padX - 3}
            y={padY + 3}
            text-anchor="end"
            class="fill-muted-foreground/40"
            font-size="7"
            font-family={MONO_FONT}>{yRange.max}</text
          >
          <text
            x={padX - 3}
            y={padY + innerH + 3}
            text-anchor="end"
            class="fill-muted-foreground/40"
            font-size="7"
            font-family={MONO_FONT}>{yRange.min}</text
          >

          <!-- Target line -->
          <line
            x1={padX}
            y1={targetY}
            x2={padX + innerW}
            y2={targetY}
            stroke="var(--muted-foreground)"
            stroke-width="0.7"
            stroke-dasharray="5 3"
            opacity="0.4"
          />
          <text
            x={padX + innerW + 4}
            y={targetY + 3}
            class="fill-muted-foreground/50"
            font-size="7"
            font-family={MONO_FONT}>{target}%</text
          >

          <!-- Connecting line -->
          {#if linePath}
            <path
              d={linePath}
              fill="none"
              stroke="var(--muted-foreground)"
              stroke-width="1.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.2"
            />
          {/if}

          <!-- Dots -->
          {#each points as point, i (weeks[i].weekStart)}
            <circle
              role="img"
              aria-label="{weeks[i].weekLabel}: {weeks[i].rate}%"
              cx={point.x}
              cy={point.y}
              r="18"
              fill="transparent"
              class="cursor-pointer"
              onmouseenter={() => (hoveredPoint = i)}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === i ? 6 : 4.5}
              fill={dotColor(weeks[i].rate)}
              stroke="var(--card)"
              stroke-width="2"
              class="pointer-events-none transition-all duration-150"
            />
          {/each}
        </svg>

        <!-- Tooltip -->
        {#if hoveredPoint !== null}
          {@const hp = points[hoveredPoint]}
          {@const pct = (hp.x / chartW) * 100}
          {@const isLeft = pct < 25}
          {@const isRight = pct > 75}
          <div
            class="absolute pointer-events-none bg-popover border border-border rounded-md shadow-md px-2 py-1 text-[11px] z-10 whitespace-nowrap -top-1.5"
            style="left: {pct}%; transform: translateX({isLeft
              ? '0%'
              : isRight
                ? '-100%'
                : '-50%'})"
          >
            <span class="text-muted-foreground">{hp.week.weekLabel}</span>
            <span class="ml-1.5 font-mono font-medium" style="color: {dotColor(hp.week.rate)}"
              >{hp.week.rate}%</span
            >
            <span class="ml-1 text-muted-foreground/60 font-mono"
              >{formatHours(hp.week.billable)}/{formatHours(hp.week.total)}</span
            >
          </div>
        {/if}

        <!-- Legend row -->
        <div class="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-success"></span>≥{target}%
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-warning"></span>{target -
                10}–{target - 1}%
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground"
              ></span>&lt;{target - 10}%
            </span>
          </div>
          <span>{weeks.length} weeks</span>
        </div>
      </div>
    {/if}
  </div>
</div>
