import { ApiClient, type ApiClientConfig } from './base-client';
import type {
  JiraSearchResponse,
  JiraIssue,
  JiraWorklog,
  JiraUser,
  JiraWorklogResponse,
  JiraCreateWorklogPayload,
  JiraUpdateWorklogPayload
} from '../types';
import { logger } from '../utils/logger';

export interface JiraWorklogClientConfig extends ApiClientConfig {
  instanceType: 'cloud' | 'server';
}

export interface WorklogWithIssue {
  worklog: JiraWorklog;
  issueKey: string;
  issueSummary: string;
  issueType?: string;
  projectKey?: string;
}

export abstract class JiraWorklogClient extends ApiClient {
  protected currentUser: JiraUser | null = null;

  protected get serviceName(): string {
    return 'Jira';
  }

  protected abstract get apiVersion(): string;
  protected abstract isCurrentUser(author: JiraWorklog['author']): boolean;
  protected abstract storeCurrentUser(user: JiraUser): void;
  protected abstract formatWorklogPayload(
    payload: JiraCreateWorklogPayload | JiraUpdateWorklogPayload
  ): Record<string, unknown>;

  async testConnection(): Promise<{ success: boolean; user?: JiraUser; error?: string }> {
    try {
      logger.connection('Testing Jira connection');
      const user = await this.request<JiraUser>('GET', `/rest/api/${this.apiVersion}/myself`);
      this.storeCurrentUser(user);
      logger.connectionSuccess(`Jira connected as ${user.displayName}`);
      return { success: true, user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      logger.error('Jira connection test failed', error);
      return { success: false, error: message };
    }
  }

  async getWorklogsForRange(from: string, to: string): Promise<WorklogWithIssue[]> {
    const issues = await this.searchIssuesWithWorklogs(from, to);

    const allWorklogs: WorklogWithIssue[] = [];

    for (const issue of issues) {
      const worklogs = await this.collectWorklogs(issue);
      const filtered = worklogs.filter((w) => {
        const worklogDate = w.started.split('T')[0];
        return worklogDate >= from && worklogDate <= to && this.isCurrentUser(w.author);
      });

      for (const worklog of filtered) {
        allWorklogs.push({
          worklog,
          issueKey: issue.key,
          issueSummary: issue.fields.summary,
          issueType: issue.fields.issuetype?.name,
          projectKey: issue.fields.project?.key
        });
      }
    }

    logger.info(`Found ${allWorklogs.length} Jira worklogs for ${from} to ${to}`);
    return allWorklogs;
  }

  private async searchIssuesWithWorklogs(from: string, to: string): Promise<JiraIssue[]> {
    const jql = `worklogDate >= "${from}" AND worklogDate <= "${to}"`;
    const allIssues: JiraIssue[] = [];
    let startAt = 0;
    const maxResults = 50;

    logger.info(`Searching Jira issues: ${jql}`);

    while (true) {
      const response = await this.request<JiraSearchResponse>(
        'POST',
        `/rest/api/${this.apiVersion}/search`,
        {
          jql,
          startAt,
          maxResults,
          fields: ['summary', 'issuetype', 'project', 'worklog']
        }
      );

      allIssues.push(...response.issues);

      if (allIssues.length >= response.total) break;
      startAt += maxResults;
    }

    logger.info(`Found ${allIssues.length} issues with worklogs`);
    return allIssues;
  }

  private async collectWorklogs(issue: JiraIssue): Promise<JiraWorklog[]> {
    const inlineWorklogs = issue.fields.worklog;

    if (inlineWorklogs && inlineWorklogs.total <= inlineWorklogs.maxResults) {
      return inlineWorklogs.worklogs;
    }

    return this.fetchAllWorklogs(issue.key);
  }

  private async fetchAllWorklogs(issueKey: string): Promise<JiraWorklog[]> {
    const allWorklogs: JiraWorklog[] = [];
    let startAt = 0;
    const maxResults = 1000;

    while (true) {
      const response = await this.request<JiraWorklogResponse>(
        'GET',
        `/rest/api/${this.apiVersion}/issue/${issueKey}/worklog?startAt=${startAt}&maxResults=${maxResults}`
      );

      allWorklogs.push(...response.worklogs);

      if (allWorklogs.length >= response.total) break;
      startAt += maxResults;
    }

    return allWorklogs;
  }

  extractWorklogComment(comment: JiraWorklog['comment']): string | undefined {
    if (!comment) return undefined;
    if (typeof comment === 'string') return comment;
    return this.extractAdfText(comment);
  }

  private extractAdfText(doc: {
    content?: Array<{ type: string; text?: string; content?: unknown[] }>;
  }): string {
    if (!doc.content) return '';
    const parts: string[] = [];
    for (const node of doc.content) {
      if (node.text) {
        parts.push(node.text);
      } else if (node.content) {
        parts.push(this.extractAdfText(node as typeof doc));
      }
    }
    return parts.join('');
  }

  /**
   * Create a new worklog on an issue
   */
  async createWorklog(issueKey: string, payload: JiraCreateWorklogPayload): Promise<JiraWorklog> {
    logger.info(`Creating worklog on ${issueKey}`, { seconds: payload.timeSpentSeconds });
    const formattedPayload = this.formatWorklogPayload(payload);
    return this.request<JiraWorklog>(
      'POST',
      `/rest/api/${this.apiVersion}/issue/${issueKey}/worklog`,
      formattedPayload
    );
  }

  /**
   * Update an existing worklog
   */
  async updateWorklog(
    issueKey: string,
    worklogId: string,
    payload: JiraUpdateWorklogPayload
  ): Promise<JiraWorklog> {
    logger.info(`Updating worklog ${worklogId} on ${issueKey}`);
    const formattedPayload = this.formatWorklogPayload(payload);
    return this.request<JiraWorklog>(
      'PUT',
      `/rest/api/${this.apiVersion}/issue/${issueKey}/worklog/${worklogId}`,
      formattedPayload
    );
  }

  /**
   * Delete a worklog
   */
  async deleteWorklog(issueKey: string, worklogId: string): Promise<void> {
    logger.info(`Deleting worklog ${worklogId} from ${issueKey}`);
    await this.request<void>(
      'DELETE',
      `/rest/api/${this.apiVersion}/issue/${issueKey}/worklog/${worklogId}`
    );
  }
}
