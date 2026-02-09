export type ServiceType = 'moco' | 'jira' | 'outlook';

export interface MocoConnectionConfig {
  domain: string;
  apiKey: string;
}

export interface JiraConnectionConfig {
  instanceType: 'cloud' | 'server';
  baseUrl: string;
  credentials: JiraCredentials;
  proxyUrl?: string;
  accountId?: string;
}

export type JiraCredentials = JiraCloudCredentials | JiraServerCredentials;

export interface JiraCloudCredentials {
  type: 'cloud';
  email: string;
  apiToken: string;
}

export interface JiraServerCredentials {
  type: 'server';
  authMethod: 'basic' | 'pat';
  username?: string;
  password?: string;
  personalAccessToken?: string;
}

export interface OutlookConnectionConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
}

export interface ServiceConnectionState {
  service: ServiceType;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastConnected: string | null;
  needsReauth: boolean;
}

export interface AllConnectionsState {
  moco: ServiceConnectionState;
  jira: ServiceConnectionState;
  outlook: ServiceConnectionState;
}

export function createInitialServiceState(service: ServiceType): ServiceConnectionState {
  return {
    service,
    isConnected: false,
    isConnecting: false,
    error: null,
    lastConnected: null,
    needsReauth: false
  };
}
