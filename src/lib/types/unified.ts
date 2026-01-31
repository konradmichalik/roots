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
  metadata: MocoMetadata | JiraMetadata | OutlookMetadata;
}

export interface MocoMetadata {
  source: 'moco';
  activityId: number;
  projectId: number;
  taskId: number;
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

// Per-weekday target hours: index 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun
export type WeekdayHours = [number, number, number, number, number, number, number];

export type AbsenceType = 'vacation' | 'sick' | 'public_holiday' | 'personal' | 'other';

export interface ManualAbsence {
  id: string;
  type: AbsenceType;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD (same as startDate for single-day)
  halfDay: boolean;
  note?: string;
  createdAt: string;
}

export interface DayPresence {
  from: string;
  to: string | null;
  hours: number;
  isHomeOffice: boolean;
}

export interface DayOverview {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isToday: boolean;
  requiredHours: number;
  presence?: DayPresence;
  manualAbsence?: ManualAbsence;
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

export type Theme = 'light' | 'dark' | 'system';
