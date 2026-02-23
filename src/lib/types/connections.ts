export type ServiceType = 'moco' | 'jira' | 'outlook' | 'personio';

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
