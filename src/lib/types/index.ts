// Shared types
export type { ServiceType, ServiceConnectionState, AllConnectionsState } from './connections';
export { createInitialServiceState } from './connections';

export type {
  UnifiedTimeEntry,
  MocoMetadata,
  JiraMetadata,
  OutlookMetadata,
  WeekdayHours,
  AbsenceType,
  ManualAbsence,
  PersonioAbsence,
  DayPresence,
  DayOverview,
  Theme
} from './unified';
export { ABSENCE_LABELS, ABSENCE_COLORS } from './unified';

export type { Favorite, FavoriteEventMatch } from './favorites';
export type { RecentMocoPair } from './recentPairs';
export type { TimerStatus, TimerMocoBooking, TimerState, DraftEntry } from './timer';

// Service-specific types (re-exported for backward compatibility)
export type {
  MocoConnectionConfig,
  MocoActivity,
  MocoProject,
  MocoTask,
  MocoCustomer,
  MocoUser,
  MocoProjectAssigned,
  MocoCreateActivity,
  MocoUpdateActivity,
  MocoPresence,
  MocoCreatePresence,
  MocoUpdatePresence,
  MocoTaskCost,
  MocoProjectReport
} from '../services/moco/types';

export type {
  JiraConnectionConfig,
  JiraCredentials,
  JiraCloudCredentials,
  JiraServerCredentials,
  JiraSearchResponse,
  JiraIssue,
  JiraWorklog,
  JiraWorklogAuthor,
  JiraAdfDocument,
  JiraUser,
  JiraWorklogResponse,
  JiraCreateWorklogPayload,
  JiraUpdateWorklogPayload,
  JiraCreateWorklog,
  JiraUpdateWorklog
} from '../services/jira/types';

export type {
  OutlookConnectionConfig,
  MSGraphEvent,
  MSGraphAttendee,
  MSGraphUser,
  MSGraphCalendarResponse,
  OAuthTokens,
  OAuthTokenResponse
} from '../services/outlook/types';

export type {
  PersonioConnectionConfig,
  PersonioAuthToken,
  PersonioEmployee,
  PersonioEmployeeAttribute,
  PersonioWorkScheduleDay,
  PersonioTimeOff,
  PersonioResponse,
  PersonioAbsenceBalance
} from '../services/personio/types';
