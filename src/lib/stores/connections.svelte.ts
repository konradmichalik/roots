import type {
  AllConnectionsState,
  MocoConnectionConfig,
  JiraConnectionConfig,
  OutlookConnectionConfig,
  OAuthTokens
} from '../types';
import { createInitialServiceState } from '../types';
import {
  createMocoClient, type MocoClient,
  createJiraWorklogClient, type JiraWorklogClient,
  createOutlookClient, OutlookClient
} from '../api';
import { exchangeCodeForTokens, getStoredOAuthConfig } from '../api/oauth-manager';
import {
  getStorageItemAsync,
  setStorageItemAsync,
  removeStorageItemAsync,
  STORAGE_KEYS
} from '../utils/storage';
import { logger } from '../utils/logger';

export const connectionsState = $state<AllConnectionsState>({
  moco: createInitialServiceState('moco'),
  jira: createInitialServiceState('jira'),
  outlook: createInitialServiceState('outlook')
});

let mocoClient: MocoClient | null = null;
let jiraClient: JiraWorklogClient | null = null;
let outlookClient: OutlookClient | null = null;

export async function initializeConnections(): Promise<void> {
  const restores: Promise<void>[] = [];

  const mocoConfig = await getStorageItemAsync<MocoConnectionConfig>(STORAGE_KEYS.MOCO_CONFIG);
  if (mocoConfig) {
    logger.connection('Restoring Moco connection from storage');
    restores.push(connectMoco(mocoConfig).then(() => {}));
  }

  const jiraConfig = await getStorageItemAsync<JiraConnectionConfig>(STORAGE_KEYS.JIRA_CONFIG);
  if (jiraConfig) {
    logger.connection('Restoring Jira connection from storage');
    restores.push(connectJira(jiraConfig).then(() => {}));
  }

  const outlookConfig = await getStorageItemAsync<OutlookConnectionConfig>(STORAGE_KEYS.OUTLOOK_CONFIG);
  const outlookTokens = await getStorageItemAsync<OAuthTokens>(STORAGE_KEYS.OUTLOOK_TOKENS);
  if (outlookConfig && outlookTokens) {
    logger.connection('Restoring Outlook connection from storage');
    restores.push(restoreOutlook(outlookConfig, outlookTokens).then(() => {}));
  }

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

    await setStorageItemAsync(STORAGE_KEYS.JIRA_CONFIG, config);
    logger.connectionSuccess(`Jira connected as ${result.user?.displayName ?? 'unknown'}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    connectionsState.jira.isConnected = false;
    connectionsState.jira.isConnecting = false;
    connectionsState.jira.error = message;
    connectionsState.jira.lastConnected = null;
    jiraClient = null;
    logger.error('Jira connection failed', error);
    return false;
  }
}

export async function disconnectJira(): Promise<void> {
  connectionsState.jira = createInitialServiceState('jira');
  jiraClient = null;
  await removeStorageItemAsync(STORAGE_KEYS.JIRA_CONFIG);
  logger.connection('Jira disconnected');
}

async function restoreOutlook(config: OutlookConnectionConfig, tokens: OAuthTokens): Promise<void> {
  try {
    outlookClient = createOutlookClient(config, tokens, (fresh) => {
      setStorageItemAsync(STORAGE_KEYS.OUTLOOK_TOKENS, fresh);
    });
    const result = await outlookClient.testConnection();
    if (!result.success) {
      throw new Error(result.error || 'Outlook connection failed');
    }
    connectionsState.outlook.isConnected = true;
    connectionsState.outlook.lastConnected = new Date().toISOString();
    logger.connectionSuccess(`Outlook restored as ${result.user?.displayName ?? 'unknown'}`);
  } catch (error) {
    outlookClient = null;
    const message = error instanceof Error ? error.message : 'Outlook restore failed';
    connectionsState.outlook.error = message;
    logger.error('Outlook restore failed', error);
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
    connectionsState.outlook.error = null;
    connectionsState.outlook.lastConnected = new Date().toISOString();

    await setStorageItemAsync(STORAGE_KEYS.OUTLOOK_CONFIG, config);
    await setStorageItemAsync(STORAGE_KEYS.OUTLOOK_TOKENS, tokens);
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

export function isAnyServiceConnected(): boolean {
  return (
    connectionsState.moco.isConnected ||
    connectionsState.jira.isConnected ||
    connectionsState.outlook.isConnected
  );
}

