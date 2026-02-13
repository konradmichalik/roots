import type { OutlookConnectionConfig, OAuthTokens, OAuthTokenResponse } from '../types';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { isTauri } from '../utils/storage';

const OAUTH_SCOPES =
  'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read offline_access';

// PKCE state in localStorage (survives full-page navigation and deep-link round-trips)
const PKCE_KEY_VERIFIER = 'roots:oauth:code_verifier';
const PKCE_KEY_CONFIG = 'roots:oauth:config';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const DEEP_LINK_REDIRECT_URI = 'roots://oauth/callback';

/** POST form data to a token endpoint. In Tauri uses a Rust command (no Origin header). */
async function postTokenRequest(url: string, body: string): Promise<OAuthTokenResponse> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const text = await invoke<string>('http_post_form', { url, body });
    return JSON.parse(text);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      (errorData as Record<string, string>).error_description || 'Token request failed';
    throw new Error(message);
  }

  return response.json();
}

function getAuthorizeEndpoint(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
}

function getTokenEndpoint(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
}

function generateCodeVerifier(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(128);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function startOAuthFlow(config: OutlookConnectionConfig): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Always determine redirect URI from current platform (not from stored config)
  const effectiveConfig: OutlookConnectionConfig = {
    ...config,
    redirectUri: isTauri() ? DEEP_LINK_REDIRECT_URI : window.location.origin
  };

  // Store PKCE state in localStorage (survives navigation, unlike sessionStorage in WKWebView)
  localStorage.setItem(PKCE_KEY_VERIFIER, codeVerifier);
  localStorage.setItem(PKCE_KEY_CONFIG, JSON.stringify(effectiveConfig));

  const params = new URLSearchParams({
    client_id: effectiveConfig.clientId,
    response_type: 'code',
    redirect_uri: effectiveConfig.redirectUri,
    scope: OAUTH_SCOPES,
    state: 'outlook',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const authorizeUrl = `${getAuthorizeEndpoint(effectiveConfig.tenantId)}?${params}`;

  if (isTauri()) {
    // Open in system browser — deep link callback will return the code
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(authorizeUrl);
    logger.info('Opened OAuth flow in system browser');
  } else {
    // Browser mode: navigate in place (development)
    logger.info('Starting OAuth flow, redirecting to Microsoft login');
    window.location.href = authorizeUrl;
  }
}

export function getStoredOAuthConfig(): OutlookConnectionConfig | null {
  const raw = localStorage.getItem(PKCE_KEY_CONFIG);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function exchangeCodeForTokens(
  config: OutlookConnectionConfig,
  code: string
): Promise<OAuthTokens> {
  const codeVerifier = localStorage.getItem(PKCE_KEY_VERIFIER);
  if (!codeVerifier) {
    throw new Error('PKCE code_verifier not found. Please restart the login process.');
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier
  });

  logger.info('Exchanging OAuth code for tokens');

  const data = await postTokenRequest(getTokenEndpoint(config.tenantId), body.toString());

  // Clear PKCE state after successful exchange
  localStorage.removeItem(PKCE_KEY_VERIFIER);
  localStorage.removeItem(PKCE_KEY_CONFIG);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope
  };
}

export class TokenRefreshError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'TokenRefreshError';
  }

  get isPermanent(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 400 && this.statusCode < 500;
  }
}

export async function refreshAccessToken(
  config: OutlookConnectionConfig,
  refreshToken: string
): Promise<OAuthTokens> {
  return withRetry(
    async () => {
      const body = new URLSearchParams({
        client_id: config.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: OAUTH_SCOPES
      });

      logger.info('Refreshing OAuth access token');

      let data: OAuthTokenResponse;
      try {
        data = await postTokenRequest(getTokenEndpoint(config.tenantId), body.toString());
      } catch {
        throw new TokenRefreshError('Token refresh failed. Please sign in again.', 400);
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope
      };
    },
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      shouldRetry: (error) => {
        if (error instanceof TokenRefreshError && error.isPermanent) {
          logger.info('Token refresh failed with permanent error, skipping retry');
          return false;
        }
        return true;
      }
    }
  );
}

export function isTokenExpired(tokens: OAuthTokens): boolean {
  return Date.now() >= tokens.expiresAt - TOKEN_EXPIRY_BUFFER_MS;
}

export async function ensureFreshTokens(
  config: OutlookConnectionConfig,
  tokens: OAuthTokens
): Promise<OAuthTokens> {
  if (!isTokenExpired(tokens)) {
    return tokens;
  }

  if (!tokens.refreshToken) {
    throw new Error('Access token expired and no refresh token available. Please sign in again.');
  }

  return refreshAccessToken(config, tokens.refreshToken);
}

/** Browser-mode only: detect OAuth callback from URL query params */
export function detectOAuthCallback(): { code: string; state: string } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (code && state === 'outlook') {
    return { code, state };
  }

  return null;
}

/** Browser-mode only: clean OAuth params from URL bar */
export function clearOAuthCallbackFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('session_state');
  window.history.replaceState({}, '', url.pathname + (url.search || ''));
}
