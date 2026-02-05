import type {
  OutlookConnectionConfig,
  OAuthTokens,
  MSGraphUser,
  MSGraphEvent,
  MSGraphCalendarResponse
} from '../types';
import { ensureFreshTokens } from './oauth-manager';
import { logger } from '../utils/logger';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class OutlookClient {
  private config: OutlookConnectionConfig;
  private tokens: OAuthTokens;
  private onTokensRefreshed?: (tokens: OAuthTokens) => void;

  constructor(
    config: OutlookConnectionConfig,
    tokens: OAuthTokens,
    onTokensRefreshed?: (tokens: OAuthTokens) => void
  ) {
    this.config = config;
    this.tokens = tokens;
    this.onTokensRefreshed = onTokensRefreshed;
  }

  private async getAccessToken(): Promise<string> {
    const fresh = await ensureFreshTokens(this.config, this.tokens);
    if (fresh !== this.tokens) {
      this.tokens = fresh;
      this.onTokensRefreshed?.(fresh);
    }
    return this.tokens.accessToken;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${GRAPH_BASE}${endpoint}`;
    const timer = logger.time();

    logger.apiRequest('GET', `[Outlook] ${endpoint}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Prefer: 'outlook.timezone="Europe/Berlin"'
      }
    });

    const duration = timer();

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message =
        (data as Record<string, Record<string, string>>)?.error?.message ||
        'MS Graph request failed';
      logger.apiError('GET', `[Outlook] ${endpoint}`, { status: response.status, data });
      throw new Error(message);
    }

    logger.apiResponse('GET', `[Outlook] ${endpoint}`, response.status, duration);
    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; user?: MSGraphUser; error?: string }> {
    try {
      logger.connection('Testing Outlook connection');
      const user = await this.request<MSGraphUser>('/me');
      logger.connectionSuccess(`Outlook connected as ${user.displayName}`);
      return { success: true, user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      logger.error('Outlook connection test failed', error);
      return { success: false, error: message };
    }
  }

  async getCalendarEvents(from: string, to: string): Promise<MSGraphEvent[]> {
    const startDateTime = `${from}T00:00:00`;
    const endDateTime = `${to}T23:59:59`;

    logger.info(`Fetching Outlook events: ${from} to ${to}`);

    const allEvents: MSGraphEvent[] = [];
    let url: string | null =
      `/me/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$select=id,subject,start,end,isAllDay,showAs,responseStatus,organizer,attendees,isOnlineMeeting,webLink&$top=100`;

    while (url) {
      const response: MSGraphCalendarResponse = await this.request<MSGraphCalendarResponse>(url);
      allEvents.push(...response.value);

      const nextLink: string | undefined = response['@odata.nextLink'];
      url = nextLink ? nextLink.replace(GRAPH_BASE, '') : null;
    }

    const filtered = allEvents.filter(
      (e) => e.showAs !== 'free' && e.responseStatus.response !== 'declined'
    );

    logger.info(`Fetched ${allEvents.length} events, ${filtered.length} after filter`);
    return filtered;
  }
}
