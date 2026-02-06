export type {
  ServiceType,
  MocoConnectionConfig,
  JiraConnectionConfig,
  JiraCredentials,
  JiraCloudCredentials,
  JiraServerCredentials,
  OutlookConnectionConfig,
  ServiceConnectionState,
  AllConnectionsState
} from './connections';
export { createInitialServiceState } from './connections';

export type {
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
} from './moco';

export type {
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
} from './jira';

export type {
  MSGraphEvent,
  MSGraphAttendee,
  MSGraphUser,
  MSGraphCalendarResponse,
  OAuthTokens,
  OAuthTokenResponse
} from './outlook';

export type {
  UnifiedTimeEntry,
  MocoMetadata,
  JiraMetadata,
  OutlookMetadata,
  WeekdayHours,
  AbsenceType,
  ManualAbsence,
  DayPresence,
  DayOverview,
  Theme
} from './unified';
export { ABSENCE_LABELS, ABSENCE_COLORS } from './unified';

export type { Favorite, FavoriteEventMatch } from './favorites';

export type { RecentMocoPair } from './recentPairs';

export type { TimerStatus, TimerMocoBooking, TimerState, DraftEntry } from './timer';
