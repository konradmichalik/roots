export type ServiceType = 'moco' | 'jira' | 'personio' | 'outlook';

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

export interface PersonioConnectionConfig {
  clientId: string;
  clientSecret: string;
  employeeId?: number;
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
}

export interface AllConnectionsState {
  moco: ServiceConnectionState;
  jira: ServiceConnectionState;
  personio: ServiceConnectionState;
  outlook: ServiceConnectionState;
}

export function createInitialServiceState(service: ServiceType): ServiceConnectionState {
  return {
    service,
    isConnected: false,
    isConnecting: false,
    error: null,
    lastConnected: null
  };
}
