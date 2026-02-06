export interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: { name: string; iconUrl?: string };
    project: { key: string; name: string };
    worklog?: JiraWorklogResponse;
  };
}

export interface JiraWorklog {
  id: string;
  author: JiraWorklogAuthor;
  started: string;
  timeSpentSeconds: number;
  comment?: string | JiraAdfDocument;
}

export interface JiraWorklogAuthor {
  accountId?: string;
  key?: string;
  name?: string;
  displayName: string;
}

export interface JiraAdfDocument {
  type: 'doc';
  version: number;
  content: JiraAdfNode[];
}

interface JiraAdfNode {
  type: string;
  text?: string;
  content?: JiraAdfNode[];
}

export interface JiraUser {
  accountId?: string;
  key?: string;
  name?: string;
  displayName: string;
  emailAddress?: string;
}

export interface JiraWorklogResponse {
  startAt: number;
  maxResults: number;
  total: number;
  worklogs: JiraWorklog[];
}

// Request payload for creating a worklog
export interface JiraCreateWorklogPayload {
  timeSpentSeconds: number;
  started: string; // ISO 8601: "2024-02-06T09:00:00.000+0000"
  comment?: string | JiraAdfDocument;
}

// Request payload for updating a worklog
export interface JiraUpdateWorklogPayload {
  timeSpentSeconds?: number;
  started?: string;
  comment?: string | JiraAdfDocument;
}

// Store-level input types (simpler than API payloads)
export interface JiraCreateWorklog {
  issueKey: string;
  date: string; // YYYY-MM-DD
  hours: number; // Decimal hours
  startTime?: string; // HH:mm, defaults to 09:00
  comment?: string;
}

export interface JiraUpdateWorklog {
  hours?: number;
  startTime?: string;
  comment?: string;
}
