import { JiraWorklogClient, type JiraWorklogClientConfig } from './client';
import type {
  JiraUser,
  JiraWorklogAuthor,
  JiraCreateWorklogPayload,
  JiraUpdateWorklogPayload
} from './types';

interface JiraCloudConfig extends JiraWorklogClientConfig {
  email: string;
  apiToken: string;
}

export class JiraCloudWorklogClient extends JiraWorklogClient {
  private email: string;
  private apiToken: string;
  private accountId: string | null = null;

  constructor(config: JiraCloudConfig) {
    super(config);
    this.email = config.email;
    this.apiToken = config.apiToken;
  }

  protected get apiVersion(): string {
    return '3';
  }

  protected getAuthHeaders(): Record<string, string> {
    const token = btoa(`${this.email}:${this.apiToken}`);
    return {
      Authorization: `Basic ${token}`,
      'X-Atlassian-Token': 'no-check'
    };
  }

  protected storeCurrentUser(user: JiraUser): void {
    this.currentUser = user;
    this.accountId = user.accountId ?? null;
  }

  protected isCurrentUser(author: JiraWorklogAuthor): boolean {
    if (!this.accountId) return false;
    return author.accountId === this.accountId;
  }

  protected formatWorklogPayload(
    payload: JiraCreateWorklogPayload | JiraUpdateWorklogPayload
  ): Record<string, unknown> {
    const formatted: Record<string, unknown> = { ...payload };

    // Cloud API v3 uses ADF (Atlassian Document Format) for comments
    if (typeof payload.comment === 'string' && payload.comment) {
      formatted.comment = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: payload.comment }]
          }
        ]
      };
    }

    return formatted;
  }
}
