import { JiraWorklogClient, type JiraWorklogClientConfig } from './jira-worklog-client';
import type {
  JiraUser,
  JiraWorklogAuthor,
  JiraCreateWorklogPayload,
  JiraUpdateWorklogPayload
} from '../types';

interface JiraServerConfig extends JiraWorklogClientConfig {
  authMethod: 'basic' | 'pat';
  username?: string;
  password?: string;
  personalAccessToken?: string;
}

export class JiraServerWorklogClient extends JiraWorklogClient {
  private authMethod: 'basic' | 'pat';
  private username?: string;
  private password?: string;
  private personalAccessToken?: string;
  private userKey: string | null = null;
  private userName: string | null = null;

  constructor(config: JiraServerConfig) {
    super(config);
    this.authMethod = config.authMethod;
    this.username = config.username;
    this.password = config.password;
    this.personalAccessToken = config.personalAccessToken;
  }

  protected get apiVersion(): string {
    return '2';
  }

  protected getAuthHeaders(): Record<string, string> {
    if (this.authMethod === 'pat' && this.personalAccessToken) {
      return {
        Authorization: `Bearer ${this.personalAccessToken}`,
        'X-Atlassian-Token': 'no-check'
      };
    }

    const token = btoa(`${this.username}:${this.password}`);
    return {
      Authorization: `Basic ${token}`,
      'X-Atlassian-Token': 'no-check'
    };
  }

  protected storeCurrentUser(user: JiraUser): void {
    this.currentUser = user;
    this.userKey = user.key ?? null;
    this.userName = user.name ?? null;
  }

  protected isCurrentUser(author: JiraWorklogAuthor): boolean {
    if (this.userKey && author.key === this.userKey) return true;
    if (this.userName && author.name === this.userName) return true;
    return false;
  }

  protected formatWorklogPayload(
    payload: JiraCreateWorklogPayload | JiraUpdateWorklogPayload
  ): Record<string, unknown> {
    // Server API v2 accepts plain string comments directly
    return { ...payload };
  }
}
