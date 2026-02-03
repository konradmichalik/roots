import type { MocoProjectAssigned, MocoTask } from '../types';
import { getMocoClient } from './connections.svelte';
import { logger } from '../utils/logger';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const mocoProjectsState = $state({
  projects: [] as MocoProjectAssigned[],
  loading: false,
  lastFetched: null as number | null
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
 * Fetch tasks for a project from the API.
 * Always fetches from /projects/:id/tasks to get the `active` field,
 * which is not included in /projects/assigned responses.
 */
export async function fetchTasksForProject(projectId: number): Promise<void> {
  const project = getProjectById(projectId);

  const client = getMocoClient();
  if (!client || !project) return;

  // Check if tasks already have the `active` field (were fetched from /tasks endpoint)
  const hasActiveField = project.tasks?.some((t) => t.active !== undefined);
  if (hasActiveField) return;

  try {
    const tasks = await client.getProjectTasks(projectId);
    // Update the project's tasks in place
    const idx = mocoProjectsState.projects.findIndex((p) => p.id === projectId);
    if (idx !== -1) {
      mocoProjectsState.projects[idx] = { ...mocoProjectsState.projects[idx], tasks };
    }
    logger.store('mocoProjects', `Loaded ${tasks.length} tasks for project ${projectId}`);
  } catch (error) {
    logger.error(`Failed to fetch tasks for project ${projectId}`, error);
  }
}
