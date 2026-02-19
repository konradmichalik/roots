/**
 * Demo mode data pools and anonymization utilities.
 * Uses stable hashing so the same real value always maps to the same fake value.
 */

// ---------------------------------------------------------------------------
// Demo mode flag (plain boolean — importable from any .ts without circular deps)
// ---------------------------------------------------------------------------
let _demoActive = false;
export function isDemoMode(): boolean {
  return _demoActive;
}
export function setDemoActive(active: boolean): void {
  _demoActive = active;
}

import type {
  UnifiedTimeEntry,
  MocoMetadata,
  JiraMetadata,
  OutlookMetadata
} from '$lib/types/unified';
import type { Favorite } from '$lib/types/favorites';
import type { DraftEntry, TimerMocoBooking } from '$lib/types/timer';
import type { RecentMocoPair } from '$lib/types/recentPairs';

// ---------------------------------------------------------------------------
// Fake data pools
// ---------------------------------------------------------------------------

const CUSTOMERS = [
  'Acme Corp',
  'Globex Industries',
  'Initech Solutions',
  'Umbrella Group',
  'Stark Technologies',
  'Wayne Enterprises',
  'Oscorp Labs',
  'Cyberdyne Systems',
  'Soylent Corp',
  'Tyrell Corporation',
  'Weyland-Yutani',
  'Aperture Science'
];

const PROJECTS = [
  'Website Relaunch',
  'Mobile App v2',
  'API Migration',
  'Design System',
  'Data Pipeline',
  'Cloud Migration',
  'CRM Integration',
  'Analytics Dashboard',
  'E-Commerce Platform',
  'Customer Portal',
  'Internal Tools',
  'Infrastructure Upgrade'
];

const TASKS = [
  'Frontend Development',
  'Backend Development',
  'UI/UX Design',
  'Code Review',
  'Testing & QA',
  'Documentation',
  'DevOps',
  'Architecture',
  'Bug Fixing',
  'Performance Optimization',
  'Security Audit',
  'Database Modeling'
];

const JIRA_PROJECT_KEYS = [
  'WEB',
  'MOB',
  'API',
  'DES',
  'DAT',
  'CLD',
  'CRM',
  'ANA',
  'ECO',
  'PRT',
  'INT',
  'INF'
];

const JIRA_SUMMARIES = [
  'Implement user authentication flow',
  'Fix responsive layout on dashboard',
  'Add export functionality for reports',
  'Update API documentation',
  'Refactor payment service',
  'Optimize database queries',
  'Add dark mode support',
  'Implement search functionality',
  'Fix date picker timezone issue',
  'Add unit tests for core module',
  'Create CI/CD pipeline',
  'Migrate to new storage backend',
  'Update dependencies to latest versions',
  'Implement WebSocket notifications',
  'Add CSV import feature',
  'Fix memory leak in worker process'
];

const EVENT_TITLES = [
  'Team Standup',
  'Sprint Planning',
  'Design Review',
  'Architecture Discussion',
  'Client Meeting',
  'Retrospective',
  'Knowledge Sharing',
  'Tech Talk',
  'Product Demo',
  'Backlog Grooming',
  '1:1 Meeting',
  'Workshop',
  'Sync Meeting',
  'Code Review Session',
  'Release Planning',
  'Stakeholder Update'
];

const DESCRIPTIONS = [
  'Working on feature implementation',
  'Bug investigation and fix',
  'Reviewing pull requests',
  'Updating project documentation',
  'Performance profiling and optimization',
  'Setting up test infrastructure',
  'Pair programming session',
  'Spike: evaluating new library',
  'Preparing sprint demo',
  'Database schema migration',
  'Configuring CI pipeline',
  'Writing integration tests'
];

const FAVORITE_NAMES = [
  'Daily Development',
  'Code Reviews',
  'Meeting Time',
  'Documentation',
  'Bug Fixes',
  'Sprint Planning',
  'DevOps Tasks',
  'Design Review',
  'Testing',
  'Architecture Work'
];

// ---------------------------------------------------------------------------
// Stable hash — same input always produces the same index
// ---------------------------------------------------------------------------

function stableHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickFromPool<T>(pool: T[], key: string): T {
  return pool[stableHash(key) % pool.length];
}

// Stable Jira issue number from key string
function stableIssueNumber(key: string): number {
  return (stableHash(key) % 900) + 100; // 100–999
}

// ---------------------------------------------------------------------------
// Anonymizers
// ---------------------------------------------------------------------------

function anonymizeMocoMetadata(meta: MocoMetadata): MocoMetadata {
  const customerKey = `customer-${meta.customerName || meta.projectId}`;
  const projectKey = `project-${meta.projectName || meta.projectId}`;
  const taskKey = `task-${meta.taskName || meta.taskId}`;

  return {
    ...meta,
    customerName: pickFromPool(CUSTOMERS, customerKey),
    projectName: pickFromPool(PROJECTS, projectKey),
    taskName: pickFromPool(TASKS, taskKey),
    remoteTicketKey: meta.remoteTicketKey
      ? `${pickFromPool(JIRA_PROJECT_KEYS, meta.remoteTicketKey)}-${stableIssueNumber(meta.remoteTicketKey)}`
      : undefined
  };
}

function anonymizeJiraMetadata(meta: JiraMetadata): JiraMetadata {
  const projKey = pickFromPool(JIRA_PROJECT_KEYS, `jira-proj-${meta.projectKey || meta.issueKey}`);
  const issueNum = stableIssueNumber(meta.issueKey);

  return {
    ...meta,
    issueKey: `${projKey}-${issueNum}`,
    issueSummary: pickFromPool(JIRA_SUMMARIES, meta.issueSummary || meta.issueKey),
    projectKey: projKey
  };
}

function anonymizeOutlookMetadata(meta: OutlookMetadata): OutlookMetadata {
  return {
    ...meta,
    webLink: 'https://outlook.office.com/calendar/item/demo'
  };
}

export function anonymizeTimeEntry(entry: UnifiedTimeEntry): UnifiedTimeEntry {
  const titleKey = `title-${entry.title || entry.id}`;
  const descKey = `desc-${entry.description || entry.id}`;

  let metadata = entry.metadata;
  let title = entry.title;

  if (metadata.source === 'moco') {
    metadata = anonymizeMocoMetadata(metadata);
    title = `${(metadata as MocoMetadata).projectName} – ${(metadata as MocoMetadata).taskName}`;
  } else if (metadata.source === 'jira') {
    metadata = anonymizeJiraMetadata(metadata);
    title = `${(metadata as JiraMetadata).issueKey} ${(metadata as JiraMetadata).issueSummary}`;
  } else if (metadata.source === 'outlook') {
    metadata = anonymizeOutlookMetadata(metadata);
    title = pickFromPool(EVENT_TITLES, titleKey);
  }

  return {
    ...entry,
    title,
    description: entry.description ? pickFromPool(DESCRIPTIONS, descKey) : undefined,
    metadata
  };
}

export function anonymizeFavorite(fav: Favorite): Favorite {
  const customerKey = `fav-customer-${fav.customerName || fav.projectId}`;
  const projectKey = `fav-project-${fav.projectName || fav.projectId}`;
  const taskKey = `fav-task-${fav.taskName || fav.taskId}`;
  const nameKey = `fav-name-${fav.name || fav.id}`;

  return {
    ...fav,
    name: pickFromPool(FAVORITE_NAMES, nameKey),
    customerName: pickFromPool(CUSTOMERS, customerKey),
    projectName: pickFromPool(PROJECTS, projectKey),
    taskName: pickFromPool(TASKS, taskKey),
    description: fav.description ? pickFromPool(DESCRIPTIONS, `fav-desc-${fav.id}`) : undefined
  };
}

export function anonymizeTimerBooking(booking: TimerMocoBooking): TimerMocoBooking {
  const customerKey = `timer-customer-${booking.customerName || booking.projectId}`;
  const projectKey = `timer-project-${booking.projectName || booking.projectId}`;
  const taskKey = `timer-task-${booking.taskName || booking.taskId}`;

  return {
    ...booking,
    customerName: pickFromPool(CUSTOMERS, customerKey),
    projectName: pickFromPool(PROJECTS, projectKey),
    taskName: pickFromPool(TASKS, taskKey),
    description: booking.description
      ? pickFromPool(DESCRIPTIONS, `timer-desc-${booking.projectId}-${booking.taskId}`)
      : undefined
  };
}

export function anonymizeDraft(draft: DraftEntry): DraftEntry {
  return {
    ...draft,
    note: draft.note ? pickFromPool(DESCRIPTIONS, `draft-note-${draft.id}`) : '',
    mocoBooking: draft.mocoBooking ? anonymizeTimerBooking(draft.mocoBooking) : null
  };
}

/**
 * Guard: anonymize entries only when demo mode is active.
 * Call this after mapping API responses to UnifiedTimeEntry[].
 */
export function anonymizeEntriesIfDemoMode(entries: UnifiedTimeEntry[]): UnifiedTimeEntry[] {
  if (!_demoActive) return entries;
  return entries.map(anonymizeTimeEntry);
}

export function anonymizeRecentPair(pair: RecentMocoPair): RecentMocoPair {
  const customerKey = `recent-customer-${pair.customerName || pair.projectId}`;
  const projectKey = `recent-project-${pair.projectName || pair.projectId}`;
  const taskKey = `recent-task-${pair.taskName || pair.taskId}`;

  return {
    ...pair,
    customerName: pickFromPool(CUSTOMERS, customerKey),
    projectName: pickFromPool(PROJECTS, projectKey),
    taskName: pickFromPool(TASKS, taskKey)
  };
}
