// ---------------------------------------------------------------------------
// Global StatsModal control — lets any component open the stats dialog
// ---------------------------------------------------------------------------

type SlideId = 'overview' | 'breakdown' | 'projects';

export const statsModalState = $state({
  open: false,
  initialSlide: 'overview' as SlideId,
  highlightProjectId: undefined as number | undefined,
  highlightTaskName: undefined as string | undefined
});

/** Open the stats modal on a specific slide (no highlight). */
export function openStats(slide: SlideId = 'overview'): void {
  statsModalState.open = true;
  statsModalState.initialSlide = slide;
  statsModalState.highlightProjectId = undefined;
  statsModalState.highlightTaskName = undefined;
}

/** Open the stats modal on the Tasks slide, highlighting a specific project + task. */
export function openStatsForTask(projectId: number, taskName: string): void {
  statsModalState.open = true;
  statsModalState.initialSlide = 'projects';
  statsModalState.highlightProjectId = projectId;
  statsModalState.highlightTaskName = taskName;
}

/** Clear highlight (called when the modal closes). */
export function resetStatsHighlight(): void {
  statsModalState.highlightProjectId = undefined;
  statsModalState.highlightTaskName = undefined;
}
