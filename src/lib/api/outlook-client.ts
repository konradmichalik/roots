import type {
  OutlookConnectionConfig,
  OAuthTokens,
  MSGraphUser,
  MSGraphEvent,
  MSGraphCalendarResponse
} from '../types';
import { ensureFreshTokens, refreshAccessToken } from './oauth-manager';
import { logger } from '../utils/logger';
import { validateResponse } from '../schemas/validate';
import { msGraphUserSchema, msGraphCalendarResponseSchema } from '../schemas/outlook';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MAX_REQUEST_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

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

  private async forceTokenRefresh(): Promise<string> {
    if (!this.tokens.refreshToken) {
      throw new Error('No refresh token available. Please sign in again.');
    }
    const fresh = await refreshAccessToken(this.config, this.tokens.refreshToken);
    this.tokens = fresh;
    this.onTokensRefreshed?.(fresh);
    return fresh.accessToken;
  }

  private async executeRequest(endpoint: string, token: string): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE}${endpoint}`;
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Prefer: 'outlook.timezone="Europe/Berlin"'
      }
    });
  }

  private async request<T>(endpoint: string): Promise<T> {
    const timer = logger.time();
    logger.apiRequest('GET', `[Outlook] ${endpoint}`);

    let token = await this.getAccessToken();
    let response = await this.executeRequest(endpoint, token);

    // On 401: force token refresh and retry once
    if (response.status === 401) {
      logger.info('Outlook request got 401, refreshing token and retrying');
      token = await this.forceTokenRefresh();
      response = await this.executeRequest(endpoint, token);
    }

    // On transient errors (5xx, 429): retry with backoff
    for (
      let retry = 0;
      retry < MAX_REQUEST_RETRIES && !response.ok && isRetryableStatus(response.status);
      retry++
    ) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : RETRY_DELAY_MS * Math.pow(2, retry);
      logger.info(
        `Outlook request retry ${retry + 1}/${MAX_REQUEST_RETRIES} in ${delayMs}ms (status ${response.status})`
      );
      await delay(delayMs);
      response = await this.executeRequest(endpoint, token);
    }

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
      const raw = await this.request<MSGraphUser>('/me');
      const user = validateResponse(msGraphUserSchema, raw, 'Outlook me');
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
      const raw: MSGraphCalendarResponse = await this.request<MSGraphCalendarResponse>(url);
      const response = validateResponse(msGraphCalendarResponseSchema, raw, 'Outlook calendar');
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
