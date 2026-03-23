export interface JiraSourceMatcher {
  type: 'jira';
  connectionId: string;
  projectKey: string;
  issuePattern?: string;
  epicKey?: string;
  component?: string;
  labels?: string[];
  summaryContains?: string;
  jql?: string;
}

export interface OutlookSourceMatcher {
  type: 'outlook';
  eventPattern: string;
  matchType: 'contains' | 'exact' | 'startsWith';
  overrideHours?: number;
}

export type SourceMatcher = JiraSourceMatcher | OutlookSourceMatcher;

export interface RuleTarget {
  mocoProjectId: number;
  mocoTaskId: number;
  mocoProjectName: string;
  mocoTaskName: string;
  customerName: string;
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  autoSync: boolean;
  source: SourceMatcher;
  target: RuleTarget;
  descriptionTemplate: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  targetStatus: 'valid' | 'stale' | 'unknown';
  staleNotifiedAt?: string;
}
