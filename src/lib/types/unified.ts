import type { ServiceType } from './connections';

export interface UnifiedTimeEntry {
  id: string;
  source: ServiceType;
  date: string;
  hours: number;
  startTime?: string;
  endTime?: string;
  title: string;
  description?: string;
  category?: string;
  metadata: MocoMetadata | JiraMetadata | OutlookMetadata | PersonioMetadata;
}

export interface MocoMetadata {
  source: 'moco';
  activityId: number;
  projectName: string;
  taskName: string;
  customerName: string;
  billable: boolean;
  remoteTicketKey?: string;
}

export interface JiraMetadata {
  source: 'jira';
  worklogId: string;
  issueKey: string;
  issueSummary: string;
  issueType?: string;
  projectKey?: string;
}

export interface OutlookMetadata {
  source: 'outlook';
  eventId: string;
  isAllDay: boolean;
  showAs: string;
  responseStatus: string;
  attendeeCount?: number;
  isOnlineMeeting: boolean;
  webLink: string;
}

export interface PersonioMetadata {
  source: 'personio';
  absenceId: number;
  absenceType: string;
  status: string;
  halfDay: boolean;
}

export interface DayOverview {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isToday: boolean;
  requiredHours: number;
  absence?: PersonioMetadata;
  entries: {
    moco: UnifiedTimeEntry[];
    jira: UnifiedTimeEntry[];
    outlook: UnifiedTimeEntry[];
  };
  totals: {
    moco: number;
    jira: number;
    outlook: number;
    actual: number;
  };
  balance: number;
}

export interface WeekOverview {
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  days: DayOverview[];
  totals: {
    required: number;
    actual: number;
    balance: number;
    jira: number;
    outlook: number;
  };
}

export type ViewMode = 'week' | 'day' | 'month';

export type Theme = 'light' | 'dark' | 'system';
