import type { OutlookConnectionConfig, OAuthTokens, OAuthTokenResponse } from '../types';
import { logger } from '../utils/logger';

const OAUTH_SCOPES =
  'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read offline_access';
const SESSION_KEY_VERIFIER = 'roots:oauth:code_verifier';
const SESSION_KEY_CONFIG = 'roots:oauth:config';
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

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

  sessionStorage.setItem(SESSION_KEY_VERIFIER, codeVerifier);
  sessionStorage.setItem(SESSION_KEY_CONFIG, JSON.stringify(config));

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: OAUTH_SCOPES,
    state: 'outlook',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const authorizeUrl = `${getAuthorizeEndpoint(config.tenantId)}?${params}`;
  logger.info(`Starting OAuth flow, redirecting to Microsoft login`);
  window.location.href = authorizeUrl;
}

export function getStoredOAuthConfig(): OutlookConnectionConfig | null {
  const raw = sessionStorage.getItem(SESSION_KEY_CONFIG);
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
  const codeVerifier = sessionStorage.getItem(SESSION_KEY_VERIFIER);
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

  const response = await fetch(getTokenEndpoint(config.tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      (errorData as Record<string, string>).error_description || 'Token exchange failed';
    throw new Error(message);
  }

  const data: OAuthTokenResponse = await response.json();

  sessionStorage.removeItem(SESSION_KEY_VERIFIER);
  sessionStorage.removeItem(SESSION_KEY_CONFIG);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope
  };
}

export async function refreshAccessToken(
  config: OutlookConnectionConfig,
  refreshToken: string
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: OAUTH_SCOPES
  });

  logger.info('Refreshing OAuth access token');

  const response = await fetch(getTokenEndpoint(config.tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    throw new Error('Token refresh failed. Please sign in again.');
  }

  const data: OAuthTokenResponse = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope
  };
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

export function detectOAuthCallback(): { code: string; state: string } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (code && state === 'outlook') {
    return { code, state };
  }

  return null;
}

export function clearOAuthCallbackFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('session_state');
  window.history.replaceState({}, '', url.pathname + (url.search || ''));
}
