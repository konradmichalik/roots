export interface OutlookConnectionConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
}

export interface MSGraphEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  responseStatus: { response: string; time: string };
  organizer: { emailAddress: { name: string; address: string } };
  attendees: MSGraphAttendee[];
  isOnlineMeeting: boolean;
  webLink: string;
}

export interface MSGraphAttendee {
  emailAddress: { name: string; address: string };
  type: 'required' | 'optional' | 'resource';
  status: { response: string; time: string };
}

export interface MSGraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

export interface MSGraphCalendarResponse {
  value: MSGraphEvent[];
  '@odata.nextLink'?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}
