import type {
  AllConnectionsState,
  MocoConnectionConfig,
  JiraConnectionConfig,
  OutlookConnectionConfig,
  PersonioConnectionConfig,
  PersonioAuthToken,
  OAuthTokens
} from '../types';
import { createInitialServiceState } from '../types';
import {
  createMocoClient,
  type MocoClient,
  createJiraWorklogClient,
  type JiraWorklogClient,
  createOutlookClient,
  OutlookClient,
  createPersonioClient,
  type PersonioClient
} from '../api';
import { exchangeCodeForTokens, getStoredOAuthConfig, startOAuthFlow } from '../api/oauth-manager';
import {
  getStorageItemAsync,
  setStorageItemAsync,
  removeStorageItemAsync,
  STORAGE_KEYS
} from '../utils/storage';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { updateSettings } from './settings.svelte';

export const connectionsState = $state<AllConnectionsState>({
  moco: createInitialServiceState('moco'),
  jira: createInitialServiceState('jira'),
  outlook: createInitialServiceState('outlook'),
  personio: createInitialServiceState('personio')
});

// Track if user has ever configured any service (persisted configs exist)
let hasConfiguredServices = $state(false);

let mocoClient: MocoClient | null = null;
let jiraClient: JiraWorklogClient | null = null;
let jiraConfig: JiraConnectionConfig | null = null;
let outlookClient: OutlookClient | null = null;
let personioClient: PersonioClient | null = null;

export async function initializeConnections(): Promise<void> {
  const restores: Promise<void>[] = [];

  const mocoConfig = await getStorageItemAsync<MocoConnectionConfig>(STORAGE_KEYS.MOCO_CONFIG);
  if (mocoConfig) {
    hasConfiguredServices = true;
    logger.connection('Restoring Moco connection from storage');
    restores.push(connectMoco(mocoConfig).then(() => {}));
  }

  const jiraConfig = await getStorageItemAsync<JiraConnectionConfig>(STORAGE_KEYS.JIRA_CONFIG);
  if (jiraConfig) {
    hasConfiguredServices = true;
    logger.connection('Restoring Jira connection from storage');
    restores.push(connectJira(jiraConfig).then(() => {}));
  }

  const outlookConfig = await getStorageItemAsync<OutlookConnectionConfig>(
    STORAGE_KEYS.OUTLOOK_CONFIG
  );
  const outlookTokens = await getStorageItemAsync<OAuthTokens>(STORAGE_KEYS.OUTLOOK_TOKENS);
  if (outlookConfig && outlookTokens) {
    hasConfiguredServices = true;
    logger.connection('Restoring Outlook connection from storage');
    restores.push(restoreOutlook(outlookConfig, outlookTokens).then(() => {}));
  }

  const personioConfig = await getStorageItemAsync<PersonioConnectionConfig>(
    STORAGE_KEYS.PERSONIO_CONFIG
  );
  if (personioConfig) {
    hasConfiguredServices = true;
    logger.connection('Restoring Personio connection from storage');
    const storedToken = await getStorageItemAsync<PersonioAuthToken>(STORAGE_KEYS.PERSONIO_TOKEN);
    restores.push(restorePersonio(personioConfig, storedToken ?? undefined).then(() => {}));
  }

  // Note: hasConfiguredServices is also set in connect functions for new connections

  await Promise.allSettled(restores);
  logger.store('connections', 'Initialized');
}

export async function connectMoco(config: MocoConnectionConfig): Promise<boolean> {
  connectionsState.moco.isConnecting = true;
  connectionsState.moco.error = null;

  try {
    mocoClient = createMocoClient(config);
    const result = await mocoClient.testConnection();

    if (!result.success) {
      throw new Error(result.error || 'Moco connection failed');
    }

    connectionsState.moco.isConnected = true;
    connectionsState.moco.isConnecting = false;
    connectionsState.moco.error = null;
    connectionsState.moco.lastConnected = new Date().toISOString();

    await setStorageItemAsync(STORAGE_KEYS.MOCO_CONFIG, config);
    hasConfiguredServices = true;
    logger.connectionSuccess(`Moco connected to ${config.domain}.mocoapp.com`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    connectionsState.moco.isConnected = false;
    connectionsState.moco.isConnecting = false;
    connectionsState.moco.error = message;
    connectionsState.moco.lastConnected = null;
    mocoClient = null;
    logger.error('Moco connection failed', error);
    return false;
  }
}

export async function disconnectMoco(): Promise<void> {
  connectionsState.moco = createInitialServiceState('moco');
  mocoClient = null;
  await removeStorageItemAsync(STORAGE_KEYS.MOCO_CONFIG);
  logger.connection('Moco disconnected');
}

export async function connectJira(config: JiraConnectionConfig): Promise<boolean> {
  connectionsState.jira.isConnecting = true;
  connectionsState.jira.error = null;

  try {
    jiraClient = createJiraWorklogClient(config);
    const result = await jiraClient.testConnection();

    if (!result.success) {
      throw new Error(result.error || 'Jira connection failed');
    }

    connectionsState.jira.isConnected = true;
    connectionsState.jira.isConnecting = false;
    connectionsState.jira.error = null;
    connectionsState.jira.lastConnected = new Date().toISOString();
    jiraConfig = config;

    await setStorageItemAsync(STORAGE_KEYS.JIRA_CONFIG, config);
    hasConfiguredServices = true;
    logger.connectionSuccess(`Jira connected as ${result.user?.displayName ?? 'unknown'}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    connectionsState.jira.isConnected = false;
    connectionsState.jira.isConnecting = false;
    connectionsState.jira.error = message;
    connectionsState.jira.lastConnected = null;
    jiraClient = null;
    jiraConfig = null;
    logger.error('Jira connection failed', error);
    return false;
  }
}

export async function disconnectJira(): Promise<void> {
  connectionsState.jira = createInitialServiceState('jira');
  jiraClient = null;
  jiraConfig = null;
  await removeStorageItemAsync(STORAGE_KEYS.JIRA_CONFIG);
  logger.connection('Jira disconnected');
}

async function restoreOutlook(config: OutlookConnectionConfig, tokens: OAuthTokens): Promise<void> {
  try {
    outlookClient = createOutlookClient(config, tokens, async (fresh) => {
      await setStorageItemAsync(STORAGE_KEYS.OUTLOOK_TOKENS, fresh);
    });

    const result = await withRetry(
      async () => {
        const res = await outlookClient!.testConnection();
        if (!res.success) {
          throw new Error(res.error || 'Outlook connection failed');
        }
        return res;
      },
      { maxRetries: 3, baseDelayMs: 2000 }
    );

    connectionsState.outlook.isConnected = true;
    connectionsState.outlook.needsReauth = false;
    connectionsState.outlook.lastConnected = new Date().toISOString();
    logger.connectionSuccess(`Outlook restored as ${result.user?.displayName ?? 'unknown'}`);
  } catch (error) {
    outlookClient = null;
    const message = error instanceof Error ? error.message : 'Outlook restore failed';
    connectionsState.outlook.isConnected = false;
    connectionsState.outlook.needsReauth = true;
    connectionsState.outlook.error = message;
    logger.error('Outlook restore failed', error);

    // Only clear tokens — keep config so user can re-authenticate without re-entering credentials
    await removeStorageItemAsync(STORAGE_KEYS.OUTLOOK_TOKENS);
    logger.connection('Cleared expired Outlook tokens, config preserved for re-auth');
  }
}

export async function handleOutlookCallback(code: string): Promise<boolean> {
  const config = getStoredOAuthConfig();
  if (!config) {
    logger.error('Outlook OAuth config not found in session');
    return false;
  }

  connectionsState.outlook.isConnecting = true;
  connectionsState.outlook.error = null;

  try {
    const tokens = await exchangeCodeForTokens(config, code);

    outlookClient = createOutlookClient(config, tokens, async (fresh) => {
      await setStorageItemAsync(STORAGE_KEYS.OUTLOOK_TOKENS, fresh);
    });

    const result = await outlookClient.testConnection();
    if (!result.success) {
      throw new Error(result.error || 'Outlook connection failed');
    }

    connectionsState.outlook.isConnected = true;
    connectionsState.outlook.isConnecting = false;
    connectionsState.outlook.needsReauth = false;
    connectionsState.outlook.error = null;
    connectionsState.outlook.lastConnected = new Date().toISOString();

    await setStorageItemAsync(STORAGE_KEYS.OUTLOOK_CONFIG, config);
    await setStorageItemAsync(STORAGE_KEYS.OUTLOOK_TOKENS, tokens);
    hasConfiguredServices = true;
    logger.connectionSuccess(`Outlook connected as ${result.user?.displayName ?? 'unknown'}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    connectionsState.outlook.isConnected = false;
    connectionsState.outlook.isConnecting = false;
    connectionsState.outlook.error = message;
    outlookClient = null;
    logger.error('Outlook connection failed', error);
    return false;
  }
}

export async function disconnectOutlook(): Promise<void> {
  connectionsState.outlook = createInitialServiceState('outlook');
  outlookClient = null;
  await removeStorageItemAsync(STORAGE_KEYS.OUTLOOK_CONFIG);
  await removeStorageItemAsync(STORAGE_KEYS.OUTLOOK_TOKENS);
  logger.connection('Outlook disconnected');
}

export function getMocoClient(): MocoClient | null {
  return mocoClient;
}

export function getJiraClient(): JiraWorklogClient | null {
  return jiraClient;
}

export function getOutlookClient(): OutlookClient | null {
  return outlookClient;
}

export function getJiraBaseUrl(): string | null {
  return jiraConfig?.baseUrl ?? null;
}

export async function connectPersonio(config: PersonioConnectionConfig): Promise<boolean> {
  connectionsState.personio.isConnecting = true;
  connectionsState.personio.error = null;

  try {
    personioClient = createPersonioClient(config, undefined, async (token) => {
      await setStorageItemAsync(STORAGE_KEYS.PERSONIO_TOKEN, token);
    });

    const result = await personioClient.testConnection();
    if (!result.success) {
      throw new Error(result.error || 'Personio connection failed');
    }

    // Apply work schedule from employee data returned by testConnection
    if (result.employee) {
      const workSchedule = personioClient.getWorkSchedule(result.employee);
      if (workSchedule) {
        updateSettings({ weekdayHours: workSchedule });
        logger.store('settings', 'Updated weekdayHours from Personio', { workSchedule });
      }
    }

    connectionsState.personio.isConnected = true;
    connectionsState.personio.isConnecting = false;
    connectionsState.personio.error = null;
    connectionsState.personio.lastConnected = new Date().toISOString();

    await setStorageItemAsync(STORAGE_KEYS.PERSONIO_CONFIG, config);
    if (personioClient.getToken()) {
      await setStorageItemAsync(STORAGE_KEYS.PERSONIO_TOKEN, personioClient.getToken()!);
    }
    hasConfiguredServices = true;
    logger.connectionSuccess(`Personio connected as ${result.employeeName}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    connectionsState.personio.isConnected = false;
    connectionsState.personio.isConnecting = false;
    connectionsState.personio.error = message;
    connectionsState.personio.lastConnected = null;
    personioClient = null;
    logger.error('Personio connection failed', error);
    return false;
  }
}

export async function disconnectPersonio(): Promise<void> {
  connectionsState.personio = createInitialServiceState('personio');
  personioClient = null;
  await removeStorageItemAsync(STORAGE_KEYS.PERSONIO_CONFIG);
  await removeStorageItemAsync(STORAGE_KEYS.PERSONIO_TOKEN);
  logger.connection('Personio disconnected');
}

async function restorePersonio(
  config: PersonioConnectionConfig,
  storedToken?: PersonioAuthToken
): Promise<void> {
  try {
    personioClient = createPersonioClient(config, storedToken, async (token) => {
      await setStorageItemAsync(STORAGE_KEYS.PERSONIO_TOKEN, token);
    });

    const result = await personioClient.testConnection();
    if (!result.success) {
      throw new Error(result.error || 'Personio restore failed');
    }

    connectionsState.personio.isConnected = true;
    connectionsState.personio.lastConnected = new Date().toISOString();
    logger.connectionSuccess(`Personio restored as ${result.employeeName}`);
  } catch (error) {
    personioClient = null;
    const message = error instanceof Error ? error.message : 'Personio restore failed';
    connectionsState.personio.isConnected = false;
    connectionsState.personio.error = message;
    logger.error('Personio restore failed', error);
  }
}

export function getPersonioClient(): PersonioClient | null {
  return personioClient;
}

export function isAnyServiceConnected(): boolean {
  return (
    connectionsState.moco.isConnected ||
    connectionsState.jira.isConnected ||
    connectionsState.outlook.isConnected ||
    connectionsState.personio.isConnected
  );
}

export function hasAnyServiceConfigured(): boolean {
  return hasConfiguredServices;
}

export async function reauthenticateOutlook(): Promise<void> {
  const config = await getStorageItemAsync<OutlookConnectionConfig>(STORAGE_KEYS.OUTLOOK_CONFIG);
  if (!config) return;

  connectionsState.outlook.isConnecting = true;
  connectionsState.outlook.error = null;
  startOAuthFlow(config);
}
