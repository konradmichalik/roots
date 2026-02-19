<script lang="ts">
  import { formatHours } from '../../utils/time-format';
  import type { MonthProjectStats } from './statsTypes';
  import { statsModalState } from '../../stores/statsModal.svelte';
  import { tick } from 'svelte';

  let { stats }: { stats: MonthProjectStats } = $props();

  // Read highlight directly from the global store (avoids multi-level prop chain)
  let highlightProjectId = $derived(statsModalState.highlightProjectId);
  let highlightTaskName = $derived(statsModalState.highlightTaskName);

  let listRef: HTMLElement | undefined = $state();

  // Scroll to highlighted project whenever the value changes
  $effect(() => {
    if (highlightProjectId !== undefined && listRef) {
      tick().then(() => {
        const el = listRef?.querySelector(`[data-project-id="${highlightProjectId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  });

  // Colors for project bars (cycling through Nord palette)
  const PROJECT_COLORS = [
    '#8fbcbb',
    '#88c0d0',
    '#81a1c1',
    '#5e81ac',
    '#bf616a',
    '#d08770',
    '#ebcb8b',
    '#a3be8c',
    '#b48ead'
  ];

  function getProjectColor(index: number): string {
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
  }

  function getPercent(hours: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((hours / total) * 100);
  }

  // Generate pie chart segments
  let pieSegments = $derived.by(() => {
    if (stats.total === 0) return [];

    let currentAngle = -90; // Start from top

    return stats.projects.map((project, i) => {
      const percent = (project.hours / stats.total) * 100;
      const angle = (percent / 100) * 360;
      const segment = {
        project,
        color: getProjectColor(i),
        percent,
        startAngle: currentAngle,
        endAngle: currentAngle + angle
      };
      currentAngle += angle;
      return segment;
    });
  });

  function describeArc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ): string {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  }

  function polarToCartesian(
    cx: number,
    cy: number,
    r: number,
    angleInDegrees: number
  ): { x: number; y: number } {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians)
    };
  }

  let hoveredSegment = $state<number | null>(null);
</script>

<div class="space-y-3 animate-in fade-in duration-200" bind:this={listRef}>
  {#if stats.projects.length > 0}
    <!-- Pie Chart with Tooltip -->
    <div class="flex flex-col items-center gap-3 py-4">
      <div class="relative">
        <svg width="200" height="200" viewBox="0 0 100 100">
          {#each pieSegments as segment, i (segment.project.projectId)}
            <path
              role="img"
              aria-label="{segment.project.customerName} — {segment.project
                .projectName}: {formatHours(segment.project.hours)}"
              d={describeArc(50, 50, 45, segment.startAngle, segment.endAngle)}
              fill={segment.color}
              class="transition-opacity duration-150 cursor-pointer"
              opacity={hoveredSegment === null || hoveredSegment === i ? 1 : 0.4}
              onmouseenter={() => (hoveredSegment = i)}
              onmouseleave={() => (hoveredSegment = null)}
            />
          {/each}
          <!-- Center hole for donut effect -->
          <circle cx="50" cy="50" r="30" fill="var(--background)" />
        </svg>
        <!-- Center text -->
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {#if hoveredSegment !== null}
            <span class="text-2xl font-mono font-semibold text-foreground">
              {Math.round(pieSegments[hoveredSegment].percent)}%
            </span>
          {:else}
            <span class="text-xs text-muted-foreground">Total</span>
            <span class="text-base font-mono font-semibold text-foreground">
              {formatHours(stats.total)}
            </span>
          {/if}
        </div>
      </div>

      <!-- Hover Tooltip -->
      <div class="h-10 flex items-center justify-center text-center px-4">
        {#if hoveredSegment !== null}
          {@const hovered = pieSegments[hoveredSegment].project}
          <div class="flex flex-col items-center gap-0.5">
            <span class="text-sm font-medium text-foreground line-clamp-1">
              {hovered.customerName} — {hovered.projectName}
            </span>
            <span class="text-xs text-muted-foreground font-mono">
              {formatHours(hovered.hours)}
            </span>
          </div>
        {:else}
          <span class="text-xs text-muted-foreground"> Hover über Segmente für Details </span>
        {/if}
      </div>
    </div>

    <!-- Project List -->
    {#each stats.projects as project, i (project.projectId)}
      {@const isHighlighted = highlightProjectId !== undefined && project.projectId === highlightProjectId}
      <div
        role="listitem"
        class="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm transition-all duration-300
          {isHighlighted ? 'ring-2 ring-primary/50' : ''}"
        data-project-id={project.projectId}
      >
        <!-- Project Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div
              class="h-3 w-3 rounded-full flex-shrink-0"
              style="background-color: {getProjectColor(i)}"
            ></div>
            <span
              class="text-sm font-medium text-foreground truncate"
              title="{project.customerName} — {project.projectName}"
            >
              {project.customerName} — {project.projectName}
            </span>
          </div>
          <div class="flex items-center gap-2 ml-2 flex-shrink-0">
            <span class="text-xs text-muted-foreground">
              {getPercent(project.hours, stats.total)}%
            </span>
            <span class="text-sm font-mono font-semibold text-foreground">
              {formatHours(project.hours)}
            </span>
          </div>
        </div>

        <!-- Project Progress Bar -->
        <div class="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            style="width: {getPercent(
              project.hours,
              stats.total
            )}%; background-color: {getProjectColor(i)}"
          ></div>
        </div>

        <!-- Tasks within Project -->
        <div class="pl-5 space-y-1 pt-1">
          {#each project.tasks as task, taskIndex (`${project.projectId}-${taskIndex}`)}
            {@const isTaskHighlighted = isHighlighted && highlightTaskName !== undefined && task.taskName === highlightTaskName}
            <div class="flex items-center justify-between text-xs gap-2 transition-colors duration-300
              {isTaskHighlighted ? 'bg-primary/10 rounded px-1 -mx-1' : ''}">
              <span class="{isTaskHighlighted ? 'text-foreground font-medium' : 'text-muted-foreground'} truncate min-w-0 flex-1" title={task.taskName}>
                {task.taskName}
              </span>
              <span class="text-muted-foreground/70 flex-shrink-0 w-8 text-right">
                {getPercent(task.hours, stats.total)}%
              </span>
              <span class="font-mono text-muted-foreground flex-shrink-0 w-14 text-right">
                {formatHours(task.hours)}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {:else}
    <div class="rounded-xl border border-border bg-card p-8 text-center">
      <p class="text-sm text-muted-foreground">No projects tracked this month.</p>
    </div>
  {/if}
</div>
