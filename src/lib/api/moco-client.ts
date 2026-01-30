import { ApiClient, type ApiClientConfig } from './base-client';
import type { MocoActivity, MocoUser } from '../types';
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
   * Get domain for display
   */
  getDomain(): string {
    return this.domain;
  }
}
