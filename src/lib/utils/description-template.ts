import type { UnifiedTimeEntry, JiraMetadata, OutlookMetadata } from '../types';

export const JIRA_TEMPLATE_VARIABLES = [
  { name: 'issueKey', label: 'Issue Key', example: 'SUP-123' },
  { name: 'issueSummary', label: 'Issue Summary', example: 'Login broken on Safari' },
  { name: 'issueType', label: 'Issue Type', example: 'Bug' },
  { name: 'projectKey', label: 'Project Key', example: 'SUP' },
  { name: 'worklogComment', label: 'Worklog Comment', example: 'Fixed the auth flow' }
] as const;

export const OUTLOOK_TEMPLATE_VARIABLES = [
  { name: 'eventTitle', label: 'Event Title', example: 'Team Weekly' }
] as const;

export const DEFAULT_JIRA_TEMPLATE = '{issueKey} – {issueSummary}';
export const DEFAULT_OUTLOOK_TEMPLATE = '{eventTitle}';

export function renderDescriptionTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

export function buildJiraVariables(entry: UnifiedTimeEntry): Record<string, string> {
  const meta = entry.metadata as JiraMetadata;
  return {
    issueKey: meta.issueKey ?? '',
    issueSummary: meta.issueSummary ?? '',
    issueType: meta.issueType ?? '',
    projectKey: meta.projectKey ?? '',
    worklogComment: entry.description ?? ''
  };
}

export function buildOutlookVariables(entry: UnifiedTimeEntry): Record<string, string> {
  const meta = entry.metadata as OutlookMetadata;
  return {
    eventTitle: entry.title ?? '',
    eventId: meta.eventId ?? ''
  };
}

export function buildExampleVariables(sourceType: 'jira' | 'outlook'): Record<string, string> {
  if (sourceType === 'jira') {
    return Object.fromEntries(JIRA_TEMPLATE_VARIABLES.map((v) => [v.name, v.example]));
  }
  return Object.fromEntries(OUTLOOK_TEMPLATE_VARIABLES.map((v) => [v.name, v.example]));
}
