import type { MocoProjectAssigned, MocoTask, MocoProjectReport } from '../types';
import { getMocoClient } from './connections.svelte';
import { logger } from '../utils/logger';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const mocoProjectsState = $state({
  projects: [] as MocoProjectAssigned[],
  loading: false,
  lastFetched: null as number | null,
  // Task hours from project reports: taskId -> hours_total
  taskHoursCache: new Map<number, number>(),
  // Full project reports: projectId -> report
  projectReportsCache: {} as Record<string, MocoProjectReport>,
  // Track which projects have had detailed tasks loaded
  loadedTaskDetails: new Set<number>(),
});

export async function fetchAssignedProjects(): Promise<void> {
  // Return cached if fresh
  if (mocoProjectsState.lastFetched && Date.now() - mocoProjectsState.lastFetched < CACHE_TTL) {
    return;
  }

  const client = getMocoClient();
  if (!client) return;

  mocoProjectsState.loading = true;
  try {
    const projects = await client.getAssignedProjects();
    mocoProjectsState.projects = projects;
    mocoProjectsState.lastFetched = Date.now();
    logger.store('mocoProjects', `Loaded ${projects.length} assigned projects`);
  } catch (error) {
    logger.error('Failed to fetch Moco projects', error);
  } finally {
    mocoProjectsState.loading = false;
  }
}

export function getActiveProjects(): MocoProjectAssigned[] {
  // Filter out inactive projects (active defaults to true if not present)
  return mocoProjectsState.projects.filter((p) => p.active !== false);
}

export function getProjectById(id: number): MocoProjectAssigned | undefined {
  return mocoProjectsState.projects.find((p) => p.id === id);
}

export function getTasksForProject(projectId: number): MocoTask[] {
  const project = getProjectById(projectId);
  const tasks = project?.tasks ?? [];
  // Filter out inactive tasks (active defaults to true if not present)
  return tasks.filter((t) => t.active !== false);
}

/**
 * Fetch detailed tasks for a project from /projects/:id/tasks.
 * This endpoint returns budget, hourly_rate and active fields
 * which are NOT included in /projects/assigned.
 */
export async function fetchTasksForProject(projectId: number): Promise<void> {
  if (mocoProjectsState.loadedTaskDetails.has(projectId)) return;

  const project = getProjectById(projectId);
  const client = getMocoClient();
  if (!client || !project) return;

  try {
    const tasks = await client.getProjectTasks(projectId);
    const idx = mocoProjectsState.projects.findIndex((p) => p.id === projectId);
    if (idx !== -1) {
      mocoProjectsState.projects[idx] = { ...mocoProjectsState.projects[idx], tasks };
    }
    mocoProjectsState.loadedTaskDetails.add(projectId);
    logger.store('mocoProjects', `Loaded ${tasks.length} tasks for project ${projectId}`);
  } catch (error) {
    logger.error(`Failed to fetch tasks for project ${projectId}`, error);
  }
}

/**
 * Fetch project report to get hours logged per task.
 * Always fetches fresh data from the API.
 */
export async function fetchProjectReport(projectId: number): Promise<void> {
  const client = getMocoClient();
  if (!client) return;

  try {
    const report = await client.getProjectReport(projectId);

    // Cache hours for each task
    if (report.costs_by_task) {
      for (const taskCost of report.costs_by_task) {
        mocoProjectsState.taskHoursCache.set(taskCost.id, taskCost.hours_total);
      }
    }

    mocoProjectsState.projectReportsCache = {
      ...mocoProjectsState.projectReportsCache,
      [String(projectId)]: report
    };
    logger.store(
      'mocoProjects',
      `Loaded report for project ${projectId}: ${report.costs_by_task?.length ?? 0} tasks`
    );
  } catch (error) {
    logger.error(`Failed to fetch report for project ${projectId}`, error);
  }
}

/**
 * Get logged hours for a task from the cached project report.
 * Returns 0 if not cached yet.
 */
export function getTaskLoggedHours(taskId: number): number {
  return mocoProjectsState.taskHoursCache.get(taskId) ?? 0;
}


