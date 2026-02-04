import { ApiClient, type ApiClientConfig } from './base-client';
import type { MocoActivity, MocoUser, MocoTask, MocoProjectAssigned, MocoCreateActivity, MocoUpdateActivity, MocoPresence, MocoCreatePresence, MocoUpdatePresence, MocoProjectReport } from '../types';
import { logger } from '../utils/logger';

export interface MocoClientConfig extends ApiClientConfig {
  apiKey: string;
  domain: string;
}

export class MocoClient extends ApiClient {
  private apiKey: string;
  private domain: string;
  private currentUserId: number | null = null;

  constructor(config: MocoClientConfig) {
    super({
      baseUrl: `https://${config.domain}.mocoapp.com/api/v1`,
      proxyUrl: config.proxyUrl,
      timeout: config.timeout
    });
    this.apiKey = config.apiKey;
    this.domain = config.domain;
  }

  protected get serviceName(): string {
    return 'Moco';
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Token token=${this.apiKey}`
    };
  }

  async testConnection(): Promise<{ success: boolean; user?: MocoUser; error?: string }> {
    try {
      logger.connection(`Testing Moco connection to ${this.domain}.mocoapp.com`);
      const user = await this.request<MocoUser>('GET', '/session');

      this.currentUserId = user.id;
      logger.connectionSuccess(`Moco connected as ${user.firstname} ${user.lastname} (ID: ${user.id})`);
      return { success: true, user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      logger.error('Moco connection test failed', error);
      return { success: false, error: message };
    }
  }

  /**
   * Fetch time entries for a date range
   */
  async getActivities(from: string, to: string): Promise<MocoActivity[]> {
    const userFilter = this.currentUserId ? `&user_id=${this.currentUserId}` : '';
    logger.info(`Fetching Moco activities: ${from} to ${to} (user: ${this.currentUserId ?? 'all'})`);
    const activities = await this.request<MocoActivity[]>(
      'GET',
      `/activities?from=${from}&to=${to}${userFilter}`
    );
    logger.info(`Fetched ${activities.length} Moco activities`);
    return activities;
  }

  /**
   * Fetch projects assigned to the current user (includes tasks)
   */
  async getAssignedProjects(): Promise<MocoProjectAssigned[]> {
    logger.info('Fetching assigned Moco projects');
    const projects = await this.request<MocoProjectAssigned[]>('GET', '/projects/assigned');
    logger.info(`Fetched ${projects.length} assigned projects`);
    return projects;
  }

  /**
   * Fetch tasks for a specific project
   */
  async getProjectTasks(projectId: number): Promise<MocoTask[]> {
    logger.info(`Fetching tasks for project ${projectId}`);
    const tasks = await this.request<MocoTask[]>('GET', `/projects/${projectId}/tasks`);
    logger.info(`Fetched ${tasks.length} tasks for project ${projectId}`);
    return tasks;
  }

  /**
   * Fetch project report with budget and hours data per task
   */
  async getProjectReport(projectId: number): Promise<MocoProjectReport> {
    logger.info(`Fetching report for project ${projectId}`);
    const report = await this.request<MocoProjectReport>('GET', `/projects/${projectId}/report`);
    logger.info(`Fetched report for project ${projectId}: ${report.costs_by_task?.length ?? 0} tasks`);
    return report;
  }

  /**
   * Create a new time entry
   */
  async createActivity(data: MocoCreateActivity): Promise<MocoActivity> {
    logger.info('Creating Moco activity', { date: data.date, projectId: data.project_id });
    return this.request<MocoActivity>('POST', '/activities', data);
  }

  /**
   * Update an existing time entry
   */
  async updateActivity(id: number, data: MocoUpdateActivity): Promise<MocoActivity> {
    logger.info(`Updating Moco activity ${id}`);
    return this.request<MocoActivity>('PUT', `/activities/${id}`, data);
  }

  /**
   * Delete a time entry
   */
  async deleteActivity(id: number): Promise<void> {
    logger.info(`Deleting Moco activity ${id}`);
    await this.request<void>('DELETE', `/activities/${id}`);
  }

  /**
   * Fetch user presences (attendance) for a date range
   */
  async getPresences(from: string, to: string): Promise<MocoPresence[]> {
    const userFilter = this.currentUserId ? `&user_id=${this.currentUserId}` : '';
    logger.info(`Fetching Moco presences: ${from} to ${to}`);
    const presences = await this.request<MocoPresence[]>(
      'GET',
      `/users/presences?from=${from}&to=${to}${userFilter}`
    );
    logger.info(`Fetched ${presences.length} Moco presences`);
    return presences;
  }

  /**
   * Create a new presence entry
   */
  async createPresence(data: MocoCreatePresence): Promise<MocoPresence> {
    logger.info('Creating Moco presence', { date: data.date, from: data.from });
    return this.request<MocoPresence>('POST', '/users/presences', data);
  }

  /**
   * Update an existing presence entry
   */
  async updatePresence(id: number, data: MocoUpdatePresence): Promise<MocoPresence> {
    logger.info(`Updating Moco presence ${id}`);
    return this.request<MocoPresence>('PUT', `/users/presences/${id}`, data);
  }

  /**
   * Delete a presence entry
   */
  async deletePresence(id: number): Promise<void> {
    logger.info(`Deleting Moco presence ${id}`);
    await this.request<void>('DELETE', `/users/presences/${id}`);
  }

  /**
   * Get domain for display
   */
  getDomain(): string {
    return this.domain;
  }
}
