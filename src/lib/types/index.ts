export type {
  ServiceType,
  MocoConnectionConfig,
  JiraConnectionConfig,
  JiraCredentials,
  JiraCloudCredentials,
  JiraServerCredentials,
  PersonioConnectionConfig,
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
  MocoPresence
} from './moco';

export type {
  JiraSearchResponse,
  JiraIssue,
  JiraWorklog,
  JiraWorklogAuthor,
  JiraAdfDocument,
  JiraUser,
  JiraWorklogResponse
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
  PersonioMetadata,
  WeekdayHours,
  AbsenceType,
  ManualAbsence,
  DayPresence,
  DayOverview,
  Theme
} from './unified';

export type { Favorite, FavoriteEventMatch } from './favorites';
