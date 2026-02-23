export { OutlookClient } from './client';
export {
  startOAuthFlow,
  exchangeCodeForTokens,
  refreshAccessToken,
  ensureFreshTokens,
  isTokenExpired,
  detectOAuthCallback,
  clearOAuthCallbackFromUrl,
  getStoredOAuthConfig,
  TokenRefreshError
} from './oauth-manager';
export type {
  OutlookConnectionConfig,
  MSGraphEvent,
  MSGraphAttendee,
  MSGraphUser,
  MSGraphCalendarResponse,
  OAuthTokens,
  OAuthTokenResponse
} from './types';
