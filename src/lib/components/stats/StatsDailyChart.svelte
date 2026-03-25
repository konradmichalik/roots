<script lang="ts">
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { parseDate, formatDateShort } from '../../utils/date-helpers';
  import type { DayOverview } from '../../types';
  import type { DayChartEntry } from './statsTypes';

  let {
    workingDays,
    getOverview,
    todayStr,
    isCurrentMonth
  }: {
    workingDays: string[];
    getOverview: (date: string) => DayOverview;
    todayStr: string;
    isCurrentMonth: boolean;
  } = $props();

  // Build chart entries from working days
  let entries = $derived.by((): DayChartEntry[] => {
    return workingDays.map((date) => {
      const overview = getOverview(date);
      const isFuture = isCurrentMonth && date >= todayStr;
      return {
        date,
        actual: overview.totals.actual,
        target: overview.requiredHours,
        balance: overview.balance,
        isFuture
      };
    });
  });

  // KPI: average hours per past working day
  let pastEntries = $derived(entries.filter((e) => !e.isFuture && e.target > 0));
  let avgHoursPerDay = $derived(
    pastEntries.length > 0
      ? pastEntries.reduce((sum, e) => sum + e.actual, 0) / pastEntries.length
      : 0
  );

  // KPI: best and worst weekday (by average hours, only past days)
  const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  interface WeekdayAvg {
    label: string;
    avg: number;
    count: number;
  }

  let weekdayStats = $derived.by((): { best: WeekdayAvg | null; worst: WeekdayAvg | null } => {
    const byDay: Record<number, { total: number; count: number }> = {};
    for (const entry of pastEntries) {
      const dow = parseDate(entry.date).getDay();
      if (!byDay[dow]) byDay[dow] = { total: 0, count: 0 };
      byDay[dow].total += entry.actual;
      byDay[dow].count += 1;
    }

    const avgs: WeekdayAvg[] = Object.entries(byDay)
      .filter(([, v]) => v.count >= 2)
      .map(([k, v]) => ({
        label: WEEKDAY_LABELS[Number(k)],
        avg: v.total / v.count,
        count: v.count
      }));

    if (avgs.length < 2) return { best: null, worst: null };

    const sorted = [...avgs].sort((a, b) => b.avg - a.avg);
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  });

  // Chart geometry
  const chartW = 520;
  const chartH = 140;
  const padLeft = 32;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 24;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;

  // Y-axis: max of (highest actual hours, target + 2h, 10h)
  let yMax = $derived.by(() => {
    const maxActual = Math.max(...entries.map((e) => e.actual), 0);
    const maxTarget = Math.max(...entries.map((e) => e.target), 0);
    return Math.max(maxActual, maxTarget + 2, 10);
  });

  function hoursToY(hours: number): number {
    return padTop + innerH - (hours / yMax) * innerH;
  }

  // Bar layout with weekend gaps
  let barLayout = $derived.by(() => {
    if (entries.length === 0) return [];

    // Detect week boundaries for gaps
    const totalGaps = entries.reduce((gaps, entry, i) => {
      if (i === 0) return 0;
      const prevDate = parseDate(entries[i - 1].date);
      const currDate = parseDate(entry.date);
      const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      return gaps + (dayDiff > 1 ? 1 : 0);
    }, 0);

    const gapWidth = 6;
    const usableWidth = innerW - totalGaps * gapWidth;
    const barWidth = Math.min(18, usableWidth / entries.length - 2);
    const barSpacing = (usableWidth - barWidth * entries.length) / Math.max(entries.length - 1, 1);

    let x = padLeft;
    return entries.map((entry, i) => {
      if (i > 0) {
        const prevDate = parseDate(entries[i - 1].date);
        const currDate = parseDate(entry.date);
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff > 1) x += gapWidth;
      }

      const barX = x;
      x += barWidth + (i < entries.length - 1 ? barSpacing : 0);

      const barH = (entry.actual / yMax) * innerH;
      const barY = padTop + innerH - barH;

      return { x: barX, y: barY, width: barWidth, height: barH, entry };
    });
  });

  // Target line Y position (average across all entries to handle varied weekday hours)
  let targetHours = $derived(
    entries.length > 0
      ? entries.reduce((sum, e) => sum + e.target, 0) / entries.length
      : 8
  );
  let targetY = $derived(hoursToY(targetHours));

  function barColor(entry: DayChartEntry): string {
    if (entry.isFuture) return 'var(--color-muted)';
    if (entry.actual === 0 && entry.target === 0) return 'var(--color-muted)';
    if (entry.actual >= entry.target) return 'var(--color-success)';
    return 'var(--color-danger)';
  }

  const MONO_FONT = "'JetBrains Mono Variable', ui-monospace, monospace";

  let hoveredBar = $state<number | null>(null);

  // Y-axis labels
  let yLabels = $derived.by(() => {
    const step = yMax <= 12 ? 2 : 4;
    const labels: number[] = [];
    for (let h = 0; h <= yMax; h += step) {
      labels.push(h);
    }
    return labels;
  });
</script>

<div class="space-y-3 animate-in fade-in duration-200">
  <!-- KPI Header -->
  <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-foreground">Daily Hours</h4>
      <div class="flex items-baseline gap-1.5">
        <span class="text-3xl font-mono font-extrabold text-foreground">
          {avgHoursPerDay.toFixed(1)}h
        </span>
        <span class="text-sm text-muted-foreground/60">avg/day</span>
      </div>
    </div>

    {#if weekdayStats.best && weekdayStats.worst}
      <div class="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Best: <span class="font-mono font-medium text-success-text"
            >{weekdayStats.best.label} {weekdayStats.best.avg.toFixed(1)}h</span
          >
        </span>
        <span>
          Weakest: <span class="font-mono font-medium text-danger-text"
            >{weekdayStats.worst.label} {weekdayStats.worst.avg.toFixed(1)}h</span
          >
        </span>
      </div>
    {/if}
  </div>

  <!-- Bar Chart -->
  {#if entries.length > 0}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="relative overflow-x-clip" onmouseleave={() => (hoveredBar = null)}>
      <svg
        viewBox="0 0 {chartW} {chartH}"
        class="w-full h-auto"
        role="img"
        aria-label="Daily hours bar chart"
      >
        <!-- Y-axis grid lines and labels -->
        {#each yLabels as h (h)}
          <line
            x1={padLeft}
            y1={hoursToY(h)}
            x2={chartW - padRight}
            y2={hoursToY(h)}
            stroke="var(--muted-foreground)"
            stroke-width="0.5"
            opacity="0.15"
          />
          <text
            x={padLeft - 4}
            y={hoursToY(h) + 3}
            text-anchor="end"
            class="fill-muted-foreground/40"
            font-size="8"
            font-family={MONO_FONT}>{h}h</text
          >
        {/each}

        <!-- Target dashed line -->
        <line
          x1={padLeft}
          y1={targetY}
          x2={chartW - padRight}
          y2={targetY}
          stroke="var(--muted-foreground)"
          stroke-width="0.8"
          stroke-dasharray="5 3"
          opacity="0.5"
        />
        <text
          x={chartW - padRight + 2}
          y={targetY + 3}
          class="fill-muted-foreground/50"
          font-size="7"
          font-family={MONO_FONT}>{targetHours}h</text
        >

        <!-- Bars -->
        {#each barLayout as bar, i (entries[i].date)}
          <!-- Hit area (wider than visible bar for easier hovering) -->
          <rect
            x={bar.x - 2}
            y={padTop}
            width={bar.width + 4}
            height={innerH}
            fill="transparent"
            class="cursor-pointer"
            onmouseenter={() => (hoveredBar = i)}
          />
          <!-- Visible bar -->
          <rect
            x={bar.x}
            y={bar.entry.actual > 0 ? bar.y : padTop + innerH}
            width={bar.width}
            height={Math.max(bar.height, bar.entry.actual > 0 ? 1 : 0)}
            rx="2"
            fill={barColor(bar.entry)}
            opacity={hoveredBar === null || hoveredBar === i ? 1 : 0.5}
            class="pointer-events-none transition-opacity duration-150"
          />
        {/each}

        <!-- X-axis weekday labels -->
        {#each barLayout as bar, i (entries[i].date)}
          <text
            x={bar.x + bar.width / 2}
            y={chartH - 6}
            text-anchor="middle"
            class="fill-muted-foreground/50"
            font-size="7"
            font-family={MONO_FONT}
          >
            {WEEKDAY_SHORT[parseDate(entries[i].date).getDay()]}
          </text>
        {/each}
      </svg>

      <!-- Hover Tooltip -->
      {#if hoveredBar !== null}
        {@const bar = barLayout[hoveredBar]}
        {@const entry = entries[hoveredBar]}
        {@const pct = ((bar.x + bar.width / 2) / chartW) * 100}
        {@const isLeft = pct < 20}
        {@const isRight = pct > 80}
        <div
          class="absolute pointer-events-none bg-popover border border-border rounded-md shadow-md px-2.5 py-1.5 text-[11px] z-10 whitespace-nowrap top-1"
          style="left: {pct}%; transform: translateX({isLeft ? '0%' : isRight ? '-100%' : '-50%'})"
        >
          <div class="text-muted-foreground">{formatDateShort(entry.date)}</div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="font-mono font-medium text-foreground">{formatHours(entry.actual)}</span>
            <span class="text-muted-foreground/60">/ {formatHours(entry.target)}</span>
            <span class="font-mono font-medium {getBalanceClass(entry.balance)}">
              {formatBalance(entry.balance)}
            </span>
          </div>
        </div>
      {/if}

      <!-- Legend -->
      <div class="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-sm bg-success"></span>
            &ge; target
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-sm bg-danger"></span>
            &lt; target
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-sm bg-muted"></span>
            future
          </span>
        </div>
        <span>{pastEntries.length} days tracked</span>
      </div>
    </div>
  {:else}
    <div class="rounded-xl border border-border bg-card p-8 text-center">
      <p class="text-sm text-muted-foreground">No working days this month.</p>
    </div>
  {/if}
</div>
