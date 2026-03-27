export type ServiceType = 'moco' | 'jira' | 'outlook' | 'personio';

export interface ServiceConnectionState {
  service: ServiceType;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastConnected: string | null;
  needsReauth: boolean;
}

export interface JiraConnectionInstance {
  id: string;
  label: string;
  state: ServiceConnectionState;
}

export interface AllConnectionsState {
  moco: ServiceConnectionState;
  jiraConnections: JiraConnectionInstance[];
  outlook: ServiceConnectionState;
  personio: ServiceConnectionState;
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
