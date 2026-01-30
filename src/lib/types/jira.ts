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
