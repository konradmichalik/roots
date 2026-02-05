import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import { getActiveProjects, getTasksForProject } from './mocoProjects.svelte';
import type { RecentMocoPair } from '../types';

const MAX_STORED_PAIRS = 20;

export const recentPairsState = $state<{ pairs: RecentMocoPair[] }>({
  pairs: []
});

export async function initializeRecentPairs(): Promise<void> {
  const stored = await getStorageItemAsync<RecentMocoPair[]>(STORAGE_KEYS.RECENT_PAIRS);
  if (stored) {
    recentPairsState.pairs = stored;
  }
  logger.store('recentPairs', 'Initialized', { count: recentPairsState.pairs.length });
}

function persist(): void {
  saveStorage(STORAGE_KEYS.RECENT_PAIRS, recentPairsState.pairs);
}

export function trackPairUsage(data: {
  projectId: number;
  taskId: number;
  projectName: string;
  taskName: string;
  customerName: string;
}): void {
  const existingIndex = recentPairsState.pairs.findIndex(
    (p) => p.projectId === data.projectId && p.taskId === data.taskId
  );

  if (existingIndex !== -1) {
    const updated = [...recentPairsState.pairs];
    updated[existingIndex] = {
      ...updated[existingIndex],
      usageCount: updated[existingIndex].usageCount + 1,
      projectName: data.projectName,
      taskName: data.taskName,
      customerName: data.customerName
    };
    recentPairsState.pairs = updated;
  } else {
    recentPairsState.pairs = [...recentPairsState.pairs, { ...data, usageCount: 1 }];
  }

  if (recentPairsState.pairs.length > MAX_STORED_PAIRS) {
    recentPairsState.pairs = [...recentPairsState.pairs]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, MAX_STORED_PAIRS);
  }

  persist();
  logger.store('recentPairs', 'Tracked usage', {
    project: data.projectName,
    task: data.taskName
  });
}

export function removePair(projectId: number, taskId: number): void {
  recentPairsState.pairs = recentPairsState.pairs.filter(
    (p) => !(p.projectId === projectId && p.taskId === taskId)
  );
  persist();
  logger.store('recentPairs', 'Removed pair', { projectId, taskId });
}

export function getTopPairs(limit: number = 5): RecentMocoPair[] {
  const activeProjects = getActiveProjects();
  const activeProjectIds = new Set(activeProjects.map((p) => p.id));

  return [...recentPairsState.pairs]
    .filter((pair) => {
      if (!activeProjectIds.has(pair.projectId)) {
        return false;
      }
      const tasks = getTasksForProject(pair.projectId);
      return tasks.some((t) => t.id === pair.taskId);
    })
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}
